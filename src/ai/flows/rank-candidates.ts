
'use server';

/**
 * @fileOverview Ranks candidate resumes against a single target job description using AI.
 *
 * - rankCandidates - A function that handles the ranking process for a single JD.
 * - RankCandidatesInput - The input type for the rankCandidates function.
 * - RankCandidatesOutput - The return type for the rankCandidates function (now for a single JD).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for a single resume file input
const ResumeInputSchema = z.object({
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z
    .string()
    .describe(
      "A candidate resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
type ResumeInput = z.infer<typeof ResumeInputSchema>;


// Input schema for ranking candidates against a SINGLE target job description
const RankCandidatesInputSchema = z.object({
  targetJobDescription: z.object({
    name: z.string().describe("The name/title of the target job description."),
    dataUri: z.string().describe("The data URI of the target job description content."),
  }),
  resumes: z.array(ResumeInputSchema),
});
export type RankCandidatesInput = z.infer<typeof RankCandidatesInputSchema>;


// Schema for the AI's direct output when ranking a single resume against a single JD
const AICandidateOutputSchema = z.object({
  name: z.string().describe('The name of the candidate, extracted from the resume.'),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100), reflecting how well the resume is structured for automated parsing, considering factors like formatting, keyword optimization, and clarity.'),
  keySkills: z.string().describe('Key skills from the resume matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate, including strengths, weaknesses, improvement suggestions, and notes on ATS score if relevant.'),
});

// Schema for the full candidate data structure, including fields added after AI processing (id, uris)
const FullRankedCandidateSchema = AICandidateOutputSchema.extend({
  id: z.string().describe('Unique identifier for the candidate entry.'),
  originalResumeName: z.string().describe('The original file name of the uploaded resume.'),
  resumeDataUri: z.string().describe('The data URI of the resume content.'),
});


// The overall output schema for the rankCandidatesFlow, now for a SINGLE JobDescription
// This aligns with src/lib/types.JobScreeningResult
const RankCandidatesOutputSchema = z.object({
    jobDescriptionName: z.string().describe("The name/title of the job description against which candidates were ranked."),
    jobDescriptionDataUri: z.string().describe("The data URI of the job description content used for ranking."),
    candidates: z.array(FullRankedCandidateSchema),
  });
export type RankCandidatesOutput = z.infer<typeof RankCandidatesOutputSchema>;


export async function rankCandidates(input: RankCandidatesInput): Promise<RankCandidatesOutput> {
  try {
    return await rankCandidatesFlow(input);
  } catch (flowError) {
    const message = flowError instanceof Error ? flowError.message : String(flowError);
    const stack = flowError instanceof Error ? flowError.stack : undefined;
    console.error('Error in rankCandidates function (server action entry):', message, stack);
    throw new Error(`Candidate ranking process failed: ${message}`);
  }
}

const rankCandidatePrompt = ai.definePrompt({
  name: 'rankSingleCandidateAgainstSingleJDPrompt', // Renamed for clarity
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The target job description as a data URI."),
      resumeDataUri: z.string().describe("A candidate resume as a data URI."),
      originalResumeName: z.string().describe("The original file name of the resume, for context only.")
    }),
  },
  output: {
     schema: AICandidateOutputSchema,
  },
  prompt: `You are an expert HR assistant tasked with ranking a candidate resume against a specific job description.

  Job Description:
  {{media url=jobDescriptionDataUri}}

  Resume (original file name: {{{originalResumeName}}}):
  {{media url=resumeDataUri}}

  Analyze the resume and the job description, then provide the following:
  - Candidate's full name, as extracted from the resume content.
  - A match score (0-100) indicating the resume's relevance to THIS SPECIFIC job description.
  - An ATS (Applicant Tracking System) compatibility score (0-100). This score should reflect how well the resume is structured for automated parsing by ATS software, considering factors like formatting, keyword optimization, and clarity.
  - Key skills from the resume that match THIS SPECIFIC job description (comma-separated).
  - Human-friendly feedback explaining the resume's strengths and weaknesses against THIS SPECIFIC job description, and providing improvement suggestions. If the ATS score is low, briefly include suggestions to improve it in the feedback.

  Ensure the output is structured as a JSON object.`,
  config: {
    temperature: 0, // Low temperature for consistent ranking
  },
});

const rankCandidatesFlow = ai.defineFlow(
  {
    name: 'rankCandidatesAgainstSingleJDFlow', // Renamed for clarity
    inputSchema: RankCandidatesInputSchema,
    outputSchema: RankCandidatesOutputSchema,
  },
  async (input): Promise<RankCandidatesOutput> => {
    try {
      const { targetJobDescription, resumes } = input;

      if (!targetJobDescription || !targetJobDescription.dataUri) {
        throw new Error("Target job description is missing or invalid.");
      }
      if (!resumes || resumes.length === 0) {
        return {
          jobDescriptionName: targetJobDescription.name,
          jobDescriptionDataUri: targetJobDescription.dataUri,
          candidates: [], // No resumes to rank
        };
      }

      const resumeRankingPromises = resumes.map(async (resume) => {
        try {
          const promptInput = {
            jobDescriptionDataUri: targetJobDescription.dataUri,
            resumeDataUri: resume.dataUri,
            originalResumeName: resume.name,
          };
          const { output: aiCandidateOutput } = await rankCandidatePrompt(promptInput);

          if (aiCandidateOutput) {
            return {
              ...aiCandidateOutput,
              id: crypto.randomUUID(),
              resumeDataUri: resume.dataUri,
              originalResumeName: resume.name,
            } satisfies z.infer<typeof FullRankedCandidateSchema>;
          }
          console.warn(`AI returned no output for resume ${resume.name} against JD ${targetJobDescription.name}.`);
          return null;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[rankCandidatesFlow] Error ranking resume ${resume.name} for JD ${targetJobDescription.name}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
          return null; // Allow other rankings to proceed
        }
      });

      const rankedCandidatesWithNulls = await Promise.all(resumeRankingPromises);
      const candidatesForThisJD = rankedCandidatesWithNulls.filter(c => c !== null) as z.infer<typeof FullRankedCandidateSchema>[];

      // Sort candidates by score in descending order
      candidatesForThisJD.sort((a, b) => b.score - a.score);

      return {
        jobDescriptionName: targetJobDescription.name,
        jobDescriptionDataUri: targetJobDescription.dataUri,
        candidates: candidatesForThisJD,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error('[rankCandidatesFlow] Internal error caught within the flow itself:', message, stack);
      throw new Error(`RankCandidatesFlow failed: ${message}`);
    }
  }
);
