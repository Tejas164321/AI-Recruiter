
'use server';

/**
 * @fileOverview Ranks a batch of candidate resumes against a single job role.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RankedCandidate } from '@/lib/types';


// Internal Zod schema for a single resume file's plain text content.
const ResumeInputSchema = z.object({
  id: z.string().describe("The unique client-side ID of the resume."),
  name: z.string().describe("The original file name of the resume, for context."),
  content: z.string().describe("The full plain-text content of the resume."),
});

// Zod schema for the AI's direct output when ranking one resume.
const AICandidateOutputSchema = z.object({
  id: z.string().describe('The unique client-side ID of the resume that was processed.'),
  name: z.string().describe('The full name of the candidate, as extracted from the resume.'),
  email: z.string().optional().describe("The candidate's email address. If not found, this can be omitted."),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100).'),
  keySkills: z.string().describe('A comma-separated list of the most important skills from the resume that match the job description.'),
  feedback: z.string().describe('Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses against THIS SPECIFIC job description.'),
});

// The expected output from the AI is an array of ranked candidates.
const AICandidateBatchOutputSchema = z.array(AICandidateOutputSchema);


// Defines the Genkit prompt for ranking a BATCH of resumes.
const rankCandidatesInBatchPrompt = ai.definePrompt({
  name: 'rankCandidatesInBatchPrompt',
  input: {
    schema: z.object({
      jobDescriptionContent: z.string().describe("The plain text of the target job description."),
      resumesData: z.array(ResumeInputSchema),
    }),
  },
  output: {
     schema: AICandidateBatchOutputSchema,
  },
  prompt: `You are an expert HR assistant tasked with ranking a batch of candidate resumes against a specific job description.
Your scoring must be consistent and deterministic.

Job Description to match against:
---
{{{jobDescriptionContent}}}
---

Now, for each of the resumes provided below, analyze its content and provide a JSON object with the specified fields.
Return a single JSON array containing an object for each resume.

{{#each resumesData}}
---
Resume to Analyze:
- ID: {{{this.id}}}
- Original Filename: {{{this.name}}}
- Content:
{{{this.content}}}
---
{{/each}}

For each resume, provide the following fields in a JSON object:
- id: The original unique ID of the resume being processed. THIS IS CRITICAL.
- name: Candidate's full name.
- email: Candidate's email address. Omit if not found.
- score: A match score (0-100) for relevance to THIS SPECIFIC job description.
- atsScore: An ATS compatibility score (0-100).
- keySkills: A comma-separated list of the most important skills from the resume that match THIS SPECIFIC job description.
- feedback: Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses.

Ensure your final output is a single, valid JSON array, with one object per input resume.
`,
  config: {
    temperature: 0,
    model: 'googleai/gemini-1.5-flash-latest'
  },
});


/**
 * A standard async function to perform screening on a batch of resumes.
 *
 * @param {object} input - The job role content and an array of resumes with plain text content.
 * @returns {Promise<RankedCandidate[]>} A promise that resolves to an array of ranked candidates.
 */
export async function performBulkScreening(input: {
    jobDescriptionContent: string;
    resumesData: Array<{ id: string, content: string, name: string }>;
}): Promise<RankedCandidate[]> {
    
    try {
        // This is the call to the AI model with the entire batch.
        const { output } = await rankCandidatesInBatchPrompt(input);
        
        if (!output) {
             throw new Error(`AI did not return an output for the batch.`);
        }
        
        // Map the AI output to the final RankedCandidate structure.
        const rankedCandidates = output.map(aiCandidate => {
            const originalResume = input.resumesData.find(r => r.id === aiCandidate.id);
            return {
                id: aiCandidate.id,
                name: aiCandidate.name || originalResume?.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
                email: aiCandidate.email || "", // Ensure email is a string
                score: aiCandidate.score,
                atsScore: aiCandidate.atsScore,
                keySkills: aiCandidate.keySkills,
                feedback: aiCandidate.feedback,
                originalResumeName: originalResume?.name || "Unknown",
            } as RankedCandidate;
        });

        // Ensure every original resume gets a result, even if the AI missed one.
        const finalResults: RankedCandidate[] = [];
        for (const originalResume of input.resumesData) {
            const foundResult = rankedCandidates.find(rc => rc.id === originalResume.id);
            if (foundResult) {
                finalResults.push(foundResult);
            } else {
                // Create a fallback error object if the AI failed to return a result for a specific resume.
                finalResults.push({
                    id: originalResume.id,
                    name: originalResume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)",
                    email: "",
                    score: 0,
                    atsScore: 0,
                    keySkills: 'AI Processing Error',
                    feedback: `The AI failed to return a result for this specific resume in the batch.`,
                    originalResumeName: originalResume.name,
                });
            }
        }
        return finalResults;

    } catch (error) {
        // If the entire batch call fails, return error objects for all resumes in that batch.
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`CRITICAL ERROR processing batch. Error: ${errorMessage}`);
        
        return input.resumesData.map(resume => ({
            id: resume.id,
            name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)",
            email: "",
            score: 0,
            atsScore: 0,
            keySkills: 'AI Processing Error',
            feedback: `A critical error occurred while processing this resume's batch: ${errorMessage.substring(0, 500)}`,
            originalResumeName: resume.name,
        }));
    }
}
