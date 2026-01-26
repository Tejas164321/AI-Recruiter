
"use client";

import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ProcessingProgress } from "@/lib/types";

/**
 * Props for the LoadingIndicator component.
 */
interface LoadingIndicatorProps {
  /** The stage of processing to display a relevant message. */
  stage: "roles" | "screening" | "general";
  /** Optional detailed progress information for batch processing */
  progress?: ProcessingProgress | null;
}

/**
 * A component to display a themed loading animation and message for long-running AI processes.
 * Enhanced with progress bar support for batch processing.
 */
export function LoadingIndicator({ stage, progress }: LoadingIndicatorProps) {
  let message = "Processing...";
  let subMessage = "This may take a few moments. Please be patient.";

  if (stage === "roles") {
    message = "AI is extracting job roles...";
    subMessage = "Analyzing document structure and content";
  } else if (stage === "screening") {
    if (progress) {
      message = `Analyzing resumes (${progress.succeeded + progress.failed}/${progress.total})`;
      subMessage = progress.status;
    } else {
      message = "AI is analyzing resumes and roles...";
      subMessage = "This may take a few moments for large batches";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-10 text-center">
      {/* The animated icon */}
      <Loader2 className="w-12 h-12 text-primary animate-spin" />

      {/* The loading messages */}
      <div className="space-y-2 w-full max-w-md">
        <p className="text-xl font-semibold text-primary">{message}</p>
        <p className="text-sm text-muted-foreground">{subMessage}</p>
      </div>

      {/* Progress bar for batch processing */}
      {progress && (
        <div className="w-full max-w-md space-y-3">
          <Progress value={progress.percentComplete} className="h-3" />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.percentComplete}% complete</span>
            {progress.currentBatch && progress.totalBatches && (
              <span>Batch {progress.currentBatch}/{progress.totalBatches}</span>
            )}
          </div>

          {/* Success/Failure counters */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>{progress.succeeded} succeeded</span>
            </div>
            {progress.failed > 0 && (
              <div className="flex items-center gap-1.5 text-destructive">
                <XCircle className="w-4 h-4" />
                <span>{progress.failed} failed</span>
              </div>
            )}
          </div>

          {/* Current item being processed */}
          {progress.current > 0 && progress.current < progress.total && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Processing item {progress.current} of {progress.total}...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline progress indicator for use in cards or smaller spaces.
 */
export function InlineProgress({ progress }: { progress: ProcessingProgress }) {
  return (
    <div className="flex items-center gap-3">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <div className="flex-1">
        <Progress value={progress.percentComplete} className="h-2" />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {progress.current}/{progress.total}
      </span>
    </div>
  );
}

/**
 * Processing complete banner with summary statistics.
 */
interface ProcessingResultBannerProps {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  timeMs: number;
  onRetryFailed?: () => void;
}

export function ProcessingResultBanner({
  totalProcessed,
  succeeded,
  failed,
  timeMs,
  onRetryFailed,
}: ProcessingResultBannerProps) {
  const hasErrors = failed > 0;
  const timeSeconds = (timeMs / 1000).toFixed(1);

  if (!hasErrors) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <p className="font-medium text-green-800 dark:text-green-200">
            All {totalProcessed} resumes processed successfully
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            Completed in {timeSeconds}s
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Processing completed with some errors
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
          {succeeded} of {totalProcessed} resumes processed successfully. {failed} failed.
        </p>
        {onRetryFailed && (
          <button
            onClick={onRetryFailed}
            className="text-sm text-amber-700 dark:text-amber-300 underline hover:no-underline mt-2"
          >
            Retry failed items
          </button>
        )}
      </div>
    </div>
  );
}
