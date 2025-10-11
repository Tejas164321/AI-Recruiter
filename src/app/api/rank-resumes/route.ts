
import { performBulkScreening } from '@/ai/flows/rank-candidates';
import type { RankedCandidate, PerformBulkScreeningInput } from '@/lib/types';
import { type NextRequest } from 'next/server';

// The number of resumes to process in a single AI call.
const BATCH_SIZE = 15;

/**
 * A helper function to decode a data URI to plain text.
 * Returns an empty string if decoding fails.
 */
const decodeDataUri = (dataUri: string): string => {
    try {
        const base64 = dataUri.split(',')[1];
        if (!base64) return "";
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (e) {
        console.error("Failed to decode data URI:", e);
        return "";
    }
}

/**
 * This API route handles the bulk resume screening process.
 * It batches resumes, processes them sequentially, and streams back the
 * AI-powered ranking results in real-time as each batch is completed.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. API Key Check: Immediately fail if the key is not configured on the server.
    if (!process.env.GOOGLE_API_KEY) {
        return new Response(JSON.stringify({ 
            error: 'Missing API Key', 
            details: 'The GOOGLE_API_KEY is not configured on the server. Please set it up in your environment variables.' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
    }
      
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    // Decode the job description content once.
    const jobDescriptionContent = decodeDataUri(jobDescription.contentDataUri);
    if (!jobDescriptionContent) {
        throw new Error("Could not decode job description content.");
    }
    
    // Create batches of resumes.
    const resumeBatches = [];
    for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
        resumeBatches.push(resumes.slice(i, i + BATCH_SIZE));
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Process batches sequentially.
        for (const batch of resumeBatches) {
          try {
            const resumesData = batch.map(resume => ({
              id: resume.id,
              name: resume.name,
              content: decodeDataUri(resume.dataUri)
            })).filter(r => r.content); // Filter out resumes that failed to decode

            if (resumesData.length === 0) continue;

            const rankedCandidates = await performBulkScreening({
              jobDescriptionContent,
              resumesData,
            });

            // Stream each candidate from the completed batch.
            for (const candidate of rankedCandidates) {
              controller.enqueue(encoder.encode(JSON.stringify(candidate) + '\n'));
            }

          } catch (batchError) {
             console.error(`[API Route] Error processing a batch:`, batchError);
             const errorMessage = batchError instanceof Error ? batchError.message : "A batch failed to process.";
             // Send an error object for each resume in the failed batch.
             for (const resume of batch) {
                const errorCandidate: RankedCandidate = {
                    id: resume.id,
                    name: resume.name || "Error Processing",
                    score: 0,
                    atsScore: 0,
                    keySkills: "Batch Processing Error",
                    feedback: `A critical error occurred during batch processing: ${errorMessage}`,
                    originalResumeName: resume.name,
                };
                controller.enqueue(encoder.encode(JSON.stringify(errorCandidate) + '\n'));
             }
          }
        }
        
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    console.error('Error in rank-resumes API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to process request', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
