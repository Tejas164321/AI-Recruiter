
import { performSingleResumeScreening } from '@/ai/flows/rank-candidates';
import type { PerformBulkScreeningInput, RankedCandidate } from '@/lib/types';
import { type NextRequest } from 'next/server';


/**
 * This API route handles the bulk resume screening process.
 * It receives a job description and a list of resumes, then streams back the
 * AI-powered ranking results in real-time as each resume is processed in parallel.
 */
export async function POST(req: NextRequest) {
  try {
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Map each resume to a processing promise.
        const processingPromises = resumes.map(resume => 
          performSingleResumeScreening({ jobDescription, resume })
            .then(rankedCandidate => {
              // As soon as a candidate is ranked, send it to the client.
              controller.enqueue(encoder.encode(JSON.stringify(rankedCandidate) + '\n'));
            })
            .catch(error => {
              // If an individual screening fails, log it and potentially send an error state for that specific resume.
              console.error(`[API Route] Error processing resume ${resume.name} in parallel:`, error);
              const errorMessage = error instanceof Error ? error.message : "A resume failed to process.";
              const errorCandidate: RankedCandidate = {
                id: resume.id,
                name: resume.name || "Error Processing",
                email: "",
                score: 0,
                atsScore: 0,
                keySkills: "Processing Error",
                feedback: `Failed to process this resume: ${errorMessage}`,
                originalResumeName: resume.name,
              };
               controller.enqueue(encoder.encode(JSON.stringify(errorCandidate) + '\n'));
            })
        );

        // Wait for all parallel processes to complete before closing the stream.
        await Promise.all(processingPromises);
        
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
