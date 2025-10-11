
'use server';

/**
 * @fileOverview Performs bulk screening by ranking candidate resumes against a job role.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RankedCandidate, PerformBulkScreeningInput } from '@/lib/types';


// Internal Zod schema for a single resume file.
const ResumeInputSchema = z.object({
  id: z.string(),
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z.string().describe("A candidate resume as a data URI."),
});


// Zod schema for the AI's direct output when ranking one resume.
const AICandidateOutputSchema = z.object({
  resumeId: z.string().describe("The original ID of the resume this ranking pertains to."),
  name: z.string().describe('The full name of the candidate, as extracted from the resume.'),
  email: z.string().optional().describe("The candidate's email address. If not found, return an empty string."),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100).'),
  keySkills: z.string().describe('A comma-separated list of the most important skills from the resume that match the job description.'),
  feedback: z.string().describe('Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses against THIS SPECIFIC job description.'),
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

Job Description to match against:
{{media url=jobDescriptionDataUri}}

Now, for each resume in the provided batch below, analyze its content against the job description above and provide the following details in a JSON object:
- resumeId: The original ID of the resume this result corresponds to.
- name: Candidate's full name. If not found, use the original resume filename.
- email: Candidate's email address. If not found, omit this field.
- score: A match score (0-100) for relevance to THIS SPECIFIC job description.
- atsScore: An ATS compatibility score (0-100).
- keySkills: A comma-separated list of the most important skills from the resume that match THIS SPECIFIC job description.
- feedback: Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses against THIS SPECIFIC job description.

Input Resumes to process:
{{#each resumesData}}
---
Resume ID: {{{this.id}}}
Original Filename: {{{this.originalResumeName}}}
Content for Analysis:
{{media url=this.dataUri}}
---
{{/each}}

Ensure your output is a valid JSON array, with one object for each resume provided in the input.`,
  config: {
    temperature: 0,
  },
});


/**
 * A standard async function to perform bulk screening on a single batch.
 *
 * @param {PerformBulkScreeningInput} input - The job role and a batch of resumes.
 * @returns {Promise<RankedCandidate[]>} A promise that resolves to an array of ranked candidates for the batch.
 */
export async function performBulkScreening(input: PerformBulkScreeningInput): Promise<RankedCandidate[]> {
    const { jobDescription, resumes } = input;

    const promptInput = {
        jobDescriptionDataUri: jobDescription.contentDataUri,
        resumesData: resumes.map(r => ({ id: r.id, dataUri: r.dataUri, originalResumeName: r.name })),
    };
    
    try {
        const { output } = await rankCandidatesInBatchPrompt(promptInput);
        if (!output) {
             throw new Error("AI did not return an output for this batch.");
        }

        return output.map(aiCandidateOutput => {
            const originalResume = resumes.find(r => r.id === aiCandidateOutput.resumeId);
            if (!originalResume) return null;

            // IMPORTANT: Do not include resumeDataUri in the returned object.
            return {
                id: originalResume.id,
                name: aiCandidateOutput.name || originalResume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
                email: aiCandidateOutput.email || "",
                score: aiCandidateOutput.score,
                atsScore: aiCandidateOutput.atsScore,
                keySkills: aiCandidateOutput.keySkills,
                feedback: aiCandidateOutput.feedback,
                originalResumeName: originalResume.name,
            } as RankedCandidate;
        }).filter((c): c is RankedCandidate => c !== null);

    } catch (error) {
        console.error(`CRITICAL ERROR processing batch for role ${jobDescription.name}. Error: ${error instanceof Error ? error.message : String(error)}`);
        // Return error objects for this batch so the frontend can display them.
        return resumes.map(resume => ({
            id: resume.id, name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)", email: "",
            score: 0, atsScore: 0, keySkills: 'Critical processing error',
            feedback: `A critical error occurred while processing this resume: ${String(error).substring(0, 200)}`,
            originalResumeName: resume.name,
        }));
    }
}
