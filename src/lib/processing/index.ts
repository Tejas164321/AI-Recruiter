/**
 * Processing utilities for robust bulk operations
 */

export {
    executeWithRateLimit,
    createRateLimitedFunction,
    type RateLimiterOptions,
    type RateLimiterStats,
    type RateLimiterResult,
} from './rate-limiter';

export {
    withRetry,
    isRetryableError,
    createCircuitBreaker,
    type RetryOptions,
    type RetryResult,
    type CircuitBreakerState,
    type CircuitBreakerOptions,
} from './retry-handler';

export {
    processInBatches,
    processAdaptively,
    type BatchProcessorOptions,
    type BatchProgress,
    type BatchResult,
    type BatchProcessorResult,
} from './batch-processor';

export {
    withTimeout,
    checkApiHealth,
    getDegradationMode,
    checkMemoryUsage,
    suggestGarbageCollection,
    type HealthCheckResult,
    type DegradationMode,
    type DegradationConfig,
} from './resilience';
