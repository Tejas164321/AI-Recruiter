
import { performBulkScreening, type PerformBulkScreeningInput } from '@/ai/flows/rank-candidates';
import { type NextRequest } from 'next/server';

const BATCH_SIZE = 10;

/**
 * This API route handles the bulk resume screening process.
 * It receives a job description and a list of resumes, then streams back the
 * AI-powered ranking results in real-time.
 */
export async function POST(req: NextRequest) {
  try {
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    // The stream is manually controlled to ensure data is sent correctly.
    const stream = new ReadableStream({
      async start(controller) {
        // Divide resumes into manageable batches.
        const resumeBatches: Array<typeof resumes> = [];
        for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
          resumeBatches.push(resumes.slice(i, i + BATCH_SIZE));
        }

        const encoder = new TextEncoder();

        // Process each batch sequentially to avoid overwhelming the API
        // and to ensure stable streaming.
        for (const batch of resumeBatches) {
            try {
                // Call the AI flow to process the current batch.
                const rankedCandidates = await performBulkScreening({ jobDescription, resumes: batch });
                
                // For each candidate returned, stringify them and enqueue them into the stream.
                // A newline character is crucial as it acts as a delimiter on the client-side.
                for (const candidate of rankedCandidates) {
                    controller.enqueue(encoder.encode(JSON.stringify(candidate) + '\n'));
                }
            } catch (error) {
                 // If a batch fails, log the error and continue to the next batch.
                 // This makes the process resilient.
                 console.error("[API Route] Error processing a batch:", error);
                 // Optionally, you could enqueue an error message for the client here.
            }
        }
        
        // Once all batches are processed, close the stream.
        controller.close();
      },
    });

    // Return the stream as the response.
    return new Response(stream, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    // Handle errors that occur before the stream starts (e.g., bad JSON body).
    console.error('Error in rank-resumes API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to process request', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
