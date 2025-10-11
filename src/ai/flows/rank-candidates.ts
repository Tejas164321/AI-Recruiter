
'use server';

/**
 * @fileOverview Performs bulk screening by ranking candidate resumes against a job role.
 * This flow processes resumes in stable batches to handle large volumes efficiently and streams
 * results back to the client in real-time.
 *
 * - performBulkScreeningStream - The main async generator function to handle the screening process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RankedCandidate } from '@/lib/types';

// The number of resumes to process in a single AI call.
const BATCH_SIZE = 10; 

// Internal Zod schema for a single resume file.
const ResumeInputSchema = z.object({
  id: z.string(),
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z.string().describe("A candidate resume as a data URI."),
});

// Zod schema for the input required by the server action. This is NOT exported.
const PerformBulkScreeningInputSchema = z.object({
  jobDescription: z.object({
    id: z.string(),
    name: z.string(),
    contentDataUri: z.string(),
    originalDocumentName: z.string(),
  }),
  resumes: z.array(ResumeInputSchema),
});
type PerformBulkScreeningInput = z.infer<typeof PerformBulkScreeningInputSchema>;

// Zod schema for the AI's direct output when ranking one resume.
const AICandidateOutputSchema = z.object({
  resumeId: z.string().describe("The original ID of the resume this ranking pertains to."),
  name: z.string().describe('The full name of the candidate, as extracted from the resume.'),
  email: z.string().optional().describe("The candidate's email address. If not found, return an empty string."),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100).'),
  keySkills: z.string().describe('Key skills from the resume matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate, including strengths, weaknesses, and improvement suggestions.'),
});

// Defines the Genkit prompt for ranking a BATCH of resumes.
const rankCandidatesInBatchPrompt = ai.definePrompt({
  name: 'rankCandidatesInBatchPrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The target job description as a data URI."),
      resumesData: z.array(z.object({
          id: z.string(),
          dataUri: z.string().describe("A candidate resume as a data URI."),
          originalResumeName: z.string().describe("The original file name of the resume, for context only.")
      })).describe("A batch of resumes to rank."),
    }),
  },
  output: {
     schema: z.array(AICandidateOutputSchema).describe("An array of ranking results, one for each resume in the input batch."),
  },
  prompt: `You are an expert HR assistant tasked with ranking a batch of candidate resumes against a specific job description.
Your scoring should be consistent and deterministic.

Job Description:
{{media url=jobDescriptionDataUri}}

For each resume in the provided batch, analyze it against the job description and provide the following details in a JSON object:
- resumeId: The original ID of the resume this result corresponds to.
- name: Candidate's full name. If not found, use the original resume filename.
- email: Candidate's email address. If not found, omit this field.
- score: A match score (0-100) for relevance to THIS SPECIFIC job description.
- atsScore: An ATS compatibility score (0-100).
- keySkills: Key skills from the resume that match THIS SPECIFIC job description (comma-separated).
- feedback: Human-friendly feedback on strengths, weaknesses, and improvement suggestions against THIS SPECIFIC job description.

Input Resumes:
{{#each resumesData}}
---
Resume ID: {{{this.id}}}
Resume Filename: {{{this.originalResumeName}}}
{{media url=this.dataUri}}
---
{{/each}}

Ensure your output is a valid JSON array, with one object for each resume provided in the input.`,
  config: {
    temperature: 0,
  },
});


/**
 * The main server action for performing bulk screening. It's an async generator
 * that streams ranked candidates back to the client using a stable, sequential
 * batching approach.
 *
 * @param {PerformBulkScreeningInput} input - The job role and all resumes to be processed.
 * @yields {RankedCandidate} A ranked candidate object as it is processed.
 */
export async function* performBulkScreeningStream(input: PerformBulkScreeningInput): AsyncGenerator<RankedCandidate> {
    console.log("[SERVER DEBUG] performBulkScreeningStream called with", input.resumes.length, "resumes.");
    const { jobDescription, resumes } = input;

    // Create batches of resumes to process sequentially.
    const batches = [];
    for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
        batches.push(resumes.slice(i, i + BATCH_SIZE));
    }
    console.log(`[SERVER DEBUG] Created ${batches.length} batches of size ${BATCH_SIZE}.`);

    let batchNumber = 0;
    // Process each batch one by one and stream the results as they become available.
    for (const batch of batches) {
        batchNumber++;
        const promptInput = {
            jobDescriptionDataUri: jobDescription.contentDataUri,
            resumesData: batch.map(r => ({ id: r.id, dataUri: r.dataUri, originalResumeName: r.name })),
        };
        
        try {
            console.log(`[SERVER DEBUG] Processing batch #${batchNumber} with ${batch.length} resumes...`);
            const { output } = await rankCandidatesInBatchPrompt(promptInput);
            console.log(`[SERVER DEBUG] Successfully processed batch #${batchNumber}. AI returned ${output?.length || 0} results.`);

            if (output && output.length > 0) {
                // For each result from the AI, construct the full RankedCandidate object and yield it.
                for (const aiCandidateOutput of output) {
                    const originalResume = resumes.find(r => r.id === aiCandidateOutput.resumeId);
                    if (originalResume) {
                        const rankedCandidate: RankedCandidate = {
                            id: originalResume.id,
                            name: aiCandidateOutput.name || originalResume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
                            email: aiCandidateOutput.email || "",
                            score: aiCandidateOutput.score,
                            atsScore: aiCandidateOutput.atsScore,
                            keySkills: aiCandidateOutput.keySkills,
                            feedback: aiCandidateOutput.feedback,
                            originalResumeName: originalResume.name,
                            resumeDataUri: originalResume.dataUri,
                        };
                        console.log(`[SERVER DEBUG] Yielding candidate: ${rankedCandidate.name}`);
                        yield rankedCandidate;
                    }
                }
            } else {
                 // If AI returns no output for a batch, yield error objects for those resumes.
                 console.warn(`[SERVER DEBUG] AI returned no output for batch #${batchNumber}.`);
                 for (const resume of batch) {
                    yield {
                        id: resume.id, name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)", email: "",
                        score: 0, atsScore: 0, keySkills: 'AI returned no output',
                        feedback: 'The AI model did not return any output for this resume in its batch.',
                        originalResumeName: resume.name, resumeDataUri: resume.dataUri,
                    };
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER DEBUG] CRITICAL ERROR processing batch #${batchNumber}. Error: ${errorMessage}`, error);

            // If an error occurs, yield error objects for each resume in the failing batch.
            for (const resume of batch) {
                yield {
                    id: resume.id, name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)", email: "",
                    score: 0, atsScore: 0, keySkills: 'Critical processing error',
                    feedback: `A critical error occurred while processing the batch for this resume: ${String(errorMessage).substring(0, 200)}`,
                    originalResumeName: resume.name, resumeDataUri: resume.dataUri,
                };
            }
        }
    }
    console.log("[SERVER DEBUG] Finished processing all batches.");
}
