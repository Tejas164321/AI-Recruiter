/**
 * Request Timeout Wrapper
 * 
 * Wraps async operations with configurable timeout to prevent hanging requests.
 */

/**
 * Wraps a promise with a timeout. Rejects if the operation takes too long.
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Operation timed out'
): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${errorMessage} (after ${timeoutMs}ms)`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
}

/**
 * Health check result for API availability
 */
export interface HealthCheckResult {
    healthy: boolean;
    latencyMs: number;
    error?: string;
}

/**
 * Performs a lightweight health check to verify API is responding
 */
export async function checkApiHealth(
    healthCheckFn: () => Promise<unknown>,
    timeoutMs = 5000
): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
        await withTimeout(healthCheckFn(), timeoutMs, 'API health check timed out');
        return {
            healthy: true,
            latencyMs: Date.now() - startTime,
        };
    } catch (error) {
        return {
            healthy: false,
            latencyMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Graceful degradation modes
 */
export type DegradationMode = 'normal' | 'reduced' | 'minimal';

/**
 * Configuration for graceful degradation based on error rate
 */
export interface DegradationConfig {
    /** Error rate threshold to switch to reduced mode (0-1) */
    reducedModeThreshold: number;
    /** Error rate threshold to switch to minimal mode (0-1) */
    minimalModeThreshold: number;
    /** Concurrency in normal mode */
    normalConcurrency: number;
    /** Concurrency in reduced mode */
    reducedConcurrency: number;
    /** Concurrency in minimal mode */
    minimalConcurrency: number;
}

const DEFAULT_DEGRADATION_CONFIG: DegradationConfig = {
    reducedModeThreshold: 0.15, // 15% error rate
    minimalModeThreshold: 0.30, // 30% error rate
    normalConcurrency: 3,
    reducedConcurrency: 2,
    minimalConcurrency: 1,
};

/**
 * Determines degradation mode based on current error rate
 */
export function getDegradationMode(
    errorRate: number,
    config = DEFAULT_DEGRADATION_CONFIG
): { mode: DegradationMode; concurrency: number } {
    if (errorRate >= config.minimalModeThreshold) {
        return { mode: 'minimal', concurrency: config.minimalConcurrency };
    }
    if (errorRate >= config.reducedModeThreshold) {
        return { mode: 'reduced', concurrency: config.reducedConcurrency };
    }
    return { mode: 'normal', concurrency: config.normalConcurrency };
}

/**
 * Memory usage check (for Node.js environment)
 */
export function checkMemoryUsage(): {
    usedMB: number;
    totalMB: number;
    percentUsed: number;
    warning: boolean;
} | null {
    if (typeof process === 'undefined' || !process.memoryUsage) {
        return null;
    }

    const mem = process.memoryUsage();
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const percentUsed = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    return {
        usedMB,
        totalMB,
        percentUsed,
        warning: percentUsed > 85,
    };
}

/**
 * Cleanup helper for releasing memory between batches
 */
export function suggestGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
        try {
            global.gc();
        } catch {
            // GC not exposed
        }
    }
}
