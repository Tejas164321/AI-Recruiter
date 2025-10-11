
import { performBulkScreening, type PerformBulkScreeningInput } from '@/ai/flows/rank-candidates';
import { type NextRequest } from 'next/server';

const BATCH_SIZE = 10;

export async function POST(req: NextRequest) {
  try {
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    const stream = new ReadableStream({
      async start(controller) {
        const resumeBatches = [];
        for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
          resumeBatches.push(resumes.slice(i, i + BATCH_SIZE));
        }

        for (const batch of resumeBatches) {
            try {
                const rankedCandidates = await performBulkScreening({ jobDescription, resumes: batch });
                for (const candidate of rankedCandidates) {
                    controller.enqueue(JSON.stringify(candidate) + '\n');
                }
            } catch (error) {
                 console.error("Error processing a batch in API route:", error);
                 // Optionally enqueue an error message for the client
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
