
'use server';

/**
 * @fileOverview Ranks candidate resumes based on their relevance to job descriptions using AI.
 * Handles multiple job descriptions and multiple resumes for many-to-many ranking.
 * If a single job description file contains multiple JDs, it attempts to segment them.
 *
 * - rankCandidates - A function that handles the ranking process.
 * - RankCandidatesInput - The input type for the rankCandidates function.
 * - RankCandidatesOutput - The return type for the rankCandidates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JobDescriptionInputSchema = z.object({
  name: z.string().describe("The file name or identifier of the job description."),
  dataUri: z
    .string()
    .describe(
      "The job description as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
type JobDescriptionInput = z.infer<typeof JobDescriptionInputSchema>;

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

// Schema for the AI's direct output when ranking a single resume against a single JD
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
    jobDescriptionName: z.string().describe("The name/title of the job description (potentially from segmentation)."),
    jobDescriptionDataUri: z.string().describe("The data URI of the job description content (potentially segmented)."),
    candidates: z.array(FullRankedCandidateSchema),
  })
);

export type RankCandidatesOutput = z.infer<typeof RankCandidatesOutputSchema>;


// New schema for a single, segmented job description
const SegmentedJobDescriptionSchema = z.object({
  title: z.string().describe("The concise job title of this individual job description (e.g., 'Software Engineer', 'Product Manager')."),
  content: z.string().describe("The full text content of this individual job description, including all requirements, responsibilities, and qualifications."),
});
export type SegmentedJobDescription = z.infer<typeof SegmentedJobDescriptionSchema>;

// New prompt for segmenting job descriptions from a single document
const segmentJobDescriptionsPrompt = ai.definePrompt({
  name: 'segmentJobDescriptionsPrompt',
  input: {
    schema: z.object({
      documentDataUri: z.string().describe("The document (e.g., PDF, TXT) as a data URI, potentially containing multiple job descriptions."),
      originalFileName: z.string().describe("The original file name of the document, for context only."),
    })
  },
  output: {
    schema: z.array(SegmentedJobDescriptionSchema).describe("An array of individual job descriptions found in the document. If only one JD is present, it should be an array with a single element."),
  },
  prompt: `You are an expert HR document parser. Your task is to analyze the provided document and identify all distinct job descriptions contained within it.
For each distinct job description you find, you must extract:
1.  A concise and accurate job title (e.g., "Senior Software Engineer", "Marketing Manager"). Ensure the title is specific to the job described.
2.  The complete text content of that specific job description, including all requirements, responsibilities, and qualifications.

Document to analyze (from original file: {{{originalFileName}}}):
{{media url=documentDataUri}}

If the document clearly contains only one job description, return an array with that single job description.
If the document contains multiple job descriptions, ensure each is extracted as a separate item in the output array.
Pay close attention to formatting cues like headings, horizontal lines, page breaks, or significant spacing that might separate different job descriptions.
The "content" field for each job description must be the full text for that specific job, not a summary.`,
  config: {
    temperature: 0.1, 
  },
});


export async function rankCandidates(input: RankCandidatesInput): Promise<RankCandidatesOutput> {
  try {
    return await rankCandidatesFlow(input);
  } catch (flowError) {
    console.error('Error in rankCandidates flow execution:', flowError);
    const message = flowError instanceof Error ? flowError.message : String(flowError);
    // It's generally better to let Next.js handle the serialization of errors for server actions
    // Re-throwing the original error or a new error with a clear message is often preferred.
    throw new Error(`Candidate ranking process failed: ${message}`);
  }
}

const rankCandidatePrompt = ai.definePrompt({
  name: 'rankCandidatePrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string().describe("The job description (potentially segmented) as a data URI."),
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
    temperature: 0, // Low temperature for more deterministic scoring
  },
});

const rankCandidatesFlow = ai.defineFlow(
  {
    name: 'rankCandidatesFlow',
    inputSchema: RankCandidatesInputSchema,
    outputSchema: RankCandidatesOutputSchema,
  },
  async (input): Promise<RankCandidatesOutput> => {
    const { jobDescriptions: uploadedJobDescriptionFiles, resumes } = input;
    
    // Step 1: Segment all uploaded JD files in parallel
    const segmentationTasks = uploadedJobDescriptionFiles.map(async (uploadedJdFile) => {
      try {
        const segmentationInput = {
          documentDataUri: uploadedJdFile.dataUri,
          originalFileName: uploadedJdFile.name,
        };
        const { output: segmentedJdsOutput } = await segmentJobDescriptionsPrompt(segmentationInput);
        return { originalFile: uploadedJdFile, segmentedJdsOutput, error: null };
      } catch (segmentationError) {
        console.error(`Error during segmentation of JD file ${uploadedJdFile.name}:`, segmentationError);
        return { originalFile: uploadedJdFile, segmentedJdsOutput: null, error: segmentationError };
      }
    });

    const allSegmentationResults = await Promise.all(segmentationTasks);

    // Step 2: Flatten all JDs to process
    const jdsToProcessPromises: Promise<{ name: string; dataUri: string; originalFileName: string }[]>[] = [];

    for (const segResult of allSegmentationResults) {
      const { originalFile, segmentedJdsOutput, error } = segResult;
      const individualJdsForThisFile: { name: string; dataUri: string; originalFileName: string }[] = [];

      if (error || !segmentedJdsOutput || segmentedJdsOutput.length === 0) {
        if (error) console.warn(`Segmentation of ${originalFile.name} failed. Processing as a single JD. Error: ${error}`);
        else console.warn(`Segmentation of ${originalFile.name} returned no JDs. Processing as a single JD.`);
        
        individualJdsForThisFile.push({
          name: originalFile.name,
          dataUri: originalFile.dataUri,
          originalFileName: originalFile.name,
        });
      } else {
        segmentedJdsOutput.forEach((segmentedJd, index) => {
          const safeTitle = (segmentedJd.title || `Job ${index + 1}`).replace(/[^\w\s.-]/gi, '').trim();
          const jobName = `${originalFile.name} - ${safeTitle}`;
          // Ensure content is not empty before creating data URI
          const content = segmentedJd.content || "No content extracted for this job description.";
          const contentDataUri = `data:text/plain;charset=utf-8;base64,${Buffer.from(content).toString('base64')}`;
          
          individualJdsForThisFile.push({
            name: jobName,
            dataUri: contentDataUri,
            originalFileName: originalFile.name, 
          });
        });
      }
      jdsToProcessPromises.push(Promise.resolve(individualJdsForThisFile));
    }
    
    const nestedJdsToProcess = await Promise.all(jdsToProcessPromises);
    const flatJdsToProcess = nestedJdsToProcess.flat();


    if (flatJdsToProcess.length === 0 && uploadedJobDescriptionFiles.length > 0) {
        console.warn("No processable JDs found after attempting segmentation for all files. Defaulting to original uploaded files.");
        uploadedJobDescriptionFiles.forEach(originalFile => {
            flatJdsToProcess.push({
                name: originalFile.name,
                dataUri: originalFile.dataUri,
                originalFileName: originalFile.name,
            });
        });
    }
    
    // Step 3: Process each JD in parallel (includes parallel resume ranking within each)
    const screeningResultPromises = flatJdsToProcess.map(async (jdToProcess) => {
      const resumeRankingPromises = resumes.map(async (resume) => {
        try {
          const promptInput = {
            jobDescriptionDataUri: jdToProcess.dataUri,
            resumeDataUri: resume.dataUri,
            originalResumeName: resume.name,
          };
          const { output: aiCandidateOutput } = await rankCandidatePrompt(promptInput);
          
          if (aiCandidateOutput) {
            return {
              ...aiCandidateOutput,
              id: crypto.randomUUID(),
              resumeDataUri: resume.dataUri, // ensure this is passed through
              originalResumeName: resume.name, // ensure this is passed through
            } satisfies z.infer<typeof FullRankedCandidateSchema>; // Ensure type compatibility
          }
          return null; // Resume ranking failed or no output
        } catch (error) {
          console.error(`Error ranking resume ${resume.name} for JD ${jdToProcess.name}:`, error);
          return null; // Indicate failure for this specific resume ranking
        }
      });

      // Wait for all resumes to be ranked against the current JD
      const rankedCandidatesWithNulls = await Promise.all(resumeRankingPromises);
      // Filter out nulls (failed rankings) and assert type
      const candidatesForThisJD = rankedCandidatesWithNulls.filter(c => c !== null) as z.infer<typeof FullRankedCandidateSchema>[];
      
      // Sort candidates for this JD by score
      candidatesForThisJD.sort((a, b) => b.score - a.score);
      
      return {
        jobDescriptionName: jdToProcess.name,
        jobDescriptionDataUri: jdToProcess.dataUri,
        candidates: candidatesForThisJD,
      };
    });

    // Wait for all JDs to be processed
    const settledScreeningResults = await Promise.allSettled(screeningResultPromises);
    
    const finalResults: RankCandidatesOutput = [];
    settledScreeningResults.forEach(result => {
      if (result.status === 'fulfilled') {
        finalResults.push(result.value);
      } else {
        console.error("A job description screening task failed:", result.reason);
        // Optionally, you could add a placeholder or error indicator in the results
      }
    });
    
    return finalResults;
  }
);
