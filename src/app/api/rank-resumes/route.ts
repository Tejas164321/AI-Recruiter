
import { performSingleResumeScreening } from '@/ai/flows/rank-candidates';
import type { PerformBulkScreeningInput, RankedCandidate } from '@/lib/types';
import { type NextRequest } from 'next/server';

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
 * It receives a job description and a list of resumes, then streams back the
 * AI-powered ranking results in real-time as each resume is processed in parallel.
 */
export async function POST(req: NextRequest) {
  try {
    const body: PerformBulkScreeningInput = await req.json();
    const { jobDescription, resumes } = body;

    // Decode the job description content once.
    const jobDescriptionContent = decodeDataUri(jobDescription.contentDataUri);
    if (!jobDescriptionContent) {
        throw new Error("Could not decode job description content.");
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Map each resume to a processing promise.
        const processingPromises = resumes.map(resume => {
          const resumeContent = decodeDataUri(resume.dataUri);
          if (!resumeContent) {
              // If a resume can't be decoded, send an error object for it.
              const errorCandidate: RankedCandidate = {
                id: resume.id,
                name: resume.name || "Error Processing",
                email: "",
                score: 0,
                atsScore: 0,
                keySkills: "Decoding Error",
                feedback: `Failed to decode this resume. Please ensure it is a valid text-based file.`,
                originalResumeName: resume.name,
              };
              controller.enqueue(encoder.encode(JSON.stringify(errorCandidate) + '\n'));
              return Promise.resolve(); // Resolve the promise to not block others
          }

          return performSingleResumeScreening({ jobDescriptionContent, resume: { ...resume, content: resumeContent } })
            .then(rankedCandidate => {
              // As soon as a candidate is ranked, send it to the client.
              controller.enqueue(encoder.encode(JSON.stringify(rankedCandidate) + '\n'));
            })
            .catch(error => {
              // If an individual screening fails, log it and send an error state for that specific resume.
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
        });

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
