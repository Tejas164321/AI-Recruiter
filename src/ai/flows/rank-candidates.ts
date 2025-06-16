
'use server';

/**
 * @fileOverview Ranks candidate resumes based on their relevance to job descriptions using AI.
 *
 * - rankCandidates - A function that handles the ranking process.
 * - RankCandidatesInput - The input type for the rankCandidates function.
 * - RankCandidatesOutput - The return type for the rankCandidates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RankCandidatesInputSchema = z.object({
  jobDescriptionDataUri: z
    .string()
    .describe(
      'The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  resumes: z
    .array(z.string())
    .describe(
      'An array of candidate resumes, each as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});

export type RankCandidatesInput = z.infer<typeof RankCandidatesInputSchema>;

const RankedCandidateSchema = z.object({
  name: z.string().describe('The name of the candidate.'),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100), reflecting how well the resume is structured for automated parsing, considering factors like formatting, keyword optimization, and clarity.'),
  keySkills: z.string().describe('Key skills matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate, including strengths, weaknesses, improvement suggestions, and notes on ATS score if relevant.'),
});

const RankCandidatesOutputSchema = z.array(RankedCandidateSchema);

export type RankCandidatesOutput = z.infer<typeof RankCandidatesOutputSchema>;

export async function rankCandidates(input: RankCandidatesInput): Promise<RankCandidatesOutput> {
  return rankCandidatesFlow(input);
}

const rankCandidatePrompt = ai.definePrompt({
  name: 'rankCandidatePrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The job description as a data URI."),
      resume: z.string().describe("A candidate resume as a data URI."),
    }),
  },
  output: {
    schema: RankedCandidateSchema,
  },
  prompt: `You are an expert HR assistant tasked with ranking candidate resumes against a job description.

  Job Description: {{media url=jobDescriptionDataUri}}
  Resume: {{media url=resume}}

  Analyze the resume and provide the following:
  - A match score (0-100) indicating the resume's relevance to the job description.
  - An ATS (Applicant Tracking System) compatibility score (0-100). This score should reflect how well the resume is structured for automated parsing by ATS software, considering factors like formatting, keyword optimization, and clarity.
  - Key skills from the resume that match the job description.
  - Human-friendly feedback explaining the resume's strengths and weaknesses, and providing improvement suggestions. If the ATS score is low, briefly include suggestions to improve it in the feedback.

  Ensure the output is structured as a JSON object with the following fields:
  {
    "name": "Candidate Name",
    "score": Match Score (0-100),
    "atsScore": ATS Compatibility Score (0-100),
    "keySkills": "List of key skills",
    "feedback": "AI-driven feedback"
  }`,
});

const rankCandidatesFlow = ai.defineFlow(
  {
    name: 'rankCandidatesFlow',
    inputSchema: RankCandidatesInputSchema,
    outputSchema: RankCandidatesOutputSchema,
  },
  async input => {
    const {
      jobDescriptionDataUri,
      resumes
    } = input;

    const rankedCandidates = await Promise.all(
      resumes.map(async resume => {
        const {output} = await rankCandidatePrompt({
          jobDescriptionDataUri: jobDescriptionDataUri,
          resume: resume,
        });
        return output!;
      })
    );

    return rankedCandidates;
  }
);

