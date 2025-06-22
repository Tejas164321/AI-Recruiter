
'use server';
/**
 * @fileOverview Generates categorized interview questions based on a job description.
 * This flow takes a job description and produces technical, behavioral, situational, and role-specific questions.
 *
 * - generateJDInterviewQuestions - The public-facing function for generating questions.
 * - GenerateJDInterviewQuestionsInput - The input type for the function.
 * - GenerateJDInterviewQuestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Defines the expected input structure for the question generation flow.
const GenerateJDInterviewQuestionsInputSchema = z.object({
  // The job description content, encoded as a Base64 data URI.
  jobDescriptionDataUri: z
    .string()
    .describe(
      "The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  // An optional title for the role to provide more context to the AI.
  roleTitle: z.string().optional().describe('The title of the job role (e.g., "Senior Software Engineer"). This is optional but helps generate more specific questions.'),
  // Optional keywords to guide the AI on which areas to focus.
  focusAreas: z.string().optional().describe('Optional comma-separated key areas or skills to focus on for questions.'),
});
export type GenerateJDInterviewQuestionsInput = z.infer<typeof GenerateJDInterviewQuestionsInputSchema>;

// Defines the expected output structure, with questions categorized into arrays.
const GenerateJDInterviewQuestionsOutputSchema = z.object({
  technicalQuestions: z.array(z.string()).describe("Technical questions related to the job description."),
  behavioralQuestions: z.array(z.string()).describe("Behavioral questions to assess soft skills and cultural fit based on the job description."),
  situationalQuestions: z.array(z.string()).describe("Situational questions to understand problem-solving approaches relevant to the job description."),
  roleSpecificQuestions: z.array(z.string()).describe("Questions highly specific to the responsibilities and context of this role based on the job description."),
});
export type GenerateJDInterviewQuestionsOutput = z.infer<typeof GenerateJDInterviewQuestionsOutputSchema>;

/**
 * Public-facing server action to generate interview questions.
 * @param {GenerateJDInterviewQuestionsInput} input - The job description and optional context.
 * @returns {Promise<GenerateJDInterviewQuestionsOutput>} A promise resolving to the categorized questions.
 */
export async function generateJDInterviewQuestions(input: GenerateJDInterviewQuestionsInput): Promise<GenerateJDInterviewQuestionsOutput> {
  return generateJDInterviewQuestionsFlow(input);
}

// Defines the Genkit prompt for the AI model.
const prompt = ai.definePrompt({
  name: 'generateJDInterviewQuestionsPrompt',
  input: {schema: GenerateJDInterviewQuestionsInputSchema},
  output: {schema: GenerateJDInterviewQuestionsOutputSchema},
  // The prompt text uses Handlebars syntax to conditionally include optional fields.
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

// Defines the Genkit flow that orchestrates the AI call.
const generateJDInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateJDInterviewQuestionsFlow',
    inputSchema: GenerateJDInterviewQuestionsInputSchema,
    outputSchema: GenerateJDInterviewQuestionsOutputSchema,
  },
  async input => {
    // Execute the prompt with the provided input.
    const {output} = await prompt(input);
    // The exclamation mark `!` asserts that the output will not be null.
    // This is safe if the prompt is well-defined and the AI service is reliable.
    return output!;
  }
);
