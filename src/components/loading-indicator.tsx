
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
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="w-full max-w-3xl mx-auto py-8">
      {/* Active Status Header */}
      <div className="flex flex-col items-center justify-center space-y-6 mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative bg-background p-4 rounded-full shadow-lg border border-border">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-2 text-center max-w-lg">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">{message}</h3>
          <p className="text-sm text-muted-foreground">{subMessage}</p>
        </div>

        {/* Real Progress Bar */}
        {progress && (
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{progress.percentComplete}% Complete</span>
              <span>{progress.succeeded} Success • {progress.failed} Failed</span>
            </div>
            <Progress value={progress.percentComplete} className="h-2" />
          </div>
        )}
      </div>

      {/* Skeleton Mockup of Candidate List (Suspense State) */}
      <div className="space-y-4 opacity-60">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg bg-card/50">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        ))}
      </div>
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
