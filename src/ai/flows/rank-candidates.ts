
'use server';

/**
 * @fileOverview Performs bulk screening: ranks all candidate resumes against all provided job roles.
 * This file orchestrates the process of taking a list of jobs and a list of resumes,
 * and having an AI rank each resume against each job.
 *
 * - performBulkScreening - The main function to handle the bulk screening process.
 * - PerformBulkScreeningInput - Input type: list of job roles and list of resumes.
 * - PerformBulkScreeningOutput - Output type: an array of JobScreeningResult, one for each job role.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Import custom types from the application's type definitions.
import type { ExtractedJobRole, ResumeFile, RankedCandidate, JobScreeningResult, PerformBulkScreeningInput, PerformBulkScreeningOutput } from '@/lib/types'; 

// Internal Zod schema for a resume file. This ensures type safety within the flow.
const ResumeInputSchema = z.object({
  id: z.string(), // Matches the ID from the ResumeFile type.
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z
    .string()
    .describe(
      "A candidate resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  // The 'file' object is part of the input from the frontend but not used by the AI flow itself.
  file: z.any().optional().describe("The File object, not used by the AI flow directly but part of the input structure."),
});

// Internal Zod schema for an extracted job role.
const ExtractedJobRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentDataUri: z.string(),
  originalDocumentName: z.string(),
});


// Zod schema for the entire bulk screening input.
const PerformBulkScreeningInputSchema = z.object({
  jobRolesToScreen: z.array(ExtractedJobRoleSchema),
  resumesToRank: z.array(ResumeInputSchema),
});


// Zod schema for the AI's direct output when ranking one resume against one JD.
const AICandidateOutputSchema = z.object({
  name: z.string().describe('The full name of the candidate, as extracted from the resume.'),
  email: z.string().describe("The candidate's email address, as extracted from the resume. If not found, return an empty string.").optional(),
  score: z.number().describe('The match score (0-100) of the resume to the job description.'),
  atsScore: z.number().describe('The ATS (Applicant Tracking System) compatibility score (0-100), reflecting how well the resume is structured for automated parsing, considering factors like formatting, keyword optimization, and clarity.'),
  keySkills: z.string().describe('Key skills from the resume matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate, including strengths, weaknesses, improvement suggestions, and notes on ATS score if relevant.'),
});

// Zod schema for the full candidate data structure, including fields added *after* AI processing.
const FullRankedCandidateSchema = AICandidateOutputSchema.extend({
  id: z.string().describe('Unique identifier for the candidate entry.'),
  originalResumeName: z.string().describe('The original file name of the uploaded resume.'),
  resumeDataUri: z.string().describe('The data URI of the resume content.'),
});

// Zod schema for the result of screening all resumes against a *single* job role.
const JobScreeningResultSchema = z.object({
    jobDescriptionId: z.string().describe("The ID of the job description against which candidates were ranked."),
    jobDescriptionName: z.string().describe("The name/title of the job description against which candidates were ranked."),
    jobDescriptionDataUri: z.string().describe("The data URI of the job description content used for ranking."),
    candidates: z.array(FullRankedCandidateSchema),
  });

// The overall output schema for the entire flow, which is an array of JobScreeningResult.
const PerformBulkScreeningOutputSchema = z.array(JobScreeningResultSchema);

/**
 * Public-facing server action to perform bulk screening.
 * @param {PerformBulkScreeningInput} input - The job roles and resumes to be processed.
 * @returns {Promise<PerformBulkScreeningOutput>} A promise resolving to the ranked results.
 */
export async function performBulkScreening(input: PerformBulkScreeningInput): Promise<PerformBulkScreeningOutput> {
  try {
    return await performBulkScreeningFlow(input);
  } catch (flowError) {
    const message = flowError instanceof Error ? flowError.message : String(flowError);
    const stack = flowError instanceof Error ? flowError.stack : undefined;
    console.error('Error in performBulkScreening function (server action entry):', message, stack);
    // Throw a simple error object that Next.js can safely serialize back to the client.
    throw new Error(`Bulk screening process failed: ${message}`);
  }
}

// Defines the Genkit prompt for ranking a single resume against a single job description.
const rankCandidatePrompt = ai.definePrompt({
  name: 'rankSingleCandidateAgainstSingleJDPrompt',
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
Your scoring should be consistent and deterministic given the same inputs.

  Job Description:
  {{media url=jobDescriptionDataUri}}

  Resume (original file name: {{{originalResumeName}}}):
  {{media url=resumeDataUri}}

  Analyze the resume and the job description, then provide the following:
  - Candidate's full name, as extracted from the resume content. If no name can be reliably extracted, return an empty string for the name.
  - Candidate's email address, as extracted from the resume content. If no email can be reliably extracted, return an empty string for the email.
  - A match score (0-100) indicating the resume's relevance to THIS SPECIFIC job description.
  - An ATS (Applicant Tracking System) compatibility score (0-100). This score should reflect how well the resume is structured for automated parsing by ATS software, considering factors like formatting, keyword optimization, and clarity.
  - Key skills from the resume that match THIS SPECIFIC job description (comma-separated).
  - Human-friendly feedback explaining the resume's strengths and weaknesses against THIS SPECIFIC job description, and providing improvement suggestions. If the ATS score is low, briefly include suggestions to improve it in the feedback.

  Ensure the output is structured as a JSON object. Crucially, provide a consistent score given the same inputs.`,
  config: {
    temperature: 0, // Set to 0 for maximum consistency in ranking.
  },
});

// Defines the main Genkit flow for bulk screening.
const performBulkScreeningFlow = ai.defineFlow(
  {
    name: 'performBulkScreeningFlow',
    inputSchema: PerformBulkScreeningInputSchema,
    outputSchema: PerformBulkScreeningOutputSchema,
  },
  async (input): Promise<PerformBulkScreeningOutput> => {
    try {
      const { jobRolesToScreen, resumesToRank } = input;
      const allScreeningResults: PerformBulkScreeningOutput = [];

      // Early exit if no job roles or resumes are provided.
      if (jobRolesToScreen.length === 0) {
        console.warn('[performBulkScreeningFlow] No job roles provided for screening.');
        return [];
      }
      if (resumesToRank.length === 0) {
        console.warn('[performBulkScreeningFlow] No resumes provided for ranking.');
        return jobRolesToScreen.map(jr => ({
          jobDescriptionId: jr.id,
          jobDescriptionName: jr.name,
          jobDescriptionDataUri: jr.contentDataUri,
          candidates: [],
        }));
      }

      // Iterate over each job role.
      for (const jobRole of jobRolesToScreen) {
        let candidatesForThisJobRole: RankedCandidate[] = [];
        try {
          // For each job role, rank all resumes against it concurrently.
          const resumeRankingPromises = resumesToRank.map(async (resume) => {
            let aiCandidateOutput: z.infer<typeof AICandidateOutputSchema> | null = null;
            try {
              const promptInput = {
                jobDescriptionDataUri: jobRole.contentDataUri,
                resumeDataUri: resume.dataUri,
                originalResumeName: resume.name,
              };
              // Call the AI prompt for ranking.
              const { output } = await rankCandidatePrompt(promptInput);
              aiCandidateOutput = output;

              if (aiCandidateOutput) {
                // If successful, combine AI output with original resume data.
                return {
                  ...aiCandidateOutput,
                  id: crypto.randomUUID(),
                  name: aiCandidateOutput.name || resume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate", // Use extracted name or fallback to filename.
                  email: aiCandidateOutput.email || "",
                  resumeDataUri: resume.dataUri,
                  originalResumeName: resume.name,
                } satisfies RankedCandidate;
              } else {
                console.warn(`[performBulkScreeningFlow] AI returned no output for resume ${resume.name} against JD ${jobRole.name}.`);
                // Fall through to create a default error entry.
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`[performBulkScreeningFlow] Error ranking resume ${resume.name} for JD ${jobRole.name}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
              // Fall through to create a default error entry.
            }
            
            // If the AI call failed, create a default entry with error information.
            return {
              id: crypto.randomUUID(),
              name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)",
              email: "",
              score: 0,
              atsScore: 0,
              keySkills: 'Error during processing',
              feedback: `Could not fully process resume "${resume.name}" against job description "${jobRole.name}".`,
              originalResumeName: resume.name,
              resumeDataUri: resume.dataUri,
            } satisfies RankedCandidate;
          });

          // Wait for all resume rankings for the current job role to complete.
          candidatesForThisJobRole = await Promise.all(resumeRankingPromises);
          // Sort candidates by score in descending order.
          candidatesForThisJobRole.sort((a, b) => b.score - a.score);

          // Add the complete result for this job role to the list.
          allScreeningResults.push({
            jobDescriptionId: jobRole.id,
            jobDescriptionName: jobRole.name,
            jobDescriptionDataUri: jobRole.contentDataUri,
            candidates: candidatesForThisJobRole,
          });

        } catch (jobRoleProcessingError) {
          // Handle critical errors during the processing of a single job role.
          const errorMessage = jobRoleProcessingError instanceof Error ? jobRoleProcessingError.message : String(jobRoleProcessingError);
          console.error(`[performBulkScreeningFlow] CRITICAL ERROR processing job role ${jobRole.name} (ID: ${jobRole.id}). Skipping this role. Error: ${errorMessage}`, jobRoleProcessingError instanceof Error ? jobRoleProcessingError.stack : undefined);
          
          // Create error entries for all resumes for this failed job role to inform the user.
          const errorCandidatesForThisJobRole: RankedCandidate[] = resumesToRank.map(resume => ({
            id: crypto.randomUUID(),
            name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Processing Error)",
            email: "",
            score: 0,
            atsScore: 0,
            keySkills: 'Job role processing error',
            feedback: `An error occurred while processing the job role "${jobRole.name}", so this resume could not be ranked against it.`,
            originalResumeName: resume.name,
            resumeDataUri: resume.dataUri,
          }));
          
          allScreeningResults.push({
            jobDescriptionId: jobRole.id,
            jobDescriptionName: `${jobRole.name} (Processing Error)`,
            jobDescriptionDataUri: jobRole.contentDataUri,
            candidates: errorCandidatesForThisJobRole, 
          });
        }
      }
      return allScreeningResults;

    } catch (error) {
      // Catch any other unexpected errors within the flow.
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error('[performBulkScreeningFlow] Internal error caught within the flow itself:', message, stack);
      throw new Error(`Bulk Screening Flow failed: ${message}`);
    }
  }
);

    