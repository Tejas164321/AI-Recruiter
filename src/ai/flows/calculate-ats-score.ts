
'use server';
/**
 * @fileOverview Calculates the ATS (Applicant Tracking System) score for a given resume.
 * This flow analyzes a resume's structure and formatting for compatibility with automated parsing systems.
 *
 * - calculateAtsScore - A function that analyzes a resume and returns its ATS score and feedback.
 * - CalculateAtsScoreInput - The input type for the calculateAtsScore function.
 * - CalculateAtsScoreOutput - The return type for the calculateAtsScore function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Defines the expected input structure for the ATS score calculation.
const CalculateAtsScoreInputSchema = z.object({
  // The resume file content, encoded as a Base64 data URI.
  resumeDataUri: z
    .string()
    .describe(
      "The candidate's resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  // The original filename, used for context in the prompt.
  originalResumeName: z.string().describe("The original file name of the resume, for context only."),
});
export type CalculateAtsScoreInput = z.infer<typeof CalculateAtsScoreInputSchema>;

// Defines the expected output structure from the ATS score calculation.
const CalculateAtsScoreOutputSchema = z.object({
  // A numerical score representing ATS compatibility.
  atsScore: z.number().min(0).max(100).describe('The ATS (Applicant Tracking System) compatibility score (0-100), reflecting how well the resume is structured for automated parsing. Factors include formatting, keyword presence (general, not job-specific), section clarity, and use of standard fonts/layouts.'),
  // Actionable feedback for improving the resume.
  atsFeedback: z.string().describe('Actionable feedback on the resume\'s ATS compatibility. This should highlight 2-3 key strengths and 2-3 areas for improvement regarding structure, formatting, keyword optimization for general parseability, and clarity. Provide concrete examples if possible.'),
  // The candidate's name, if it can be reliably extracted.
  candidateName: z.string().optional().describe('The full name of the candidate, if it can be reliably extracted from the resume content. If not found, this can be omitted.'),
});
export type CalculateAtsScoreOutput = z.infer<typeof CalculateAtsScoreOutputSchema>;

/**
 * Public-facing function to calculate the ATS score.
 * This serves as the server action that the frontend can call.
 * @param {CalculateAtsScoreInput} input - The resume data to be analyzed.
 * @returns {Promise<CalculateAtsScoreOutput>} The ATS score and feedback.
 */
export async function calculateAtsScore(input: CalculateAtsScoreInput): Promise<CalculateAtsScoreOutput> {
  return calculateAtsScoreFlow(input);
}

// Defines the Genkit prompt for the AI model.
const prompt = ai.definePrompt({
  name: 'calculateAtsScorePrompt',
  // Specifies the Zod schemas for strongly-typed inputs and outputs.
  input: {schema: CalculateAtsScoreInputSchema},
  output: {schema: CalculateAtsScoreOutputSchema},
  // The prompt text that instructs the AI model on its task.
  // It uses Handlebars syntax `{{{...}}}` to insert input variables.
  prompt: `You are an expert ATS (Applicant Tracking System) compatibility checker.
Analyze the provided resume (original file name: {{{originalResumeName}}}) based on its structure, formatting, and content to determine how well it would be parsed by typical ATS software.

Resume for Analysis:
{{media url=resumeDataUri}}

Provide the following:
1.  **candidateName**: Extract the candidate's full name if clearly identifiable. If not, omit this field.
2.  **atsScore**: An ATS compatibility score between 0 and 100.
    *   Consider factors like:
        *   Clear section headings (e.g., "Experience", "Education", "Skills").
        *   Use of standard, readable fonts.
        *   Avoidance of tables, columns, images, headers/footers that might confuse parsers.
        *   Presence of relevant keywords (general professional terms, not specific to a job).
        *   Consistent date formatting.
        *   File type (though you only see content, assume it was a common type like PDF/DOCX).
        *   Overall machine readability.
3.  **atsFeedback**: Provide concise, actionable feedback (2-3 strengths, 2-3 weaknesses) focusing on ATS compatibility. Explain *why* certain elements are good or bad for ATS. Suggest specific improvements. For example, instead of "improve formatting," say "Consider using standard bullet points instead of custom symbols for better ATS parsing."

Your primary goal is to assess how easily an ATS can extract key information. Do not evaluate the candidate's qualifications for a specific job.
The score and feedback should be based on general ATS best practices.
Output a JSON object.`,
  // Configuration for the AI model's behavior.
  config: {
    temperature: 0.2, // Lower temperature for more consistent, deterministic scoring and feedback.
  },
});

// Defines the Genkit flow, which orchestrates the AI call.
const calculateAtsScoreFlow = ai.defineFlow(
  {
    name: 'calculateAtsScoreFlow',
    inputSchema: CalculateAtsScoreInputSchema,
    outputSchema: CalculateAtsScoreOutputSchema,
  },
  async input => {
    try {
        // Execute the prompt with the given input.
        const {output} = await prompt(input);
        // If the AI fails to return an output, throw an error.
        if (!output) {
            throw new Error("AI did not return an output for ATS score calculation.");
        }
        // Return the valid output from the AI.
        return output;
    } catch (error) {
        // Log any errors that occur during the flow.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error in calculateAtsScoreFlow for resume ${input.originalResumeName}: ${message}`, error instanceof Error ? error.stack: undefined);
        // Return a default error structure if the AI call fails, ensuring the frontend gets a consistent response shape.
        return {
            atsScore: 0,
            atsFeedback: `Error processing resume for ATS score: ${message}. Please ensure the file is a standard text-based document.`,
            candidateName: undefined,
        };
    }
  }
);
