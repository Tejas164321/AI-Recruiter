
import { performBulkScreening } from '@/ai/flows/rank-candidates';
import type { PerformBulkScreeningInput, RankedCandidate, ResumeFile } from '@/lib/types';
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

        // Process all batches in parallel
        const processingPromises = resumeBatches.map(async (batch) => {
          try {
            const rankedCandidates = await performBulkScreening({ jobDescription, resumes: batch });
            if (rankedCandidates.length > 0) {
              controller.enqueue(encoder.encode(JSON.stringify(rankedCandidates) + '\n'));
            }
          } catch (error) {
            console.error("[API Route] Error processing a batch in parallel:", error);
            // In case of an error in one batch, we can choose to send an error message
            // or simply log it and continue. Here, we'll log it and let other batches proceed.
            const errorMessage = error instanceof Error ? error.message : "A batch failed to process.";
            // Optionally enqueue a specific error object for the frontend to handle
            controller.enqueue(encoder.encode(JSON.stringify({ error: "Batch Processing Error", details: errorMessage }) + '\n'));
          }
        });

        // Wait for all parallel processes to complete.
        await Promise.all(processingPromises);
        
        // Once all batches are processed and their results streamed, close the stream.
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
