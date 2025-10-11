
import { performBulkScreening } from '@/ai/flows/rank-candidates';
import type { RankedCandidate, ResumeFile, PerformBulkScreeningInput } from '@/lib/types';
import { type NextRequest } from 'next/server';

const BATCH_SIZE = 10;

/**
 * This API route handles the bulk resume screening process.
 * It receives a job description and a list of resumes, then streams back the
 * AI-powered ranking results in real-time, filtering for unique candidates by email.
 */
export async function POST(req: NextRequest) {
  try {
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    // A Map to track unique candidates by email, storing only the highest-scoring one.
    const uniqueCandidates = new Map<string, RankedCandidate>();

    const stream = new ReadableStream({
      async start(controller) {
        const resumeBatches: Array<ResumeFile[]> = [];
        for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
          resumeBatches.push(resumes.slice(i, i + BATCH_SIZE));
        }

        const encoder = new TextEncoder();

        for (const batch of resumeBatches) {
          try {
            const rankedCandidates = await performBulkScreening({ jobDescription, resumes: batch });
            
            for (const candidate of rankedCandidates) {
              // If the email is valid, check for duplicates.
              if (candidate.email) {
                const existingCandidate = uniqueCandidates.get(candidate.email);
                // If the new candidate has a higher score, or if this is the first time seeing this email, store it.
                if (!existingCandidate || candidate.score > existingCandidate.score) {
                  uniqueCandidates.set(candidate.email, candidate);
                }
              } else {
                 // If no email, treat it as unique to avoid losing data, using its ID as a key.
                 uniqueCandidates.set(candidate.id, candidate);
              }
            }

            // After processing a batch, enqueue the current state of unique candidates.
            // This allows the UI to de-duplicate in near real-time.
            const candidatesToSend = Array.from(uniqueCandidates.values());
            controller.enqueue(encoder.encode(JSON.stringify(candidatesToSend) + '\n'));

          } catch (error) {
            console.error("[API Route] Error processing a batch:", error);
            // Optionally, you could enqueue an error message for the client here.
            const errorMessage = error instanceof Error ? error.message : "A batch failed to process.";
            controller.enqueue(encoder.encode(JSON.stringify({ error: "Batch Processing Error", details: errorMessage }) + '\n'));
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
