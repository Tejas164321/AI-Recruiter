/**
 * Rate Limiter with Concurrency Control
 * 
 * Provides controlled execution of async tasks with:
 * - Configurable concurrency limit
 * - Request queue with FIFO processing
 * - Delay between requests to prevent API throttling
 * - Statistics tracking
 */

export interface RateLimiterOptions {
    /** Maximum concurrent requests (default: 3) */
    concurrency: number;
    /** Minimum delay between starting new requests in ms (default: 200) */
    minDelayMs: number;
    /** Optional callback for progress updates */
    onProgress?: (stats: RateLimiterStats) => void;
}

export interface RateLimiterStats {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    inProgress: number;
}

export interface RateLimiterResult<T> {
    results: T[];
    stats: RateLimiterStats;
    errors: Array<{ index: number; error: Error }>;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
    concurrency: 3,
    minDelayMs: 200,
};

/**
 * Executes an array of async tasks with rate limiting and concurrency control.
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Rate limiter configuration
 * @returns Results array in same order as input, with errors tracked separately
 */
export async function executeWithRateLimit<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: Partial<RateLimiterOptions> = {}
): Promise<RateLimiterResult<R | null>> {
    const opts: RateLimiterOptions = { ...DEFAULT_OPTIONS, ...options };

    const stats: RateLimiterStats = {
        total: items.length,
        completed: 0,
        failed: 0,
        pending: items.length,
        inProgress: 0,
    };

    const results: (R | null)[] = new Array(items.length).fill(null);
    const errors: Array<{ index: number; error: Error }> = [];

    // Queue of item indices to process
    const queue: number[] = items.map((_, i) => i);

    // Track active promises
    const activePromises: Set<Promise<void>> = new Set();

    let lastRequestTime = 0;

    const notifyProgress = () => {
        opts.onProgress?.({ ...stats });
    };

    const processNext = async (): Promise<void> => {
        if (queue.length === 0) return;

        const index = queue.shift()!;
        const item = items[index];

        stats.pending--;
        stats.inProgress++;
        notifyProgress();

        // Enforce minimum delay between requests
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < opts.minDelayMs) {
            await sleep(opts.minDelayMs - timeSinceLastRequest);
        }
        lastRequestTime = Date.now();

        try {
            const result = await processor(item, index);
            results[index] = result;
            stats.completed++;
        } catch (error) {
            errors.push({
                index,
                error: error instanceof Error ? error : new Error(String(error))
            });
            stats.failed++;
        } finally {
            stats.inProgress--;
            notifyProgress();
        }
    };

    // Main processing loop
    while (queue.length > 0 || activePromises.size > 0) {
        // Start new tasks up to concurrency limit
        while (queue.length > 0 && activePromises.size < opts.concurrency) {
            const promise = processNext();
            activePromises.add(promise);
            promise.finally(() => activePromises.delete(promise));
        }

        // Wait for at least one task to complete before checking again
        if (activePromises.size > 0) {
            await Promise.race(activePromises);
        }
    }

    return { results, stats, errors };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a rate-limited version of an async function.
 * Useful for wrapping API calls that should be throttled.
 */
export function createRateLimitedFunction<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    requestsPerSecond: number = 5
): (...args: A) => Promise<R> {
    const minInterval = 1000 / requestsPerSecond;
    let lastCallTime = 0;
    const queue: Array<{
        args: A;
        resolve: (value: R) => void;
        reject: (error: Error) => void;
    }> = [];
    let processing = false;

    const processQueue = async () => {
        if (processing || queue.length === 0) return;
        processing = true;

        while (queue.length > 0) {
            const now = Date.now();
            const timeSinceLastCall = now - lastCallTime;

            if (timeSinceLastCall < minInterval) {
                await sleep(minInterval - timeSinceLastCall);
            }

            const { args, resolve, reject } = queue.shift()!;
            lastCallTime = Date.now();

            try {
                const result = await fn(...args);
                resolve(result);
            } catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        }

        processing = false;
    };

    return (...args: A): Promise<R> => {
        return new Promise((resolve, reject) => {
            queue.push({ args, resolve, reject });
            processQueue();
        });
    };
}
