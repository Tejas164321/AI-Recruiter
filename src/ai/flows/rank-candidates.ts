
'use server';

/**
 * @fileOverview Performs bulk screening by ranking candidate resumes against a job role.
 * This flow is designed to be called from a dedicated API route that handles streaming.
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

// Zod schema for the input required by this server action.
const PerformBulkScreeningInputSchema = z.object({
  jobDescription: z.object({
    id: z.string(),
    name: z.string(),
    contentDataUri: z.string(),
    originalDocumentName: z.string(),
  }),
  resumes: z.array(ResumeInputSchema),
});
export type PerformBulkScreeningInput = z.infer<typeof PerformBulkScreeningInputSchema>;

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
 * A standard async function to perform bulk screening. It processes resumes in parallel batches
 * and returns a promise that resolves with the full list of ranked candidates.
 * This function is called by the API route.
 *
 * @param {PerformBulkScreeningInput} input - The job role and all resumes to be processed.
 * @returns {Promise<RankedCandidate[]>} A promise that resolves to an array of ranked candidates.
 */
export async function performBulkScreening(input: PerformBulkScreeningInput): Promise<RankedCandidate[]> {
    const { jobDescription, resumes } = input;
    const allRankedCandidates: RankedCandidate[] = [];

    const batches = [];
    for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
        batches.push(resumes.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch) => {
        const promptInput = {
            jobDescriptionDataUri: jobDescription.contentDataUri,
            resumesData: batch.map(r => ({ id: r.id, dataUri: r.dataUri, originalResumeName: r.name })),
        };
        
        try {
            const { output } = await rankCandidatesInBatchPrompt(promptInput);
            if (!output) return [];

            return output.map(aiCandidateOutput => {
                const originalResume = resumes.find(r => r.id === aiCandidateOutput.resumeId);
                if (!originalResume) return null;

                return {
                    id: originalResume.id,
                    name: aiCandidateOutput.name || originalResume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
                    email: aiCandidateOutput.email || "",
                    score: aiCandidateOutput.score,
                    atsScore: aiCandidateOutput.atsScore,
                    keySkills: aiCandidateOutput.keySkills,
                    feedback: aiCandidateOutput.feedback,
                    originalResumeName: originalResume.name,
                    resumeDataUri: originalResume.dataUri,
                } as RankedCandidate;
            }).filter((c): c is RankedCandidate => c !== null);

        } catch (error) {
            console.error(`CRITICAL ERROR processing a batch. Error: ${error instanceof Error ? error.message : String(error)}`);
            // Return error objects for this batch
            return batch.map(resume => ({
                id: resume.id, name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)", email: "",
                score: 0, atsScore: 0, keySkills: 'Critical processing error',
                feedback: `A critical error occurred while processing the batch: ${String(error).substring(0, 200)}`,
                originalResumeName: resume.name, resumeDataUri: resume.dataUri,
            }));
        }
    });

    const resultsFromAllBatches = await Promise.all(batchPromises);
    resultsFromAllBatches.forEach(batchResult => {
        allRankedCandidates.push(...batchResult);
    });

    return allRankedCandidates;
}
