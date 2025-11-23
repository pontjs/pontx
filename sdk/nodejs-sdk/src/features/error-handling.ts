/**
 * Error Handling Module - Unified error handling for SDK
 *
 * This module provides:
 * - PontxError class with code, context, and cause
 * - Error wrapping functions for different error types
 * - Timeout handling with AbortController
 * - Clear error messages and debugging information
 */

import { ZodError } from 'zod';
import type { RequestFn } from '../types';

/**
 * Error code constants
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MOCK_NOT_FOUND: 'MOCK_NOT_FOUND',
  REQUEST_FAILED: 'REQUEST_FAILED',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Custom error class for Pontx SDK
 *
 * Provides enhanced error information including:
 * - Error code for programmatic handling
 * - Context object with request details
 * - Original error in cause field
 * - Clean stack trace using Error.captureStackTrace
 */
export class PontxError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: ErrorCode;

  /**
   * Additional context about the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Original error that caused this error
   */
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = 'PontxError';
    this.code = code;
    this.context = context;
    this.cause = cause;

    // Use Node.js Error.captureStackTrace for cleaner stack traces
    // This removes the PontxError constructor from the stack
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PontxError);
    }
  }
}

/**
 * Error context for wrapping errors
 */
interface ErrorContext {
  apiKey: string;
  url: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Check if error is a ZodError
 */
function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Check if error is an AbortError (timeout)
 */
function isAbortError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message.includes('aborted'))
  );
}

/**
 * Check if error has a status code
 */
function hasStatusCode(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    typeof (error as any).status === 'number'
  );
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: unknown): error is Error & { code?: string } {
  if (!(error instanceof Error)) return false;

  const code = (error as any).code;
  const networkCodes = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENETUNREACH',
  ];

  return typeof code === 'string' && networkCodes.includes(code);
}

/**
 * Wrap any error into a PontxError with appropriate code and context
 *
 * @param error - Original error to wrap
 * @param context - Context information (apiKey, url, params)
 * @returns Wrapped PontxError with code and context
 */
export function wrapError(
  error: unknown,
  context: ErrorContext
): PontxError {
  // Handle ZodError (validation error)
  if (isZodError(error)) {
    const message = `Validation failed for ${context.apiKey}: ${error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')}`;

    return new PontxError(
      message,
      ERROR_CODES.VALIDATION_ERROR,
      context,
      error
    );
  }

  // Handle AbortError (timeout)
  if (isAbortError(error)) {
    const message = `Request timeout for ${context.apiKey}`;

    return new PontxError(
      message,
      ERROR_CODES.TIMEOUT_ERROR,
      context,
      error
    );
  }

  // Handle HTTP errors with status codes
  if (hasStatusCode(error)) {
    const status = error.status;

    // Client errors (4xx)
    if (status >= 400 && status < 500) {
      const message = `Client error ${status} for ${context.apiKey}: ${error.message}`;

      return new PontxError(
        message,
        ERROR_CODES.CLIENT_ERROR,
        { ...context, status },
        error
      );
    }

    // Server errors (5xx)
    if (status >= 500) {
      const message = `Server error ${status} for ${context.apiKey}: ${error.message}`;

      return new PontxError(
        message,
        ERROR_CODES.SERVER_ERROR,
        { ...context, status },
        error
      );
    }
  }

  // Handle network errors
  if (isNetworkError(error)) {
    const message = `Request failed for ${context.apiKey}: ${error.message}`;

    return new PontxError(
      message,
      ERROR_CODES.REQUEST_FAILED,
      { ...context, code: error.code },
      error
    );
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = `Request failed for ${context.apiKey}: ${error.message}`;

    return new PontxError(
      message,
      ERROR_CODES.REQUEST_FAILED,
      context,
      error
    );
  }

  // Handle string errors
  if (typeof error === 'string') {
    const message = `Request failed for ${context.apiKey}: ${error}`;

    return new PontxError(
      message,
      ERROR_CODES.REQUEST_FAILED,
      context
    );
  }

  // Handle unknown error types
  const message = `Request failed for ${context.apiKey}: Unknown error`;

  return new PontxError(
    message,
    ERROR_CODES.REQUEST_FAILED,
    { ...context, originalError: error }
  );
}

/**
 * Wrap request function with timeout support
 *
 * Uses AbortController to cancel requests that exceed the timeout duration.
 *
 * @param requestFn - Original request function to wrap
 * @param defaultTimeout - Default timeout in milliseconds (optional)
 * @returns Wrapped request function with timeout support
 */
export function withTimeout(
  requestFn: RequestFn,
  defaultTimeout?: number
): RequestFn {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    // Check if timeout is specified
    const timeout = (init as any)?.timeout || defaultTimeout;

    // If no timeout, execute request directly
    if (!timeout) {
      return requestFn(url, init);
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Add signal to init options
      const initWithSignal: RequestInit = {
        ...init,
        signal: controller.signal,
      };

      // Execute request with signal
      const response = await requestFn(url, initWithSignal);

      // Clear timeout on success
      clearTimeout(timeoutId);

      return response;
    } catch (error: any) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      // Check if error is due to abort (timeout)
      if (error.name === 'AbortError' || controller.signal.aborted) {
        const timeoutError = new Error(
          `Request timeout after ${timeout}ms`
        );
        timeoutError.name = 'AbortError';
        throw timeoutError;
      }

      // Re-throw other errors
      throw error;
    }
  };
}
