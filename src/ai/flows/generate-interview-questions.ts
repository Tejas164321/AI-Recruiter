
'use server';
/**
 * @fileOverview Generates AI-driven interview questions for a candidate.
 *
 * - generateInterviewQuestions - A function that generates interview questions.
 * - GenerateInterviewQuestionsInput - The input type for the generateInterviewQuestions function.
 * - GenerateInterviewQuestionsOutput - The return type for the generateInterviewQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  candidateName: z.string().describe('The name of the candidate.'),
  jobDescriptionDataUri: z
    .string()
    .describe(
      "The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  resumeDataUri: z
    .string()
    .describe(
      "The candidate's resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  keySkills: z.string().describe("The candidate's key skills relevant to the job."),
});
export type GenerateInterviewQuestionsInput = z.infer<typeof GenerateInterviewQuestionsInputSchema>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  interviewQuestions: z.array(z.string()).describe('A list of 3-5 suggested interview questions.'),
});
export type GenerateInterviewQuestionsOutput = z.infer<typeof GenerateInterviewQuestionsOutputSchema>;

export async function generateInterviewQuestions(input: GenerateInterviewQuestionsInput): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an expert hiring assistant. Based on the candidate's resume, their key skills, and the job description provided, generate 3-5 insightful interview questions.
These questions should help assess the candidate's suitability for the role, covering both technical and behavioral aspects.
Focus on questions that probe deeper into their experiences and skills mentioned in the resume as they relate to the job requirements.

Candidate Name: {{{candidateName}}}
Key Skills: {{{keySkills}}}

Job Description:
{{media url=jobDescriptionDataUri}}

Resume:
{{media url=resumeDataUri}}
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

