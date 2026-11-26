/**
 * AI Feedback Loading Component
 * 
 * Modern, animated loading state for AI feedback that's still being generated.
 * Shows during progressive enhancement Phase 2.
 */

import React from 'react';

interface AIFeedbackLoadingProps {
    candidateName: string;
    score: number;
    variant?: 'compact' | 'full';
}

export function AIFeedbackLoading({ candidateName, score, variant = 'full' }: AIFeedbackLoadingProps) {
    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                    </div>
                    <span className="text-xs font-medium text-primary">AI Thinking...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-6 border border-dashed border-primary/30 rounded-lg bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-semibold text-lg">AI Analysis in Progress</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Generating detailed insights for <span className="font-medium text-foreground">{candidateName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                    <div className="relative flex h-3 w-3 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </div>
                    <span className="text-xs font-medium text-primary">AI Thinking</span>
                </div>
            </div>

            {/* Progress Animation */}
            <div className="space-y-3">
                {/* Analyzing Skills */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Analyzing skills match</span>
                            <span className="text-xs text-muted-foreground">Step 1/4</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '75%' }} />
                        </div>
                    </div>
                </div>

                {/* Experience Gap Analysis */}
                <div className="flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Finding gaps & improvements</span>
                            <span className="text-xs text-muted-foreground">Queued</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full" />
                    </div>
                </div>

                {/* Score Impact */}
                <div className="flex items-center gap-3 opacity-40">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Calculating score impact</span>
                            <span className="text-xs text-muted-foreground">Queued</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full" />
                    </div>
                </div>

                {/* Generating Summary */}
                <div className="flex items-center gap-3 opacity-30">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Generating final summary</span>
                            <span className="text-xs text-muted-foreground">Queued</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full" />
                    </div>
                </div>
            </div>

            {/* Info Message */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm space-y-1">
                    <p className="font-medium">AI is analyzing this candidate</p>
                    <p className="text-muted-foreground text-xs">
                        Processing top candidates first (Score: {score}/100). Detailed feedback will appear automatically when ready.
                    </p>
                </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Estimated time: 8-15 seconds</span>
            </div>
        </div>
    );
}

/**
 * Skeleton loader for feedback (simpler alternative)
 */
export function FeedbackSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="space-y-2 mt-4">
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
            </div>
        </div>
    );
}
