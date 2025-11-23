/**
 * Retry Module - Automatic retry with exponential/linear backoff
 *
 * This module provides retry functionality for failed requests with
 * configurable backoff strategies and retry conditions.
 *
 * Features:
 * - Configurable max retry attempts
 * - Exponential and linear backoff strategies
 * - Smart retry logic (5xx and network errors only)
 * - Custom retryable error configuration
 * - Detailed error information on exhaustion
 */

import type { FetchFunction } from '../types';

/**
 * Configuration for retry feature
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Backoff strategy for retry delays
   * - 'exponential': 1s, 2s, 4s, 8s, ...
   * - 'linear': 1s, 2s, 3s, 4s, ...
   * @default 'exponential'
   */
  backoff?: 'exponential' | 'linear';

  /**
   * Custom retryable error codes or HTTP status codes
   * If provided, only these errors will be retried
   * If not provided, defaults to 5xx and network errors
   */
  retryableErrors?: Array<string | number>;
}

/**
 * Error codes for retry-related errors
 */
export const RETRY_ERROR_CODES = {
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
} as const;

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'retryableErrors'>> = {
  maxAttempts: 3,
  backoff: 'exponential',
};

/**
 * Default retryable network error codes
 */
const DEFAULT_NETWORK_ERRORS = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
];

/**
 * Maximum delay cap in milliseconds (10 seconds)
 */
const MAX_DELAY_MS = 10000;

/**
 * Base delay in milliseconds (1 second)
 */
const BASE_DELAY_MS = 1000;

/**
 * Calculate delay for retry attempt using specified backoff strategy
 *
 * @param attempt - Current attempt number (1-indexed)
 * @param strategy - Backoff strategy ('exponential' or 'linear')
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  strategy: 'exponential' | 'linear'
): number {
  let delay: number;

  if (strategy === 'exponential') {
    // Exponential: 1s, 2s, 4s, 8s, 16s...
    // Formula: BASE_DELAY * 2^(attempt - 1)
    delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  } else {
    // Linear: 1s, 2s, 3s, 4s, 5s...
    // Formula: BASE_DELAY * attempt
    delay = BASE_DELAY_MS * attempt;
  }

  // Cap at maximum delay
  return Math.min(delay, MAX_DELAY_MS);
}

/**
 * Create a delay promise
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 *
 * Default retryable conditions:
 * - 5xx status codes (server errors)
 * - Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
 * - Errors without status code (treated as network errors)
 *
 * Non-retryable conditions:
 * - 4xx status codes (client errors - bad request, auth, etc.)
 *
 * @param error - Error to check
 * @param customRetryableErrors - Custom retryable error codes/statuses
 * @returns true if error is retryable
 */
function isRetryableError(
  error: any,
  customRetryableErrors?: Array<string | number>
): boolean {
  // If custom retryable errors are specified, check against them first
  if (customRetryableErrors && customRetryableErrors.length > 0) {
    // Check if error code matches
    if (error.code && customRetryableErrors.includes(error.code)) {
      return true;
    }
    // Check if status code matches
    if (error.status && customRetryableErrors.includes(error.status)) {
      return true;
    }
    // If custom list exists but no match, not retryable
    return false;
  }

  // Check for HTTP status codes
  if (error.status !== undefined) {
    // 5xx errors are retryable (server errors)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    // 4xx errors are NOT retryable (client errors)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }

  // Check for network error codes
  if (error.code && DEFAULT_NETWORK_ERRORS.includes(error.code)) {
    return true;
  }

  // If no status code, treat as network error (retryable)
  // This handles generic network failures
  return true;
}

/**
 * Wrapper function that adds retry functionality to a request function
 *
 * This decorator automatically retries failed requests based on the
 * configured strategy and retry conditions.
 *
 * @param requestFn - Original request function to wrap
 * @param config - Retry configuration
 * @returns Wrapped request function with retry capability
 *
 * @example
 * ```ts
 * const retryFetch = withRetry(fetch, {
 *   maxAttempts: 3,
 *   backoff: 'exponential',
 * });
 * ```
 */
export function withRetry(
  requestFn: FetchFunction,
  config?: RetryConfig
): FetchFunction {
  // If no config provided, return original function
  if (!config) {
    return requestFn;
  }

  // Merge with defaults
  const {
    maxAttempts = DEFAULT_CONFIG.maxAttempts,
    backoff = DEFAULT_CONFIG.backoff,
    retryableErrors,
  } = config;

  // Return wrapped function that maintains the same signature
  return async (url: string, init?: RequestInit): Promise<Response> => {
    let lastError: Error | undefined;
    let attempt = 0;

    // Retry loop
    while (attempt < maxAttempts) {
      attempt++;

      try {
        // Attempt the request
        const response = await requestFn(url, init);
        return response; // Success - return immediately
      } catch (error: any) {
        lastError = error;

        // Check if this is the last attempt
        const isLastAttempt = attempt >= maxAttempts;

        // Check if error is retryable
        const shouldRetry = isRetryableError(error, retryableErrors);

        // If not retryable or last attempt, throw immediately
        if (!shouldRetry || isLastAttempt) {
          // If this was the last attempt, wrap in RETRY_EXHAUSTED error
          if (isLastAttempt && shouldRetry) {
            const exhaustedError = new Error(
              `Request failed after ${maxAttempts} attempts. Last error: ${error.message}`
            );
            exhaustedError.name = RETRY_ERROR_CODES.RETRY_EXHAUSTED;
            (exhaustedError as any).code = RETRY_ERROR_CODES.RETRY_EXHAUSTED;
            (exhaustedError as any).attempts = maxAttempts;
            (exhaustedError as any).lastError = error;
            throw exhaustedError;
          }

          // Non-retryable error - throw immediately
          throw error;
        }

        // Calculate delay for next retry
        const delayMs = calculateDelay(attempt, backoff);

        // Wait before retrying
        await delay(delayMs);

        // Continue to next iteration (retry)
      }
    }

    // This should never be reached due to the loop logic above,
    // but TypeScript needs it for exhaustiveness
    throw lastError || new Error('Retry exhausted');
  };
}
