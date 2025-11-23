/**
 * Callable API method factory module
 *
 * This module creates callable function objects that support direct invocation
 * and utility methods (getFetchKey, queryOptions, request).
 *
 * Requirements covered:
 * - 2.1: Direct method call executes request
 * - 2.2: Two-param signature (params, options)
 * - 2.3: Three-param signature (params, body, options)
 * - 2.4: Omit options parameter uses defaults
 * - 2.5: Handle empty parameters
 * - 8.1: Attach getFetchKey method
 * - 8.2: Attach queryOptions method
 * - 8.3: Attach request property (backward compatibility)
 */

import type { PontxAPI, RequestFn, RequestOptions } from '../types';
import { classifyParameters } from './parameter-classifier';
import { selectSignatureMode } from './signature-selector';
import { buildUrl } from '../core/build-url';
import { appendQueryParams } from '../core/query-params';
import { serializeRequestBody } from '../core/request-body';

/**
 * Options for creating callable API methods
 */
export interface CallableMethodOptions {
  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Path parameter placeholder (default: '{}')
   */
  pathMark?: string;

  /**
   * Function to add custom methods to the callable object
   */
  makeCustomUsages?: (
    callable: CallableApiMethod,
    apiMeta?: PontxAPI
  ) => CallableApiMethod;
}

/**
 * Callable API method type
 */
export interface CallableApiMethod<TParams = any, TBody = any, TResponse = any> {
  // Function signature - supports both two-param and three-param modes
  (params?: TParams, bodyOrOptions?: TBody | RequestOptions, options?: RequestOptions): Promise<TResponse>;

  // Utility methods
  getFetchKey: (params?: TParams) => string;
  queryOptions: (params?: TParams, options?: RequestOptions) => {
    queryKey: string[];
    queryFn: () => Promise<TResponse>;
  };
  request: CallableApiMethod<TParams, TBody, TResponse>;

  // Allow custom methods
  [key: string]: any;
}

/**
 * Build headers from API metadata and request options
 */
function buildHeaders(
  apiMeta: PontxAPI,
  options?: RequestOptions
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Set Content-Type from consumes array
  if (apiMeta.consumes && apiMeta.consumes.length > 0) {
    headers['Content-Type'] = apiMeta.consumes[0];
  }

  // Set Accept from produces array
  if (apiMeta.produces && apiMeta.produces.length > 0) {
    headers['Accept'] = apiMeta.produces[0];
  }

  // Merge user-provided headers (user headers override defaults)
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  return headers;
}

/**
 * Generate fetch key for caching
 */
function generateFetchKey(
  apiKey: string,
  params: Record<string, unknown> = {}
): string {
  // Sort keys alphabetically for consistency
  const sortedKeys = Object.keys(params).sort();
  const queryParts = sortedKeys.map(key => `${key}=${params[key]}`);

  if (queryParts.length === 0) {
    return apiKey;
  }

  return `${apiKey}?${queryParts.join('&')}`;
}

/**
 * Create a callable API method object
 *
 * This function creates a callable function object that:
 * 1. Can be invoked directly to execute the API request
 * 2. Has utility methods attached (getFetchKey, queryOptions, request)
 * 3. Automatically classifies parameters based on API metadata
 * 4. Supports both two-param and three-param modes
 *
 * @param apiKey - API unique identifier (controller/method)
 * @param apiMeta - API metadata
 * @param requestFn - Request function to execute HTTP calls
 * @param options - Optional configuration
 * @returns Callable function object
 *
 * @example
 * ```typescript
 * // Two-param mode (JSON API)
 * const getUser = createCallableApiMethod('users/getUser', apiMeta, fetch);
 * const user = await getUser({ userId: '123' });
 *
 * // Three-param mode (FormData)
 * const upload = createCallableApiMethod('files/upload', apiMeta, fetch);
 * const result = await upload({ category: 'docs' }, formData);
 *
 * // Utility methods
 * const key = getUser.getFetchKey({ userId: '123' });
 * const opts = getUser.queryOptions({ userId: '123' });
 * ```
 */
export function createCallableApiMethod(
  apiKey: string,
  apiMeta: PontxAPI,
  requestFn: RequestFn,
  options?: CallableMethodOptions
): CallableApiMethod {
  const { getFetchUrl, pathMark, makeCustomUsages } = options || {};

  // Determine signature mode based on consumes and body type
  const mode = selectSignatureMode(apiMeta);

  // Check if API has path/query params (for optimized signature)
  // Directly check array lengths instead of using a separate function
  const hasParameters = (apiMeta.pathParams?.length ?? 0) > 0 || (apiMeta.queryParams?.length ?? 0) > 0;

  /**
   * Main callable function
   * Supports three modes:
   * 1. Two-param (JSON object body): (params, options)
   * 2. Optimized two-param (independent body, no params): (body, options)
   * 3. Three-param (independent body + params): (params, body, options)
   */
  const callable = async function(
    paramsOrBody?: Record<string, unknown> | any,
    bodyOrOptions?: any,
    options?: RequestOptions
  ): Promise<any> {
    let params: Record<string, unknown> = {};
    let body: any;
    let requestOptions: RequestOptions | undefined;

    // Determine which mode based on signature type
    if (mode === 'three-param' && !hasParameters) {
      // Optimized two-param mode: (body, options)
      // No path/query params, so first arg is body
      body = paramsOrBody;
      requestOptions = bodyOrOptions as RequestOptions | undefined;
    } else if (mode === 'three-param') {
      // Standard three-param mode: (params, body, options)
      params = paramsOrBody || {};
      body = bodyOrOptions;
      requestOptions = options;
    } else {
      // Two-param mode: (params, options)
      params = paramsOrBody || {};
      body = undefined;
      requestOptions = bodyOrOptions as RequestOptions | undefined;
    }

    // Classify parameters
    const classified = classifyParameters(params, apiMeta, mode);

    // Build URL
    let url: string;
    if (getFetchUrl) {
      url = getFetchUrl(apiMeta.path, classified.pathParams);
    } else {
      url = buildUrl(apiMeta.path, classified.pathParams, { pathMark });
    }

    // Append query parameters
    url = appendQueryParams(url, classified.queryParams);

    // Build headers
    const headers = buildHeaders(apiMeta, requestOptions);

    // Prepare request init - merge request options with defaults
    const init: RequestInit & { _apiKey?: string; timeout?: number } = {
      method: apiMeta.method,
      headers,
      _apiKey: apiKey, // For feature modules (mock, validation, etc.)
      // Forward all fetch options from requestOptions (Requirement 6.3)
      ...(requestOptions && {
        signal: requestOptions.signal,
        credentials: requestOptions.credentials,
        cache: requestOptions.cache,
        mode: requestOptions.mode,
        redirect: requestOptions.redirect,
        referrer: requestOptions.referrer,
        referrerPolicy: requestOptions.referrerPolicy,
        integrity: requestOptions.integrity,
        keepalive: requestOptions.keepalive,
        timeout: requestOptions.timeout,
      }),
    };

    // Add body if present
    if (mode === 'three-param' && body !== undefined) {
      // Three-param mode (both optimized and standard): use body directly (FormData, Blob, string, etc.)
      init.body = body;
    } else if (mode === 'two-param' && Object.keys(classified.bodyParams).length > 0) {
      // Two-param mode: serialize bodyParams as JSON
      const contentType = headers['Content-Type'] || 'application/json';
      init.body = serializeRequestBody(classified.bodyParams, contentType);
    }

    // Execute request
    const response = await requestFn(url, init);

    // Parse JSON response
    const data = await response.json();
    return data;
  };

  /**
   * Attach getFetchKey method (Requirement 8.1)
   *
   * For optimized two-param mode (no params), this returns just the apiKey.
   * For other modes, it generates a key based on params.
   */
  callable.getFetchKey = (params?: Record<string, unknown>) => {
    if (mode === 'three-param' && !hasParameters) {
      // Optimized mode: no params needed
      return apiKey;
    }
    return generateFetchKey(apiKey, params || {});
  };

  /**
   * Attach queryOptions method (Requirement 8.2)
   *
   * Signature varies based on mode:
   * - Two-param mode: (params, options)
   * - Optimized two-param: (body, options)
   * - Three-param: (params, body, options) - but we simplify to (params, options) for query
   */
  callable.queryOptions = (
    paramsOrBody?: Record<string, unknown> | any,
    bodyOrOptions?: any,
    options?: RequestOptions
  ) => {
    let fetchKey: string;
    let queryFn: () => Promise<any>;

    if (mode === 'three-param' && !hasParameters) {
      // Optimized two-param mode: (body, options)
      const body = paramsOrBody;
      const opts = bodyOrOptions as RequestOptions | undefined;
      fetchKey = apiKey;
      queryFn = () => callable(body, opts);
    } else if (mode === 'three-param') {
      // Standard three-param mode: (params, body, options)
      const params = paramsOrBody || {};
      const body = bodyOrOptions;
      fetchKey = generateFetchKey(apiKey, params);
      queryFn = () => callable(params, body, options);
    } else {
      // Two-param mode: (params, options)
      const params = paramsOrBody || {};
      const opts = bodyOrOptions as RequestOptions | undefined;
      fetchKey = generateFetchKey(apiKey, params);
      queryFn = () => callable(params, opts);
    }

    return {
      queryKey: [fetchKey],
      queryFn,
    };
  };

  /**
   * Attach request property for backward compatibility (Requirement 8.3)
   */
  callable.request = callable;

  /**
   * Apply custom usages if provided
   */
  if (makeCustomUsages) {
    return makeCustomUsages(callable as CallableApiMethod, apiMeta);
  }

  return callable as CallableApiMethod;
}
