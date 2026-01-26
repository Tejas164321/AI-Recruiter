
'use server';

/**
 * @fileOverview ROBUST Bulk Screening System - Ranks all candidate resumes against job roles.
 * 
 * This is a complete redesign with:
 * - Rate limiting to prevent API overload
 * - Exponential backoff retry for transient failures  
 * - Batch processing for large datasets
 * - Progress tracking for real-time UI updates
 * - Partial results on failure (never lose successful processing)
 * - Circuit breaker pattern for cascading failure prevention
 * 
 * - performBulkScreening - Main function for bulk screening (backward compatible)
 * - performBulkScreeningWithProgress - Enhanced version with progress callbacks
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { processInBatches, type BatchProgress } from '@/lib/processing';
import { withRetry, isRetryableError, createCircuitBreaker } from '@/lib/processing';
import { withTimeout, getDegradationMode, checkMemoryUsage, suggestGarbageCollection } from '@/lib/processing';
import { validateDataURI } from '@/lib/data-uri-validator';
import type {
  ExtractedJobRole,
  ResumeFile,
  RankedCandidate,
  JobScreeningResult,
  PerformBulkScreeningInput,
  PerformBulkScreeningOutput,
  ProcessingProgress,
  ProcessingError,
  BulkScreeningOptions,
  BulkScreeningResultWithErrors,
} from '@/lib/types';

// ============================================
// Zod Schemas
// ============================================

const ResumeInputSchema = z.object({
  id: z.string(),
  name: z.string().describe("The file name or identifier of the resume."),
  dataUri: z.string().describe("A candidate resume as a data URI."),
  file: z.any().optional(),
});

// Internal type for resume processing (matches the Zod schema)
type ResumeInput = z.infer<typeof ResumeInputSchema>;

const ExtractedJobRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentDataUri: z.string(),
  originalDocumentName: z.string(),
});

const PerformBulkScreeningInputSchema = z.object({
  jobRolesToScreen: z.array(ExtractedJobRoleSchema),
  resumesToRank: z.array(ResumeInputSchema),
});

const AICandidateOutputSchema = z.object({
  name: z.string().describe('The full name of the candidate.'),
  email: z.string().describe("The candidate's email address.").optional(),
  score: z.number().describe('Match score (0-100) to job description.'),
  atsScore: z.number().describe('ATS compatibility score (0-100).'),
  keySkills: z.string().describe('Key skills matching the job description.'),
  feedback: z.string().describe('AI-driven feedback for the candidate.'),
});

const FullRankedCandidateSchema = AICandidateOutputSchema.extend({
  id: z.string(),
  originalResumeName: z.string(),
  resumeDataUri: z.string(),
});

const JobScreeningResultSchema = z.object({
  jobDescriptionId: z.string(),
  jobDescriptionName: z.string(),
  jobDescriptionDataUri: z.string(),
  candidates: z.array(FullRankedCandidateSchema),
});

const PerformBulkScreeningOutputSchema = z.array(JobScreeningResultSchema);

// ============================================
// AI Prompt Definition
// ============================================

const rankCandidatePrompt = ai.definePrompt({
  name: 'rankSingleCandidateAgainstSingleJDPrompt',
  input: {
    schema: z.object({
      jobDescriptionDataUri: z.string(),
      resumeDataUri: z.string(),
      originalResumeName: z.string(),
    }),
  },
  output: {
    schema: AICandidateOutputSchema,
  },
  prompt: `You are an expert HR assistant tasked with ranking a candidate resume against a specific job description.
Your scoring should be consistent and deterministic given the same inputs.

  Job Description:
  {{media url=jobDescriptionDataUri}}

  Resume (original file name: {{{originalResumeName}}}):
  {{media url=resumeDataUri}}

  Analyze the resume and job description, then provide:
  - Candidate's full name (empty string if not found)
  - Candidate's email address (empty string if not found)
  - Match score (0-100) for this specific job
  - ATS compatibility score (0-100)
  - Key skills matching this job (comma-separated)
  - Feedback with strengths, weaknesses, and improvement suggestions

  Return as structured JSON. Be consistent in scoring.`,
  config: {
    temperature: 0,
  },
});

// ============================================
// Error Classification
// ============================================

type ErrorType = 'rate_limit' | 'timeout' | 'parse_error' | 'api_error' | 'unknown';

function classifyError(error: Error): { type: ErrorType; retryable: boolean } {
  const message = error.message.toLowerCase();

  if (message.includes('rate') || message.includes('429') || message.includes('quota')) {
    return { type: 'rate_limit', retryable: true };
  }
  if (message.includes('timeout') || message.includes('etimedout')) {
    return { type: 'timeout', retryable: true };
  }
  if (message.includes('parse') || message.includes('json') || message.includes('schema')) {
    return { type: 'parse_error', retryable: false };
  }
  if (message.includes('api') || message.includes('500') || message.includes('503')) {
    return { type: 'api_error', retryable: true };
  }

  return { type: 'unknown', retryable: isRetryableError(error) };
}

// ============================================
// Circuit Breaker for API Calls
// ============================================

const circuitBreaker = createCircuitBreaker(
  async (input: { jobDescriptionDataUri: string; resumeDataUri: string; originalResumeName: string }) => {
    // Wrap AI call with 30 second timeout
    const result = await withTimeout(
      rankCandidatePrompt(input),
      30000,
      `Processing ${input.originalResumeName} timed out`
    );
    return result.output;
  },
  {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    onOpen: () => console.error('🚨 [Circuit Breaker] API circuit is OPEN - too many failures'),
    onClose: () => console.log('✅ [Circuit Breaker] API circuit is CLOSED - resuming normal operation'),
  }
);

// ============================================
// Single Resume Processing with Retry
// ============================================

interface ProcessResumeContext {
  jobRole: { id: string; name: string; contentDataUri: string };
  maxRetries: number;
  timeoutMs?: number; // Per-request timeout (default: 30s)
}

async function processResumeWithRetry(
  resume: ResumeInput,
  context: ProcessResumeContext
): Promise<{ success: boolean; candidate: RankedCandidate | null; error?: ProcessingError }> {
  const { jobRole, maxRetries } = context;

  // Validate data URI before processing
  const validation = validateDataURI(resume.dataUri);
  if (!validation.isValid) {
    console.error(`❌ [Validation] Invalid data URI for ${resume.name}: ${validation.error}`);
    return {
      success: false,
      candidate: null,
      error: {
        index: 0, // Will be set by caller
        resumeId: resume.id,
        resumeName: resume.name,
        message: `Invalid resume data: ${validation.error}`,
        type: 'parse_error',
        retryable: false,
      },
    };
  }

  const result = await withRetry(
    async () => {
      console.log(`🔍 [Processing] ${resume.name} vs "${jobRole.name}"`);

      const output = await circuitBreaker.execute({
        jobDescriptionDataUri: jobRole.contentDataUri,
        resumeDataUri: resume.dataUri,
        originalResumeName: resume.name,
      });

      if (!output) {
        throw new Error('AI returned no output');
      }

      return output;
    },
    {
      maxRetries,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      jitter: true,
      onRetry: (attempt, error, delay) => {
        console.log(`🔄 [Retry ${attempt}/${maxRetries}] ${resume.name}: ${error.message.substring(0, 50)}... (waiting ${delay}ms)`);
      },
    }
  );

  if (result.success && result.result) {
    const aiOutput = result.result;
    console.log(`✅ [Success] ${aiOutput.name || resume.name} - Score: ${aiOutput.score}/100`);

    return {
      success: true,
      candidate: {
        id: crypto.randomUUID(),
        name: aiOutput.name || resume.name.replace(/\.[^/.]+$/, "") || "Unnamed Candidate",
        email: aiOutput.email || "",
        score: aiOutput.score,
        atsScore: aiOutput.atsScore,
        keySkills: aiOutput.keySkills,
        feedback: aiOutput.feedback,
        originalResumeName: resume.name,
        resumeDataUri: resume.dataUri,
      },
    };
  }

  // Failed after all retries
  const errorInfo = classifyError(result.error || new Error('Unknown error'));
  console.error(`❌ [Failed] ${resume.name} after ${result.attempts} attempts: ${result.error?.message}`);

  return {
    success: false,
    candidate: null,
    error: {
      index: 0, // Will be set by caller
      resumeId: resume.id,
      resumeName: resume.name,
      message: result.error?.message || 'Unknown error',
      type: errorInfo.type,
      retryable: errorInfo.retryable,
      retryAttempts: result.attempts,
    },
  };
}

// ============================================
// Create Error Fallback Candidate
// ============================================

function createErrorCandidate(resume: ResumeInput, jobRoleName: string, errorMessage: string): RankedCandidate {
  return {
    id: crypto.randomUUID(),
    name: resume.name.replace(/\.[^/.]+$/, "") || "Candidate (Error)",
    email: "",
    score: 0,
    atsScore: 0,
    keySkills: 'Processing failed',
    feedback: `Could not process "${resume.name}" against "${jobRoleName}": ${errorMessage}`,
    originalResumeName: resume.name,
    resumeDataUri: resume.dataUri,
  };
}

// ============================================
// Main Bulk Screening Flow (Redesigned)
// ============================================

const performBulkScreeningFlow = ai.defineFlow(
  {
    name: 'performBulkScreeningFlow',
    inputSchema: PerformBulkScreeningInputSchema,
    outputSchema: PerformBulkScreeningOutputSchema,
  },
  async (input): Promise<PerformBulkScreeningOutput> => {
    const { jobRolesToScreen, resumesToRank } = input;
    const allScreeningResults: PerformBulkScreeningOutput = [];

    // Early exit conditions
    if (jobRolesToScreen.length === 0) {
      console.warn('[performBulkScreeningFlow] No job roles provided.');
      return [];
    }
    if (resumesToRank.length === 0) {
      console.warn('[performBulkScreeningFlow] No resumes provided.');
      return jobRolesToScreen.map(jr => ({
        jobDescriptionId: jr.id,
        jobDescriptionName: jr.name,
        jobDescriptionDataUri: jr.contentDataUri,
        candidates: [],
      }));
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🚀 [Bulk Screening] Starting robust processing`);
    console.log(`   Job Roles: ${jobRolesToScreen.length}`);
    console.log(`   Resumes: ${resumesToRank.length}`);
    console.log(`   Total Operations: ${jobRolesToScreen.length * resumesToRank.length}`);
    console.log(`${'═'.repeat(60)}\n`);

    // Process each job role
    for (const jobRole of jobRolesToScreen) {
      console.log(`\n📋 Processing Job Role: "${jobRole.name}"`);

      const context: ProcessResumeContext = {
        jobRole: {
          id: jobRole.id,
          name: jobRole.name,
          contentDataUri: jobRole.contentDataUri,
        },
        maxRetries: 3,
      };

      // Use batch processor for controlled, rate-limited processing
      const batchResult = await processInBatches(
        resumesToRank,
        async (resume, _index) => {
          const result = await processResumeWithRetry(resume, context);

          // Return candidate or create error fallback
          if (result.success && result.candidate) {
            return result.candidate;
          }

          return createErrorCandidate(
            resume,
            jobRole.name,
            result.error?.message || 'Unknown error'
          );
        },
        {
          // Free Tier Optimization:
          // Gemini Free Tier allows ~15 requests per minute.
          // Concurrency 1 + 2000ms delay + ~2000ms AI processing time = ~15 requests/min
          concurrency: 1,
          batchDelayMs: 2000,
          onProgress: (progress: BatchProgress) => {
            console.log(
              `   📊 Progress: ${progress.percentComplete}% ` +
              `(${progress.processedItems}/${progress.totalItems}) - ${progress.status}`
            );
          },
        }
      );

      // Filter out nulls and sort by score
      const candidates = batchResult.results
        .filter((c): c is RankedCandidate => c !== null)
        .sort((a, b) => b.score - a.score);

      allScreeningResults.push({
        jobDescriptionId: jobRole.id,
        jobDescriptionName: jobRole.name,
        jobDescriptionDataUri: jobRole.contentDataUri,
        candidates,
      });

      console.log(`\n✅ Completed "${jobRole.name}": ${batchResult.stats.successfulItems} succeeded, ${batchResult.stats.failedItems} failed`);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎉 [Bulk Screening] Complete!`);
    console.log(`${'═'.repeat(60)}\n`);

    return allScreeningResults;
  }
);

// ============================================
// Public API - Backward Compatible
// ============================================

/**
 * Main server action for bulk screening (backward compatible).
 * Uses the robust processing engine internally.
 */
export async function performBulkScreening(
  input: PerformBulkScreeningInput
): Promise<PerformBulkScreeningOutput> {
  try {
    // Reset circuit breaker at the start of a new screening session
    circuitBreaker.reset();

    return await performBulkScreeningFlow(input);
  } catch (flowError) {
    const message = flowError instanceof Error ? flowError.message : String(flowError);
    console.error('[performBulkScreening] Critical failure:', message);
    throw new Error(`Bulk screening process failed: ${message}`);
  }
}

// ============================================
// Enhanced API with Progress Callbacks
// ============================================

/**
 * Enhanced bulk screening with real-time progress updates.
 * Use this for better UX with progress bars and status updates.
 */
export async function performBulkScreeningWithProgress(
  input: PerformBulkScreeningInput,
  options: BulkScreeningOptions = {}
): Promise<BulkScreeningResultWithErrors> {
  const startTime = Date.now();
  const allErrors: ProcessingError[] = [];
  const { onProgress, concurrency = 1, maxRetries = 3 } = options;

  try {
    // Reset circuit breaker
    circuitBreaker.reset();

    const { jobRolesToScreen, resumesToRank } = input;
    const results: PerformBulkScreeningOutput = [];
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    // Early exit conditions
    if (jobRolesToScreen.length === 0 || resumesToRank.length === 0) {
      return {
        results: [],
        errors: [],
        stats: {
          totalResumes: resumesToRank.length,
          successfulResumes: 0,
          failedResumes: 0,
          totalTimeMs: 0,
          averageTimePerResume: 0,
        },
        hasErrors: false,
        partialResults: false,
      };
    }

    const totalOperations = jobRolesToScreen.length * resumesToRank.length;

    for (const jobRole of jobRolesToScreen) {
      const context: ProcessResumeContext = {
        jobRole: {
          id: jobRole.id,
          name: jobRole.name,
          contentDataUri: jobRole.contentDataUri,
        },
        maxRetries,
      };

      const batchResult = await processInBatches(
        resumesToRank,
        async (resume, index) => {
          const result = await processResumeWithRetry(resume, context);

          if (!result.success && result.error) {
            allErrors.push({ ...result.error, index: totalProcessed + index });
          }

          return result.success && result.candidate
            ? result.candidate
            : createErrorCandidate(resume, jobRole.name, result.error?.message || 'Error');
        },
        {
          concurrency,
          batchDelayMs: 1000,
          onProgress: (progress: BatchProgress) => {
            const overallProgress = totalProcessed + progress.processedItems;

            onProgress?.({
              current: overallProgress,
              total: totalOperations,
              succeeded: totalSucceeded + (progress.processedItems - progress.failedItems),
              failed: totalFailed + progress.failedItems,
              currentBatch: progress.currentBatch,
              totalBatches: progress.totalBatches,
              percentComplete: Math.round((overallProgress / totalOperations) * 100),
              status: `Processing: ${jobRole.name} - ${progress.status}`,
            });
          },
        }
      );

      totalProcessed += resumesToRank.length;
      totalSucceeded += batchResult.stats.successfulItems;
      totalFailed += batchResult.stats.failedItems;

      const candidates = batchResult.results
        .filter((c): c is RankedCandidate => c !== null)
        .sort((a, b) => b.score - a.score);

      results.push({
        jobDescriptionId: jobRole.id,
        jobDescriptionName: jobRole.name,
        jobDescriptionDataUri: jobRole.contentDataUri,
        candidates,
      });
    }

    const totalTimeMs = Date.now() - startTime;

    return {
      results,
      errors: allErrors,
      stats: {
        totalResumes: resumesToRank.length * jobRolesToScreen.length,
        successfulResumes: totalSucceeded,
        failedResumes: totalFailed,
        totalTimeMs,
        averageTimePerResume: totalTimeMs / Math.max(1, totalProcessed),
      },
      hasErrors: allErrors.length > 0,
      partialResults: allErrors.length > 0 && totalSucceeded > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[performBulkScreeningWithProgress] Critical failure:', message);

    return {
      results: [],
      errors: allErrors,
      stats: {
        totalResumes: input.resumesToRank.length * input.jobRolesToScreen.length,
        successfulResumes: 0,
        failedResumes: input.resumesToRank.length * input.jobRolesToScreen.length,
        totalTimeMs: Date.now() - startTime,
        averageTimePerResume: 0,
      },
      hasErrors: true,
      partialResults: false,
    };
  }
}

// Types are imported directly from @/lib/types in client code
