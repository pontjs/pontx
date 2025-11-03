/**
 * Proxy Client Builder
 *
 * This module implements proxy-based client generation from API metadata.
 *
 * Features:
 * - Two-level Proxy (client.controller.method)
 * - Dynamic method generation (request, getFetchKey, queryOptions)
 * - Automatic header configuration (Content-Type, Accept)
 * - Request body serialization
 * - Support for custom usage methods
 */

import type { PontxSpecMeta, PontxAPIMeta, FetchFunction } from "../types";
import { buildUrl, createUrlBuilder } from "../url";
import { serializeRequestBody } from "../request-body";

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Request body (will be serialized based on Content-Type)
   */
  body?: any;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Additional request options
   */
  [key: string]: any;
}

/**
 * Proxy client configuration options
 */
export interface ProxyClientOptions {
  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Placeholder for missing path parameters
   */
  pathMark?: string;

  /**
   * Function to add custom methods to each API method object
   */
  makeCustomUsages?: (
    usages: Record<string, any>,
    apiMeta?: PontxAPIMeta
  ) => Record<string, any>;
}

/**
 * Parse API key to extract controller path and method name
 *
 * @param apiKey - API key in format "controller/method" or "namespace/controller/method"
 * @returns [controllerPath, methodName]
 *
 * @example
 * parseApiKey('users/getUser') // => [['users'], 'getUser']
 * parseApiKey('api/users/getUser') // => [['api', 'users'], 'getUser']
 */
export function parseApiKey(apiKey: string): [string[], string] {
  const parts = apiKey.split("/");
  const methodName = parts[parts.length - 1];
  const controllerPath = parts.slice(0, -1);
  return [controllerPath, methodName];
}

/**
 * Build request headers from API metadata and options
 *
 * @param apiMeta - API metadata
 * @param options - Request options
 * @returns Headers object
 */
export function buildHeaders(
  apiMeta: PontxAPIMeta,
  options?: RequestOptions
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Set Content-Type from consumes (first element)
  if (apiMeta.consumes && apiMeta.consumes.length > 0) {
    headers["Content-Type"] = apiMeta.consumes[0];
  }

  // Set Accept from produces (first element)
  if (apiMeta.produces && apiMeta.produces.length > 0) {
    headers["Accept"] = apiMeta.produces[0];
  }

  // Merge user-provided headers (user headers override defaults)
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  return headers;
}

/**
 * Create API method object with request, getFetchKey, and queryOptions
 */
function createApiMethod(
  apiSelector: { specName: string; controllerName: string; apiName: string },
  apiMeta: PontxAPIMeta,
  requestFn: FetchFunction,
  options?: ProxyClientOptions
): any {
  const { getFetchUrl, pathMark, makeCustomUsages } = options || {};
  const urlBuilder = createUrlBuilder({ getFetchUrl, pathMark });
  const apiKey = apiSelector?.controllerName
    ? `${apiSelector.controllerName}/${apiSelector.apiName}`
    : apiSelector.apiName;

  // Base usage methods
  const usages = {
    /**
     * Execute API request
     */
    request: async (
      params: Record<string, unknown> = {},
      requestOptions = {} as RequestOptions
    ) => {
      // Build URL
      const url = urlBuilder(apiMeta.path, params);

      // Build headers
      const headers = buildHeaders(apiMeta, requestOptions);

      // Prepare request init object
      const init: RequestInit & {
        _apiKey?: string;
        getMetadata: () => {
          specName: string;
          controllerName: string;
          apiName: string;
          apiMeta: PontxAPIMeta;
        };
      } = {
        method: apiMeta.method?.toUpperCase?.(),
        headers,
        getMetadata: () => {
          return {
            specName: apiSelector.specName,
            controllerName: apiSelector.controllerName,
            apiName: apiSelector.apiName,
            apiMeta: apiMeta,
          };
        },
        _apiKey: apiKey, // Add API key for feature modules (mock, etc.)
        ...requestOptions,
      };

      // Serialize request body if present
      // Check hasBody flag or if method is POST/PUT/PATCH (which typically have bodies)
      const methodSupportsBody = ["POST", "PUT", "PATCH"].includes(
        apiMeta.method?.toUpperCase?.() || ""
      );
      if (requestOptions?.body && (apiMeta?.hasBody || methodSupportsBody)) {
        const contentType = headers["Content-Type"] || "application/json";
        init.body = serializeRequestBody(requestOptions.body, contentType);
      }

      // Execute request
      return requestFn(url, init);
    },

    /**
     * Get fetch key for caching
     */
    getFetchKey: (params: Record<string, unknown> = {}) => {
      return urlBuilder(apiKey, params);
    },

    /**
     * Get query options for data fetching libraries (React Query, SWR, etc.)
     */
    queryOptions: (
      params: Record<string, unknown> = {},
      requestOptions?: RequestOptions
    ) => {
      const fetchKey = urlBuilder(apiKey, params);

      return {
        fetchKey,
        queryFn: () => {
          return usages.request(params, requestOptions);
        },
        queryKey: [fetchKey],
      };
    },
  };

  // Add custom usage methods if provided
  if (makeCustomUsages) {
    const customUsages = makeCustomUsages(usages, apiMeta) || {};

    return {
      ...usages,
      ...customUsages,
    };
  }

  return usages;
}

/**
 * Build proxy client from API metadata
 *
 * Creates a two-level Proxy supporting client.controller.method access pattern
 * Following the same logic as browser SDK's createClient
 *
 * @param requestFn - Function to execute API calls
 * @param pontxSpecMeta - API metadata
 * @param options - Proxy client options
 * @returns Proxy client with dynamic API methods
 *
 * @example
 * ```typescript
 * const client = buildProxyClient(fetch, pontxSpecMeta);
 *
 * // Access API methods
 * const user = await client.users.getUser.request({ userId: '123' });
 *
 * // Get cache key
 * const key = client.users.getUser.getFetchKey({ userId: '123' });
 *
 * // Get React Query query options
 * const options = client.users.getUser.queryOptions({ userId: '123' });
 * ```
 */
export function buildProxyClient(
  requestFn: FetchFunction,
  pontxSpecMeta: PontxSpecMeta,
  options?: ProxyClientOptions
): any {
  return new Proxy({} as any, {
    get(target, controllerName: string) {
      // Cache controller proxy in target
      if (!target[controllerName]) {
        target[controllerName] = new Proxy({} as any, {
          get(_, apiName: string) {
            // Look up API by ${controllerName}/${apiName}
            const apiKey = `${controllerName}/${apiName}`;
            const apiMeta = pontxSpecMeta.apis[apiKey];

            if (!apiMeta) {
              throw new Error(`API "${apiKey}" not found in client`);
            }

            // Create and return API method object
            return createApiMethod(
              {
                specName: pontxSpecMeta.name || "",
                controllerName,
                apiName,
              },
              apiMeta,
              requestFn,
              options
            );
          },
        });
      }
      return target[controllerName];
    },
  });
}
