
'use server';

/**
 * @fileOverview Ranks a single candidate resume against a job role.
 * This flow is designed to be called in parallel for bulk screening.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RankedCandidate } from '@/lib/types';


// Zod schema for the AI's direct output when ranking one resume.
const AICandidateOutputSchema = z.object({
  name: z.string().describe('The full name of the candidate, as extracted from the resume.'),
  email: z.string().optional().describe("The candidate's email address. If not found, return an empty string."),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100).'),
  keySkills: z.string().describe('A comma-separated list of the most important skills from the resume that match the job description.'),
  feedback: z.string().describe('Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses against THIS SPECIFIC job description.'),
});

// Defines the Genkit prompt for ranking a SINGLE resume.
const rankCandidatePrompt = ai.definePrompt({
  name: 'rankSingleCandidatePrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The target job description as a data URI."),
      resumeDataUri: z.string().describe("A single candidate resume as a data URI."),
      originalResumeName: z.string().describe("The original file name of the resume, for context only.")
    }),
  },
  output: {
     schema: AICandidateOutputSchema,
  },
  prompt: `You are an expert HR assistant tasked with ranking a candidate resume against a specific job description.
Your scoring should be consistent and deterministic.

Job Description to match against:
{{media url=jobDescriptionDataUri}}

Now, analyze the resume content provided below (original filename: {{{originalResumeName}}}) and provide the following details in a JSON object:
- name: Candidate's full name. If not found, use the original resume filename.
- email: Candidate's email address. If not found, omit this field.
- score: A match score (0-100) for relevance to THIS SPECIFIC job description.
- atsScore: An ATS compatibility score (0-100).
- keySkills: A comma-separated list of the most important skills from the resume that match THIS SPECIFIC job description.
- feedback: Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses against THIS SPECIFIC job description.

Resume for Analysis:
{{media url=resumeDataUri}}

Ensure your output is a single, valid JSON object with the requested fields.`,
  config: {
    temperature: 0,
  },
});


/**
 * A standard async function to perform screening on a single resume.
 *
 * @param {object} input - The job role and a single resume.
 * @returns {Promise<RankedCandidate>} A promise that resolves to a ranked candidate.
 */
export async function performSingleResumeScreening(input: {
    jobDescription: { contentDataUri: string, name: string };
    resume: { id: string, dataUri: string, name: string };
}): Promise<RankedCandidate> {
    const { jobDescription, resume } = input;

    const promptInput = {
        jobDescriptionDataUri: jobDescription.contentDataUri,
        resumeDataUri: resume.dataUri,
        originalResumeName: resume.name,
    };
    
    try {
        const { output } = await rankCandidatePrompt(promptInput);
        if (!output) {
             throw new Error(`AI did not return an output for resume ${resume.name}.`);
        }

        return {
            id: resume.id,
            name: output.name || resume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
            email: output.email || "",
            score: output.score,
            atsScore: output.atsScore,
            keySkills: output.keySkills,
            feedback: output.feedback,
            originalResumeName: resume.name,
        } as RankedCandidate;

    } catch (error) {
        console.error(`CRITICAL ERROR processing resume ${resume.name} for role ${jobDescription.name}. Error: ${error instanceof Error ? error.message : String(error)}`);
        // Return a clear error object for this resume so the frontend can display it.
        return {
            id: resume.id,
            name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)",
            email: "",
            score: 0,
            atsScore: 0,
            keySkills: 'Critical processing error',
            feedback: `A critical error occurred while processing this resume: ${String(error).substring(0, 200)}`,
            originalResumeName: resume.name,
        };
    }
}
