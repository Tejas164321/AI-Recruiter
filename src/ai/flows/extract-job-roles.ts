
'use server';
/**
 * @fileOverview Extracts individual job roles from uploaded job description documents.
 *
 * - extractJobRoles - A function that processes JD files and returns a list of distinct job roles.
 * - ExtractJobRolesInput - The input type for the extractJobRoles function.
 * - ExtractJobRolesOutput - The return type for the extractJobRoles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { randomUUID } from 'crypto'; // For Node.js environment

// Schema for a single uploaded job description file for input
const JobDescriptionFileInputSchema = z.object({
  name: z.string().describe("The file name or identifier of the job description document."),
  dataUri: z
    .string()
    .describe(
      "The job description document as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type JobDescriptionFileInput = z.infer<typeof JobDescriptionFileInputSchema>;


// Input schema for the main extractJobRolesFlow
const ExtractJobRolesInputSchema = z.object({
  jobDescriptionDocuments: z.array(JobDescriptionFileInputSchema),
});
export type ExtractJobRolesInput = z.infer<typeof ExtractJobRolesInputSchema>;


// Schema for a single, segmented/extracted job description for output
const ExtractedJobRoleOutputSchema = z.object({
  id: z.string().describe("Unique identifier for this extracted job role."),
  name: z.string().describe("The display name for this job role (e.g., 'Senior Software Engineer', 'Untitled Job Role'). This should primarily be the extracted title without the original file name."),
  contentDataUri: z.string().describe("The full text content of this individual job description, as a data URI."),
  originalDocumentName: z.string().describe("The name of the original document from which this job role was extracted."),
});
export type ExtractedJobRoleOutput = z.infer<typeof ExtractedJobRoleOutputSchema>;


// Output schema for the extractJobRolesFlow
const ExtractJobRolesOutputSchema = z.array(ExtractedJobRoleOutputSchema);
export type ExtractJobRolesOutput = z.infer<typeof ExtractJobRolesOutputSchema>;


// Prompt for segmenting job descriptions from a single document
const segmentJobDescriptionsPrompt = ai.definePrompt({
  name: 'segmentJobDescriptionsForExtractionPrompt',
  input: {
    schema: z.object({
      documentDataUri: z.string().describe("The document (e.g., PDF, TXT) as a data URI, potentially containing multiple job descriptions."),
      originalFileName: z.string().describe("The original file name of the document, for context only."),
    })
  },
  output: {
    schema: z.array(z.object({
        title: z.string().describe("The concise job title of this individual job description (e.g., 'Senior Software Engineer', 'Marketing Manager'). Ensure the title is specific to the job described. If no clear title is found, this may be empty."),
        content: z.string().describe("The full text content of that specific job description, including all requirements, responsibilities, and qualifications."),
    })).describe("An array of individual job descriptions found in the document. If only one JD is present, it should be an array with a single element. If no distinct JDs are found or the document is not a job description, return an empty array."),
  },
  prompt: `You are an expert HR document parser. Your task is to analyze the provided document and identify all distinct job descriptions contained within it.
For each distinct job description you find, you must extract:
1.  A concise and accurate job title (e.g., "Senior Software Engineer", "Marketing Manager"). Ensure the title is specific to the job described. If the document has a clear overall title that seems to represent a single job, use that. If no specific title can be determined, leave the title field empty or provide a very generic one like "Job Description".
2.  The complete text content of that specific job description, including all requirements, responsibilities, and qualifications.

Document to analyze (from original file: {{{originalFileName}}}):
{{media url=documentDataUri}}

If the document clearly contains only one job description, return an array with that single job description.
If the document contains multiple job descriptions, ensure each is extracted as a separate item in the output array.
If the document does not appear to be a job description or no clear job roles can be identified, return an empty array.
Pay close attention to formatting cues like headings, horizontal lines, page breaks, or significant spacing that might separate different job descriptions.
The "content" field for each job description must be the full text for that specific job, not a summary.`,
  config: {
    temperature: 0, // Changed from 0.1 to 0 for more deterministic output
  },
});

export async function extractJobRoles(input: ExtractJobRolesInput): Promise<ExtractJobRolesOutput> {
  try {
    return await extractJobRolesFlow(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Log the full error object here too for top-level errors from the flow
    console.error('[extractJobRoles function] DETAILED ERROR:', error);
    console.error('[extractJobRoles function (server action entry)] Error message:', message, error instanceof Error ? error.stack : undefined);
    throw new Error(`Job role extraction process failed: ${message}`);
  }
}

const extractJobRolesFlow = ai.defineFlow(
  {
    name: 'extractJobRolesFlow',
    inputSchema: ExtractJobRolesInputSchema,
    outputSchema: ExtractJobRolesOutputSchema,
  },
  async (input): Promise<ExtractJobRolesOutput> => {
    const allExtractedRoles: ExtractedJobRoleOutput[] = [];

    const segmentationPromises = input.jobDescriptionDocuments.map(async (doc) => {
      try {
        const segmentationInput = {
          documentDataUri: doc.dataUri,
          originalFileName: doc.name,
        };
        console.log(`[extractJobRolesFlow] Attempting to segment document: ${doc.name}`);
        const { output: segmentedJdsOutput } = await segmentJobDescriptionsPrompt(segmentationInput);
        console.log(`[extractJobRolesFlow] Successfully segmented document: ${doc.name}. Found ${segmentedJdsOutput?.length || 0} segments.`);


        if (segmentedJdsOutput && segmentedJdsOutput.length > 0) {
          segmentedJdsOutput.forEach((segmentedJd, index) => {
            let displayName = segmentedJd.title?.replace(/[^\w\s.-]/gi, '').trim() || '';
            if (!displayName) {
              displayName = segmentedJdsOutput.length > 1 ? `Job Role ${index + 1}` : "Untitled Job Role";
            }
            
            const content = segmentedJd.content || "No content extracted for this job description.";
            const contentDataUri = `data:text/plain;charset=utf-8;base64,${Buffer.from(content).toString('base64')}`;

            allExtractedRoles.push({
              id: randomUUID(),
              name: displayName,
              contentDataUri: contentDataUri,
              originalDocumentName: doc.name,
            });
          });
        } else {
          console.warn(`[extractJobRolesFlow] No segments found for document ${doc.name}. Treating whole doc as one role.`);
          allExtractedRoles.push({
            id: randomUUID(),
            name: "Untitled Job Role", 
            contentDataUri: doc.dataUri, 
            originalDocumentName: doc.name,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Log the full error object for more details, especially for API errors
        console.error(`[extractJobRolesFlow] DETAILED ERROR segmenting document ${doc.name}:`, error);
        console.error(`[extractJobRolesFlow] Error segmenting document ${doc.name} (message only): ${message}`, error instanceof Error ? error.stack : undefined);
        
        // Fallback on error during segmentation for a specific file
        allExtractedRoles.push({
          id: randomUUID(),
          name: "Untitled Job Role (Extraction Error)", // Indicate error in the name
          contentDataUri: doc.dataUri, // Keep original data URI
          originalDocumentName: doc.name,
        });
      }
    });

    await Promise.all(segmentationPromises);

    if (allExtractedRoles.length === 0 && input.jobDescriptionDocuments.length > 0) {
        console.warn(`[extractJobRolesFlow] No roles extracted after processing all documents. Creating fallbacks.`);
        input.jobDescriptionDocuments.forEach(doc => {
            allExtractedRoles.push({
                id: randomUUID(),
                name: "Untitled Job Role (No Segments)", // Indicate no segments found
                contentDataUri: doc.dataUri,
                originalDocumentName: doc.name,
            });
        });
    }
    return allExtractedRoles;
  }
);

