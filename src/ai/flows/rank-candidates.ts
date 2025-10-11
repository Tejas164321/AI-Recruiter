
'use server';

/**
 * @fileOverview Performs bulk screening: ranks candidate resumes against a job role in a streaming fashion.
 * This file orchestrates the process of taking a list of jobs and a list of resumes,
 * and having an AI rank each resume against each job with controlled parallelism.
 *
 * - performBulkScreeningStream - The main function to handle the bulk screening process.
 * - BulkScreeningInput - Input type: a single job role and a list of resumes.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RankedCandidate } from '@/lib/types';

// Constants for controlling the batching and parallelism
const BATCH_SIZE = 10; // Number of resumes per single AI call
const CONCURRENT_LIMIT = 5; // Number of AI calls to make in parallel at any given time

// Internal Zod schema for a resume file.
const ResumeInputSchema = z.object({
  id: z.string(),
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z.string().describe("A candidate resume as a data URI."),
});

// Internal Zod schema for an extracted job role.
const ExtractedJobRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentDataUri: z.string(),
  originalDocumentName: z.string(),
});

// Zod schema for the entire bulk screening input for the stream.
const BulkScreeningInputSchema = z.object({
  jobDescription: ExtractedJobRoleSchema,
  resumes: z.array(ResumeInputSchema),
});
export type BulkScreeningInput = z.infer<typeof BulkScreeningInputSchema>;


// Zod schema for the AI's direct output when ranking one resume against one JD.
const AICandidateOutputSchema = z.object({
  name: z.string().describe('The full name of the candidate, as extracted from the resume.'),
  email: z.string().describe("The candidate's email address, as extracted from the resume. If not found, return an empty string.").optional(),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100).'),
  keySkills: z.string().describe('Key skills from the resume matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate, including strengths, weaknesses, and improvement suggestions.'),
});

// Defines the Genkit prompt for ranking a BATCH of resumes against a single job description.
const rankCandidatesInBatchPrompt = ai.definePrompt({
  name: 'rankCandidatesInBatchPrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The target job description as a data URI."),
      resumesData: z.array(z.object({
          id: z.string(), // Pass through the resume ID
          dataUri: z.string().describe("A candidate resume as a data URI."),
          originalResumeName: z.string().describe("The original file name of the resume, for context only.")
      })).describe("A batch of up to 10 resumes to rank."),
    }),
  },
  output: {
     schema: z.array(
        AICandidateOutputSchema.extend({
            resumeId: z.string().describe("The original ID of the resume this ranking pertains to.")
        })
     ).describe("An array of ranking results, one for each resume in the input batch."),
  },
  prompt: `You are an expert HR assistant tasked with ranking a batch of candidate resumes against a specific job description.
Your scoring should be consistent and deterministic given the same inputs.

Job Description:
{{media url=jobDescriptionDataUri}}

For each resume in the provided batch, analyze it against the job description and provide the following details:
- The original ID of the resume this result corresponds to.
- Candidate's full name. If not found, use the original resume filename as the name.
- Candidate's email address. If not found, return an empty string.
- A match score (0-100) for relevance to THIS SPECIFIC job description.
- An ATS compatibility score (0-100).
- Key skills from the resume that match THIS SPECIFIC job description (comma-separated).
- Human-friendly feedback on strengths, weaknesses, and improvement suggestions against THIS SPECIFIC job description.

Input Resumes:
{{#each resumesData}}
---
Resume ID: {{{this.id}}}
Resume Filename: {{{this.originalResumeName}}}
{{media url=this.dataUri}}
---
{{/each}}

Ensure your output is a JSON array, with one object for each resume provided in the input.`,
  config: {
    temperature: 0, // Set to 0 for maximum consistency in ranking.
  },
});


/**
 * Public-facing server action to perform bulk screening as a stream.
 * This is an async generator that yields ranked candidates as they are processed.
 * @param {BulkScreeningInput} input - The job role and all resumes to be processed.
 * @yields {RankedCandidate} A promise that resolves to the ranked results for each candidate.
 */
export async function* performBulkScreeningStream(input: BulkScreeningInput): AsyncGenerator<RankedCandidate> {
    try {
        // Correctly iterate over the async generator returned by the Genkit flow
        // and yield each result back to the client.
        for await (const candidate of rankCandidatesFlow(input)) {
            yield candidate;
        }
    } catch (flowError) {
        const message = flowError instanceof Error ? flowError.message : String(flowError);
        console.error('Error in performBulkScreeningStream (server action entry):', message, flowError instanceof Error ? flowError.stack : undefined);
        // In case of a total flow failure, we throw, which will be caught by the useStream hook's error handler.
        throw new Error(`Bulk screening process failed catastrophically: ${message}`);
    }
}


// Defines the main Genkit flow for bulk screening.
const rankCandidatesFlow = ai.defineFlow(
  {
    name: 'rankCandidatesFlow',
    inputSchema: BulkScreeningInputSchema,
    outputSchema: z.custom<RankedCandidate>(),
    stream: true,
  },
  async function* (input) {
    const { jobDescription, resumes } = input;
    
    // Create an array to hold all the batches of resumes.
    const batches = [];
    for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
        batches.push(resumes.slice(i, i + BATCH_SIZE));
    }

    // This function processes a single batch and returns its results.
    const processBatch = async (batch: typeof resumes) => {
        const promptInput = {
            jobDescriptionDataUri: jobDescription.contentDataUri,
            resumesData: batch.map(r => ({ id: r.id, dataUri: r.dataUri, originalResumeName: r.name })),
        };
        try {
            console.log(`[rankCandidatesFlow] Processing batch of ${batch.length} resumes...`);
            const { output } = await rankCandidatesInBatchPrompt(promptInput);
            console.log(`[rankCandidatesFlow] Successfully processed batch. AI returned ${output?.length || 0} results.`);
            if (output) return { success: true, results: output, batch };
            // Handle case where AI returns empty/null output for a valid request
            return { success: false, error: 'AI returned no output for this batch.', batch };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[rankCandidatesFlow] CRITICAL ERROR processing batch. Error: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            return { success: false, error: errorMessage, batch };
        }
    };

    // This function manages the controlled parallel execution.
    const runWithConcurrency = async (limit: number) => {
      let activePromises = 0;
      const executing = new Set<Promise<any>>();
      
      for (const batch of batches) {
        // Wait if we've hit the concurrency limit
        while (activePromises >= limit) {
          await Promise.race(executing);
        }

        activePromises++;
        const promise = processBatch(batch).then((result) => {
          activePromises--;
          executing.delete(promise);
          return result;
        });

        executing.add(promise);
      }
      
      // Wait for all promises to finish
      await Promise.allSettled(executing);
    };

    // Execute all batches with the defined concurrency limit.
    // This function itself doesn't return the results, it just manages execution.
    // The results will be handled by yielding them as they complete.
    const allBatchPromises = batches.map(batch => processBatch(batch));
    
    // Process batches with concurrency control
    const executing = new Set<Promise<any>>();
    for (const batchPromise of allBatchPromises) {
        executing.add(batchPromise);

        batchPromise.then((batchResult) => {
            // Remove the completed promise from the set
            executing.delete(batchPromise);
        });

        // If we've hit the concurrency limit, wait for one promise to resolve
        if (executing.size >= CONCURRENT_LIMIT) {
            await Promise.race(executing);
        }
    }

    // Wait for all the promises to complete
    const allBatchResults = await Promise.all(allBatchPromises);


    // Now, iterate through the results of all batches and yield them.
    for (const batchResult of allBatchResults) {
        if (batchResult.success) {
            // If the batch was successful, yield each ranked candidate.
            for (const aiCandidateOutput of batchResult.results) {
                const originalResume = resumes.find(r => r.id === aiCandidateOutput.resumeId);
                if (originalResume) {
                    const rankedCandidate: RankedCandidate = {
                        ...aiCandidateOutput,
                        id: originalResume.id,
                        name: aiCandidateOutput.name || originalResume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
                        email: aiCandidateOutput.email || "",
                        originalResumeName: originalResume.name,
                        resumeDataUri: originalResume.dataUri,
                    };
                    yield rankedCandidate;
                }
            }
        } else {
            // If the batch failed, yield error objects for each resume in that batch.
            for (const resume of batchResult.batch) {
                yield {
                    id: resume.id, name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)", email: "",
                    score: 0, atsScore: 0, keySkills: 'Critical processing error',
                    feedback: `A critical error occurred while processing the batch for this resume: ${String(batchResult.error).substring(0, 150)}`,
                    originalResumeName: resume.name, resumeDataUri: resume.dataUri,
                };
            }
        }
    }
  }
);
