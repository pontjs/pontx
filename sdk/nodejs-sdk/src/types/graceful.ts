/**
 * TypeScript type definitions for graceful client
 *
 * This module provides type-safe interfaces for the graceful client API pattern.
 * It supports both two-param and three-param calling modes with intelligent type inference.
 *
 * Requirements covered:
 * - 1.5: Config structure compatible with createClient
 * - 7.1-7.6: Full TypeScript type inference and compile-time validation
 */

import type {
  PontxSpecMeta,
  PontxAPI,
  RequestOptions,
  RequestHeaders,
  ValidationConfig,
  MockConfig,
  RetryConfig,
  LoggerConfig,
  FetchFunction,
  APIType,
} from './index';

// ============================================================================
// Core Graceful Client Types
// ============================================================================

/**
 * Signature mode for API calls
 * - two-param: (params, options?) - for JSON APIs
 * - three-param: (params, body, options?) - for FormData/Blob APIs
 */
export type SignatureMode = 'two-param' | 'three-param';

/**
 * Classified parameters after splitting params object
 */
export interface ClassifiedParameters {
  /** Path parameters extracted from params */
  pathParams: Record<string, unknown>;
  /** Query parameters extracted from params */
  queryParams: Record<string, unknown>;
  /** Body parameters (two-param mode only) */
  bodyParams: Record<string, unknown>;
}

/**
 * Callable API method interface
 *
 * This represents a function object that can be invoked directly and also
 * has utility methods attached (getFetchKey, queryOptions, request).
 *
 * @template TParams - Parameter type (path/query/body mixed)
 * @template TBody - Body type for three-param mode (FormData, Blob, etc.)
 * @template TResponse - Response data type
 */
export interface CallableApiMethod<TParams = any, TBody = any, TResponse = any> {
  /**
   * Main callable signature
   * Supports both two-param and three-param modes
   */
  (
    params?: TParams,
    bodyOrOptions?: TBody | RequestOptions,
    options?: RequestOptions
  ): Promise<TResponse>;

  /**
   * Generate cache key for this API call
   * @param params - URL and query parameters
   * @returns Unique cache key string
   */
  getFetchKey: (params?: TParams) => string;

  /**
   * Generate query options for data fetching libraries (React Query, SWR, etc.)
   * @param params - URL and query parameters
   * @param options - Request options
   * @returns Query options object
   */
  queryOptions: (
    params?: TParams,
    options?: RequestOptions
  ) => {
    queryKey: string[];
    queryFn: () => Promise<TResponse>;
  };

  /**
   * Backward compatibility property
   * Points to the callable function itself
   */
  request: CallableApiMethod<TParams, TBody, TResponse>;

  /**
   * Allow custom methods added via makeCustomUsages
   */
  [key: string]: any;
}

/**
 * Determine signature mode based on API consumes field
 * @template TConsumes - Consumes content type
 */
export type InferSignatureMode<TConsumes extends string | undefined> =
  TConsumes extends 'multipart/form-data'
    ? 'three-param'
    : TConsumes extends 'application/octet-stream'
    ? 'three-param'
    : 'two-param';

/**
 * Check if params type is empty (undefined, {}, or Record<string, never>)
 * Used to optimize three-param mode signatures
 */
export type IsEmptyParams<T> = T extends undefined | {} | Record<string, never> ? true : false;

/**
 * Create callable method type based on signature mode
 * Optimizes three-param mode to two-param when params is empty
 * @template TApi - API type definition
 */
export type CreateCallableMethod<TApi extends APIType> =
  InferSignatureMode<TApi['consume']> extends 'three-param'
    ? IsEmptyParams<TApi['params']> extends true
      ? CallableApiMethodTwoParamWithBody<TApi>  // Three-param mode but params empty -> (body, options?)
      : CallableApiMethodThreeParam<TApi>         // Three-param mode with params -> (params, body, options?)
    : CallableApiMethodTwoParam<TApi>;            // Two-param mode -> (params, options?)

/**
 * Merge params and bodyParams for two-param mode
 * In two-param mode, all parameters (path, query, body) are provided in a single params object
 */
export type MergeParamsAndBody<TApi extends APIType> =
  TApi['params'] & (TApi['bodyParams'] extends undefined ? {} : TApi['bodyParams']);

/**
 * Two-param callable method (JSON object body APIs)
 * The first parameter includes path + query + body (merged type)
 */
export interface CallableApiMethodTwoParam<TApi extends APIType>
  extends CallableApiMethod<MergeParamsAndBody<TApi>, never, TApi['Response']> {
  (params?: MergeParamsAndBody<TApi>, options?: RequestOptions): Promise<TApi['Response']>;
}

/**
 * Two-param callable method with independent body (no params)
 * Optimized three-param mode: used when pathParams and queryParams are both empty
 * Signature: (body, options?) instead of ({}, body, options?)
 */
export interface CallableApiMethodTwoParamWithBody<TApi extends APIType>
  extends CallableApiMethod<never, TApi['bodyParams'], TApi['Response']> {
  (body?: TApi['bodyParams'], options?: RequestOptions): Promise<TApi['Response']>;

  /**
   * Generate cache key (no params needed)
   */
  getFetchKey: () => string;

  /**
   * Generate query options with body only
   */
  queryOptions: (
    body?: TApi['bodyParams'],
    options?: RequestOptions
  ) => {
    queryKey: string[];
    queryFn: () => Promise<TApi['Response']>;
  };

  /**
   * Backward compatibility property
   */
  request: CallableApiMethodTwoParamWithBody<TApi>;
}

/**
 * Three-param callable method (FormData/Blob/primitive body APIs with params)
 */
export interface CallableApiMethodThreeParam<TApi extends APIType>
  extends CallableApiMethod<TApi['params'], TApi['bodyParams'], TApi['Response']> {
  (
    params?: TApi['params'],
    body?: TApi['bodyParams'],
    options?: RequestOptions
  ): Promise<TApi['Response']>;
}

/**
 * Controller mapping for graceful client
 * Maps method names to callable API methods
 *
 * @template T - Record of method names to APIType
 */
export type GracefulController<T extends Record<string, APIType>> = {
  [K in keyof T]: CreateCallableMethod<T[K]>;
};

/**
 * Graceful client type
 * Top-level client with controller mapping
 *
 * @template T - Record of controller names to their API type records
 */
export type GracefulClient<T extends Record<string, Record<string, APIType>>> = {
  [K in keyof T]: GracefulController<T[K]>;
};

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Options for building graceful proxy client
 */
export interface GracefulProxyOptions {
  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Path parameter placeholder (default: '{}')
   */
  pathMark?: string;

  /**
   * Function to add custom methods to callable objects
   */
  makeCustomUsages?: (
    callable: CallableApiMethod,
    apiMeta?: PontxAPI
  ) => CallableApiMethod;
}

/**
 * Configuration for creating a graceful client
 *
 * This configuration is fully compatible with CreateClientConfig,
 * allowing the same feature wrappers (validation, mock, retry, logger).
 *
 * @template T - Record of controller names to their API type records
 */
export interface CreateGracefulClientConfig<
  T extends Record<string, Record<string, APIType>>
> {
  /**
   * Pontx API metadata (required)
   * Must contain valid name and apis fields
   */
  pontxSpecMeta: PontxSpecMeta;

  /**
   * Custom fetch function (optional)
   * Defaults to Node.js native fetch (Node.js >= 18)
   */
  fetchFn?: FetchFunction;

  /**
   * Path parameter placeholder (optional, default: '{}')
   * Used to identify path parameters in URL templates
   */
  pathMark?: string;

  /**
   * Custom URL builder function (optional)
   * Allows full control over URL construction
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Custom usage builder function (optional)
   * Allows adding custom methods to API endpoints
   */
  makeCustomUsages?: (
    callable: CallableApiMethod,
    apiMeta?: PontxAPI
  ) => CallableApiMethod;

  /**
   * API parameter validation (optional)
   * Uses Zod schemas to validate request parameters
   */
  validation?: ValidationConfig;

  /**
   * Mock data for testing (optional)
   * Returns static data instead of making real HTTP requests
   */
  mock?: MockConfig;

  /**
   * Automatic retry on failure (optional)
   * Retries failed requests with exponential/linear backoff
   */
  retry?: RetryConfig;

  /**
   * Request/response logging (optional)
   * Logs API calls for debugging and monitoring
   */
  logger?: LoggerConfig;
}

// ============================================================================
// Request Function Types
// ============================================================================

/**
 * Request function type with API key metadata
 * Extended from standard fetch to include API identification
 */
export type RequestFn = (
  url: string,
  init: RequestInit & { _apiKey?: string }
) => Promise<Response>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract controller names from client type
 */
export type ControllerNames<T extends GracefulClient<any>> = keyof T;

/**
 * Extract method names from controller
 */
export type MethodNames<
  T extends GracefulClient<any>,
  C extends ControllerNames<T>
> = keyof T[C];

/**
 * Extract method type from client
 */
export type GetMethod<
  T extends GracefulClient<any>,
  C extends ControllerNames<T>,
  M extends MethodNames<T, C>
> = T[C][M];
