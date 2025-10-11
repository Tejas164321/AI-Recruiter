
import { performBulkScreening } from '@/ai/flows/rank-candidates';
import type { RankedCandidate, ResumeFile, PerformBulkScreeningInput } from '@/lib/types';
import { type NextRequest } from 'next/server';

const BATCH_SIZE = 10;

/**
 * This API route handles the bulk resume screening process.
 * It receives a job description and a list of resumes, then streams back the
 * AI-powered ranking results in real-time as each batch is processed.
 */
export async function POST(req: NextRequest) {
  try {
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    const stream = new ReadableStream({
      async start(controller) {
        const resumeBatches: Array<ResumeFile[]> = [];
        for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
          resumeBatches.push(resumes.slice(i, i + BATCH_SIZE));
        }

        const encoder = new TextEncoder();

        // Process each batch sequentially and stream results immediately.
        for (const batch of resumeBatches) {
          try {
            // Get the ranked candidates for the current batch.
            const rankedCandidates = await performBulkScreening({ jobDescription, resumes: batch });
            
            // Immediately enqueue the results for this batch.
            // The frontend will handle combining and de-duplicating results.
            if (rankedCandidates.length > 0) {
              controller.enqueue(encoder.encode(JSON.stringify(rankedCandidates) + '\n'));
            }

          } catch (error) {
            console.error("[API Route] Error processing a batch:", error);
            const errorMessage = error instanceof Error ? error.message : "A batch failed to process.";
            controller.enqueue(encoder.encode(JSON.stringify({ error: "Batch Processing Error", details: errorMessage }) + '\n'));
          }
        }
        
        // Once all batches are processed, close the stream.
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
