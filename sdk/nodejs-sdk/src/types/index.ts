/**
 * Type definitions for @pontx/nodejs-sdk
 *
 * This module provides TypeScript type definitions for the SDK, including:
 * - APIMethod: Represents a single API endpoint with params, body, and response types
 * - Client/Controller: Type mappings for SDK proxy structure
 * - SdkUsage: Methods available for each API (request, getFetchKey, queryOptions)
 * - Conditional types: Smart inference based on hasBody/hasParams metadata
 */

// ============================================================================
// Import and re-export types from @pontx/spec
// ============================================================================

import type { PontxSpec, PontxAPI as PontxAPIType } from "@pontx/spec";

// Re-export with aliases
export type PontxSpecMeta = PontxSpec;
export type PontxAPI = PontxAPIType;

// ============================================================================
// Re-export types from base
// ============================================================================

export type { APIMethod } from './base';

// ============================================================================
// Base Types
// ============================================================================

/**
 * HTTP request headers
 */
export type RequestHeaders = Record<string, string>;

/**
 * Content-Type values for request body serialization
 */
export type ContentType =
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "text/plain"
  | string;

// ============================================================================
// Request Options
// ============================================================================

/**
 * Options for API request calls
 * Extends standard fetch RequestInit for full compatibility
 */
export interface RequestOptions<BodyParams = any> extends Omit<RequestInit, 'method' | 'body' | 'headers'> {
  /**
   * Request body (for POST, PUT, PATCH methods)
   */
  body?: BodyParams;

  /**
   * Custom HTTP headers
   */
  headers?: RequestHeaders;

  /**
   * Content-Type header
   * If not specified, will be inferred from body type
   */
  contentType?: ContentType;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  // Fetch options are inherited from RequestInit:
  // - signal?: AbortSignal
  // - credentials?: RequestCredentials
  // - cache?: RequestCache
  // - mode?: RequestMode
  // - redirect?: RequestRedirect
  // - referrer?: string
  // - referrerPolicy?: ReferrerPolicy
  // - integrity?: string
  // - keepalive?: boolean
  // - window?: null
}

// ============================================================================
// API Method and SDK Usage Types
// ============================================================================

/**
 * API Type definition
 * Represents the type information for an API endpoint
 */
export type APIType = {
  /** query/path request parameters */
  params: Record<string, any>;
  /** request body parameters */
  bodyParams?: any;
  /** response type */
  Response: any;
  /** HTTP method */
  method: string;
  /** API path */
  path?: string;
  /** request Content-Type */
  consume?: string;
  /** response Content-Type */
  produce?: string;
  /** whether deprecated */
  deprecated?: boolean;
};

type RequestFn<Params, BodyParams, Response> = (
  params: Params,
  requestOptions?: BodyParams extends undefined
    ? Omit<RequestOptions<BodyParams>, "body">
    : RequestOptions<BodyParams>
) => Promise<Response>;

/**
 * SDK usage methods for an API
 * These are the methods available on each API in the client
 */
export type SdkUsage<ApiTypes extends APIType> = {
  /**
   * Get the fetch key for caching
   * @param params - URL and query parameters
   * @returns Unique key for this API call
   */
  getFetchKey: (params: ApiTypes["params"]) => string;

  /**
   * Execute the API request
   * @param params - URL and query parameters
   * @param requestOptions - Request options (body, headers, etc.)
   * @returns Promise resolving to the API response
   */
  request: RequestFn<
    ApiTypes["params"],
    ApiTypes["bodyParams"],
    ApiTypes["Response"]
  >;

  /**
   * Get query options for data fetching libraries (React Query, SWR, etc.)
   * @param params - URL and query parameters
   * @param requestConfig - Request options
   * @returns Query options object with fetchKey and fetchFn
   */
  queryOptions: (
    params: ApiTypes["params"],
    requestConfig?: ApiTypes["bodyParams"] extends undefined
      ? Omit<RequestOptions<ApiTypes["bodyParams"]>, "body">
      : RequestOptions<ApiTypes["bodyParams"]>
  ) => {
    fetchKey: string;
    fetchFn: () => Promise<ApiTypes["Response"]>;
  };
};

/**
 * Controller type mapping
 * Maps a record of APIType to their SDK usage forms
 *
 * @template T - Record of API method names to APIType
 */
export type Controller<T extends Record<string, APIType>> = {
  [K in keyof T]: SdkUsage<T[K]>;
};

/**
 * Client type mapping
 * Maps a record of controller names to Controller types
 * This is the top-level type for the SDK client
 *
 * @template T - Record of controller names to their API type records
 */
export type Client<T extends Record<string, Record<string, APIType>>> = {
  [K in keyof T]: Controller<T[K]>;
};

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Validation configuration (optional feature)
 */
export type ValidationConfig = {
  /** Zod schemas by API key (controllerName/methodName) */
  schemas?: Record<string, any>; // ZodSchema
  /** Enable validation */
  enabled?: boolean;
};

/**
 * Mock configuration (optional feature)
 */
export type MockConfig = {
  /** Mock data by API key (controllerName/methodName) */
  data: Record<string, unknown>;
  /** Delay in milliseconds before returning mock data */
  delay?: number;
  /** Enable mock mode */
  enabled?: boolean;
  /** Strict mode - require all APIs to have mock data (default: false) */
  strict?: boolean;
};

/**
 * Retry configuration (optional feature)
 */
export type RetryConfig = {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Backoff strategy (default: exponential) */
  backoff?: "exponential" | "linear";
  /** Custom retryable error codes/messages */
  retryableErrors?: Array<string | number>;
};

/**
 * Logger interface
 */
export type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

/**
 * Logger configuration (optional feature)
 */
export type LoggerConfig = {
  /** Custom logger instance */
  instance?: Logger;
  /** Enable logging (default: NODE_ENV === 'development') */
  enabled?: boolean;
};

/**
 * Fetch function type - compatible with standard fetch API
 */
export type FetchFunction = (
  url: string,
  init?: RequestInit
) => Promise<Response>;

/**
 * Configuration for creating a client
 * This will be expanded in later tasks to include validation, mock, retry, logger, etc.
 */
export interface CreateClientConfig<
  T extends Record<string, Record<string, APIType>>
> {
  /**
   * Pontx API metadata
   */
  pontxSpecMeta: PontxSpecMeta;

  /**
   * Custom fetch function
   * Defaults to Node.js native fetch (Node.js >= 18)
   */
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;

  /**
   * Path parameter marker (default: "{}")
   * Used to identify path parameters in URL templates
   */
  pathMark?: string;

  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Custom usage builder function
   * Allows adding custom methods to API endpoints
   */
  makeCustomUsages?: (
    usages: SdkUsage<APIType>,
    apiMeta?: PontxAPI
  ) => Record<string, unknown>;

  // Optional feature configurations (will be implemented in later tasks)
  /** API parameter validation */
  validation?: ValidationConfig;

  /** Mock data for testing */
  mock?: MockConfig;

  /** Automatic retry on failure */
  retry?: RetryConfig;

  /** Request/response logging */
  logger?: LoggerConfig;
}

// ============================================================================
// Graceful Client Types
// ============================================================================

export type {
  SignatureMode,
  ClassifiedParameters,
  CallableApiMethod,
  CallableApiMethodTwoParam,
  CallableApiMethodThreeParam,
  MergeParamsAndBody,
  GracefulController,
  GracefulClient,
  GracefulProxyOptions,
  CreateGracefulClientConfig,
  RequestFn,
  ControllerNames,
  MethodNames,
  GetMethod,
} from './graceful';

// ============================================================================
// Flat Client Types
// ============================================================================

export type {
  FlatClient,
  CreateFlatClientConfig,
  FlatProxyOptions,
} from './flat';

// All types are already exported via named exports above
// No need for a separate export block
