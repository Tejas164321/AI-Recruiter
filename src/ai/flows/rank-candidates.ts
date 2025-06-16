
'use server';

/**
 * @fileOverview Ranks candidate resumes based on their relevance to job descriptions using AI.
 * Handles multiple job descriptions and multiple resumes for many-to-many ranking.
 *
 * - rankCandidates - A function that handles the ranking process.
 * - RankCandidatesInput - The input type for the rankCandidates function.
 * - RankCandidatesOutput - The return type for the rankCandidates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Ensure JobScreeningResult is imported if it's the intended structure, but RankCandidatesOutput is defined below.

const JobDescriptionInputSchema = z.object({
  name: z.string().describe("The file name or identifier of the job description."),
  dataUri: z
    .string()
    .describe(
      "The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const ResumeInputSchema = z.object({
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z
    .string()
    .describe(
      "A candidate resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const RankCandidatesInputSchema = z.object({
  jobDescriptions: z.array(JobDescriptionInputSchema),
  resumes: z.array(ResumeInputSchema),
});

export type RankCandidatesInput = z.infer<typeof RankCandidatesInputSchema>;

// Schema for the data structure of a candidate as returned by the AI prompt
const AICandidateOutputSchema = z.object({
  name: z.string().describe('The name of the candidate, extracted from the resume.'),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100), reflecting how well the resume is structured for automated parsing, considering factors like formatting, keyword optimization, and clarity.'),
  keySkills: z.string().describe('Key skills from the resume matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate, including strengths, weaknesses, improvement suggestions, and notes on ATS score if relevant.'),
});

// Schema for the full candidate data structure, including fields added after AI processing (id, uris)
// This aligns with src/lib/types.RankedCandidate
const FullRankedCandidateSchema = AICandidateOutputSchema.extend({
  id: z.string().describe('Unique identifier for the candidate entry.'),
  originalResumeName: z.string().describe('The original file name of the uploaded resume.'),
  resumeDataUri: z.string().describe('The data URI of the resume content.'),
});


// The overall output schema for the rankCandidatesFlow
const RankCandidatesOutputSchema = z.array(
  z.object({
    jobDescriptionName: z.string(),
    jobDescriptionDataUri: z.string(),
    candidates: z.array(FullRankedCandidateSchema), 
  })
);

export type RankCandidatesOutput = z.infer<typeof RankCandidatesOutputSchema>;


export async function rankCandidates(input: RankCandidatesInput): Promise<RankCandidatesOutput> {
  try {
    return await rankCandidatesFlow(input);
  } catch (flowError) {
    console.error('Error in rankCandidates flow execution:', flowError);
    // Ensure a new Error object is thrown, which is generally safer for Server Actions.
    // This helps Next.js properly serialize the error back to the client.
    const message = flowError instanceof Error ? flowError.message : String(flowError);
    throw new Error(`Candidate ranking process failed: ${message}`);
  }
}

const rankCandidatePrompt = ai.definePrompt({
  name: 'rankCandidatePrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The job description as a data URI."),
      resumeDataUri: z.string().describe("A candidate resume as a data URI."),
      originalResumeName: z.string().describe("The original file name of the resume, for context only.")
    }),
  },
  output: {
     schema: AICandidateOutputSchema, 
  },
  prompt: `You are an expert HR assistant tasked with ranking a candidate resume against a specific job description.

  Job Description: {{media url=jobDescriptionDataUri}}
  Resume: {{media url=resumeDataUri}}
  Original Resume File Name (for context only, do not include in extracted candidate name): {{{originalResumeName}}}

  Analyze the resume and provide the following:
  - Candidate's full name, as extracted from the resume content.
  - A match score (0-100) indicating the resume's relevance to the job description.
  - An ATS (Applicant Tracking System) compatibility score (0-100). This score should reflect how well the resume is structured for automated parsing by ATS software, considering factors like formatting, keyword optimization, and clarity.
  - Key skills from the resume that match the job description (comma-separated).
  - Human-friendly feedback explaining the resume's strengths and weaknesses, and providing improvement suggestions. If the ATS score is low, briefly include suggestions to improve it in the feedback.

  Ensure the output is structured as a JSON object.`,
  config: {
    temperature: 0,
  },
});

const rankCandidatesFlow = ai.defineFlow(
  {
    name: 'rankCandidatesFlow',
    inputSchema: RankCandidatesInputSchema,
    outputSchema: RankCandidatesOutputSchema, 
  },
  async (input): Promise<RankCandidatesOutput> => { 
    const { jobDescriptions, resumes } = input;
    const screeningResults: RankCandidatesOutput = [];

    for (const jd of jobDescriptions) {
      const candidatesForThisJD: z.infer<typeof FullRankedCandidateSchema>[] = [];
      for (const resume of resumes) {
        try {
          const promptInput = {
            jobDescriptionDataUri: jd.dataUri,
            resumeDataUri: resume.dataUri,
            originalResumeName: resume.name,
          };
          const { output: aiCandidateOutput } = await rankCandidatePrompt(promptInput);
          
          if (aiCandidateOutput) {
            candidatesForThisJD.push({
              ...aiCandidateOutput, 
              id: crypto.randomUUID(), 
              resumeDataUri: resume.dataUri,
              originalResumeName: resume.name,
            });
          }
        } catch (error) {
          console.error(`Error ranking resume ${resume.name} for JD ${jd.name}:`, error);
          // This allows the flow to continue with other resumes/JDs,
          // which is desirable if one file is problematic but others are okay.
          // However, if this error is due to exceeding token limits with a large JD,
          // it might repeatedly happen for all resumes against that JD.
        }
      }

      candidatesForThisJD.sort((a, b) => b.score - a.score);
      
      screeningResults.push({
        jobDescriptionName: jd.name,
        jobDescriptionDataUri: jd.dataUri,
        candidates: candidatesForThisJD, 
      });
    }
    return screeningResults;
  }
);

