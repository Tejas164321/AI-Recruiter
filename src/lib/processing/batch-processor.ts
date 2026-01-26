/**
 * Batch Processor for Large Datasets
 * 
 * Provides intelligent batch processing with:
 * - Automatic chunking based on dataset size
 * - Sequential batch execution
 * - Memory-efficient streaming
 * - Progress tracking and callbacks
 */

import { executeWithRateLimit, type RateLimiterStats } from './rate-limiter';

export interface BatchProcessorOptions {
    /** Items per batch (default: auto-calculated based on total) */
    batchSize?: number;
    /** Concurrency within each batch (default: 3) */
    concurrency: number;
    /** Delay between batches in ms (default: 1000) */
    batchDelayMs: number;
    /** Progress callback */
    onProgress?: (progress: BatchProgress) => void;
    /** Batch completion callback */
    onBatchComplete?: (batchIndex: number, batchResult: BatchResult<unknown>) => void;
}

export interface BatchProgress {
    /** Current batch number (1-indexed) */
    currentBatch: number;
    /** Total number of batches */
    totalBatches: number;
    /** Total items processed so far */
    processedItems: number;
    /** Total items to process */
    totalItems: number;
    /** Items failed so far */
    failedItems: number;
    /** Percentage complete (0-100) */
    percentComplete: number;
    /** Current status message */
    status: string;
}

export interface BatchResult<T> {
    results: (T | null)[];
    errors: Array<{ index: number; error: Error }>;
}

export interface BatchProcessorResult<T> {
    /** All results in original order */
    results: (T | null)[];
    /** All errors with original indices */
    errors: Array<{ index: number; error: Error }>;
    /** Final statistics */
    stats: {
        totalItems: number;
        successfulItems: number;
        failedItems: number;
        totalBatches: number;
        totalTimeMs: number;
    };
}

const DEFAULT_OPTIONS: BatchProcessorOptions = {
    concurrency: 3,
    batchDelayMs: 1000,
};

/**
 * Calculate optimal batch size based on total items
 */
function calculateBatchSize(totalItems: number): number {
    if (totalItems <= 5) return totalItems; // No batching for tiny datasets
    if (totalItems <= 20) return 10;
    if (totalItems <= 50) return 15;
    return 15; // Cap at 15 for larger datasets
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Split array into chunks
 */
function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Process a large dataset in batches with rate limiting within each batch.
 * 
 * @param items - All items to process
 * @param processor - Async function to process each item
 * @param options - Batch processor configuration
 * @returns All results with errors tracked
 */
export async function processInBatches<T, R>(
    items: T[],
    processor: (item: T, globalIndex: number) => Promise<R>,
    options: Partial<BatchProcessorOptions> = {}
): Promise<BatchProcessorResult<R>> {
    const opts: BatchProcessorOptions = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // Handle empty input
    if (items.length === 0) {
        return {
            results: [],
            errors: [],
            stats: {
                totalItems: 0,
                successfulItems: 0,
                failedItems: 0,
                totalBatches: 0,
                totalTimeMs: 0,
            },
        };
    }

    // Calculate batch size
    const batchSize = opts.batchSize ?? calculateBatchSize(items.length);
    const batches = chunk(items, batchSize);
    const totalBatches = batches.length;

    console.log(`📦 [Batch Processor] Processing ${items.length} items in ${totalBatches} batch(es) of ~${batchSize}`);

    // Initialize results array
    const allResults: (R | null)[] = new Array(items.length).fill(null);
    const allErrors: Array<{ index: number; error: Error }> = [];

    let totalProcessed = 0;
    let totalFailed = 0;

    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchStartIndex = batchIndex * batchSize;

        console.log(`\n🔄 [Batch ${batchIndex + 1}/${totalBatches}] Processing ${batch.length} items...`);

        // Notify progress at batch start
        opts.onProgress?.({
            currentBatch: batchIndex + 1,
            totalBatches,
            processedItems: totalProcessed,
            totalItems: items.length,
            failedItems: totalFailed,
            percentComplete: Math.round((totalProcessed / items.length) * 100),
            status: `Processing batch ${batchIndex + 1} of ${totalBatches}...`,
        });

        // Process batch with rate limiting
        const batchResult = await executeWithRateLimit(
            batch,
            async (item, localIndex) => {
                const globalIndex = batchStartIndex + localIndex;
                return processor(item, globalIndex);
            },
            {
                concurrency: opts.concurrency,
                minDelayMs: 250, // Slightly higher delay for API safety
                onProgress: (stats: RateLimiterStats) => {
                    const currentProcessed = totalProcessed + stats.completed + stats.failed;
                    opts.onProgress?.({
                        currentBatch: batchIndex + 1,
                        totalBatches,
                        processedItems: currentProcessed,
                        totalItems: items.length,
                        failedItems: totalFailed + stats.failed,
                        percentComplete: Math.round((currentProcessed / items.length) * 100),
                        status: `Batch ${batchIndex + 1}: ${stats.completed + stats.failed}/${batch.length} items`,
                    });
                },
            }
        );

        // Merge batch results into overall results
        batchResult.results.forEach((result, localIndex) => {
            const globalIndex = batchStartIndex + localIndex;
            allResults[globalIndex] = result;
        });

        // Merge batch errors with global indices
        batchResult.errors.forEach(({ index: localIndex, error }) => {
            const globalIndex = batchStartIndex + localIndex;
            allErrors.push({ index: globalIndex, error });
        });

        // Update totals
        totalProcessed += batchResult.stats.completed + batchResult.stats.failed;
        totalFailed += batchResult.stats.failed;

        console.log(
            `✅ [Batch ${batchIndex + 1}/${totalBatches}] Complete: ` +
            `${batchResult.stats.completed} succeeded, ${batchResult.stats.failed} failed`
        );

        // Notify batch completion
        opts.onBatchComplete?.(batchIndex, {
            results: batchResult.results,
            errors: batchResult.errors,
        });

        // Delay between batches (except for last batch)
        if (batchIndex < batches.length - 1) {
            console.log(`⏳ Waiting ${opts.batchDelayMs}ms before next batch...`);
            await sleep(opts.batchDelayMs);
        }
    }

    const totalTimeMs = Date.now() - startTime;
    const successfulItems = items.length - totalFailed;

    console.log(`\n🎉 [Batch Processor] Complete!`);
    console.log(`   Total: ${items.length} | Success: ${successfulItems} | Failed: ${totalFailed}`);
    console.log(`   Time: ${(totalTimeMs / 1000).toFixed(1)}s`);

    return {
        results: allResults,
        errors: allErrors,
        stats: {
            totalItems: items.length,
            successfulItems,
            failedItems: totalFailed,
            totalBatches,
            totalTimeMs,
        },
    };
}

/**
 * Adaptive batch processor that adjusts settings based on error rates.
 * If too many errors occur, it slows down; if successful, it can speed up.
 */
export async function processAdaptively<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: Partial<BatchProcessorOptions & { adaptiveThreshold: number }> = {}
): Promise<BatchProcessorResult<R>> {
    const adaptiveThreshold = options.adaptiveThreshold ?? 0.2; // 20% error rate triggers adaptation

    let currentConcurrency = options.concurrency ?? 3;
    let currentBatchSize = options.batchSize ?? calculateBatchSize(items.length);

    const results: (R | null)[] = new Array(items.length).fill(null);
    const errors: Array<{ index: number; error: Error }> = [];
    const batches = chunk(items, currentBatchSize);
    const startTime = Date.now();

    console.log(`🧠 [Adaptive Processor] Starting with concurrency=${currentConcurrency}, batchSize=${currentBatchSize}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchStartIndex = batchIndex * currentBatchSize;

        const batchResult = await executeWithRateLimit(
            batch,
            async (item, localIndex) => processor(item, batchStartIndex + localIndex),
            { concurrency: currentConcurrency, minDelayMs: 300 }
        );

        // Merge results
        batchResult.results.forEach((result, i) => {
            results[batchStartIndex + i] = result;
        });

        batchResult.errors.forEach(({ index, error }) => {
            errors.push({ index: batchStartIndex + index, error });
        });

        // Adapt based on error rate
        const errorRate = batchResult.stats.failed / batch.length;

        if (errorRate > adaptiveThreshold) {
            // Too many errors - slow down
            const newConcurrency = Math.max(1, currentConcurrency - 1);
            if (newConcurrency !== currentConcurrency) {
                console.log(`⚠️ [Adaptive] High error rate (${(errorRate * 100).toFixed(0)}%). Reducing concurrency: ${currentConcurrency} → ${newConcurrency}`);
                currentConcurrency = newConcurrency;
            }
            // Add extra delay
            await sleep(2000);
        } else if (errorRate === 0 && currentConcurrency < (options.concurrency ?? 3)) {
            // No errors - can speed up (but not beyond original setting)
            currentConcurrency++;
            console.log(`✨ [Adaptive] Perfect batch! Increasing concurrency to ${currentConcurrency}`);
        }

        options.onProgress?.({
            currentBatch: batchIndex + 1,
            totalBatches: batches.length,
            processedItems: batchStartIndex + batch.length,
            totalItems: items.length,
            failedItems: errors.length,
            percentComplete: Math.round(((batchStartIndex + batch.length) / items.length) * 100),
            status: `Batch ${batchIndex + 1}/${batches.length} complete`,
        });

        if (batchIndex < batches.length - 1) {
            await sleep(options.batchDelayMs ?? 1000);
        }
    }

    return {
        results,
        errors,
        stats: {
            totalItems: items.length,
            successfulItems: items.length - errors.length,
            failedItems: errors.length,
            totalBatches: batches.length,
            totalTimeMs: Date.now() - startTime,
        },
    };
}
