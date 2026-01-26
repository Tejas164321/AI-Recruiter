/**
 * Retry Handler with Exponential Backoff
 * 
 * Provides robust retry mechanism with:
 * - Exponential backoff with jitter
 * - Configurable max retries
 * - Smart error detection (retryable vs permanent)
 * - Circuit breaker pattern
 */

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Initial delay in ms before first retry (default: 1000) */
    initialDelayMs: number;
    /** Maximum delay between retries in ms (default: 30000) */
    maxDelayMs: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier: number;
    /** Add random jitter to prevent thundering herd (default: true) */
    jitter: boolean;
    /** Custom function to determine if error is retryable */
    isRetryable?: (error: Error) => boolean;
    /** Callback for each retry attempt */
    onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalTimeMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
};

/**
 * Common retryable error patterns for API calls
 */
const RETRYABLE_ERROR_PATTERNS = [
    /rate.?limit/i,
    /too.?many.?requests/i,
    /429/,
    /503/,
    /502/,
    /504/,
    /timeout/i,
    /ETIMEDOUT/,
    /ECONNRESET/,
    /ECONNREFUSED/,
    /network/i,
    /temporarily.?unavailable/i,
    /resource.?exhausted/i,
    /quota.?exceeded/i,
    /overloaded/i,
];

/**
 * Permanent error patterns that should NOT be retried
 */
const PERMANENT_ERROR_PATTERNS = [
    /invalid.?api.?key/i,
    /authentication/i,
    /unauthorized/i,
    /forbidden/i,
    /not.?found/i,
    /invalid.?argument/i,
    /malformed/i,
    /400/,
    /401/,
    /403/,
    /404/,
];

/**
 * Default function to determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    const combined = `${name}: ${message}`;

    // Check for permanent errors first
    for (const pattern of PERMANENT_ERROR_PATTERNS) {
        if (pattern.test(combined)) {
            return false;
        }
    }

    // Check for retryable errors
    for (const pattern of RETRYABLE_ERROR_PATTERNS) {
        if (pattern.test(combined)) {
            return true;
        }
    }

    // Default: retry for unknown errors (better to retry than fail)
    return true;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
    attempt: number,
    options: RetryOptions
): number {
    let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
    delay = Math.min(delay, options.maxDelayMs);

    if (options.jitter) {
        // Add random jitter between 0% and 25% of the delay
        const jitterAmount = delay * 0.25 * Math.random();
        delay += jitterAmount;
    }

    return Math.floor(delay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result with success status, result/error, and metadata
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
    const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
    const isRetryable = opts.isRetryable ?? isRetryableError;

    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        attempts = attempt + 1;

        try {
            const result = await fn();
            return {
                success: true,
                result,
                attempts,
                totalTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if we should retry
            const canRetry = attempt < opts.maxRetries && isRetryable(lastError);

            if (!canRetry) {
                break;
            }

            // Calculate and apply delay
            const delayMs = calculateDelay(attempt, opts);

            // Notify about retry
            opts.onRetry?.(attempt + 1, lastError, delayMs);

            console.log(
                `🔄 [Retry ${attempt + 1}/${opts.maxRetries}] ` +
                `Retrying in ${delayMs}ms after error: ${lastError.message.substring(0, 100)}`
            );

            await sleep(delayMs);
        }
    }

    return {
        success: false,
        error: lastError,
        attempts,
        totalTimeMs: Date.now() - startTime,
    };
}

/**
 * Circuit Breaker State
 */
export interface CircuitBreakerState {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
    /** Number of consecutive failures to open the circuit (default: 5) */
    failureThreshold: number;
    /** Time in ms to wait before attempting to close circuit (default: 60000) */
    resetTimeoutMs: number;
    /** Callback when circuit opens */
    onOpen?: () => void;
    /** Callback when circuit closes */
    onClose?: () => void;
}

/**
 * Creates a circuit breaker wrapper around an async function.
 * When too many failures occur, the circuit "opens" and fails fast.
 */
export function createCircuitBreaker<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    options: Partial<CircuitBreakerOptions> = {}
): {
    execute: (...args: A) => Promise<R>;
    getState: () => CircuitBreakerState;
    reset: () => void;
} {
    const opts: CircuitBreakerOptions = {
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        ...options,
    };

    const state: CircuitBreakerState = {
        failures: 0,
        lastFailureTime: 0,
        isOpen: false,
    };

    const checkCircuit = () => {
        if (!state.isOpen) return;

        // Check if reset timeout has passed
        const timeSinceFailure = Date.now() - state.lastFailureTime;
        if (timeSinceFailure >= opts.resetTimeoutMs) {
            console.log('🔌 [Circuit Breaker] Attempting to close circuit (half-open state)');
            state.isOpen = false;
            state.failures = 0;
        }
    };

    const recordSuccess = () => {
        if (state.failures > 0) {
            console.log('✅ [Circuit Breaker] Success recorded, resetting failure count');
        }
        state.failures = 0;
        if (state.isOpen) {
            state.isOpen = false;
            opts.onClose?.();
            console.log('🔌 [Circuit Breaker] Circuit closed');
        }
    };

    const recordFailure = () => {
        state.failures++;
        state.lastFailureTime = Date.now();

        if (state.failures >= opts.failureThreshold && !state.isOpen) {
            state.isOpen = true;
            opts.onOpen?.();
            console.error(
                `🚨 [Circuit Breaker] Circuit OPEN after ${state.failures} failures. ` +
                `Will retry after ${opts.resetTimeoutMs / 1000}s`
            );
        }
    };

    return {
        execute: async (...args: A): Promise<R> => {
            checkCircuit();

            if (state.isOpen) {
                throw new Error(
                    `Circuit breaker is OPEN. Too many failures (${state.failures}). ` +
                    `Will reset in ${Math.ceil((opts.resetTimeoutMs - (Date.now() - state.lastFailureTime)) / 1000)}s`
                );
            }

            try {
                const result = await fn(...args);
                recordSuccess();
                return result;
            } catch (error) {
                recordFailure();
                throw error;
            }
        },
        getState: () => ({ ...state }),
        reset: () => {
            state.failures = 0;
            state.lastFailureTime = 0;
            state.isOpen = false;
        },
    };
}
