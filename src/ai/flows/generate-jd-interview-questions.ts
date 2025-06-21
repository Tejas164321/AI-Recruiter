
'use server';
/**
 * @fileOverview Generates categorized interview questions based on a job description.
 *
 * - generateJDInterviewQuestions - A function that generates categorized interview questions.
 * - GenerateJDInterviewQuestionsInput - The input type for the function.
 * - GenerateJDInterviewQuestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJDInterviewQuestionsInputSchema = z.object({
  jobDescriptionDataUri: z
    .string()
    .describe(
      "The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  roleTitle: z.string().optional().describe('The title of the job role (e.g., "Senior Software Engineer"). This is optional but helps generate more specific questions.'),
  focusAreas: z.string().optional().describe('Optional comma-separated key areas or skills to focus on for questions.'),
});
export type GenerateJDInterviewQuestionsInput = z.infer<typeof GenerateJDInterviewQuestionsInputSchema>;

const GenerateJDInterviewQuestionsOutputSchema = z.object({
  technicalQuestions: z.array(z.string()).describe("Technical questions related to the job description."),
  behavioralQuestions: z.array(z.string()).describe("Behavioral questions to assess soft skills and cultural fit based on the job description."),
  situationalQuestions: z.array(z.string()).describe("Situational questions to understand problem-solving approaches relevant to the job description."),
  roleSpecificQuestions: z.array(z.string()).describe("Questions highly specific to the responsibilities and context of this role based on the job description."),
});
export type GenerateJDInterviewQuestionsOutput = z.infer<typeof GenerateJDInterviewQuestionsOutputSchema>;

export async function generateJDInterviewQuestions(input: GenerateJDInterviewQuestionsInput): Promise<GenerateJDInterviewQuestionsOutput> {
  return generateJDInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateJDInterviewQuestionsPrompt',
  input: {schema: GenerateJDInterviewQuestionsInputSchema},
  output: {schema: GenerateJDInterviewQuestionsOutputSchema},
  prompt: `You are an expert hiring assistant. Your task is to generate insightful interview questions based on the provided job description{{#if roleTitle}} for the role of '{{{roleTitle}}}'{{/if}}.

Job Description:
{{media url=jobDescriptionDataUri}}

{{#if focusAreas}}
Please pay special attention to these key areas or skills when formulating questions: {{{focusAreas}}}.
{{/if}}

Generate 3-5 questions for each of the following categories. Ensure questions are distinct and probe different aspects relevant to the job description.
- Technical Questions: Assess specific technical skills and knowledge required for the role.
- Behavioral Questions: Evaluate past behavior to predict future performance and cultural fit.
- Situational Questions: Present hypothetical scenarios to assess problem-solving and decision-making skills.
- Role-Specific Questions: Delve into nuanced aspects directly tied to the responsibilities and unique context outlined in this particular job description.

Return the questions structured in their respective categories. If a category is not applicable or you cannot generate relevant questions for it based on the JD, return an empty array for that category.
`,
});

const generateJDInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateJDInterviewQuestionsFlow',
    inputSchema: GenerateJDInterviewQuestionsInputSchema,
    outputSchema: GenerateJDInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
