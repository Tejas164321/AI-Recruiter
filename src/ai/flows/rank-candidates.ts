
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
// It now expects plain text content instead of a data URI.
const rankCandidatePrompt = ai.definePrompt({
  name: 'rankSingleCandidatePrompt',
  input: {
    schema: z.object({
      jobDescriptionContent: z.string().describe("The plain text of the target job description."),
      resumeContent: z.string().describe("The plain text content of a single candidate resume."),
      originalResumeName: z.string().describe("The original file name of the resume, for context only.")
    }),
  },
  output: {
     schema: AICandidateOutputSchema,
  },
  prompt: `You are an expert HR assistant tasked with ranking a candidate resume against a specific job description.
Your scoring should be consistent and deterministic.

Job Description to match against:
{{{jobDescriptionContent}}}

Now, analyze the resume content provided below (from original file: {{{originalResumeName}}}) and provide the following details in a JSON object:
- name: Candidate's full name. If not found, use the original resume filename.
- email: Candidate's email address. If not found, omit this field.
- score: A match score (0-100) for relevance to THIS SPECIFIC job description.
- atsScore: An ATS compatibility score (0-100).
- keySkills: A comma-separated list of the most important skills from the resume that match THIS SPECIFIC job description.
- feedback: Human-friendly but concise feedback (2-3 sentences) on strengths and weaknesses against THIS SPECIFIC job description.

Resume for Analysis:
{{{resumeContent}}}

Ensure your output is a single, valid JSON object with the requested fields.`,
  config: {
    temperature: 0,
  },
});


/**
 * A standard async function to perform screening on a single resume.
 *
 * @param {object} input - The job role and a single resume with plain text content.
 * @returns {Promise<RankedCandidate>} A promise that resolves to a ranked candidate.
 */
export async function performSingleResumeScreening(input: {
    jobDescriptionContent: string;
    resume: { id: string, content: string, name: string };
}): Promise<RankedCandidate> {
    const { jobDescriptionContent, resume } = input;

    const promptInput = {
        jobDescriptionContent: jobDescriptionContent,
        resumeContent: resume.content,
        originalResumeName: resume.name,
    };
    
    try {
        // This is the call to the AI model.
        const { output } = await rankCandidatePrompt(promptInput);
        
        // If the AI call succeeds but returns no data (highly unlikely but possible).
        if (!output) {
             throw new Error(`AI did not return an output for resume ${resume.name}.`);
        }

        // Return the successfully ranked candidate data.
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
        // If any error occurs during the AI call (e.g., invalid API key, network issue).
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`CRITICAL ERROR processing resume ${resume.name}. Error: ${errorMessage}`);
        
        // Return a structured error object. This ensures the frontend always receives a valid
        // RankedCandidate shape, preventing crashes and allowing the error to be displayed.
        return {
            id: resume.id,
            name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)",
            email: "",
            score: 0,
            atsScore: 0,
            keySkills: 'AI Processing Error',
            // The crucial change: Put the actual error message in the feedback field.
            feedback: `A critical error occurred while processing this resume. The AI model failed to respond.
            \n---
            \nTechnical Details: ${errorMessage.substring(0, 500)}
            \n---
            \nThis is often caused by an invalid or missing GOOGLE_API_KEY. Please verify your environment variables.`,
            originalResumeName: resume.name,
        };
    }
}
