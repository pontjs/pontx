/**
 * TypeScript type definitions for flat client
 *
 * This module provides type-safe interfaces for the flat client API pattern.
 * Flat clients are designed for API specifications without namespace/controller hierarchy,
 * where all APIs are accessed directly on the root client object.
 *
 * Requirements covered:
 * - 1.5: Type parameter support for flat record types
 * - 2.1: FlatClient type definition
 * - 5.1-5.6: Full TypeScript type inference and compile-time validation
 */

import type {
  PontxSpecMeta,
  PontxAPI,
  ValidationConfig,
  MockConfig,
  RetryConfig,
  LoggerConfig,
  FetchFunction,
  APIType,
} from './index';
import type {
  CallableApiMethod,
  CreateCallableMethod,
} from './graceful';

// ============================================================================
// Core Flat Client Types
// ============================================================================

/**
 * Flat client type
 *
 * Maps a flat record of API methods directly to the root client object.
 * Unlike the graceful client which has a controller layer, flat clients
 * expose all APIs at the top level without namespacing.
 *
 * @template T - Flat API record type (Record<string, APIMethod>)
 *
 * @example
 * ```typescript
 * type MyAPIs = {
 *   symbolSearch: APIMethod<{ q: string }, never, SymbolResult>;
 *   stockQuote: APIMethod<{ symbol: string }, never, QuoteData>;
 * };
 *
 * const client = createFlatClient<MyAPIs>(config);
 * // Direct API access (no controllers):
 * client.symbolSearch({ q: 'AAPL' })
 * client.stockQuote({ symbol: 'AAPL' })
 * ```
 *
 * Requirements:
 * - 2.1: Support flat record types Record<string, APIMethod>
 * - 5.1: Correct type inference for API methods
 * - 5.2: Correct type inference for parameters and responses
 */
export type FlatClient<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends APIType
    ? CreateCallableMethod<T[K]>
    : never;
};

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Options for building flat proxy client
 *
 * These options control how the flat proxy client is constructed,
 * including URL building, path parameter handling, and custom method injection.
 *
 * Requirements:
 * - 2.1: FlatProxyOptions interface definition
 */
export interface FlatProxyOptions {
  /**
   * Custom URL builder function
   * Allows full control over how URLs are constructed from path templates and parameters
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Path parameter placeholder (default: '{}')
   * Used to identify path parameters in URL templates
   * Example: '/users/{userId}' with pathMark='{}' will replace {userId}
   */
  pathMark?: string;

  /**
   * Function to add custom methods to callable API objects
   * Allows extending API methods with project-specific utility methods
   */
  makeCustomUsages?: (
    callable: CallableApiMethod,
    apiMeta?: PontxAPI
  ) => CallableApiMethod;
}

/**
 * Configuration for creating a flat client
 *
 * This configuration is fully compatible with CreateGracefulClientConfig,
 * allowing the same feature wrappers (validation, mock, retry, logger).
 * The only difference is the expected metadata structure: flat clients
 * require API keys without "/" characters.
 *
 * @template T - Flat API record type
 *
 * Requirements:
 * - 1.3: Same configuration options as graceful client
 * - 2.1: CreateFlatClientConfig interface definition
 * - 8.1-8.7: Feature parity with graceful client
 */
export interface CreateFlatClientConfig<T extends Record<string, any>> {
  /**
   * Pontx API metadata (required)
   * Must be a flat structure (API keys cannot contain "/")
   *
   * Validation:
   * - Must have valid 'name' property
   * - Must have valid 'apis' property
   * - All API keys must not contain "/" character
   * - All API keys must be valid JavaScript identifiers
   */
  pontxSpecMeta: PontxSpecMeta;

  /**
   * Custom fetch function (optional)
   * Defaults to Node.js native fetch (Node.js >= 18)
   *
   * Use this to:
   * - Add authentication headers globally
   * - Implement custom retry logic at transport level
   * - Use a different HTTP client (axios, got, etc.)
   */
  fetchFn?: FetchFunction;

  /**
   * Path parameter placeholder (optional, default: '{}')
   * Used to identify path parameters in URL templates
   *
   * Examples:
   * - '{}' matches '/users/{userId}'
   * - ':' matches '/users/:userId'
   * - '$' matches '/users/$userId'
   */
  pathMark?: string;

  /**
   * Custom URL builder function (optional)
   * Allows full control over URL construction
   *
   * When provided, this function will be called for every API request
   * to build the final URL. Use this for:
   * - Dynamic base URL selection
   * - Custom path parameter replacement
   * - Environment-specific routing
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Custom usage builder function (optional)
   * Allows adding custom methods to API endpoints
   *
   * Example:
   * ```typescript
   * makeCustomUsages: (callable, apiMeta) => {
   *   callable.prefetch = () => queryClient.prefetchQuery(...);
   *   return callable;
   * }
   * ```
   */
  makeCustomUsages?: (
    callable: CallableApiMethod,
    apiMeta?: PontxAPI
  ) => CallableApiMethod;

  /**
   * API parameter validation (optional)
   * Uses Zod schemas to validate request/response data
   *
   * When enabled:
   * - Request parameters are validated before sending
   * - Response data is validated after receiving
   * - Validation errors are thrown with detailed messages
   *
   * Requirements:
   * - 8.1: Validation feature parity
   */
  validation?: ValidationConfig;

  /**
   * Mock data for testing (optional)
   * Returns static data instead of making real HTTP requests
   *
   * When enabled:
   * - All API calls return mock data
   * - No actual network requests are made
   * - Optional delay can simulate network latency
   *
   * Requirements:
   * - 8.2: Mock feature parity
   */
  mock?: MockConfig;

  /**
   * Automatic retry on failure (optional)
   * Retries failed requests with exponential/linear backoff
   *
   * When enabled:
   * - Failed requests are automatically retried
   * - Configurable retry attempts and backoff strategy
   * - Retryable errors can be customized
   *
   * Requirements:
   * - 8.3: Retry feature parity
   */
  retry?: RetryConfig;

  /**
   * Request/response logging (optional)
   * Logs API calls for debugging and monitoring
   *
   * When enabled:
   * - Logs request details (URL, method, params)
   * - Logs response details (status, data, timing)
   * - Custom logger instance can be provided
   *
   * Requirements:
   * - 8.4: Logger feature parity
   */
  logger?: LoggerConfig;
}

// ============================================================================
// Exported Type Aliases (for convenience)
// ============================================================================

/**
 * Re-export CallableApiMethod from graceful types
 * Flat client uses the same callable method interface
 */
export type { CallableApiMethod } from './graceful';
