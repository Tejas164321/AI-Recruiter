
'use server';
/**
 * @fileOverview Generates AI-driven feedback for a candidate based on their resume and the job description.
 *
 * - generateCandidateFeedback - A function that generates feedback for a candidate.
 * - GenerateCandidateFeedbackInput - The input type for the generateCandidateFeedback function.
 * - GenerateCandidateFeedbackOutput - The return type for the generateCandidateFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCandidateFeedbackInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The candidate's resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobDescriptionDataUri: z
    .string()
    .describe(
      "The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  matchScore: z.number().describe('The match score between the resume and the job description (0-100).'),
  candidateName: z.string().describe('The name of the candidate.'),
});
export type GenerateCandidateFeedbackInput = z.infer<typeof GenerateCandidateFeedbackInputSchema>;

const GenerateCandidateFeedbackOutputSchema = z.object({
  feedback: z.string().describe('AI-generated feedback for the candidate, including strengths, weaknesses, and improvement suggestions.'),
});
export type GenerateCandidateFeedbackOutput = z.infer<typeof GenerateCandidateFeedbackOutputSchema>;

export async function generateCandidateFeedback(input: GenerateCandidateFeedbackInput): Promise<GenerateCandidateFeedbackOutput> {
  return generateCandidateFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCandidateFeedbackPrompt',
  input: {schema: GenerateCandidateFeedbackInputSchema},
  output: {schema: GenerateCandidateFeedbackOutputSchema},
  prompt: `You are an AI-powered resume feedback generator for recruiters.

  Based on the candidate's resume, the job description, and the match score, generate human-friendly feedback for the candidate.
  Explain their strengths and weaknesses and provide improvement suggestions.
  Keep the feedback concise and actionable.

  Candidate Name: {{{candidateName}}}
  Match Score: {{{matchScore}}}

  Resume:
  {{media url=resumeDataUri}}

  Job Description:
  {{media url=jobDescriptionDataUri}}

  Feedback:
`,
});

const generateCandidateFeedbackFlow = ai.defineFlow(
  {
    name: 'generateCandidateFeedbackFlow',
    inputSchema: GenerateCandidateFeedbackInputSchema,
    outputSchema: GenerateCandidateFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

