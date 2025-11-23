/**
 * URL Builder Module
 *
 * This module provides the createUrlBuilder factory function that creates
 * a URL building function with support for:
 * - Custom getFetchUrl for complete URL building control
 * - Default URL building using path parameter replacement and query param appending
 * - Configurable path parameter markers
 */

import { buildUrl, getPathParamNames } from './build-url';
import { appendQueryParams } from './query-params';

/**
 * Options for configuring URL builder behavior
 */
export interface UrlBuilderOptions {
  /**
   * Custom function to build the complete fetch URL
   * When provided, this takes precedence over default URL building logic
   *
   * @param path - The URL path template (e.g., "/users/{userId}")
   * @param params - Parameters object containing path and query params
   * @returns Complete URL string ready for fetch
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Path parameter marker for missing parameters
   * When a path parameter is not provided in params, use this marker
   * For example, ":id" or "{id}" or "_"
   */
  pathMark?: string;
}

/**
 * URL builder function signature
 * Takes a path template and params, returns a complete URL
 */
export type UrlBuilder = (
  path: string,
  params?: Record<string, unknown>
) => string;

/**
 * Creates a URL builder function with the specified options
 *
 * The returned function can be used to build URLs by:
 * 1. If getFetchUrl is provided: delegates to custom URL building function
 * 2. Otherwise: uses default logic (replace path params + append query params)
 *
 * @param options - Configuration options for URL building
 * @returns A URL builder function
 *
 * @example
 * \`\`\`typescript
 * // Default behavior
 * const builder = createUrlBuilder();
 * builder('/users/{id}', { id: 123, page: 1 });
 * // Returns: '/users/123?page=1'
 *
 * // With custom getFetchUrl
 * const builder = createUrlBuilder({
 *   getFetchUrl: (path, params) => \`https://api.example.com\${path}?token=\${params.token}\`
 * });
 * builder('/users/{id}', { id: 123, token: 'abc' });
 * // Returns: 'https://api.example.com/users/{id}?token=abc'
 *
 * // With pathMark
 * const builder = createUrlBuilder({ pathMark: ':id' });
 * builder('/users/{userId}', {});
 * // Returns: '/users/:id'
 * \`\`\`
 */
export function createUrlBuilder(options: UrlBuilderOptions = {}): UrlBuilder {
  const { getFetchUrl, pathMark } = options;

  return function buildFinalUrl(
    path: string,
    params: Record<string, unknown> = {}
  ): string {
    // If custom getFetchUrl is provided, use it directly
    if (getFetchUrl) {
      return getFetchUrl(path, params);
    }

    // Default behavior: replace path params, then append query params

    // Step 1: Replace path parameters using buildUrl
    const urlWithPathParams = buildUrl(path, params, { pathMark });

    // Step 2: Determine which params are path params (so we can exclude them from query string)
    const pathParamNames = getPathParamNames(path);

    // Step 3: Filter out path params from the params object for query string
    const queryParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (!pathParamNames.has(key)) {
        queryParams[key] = value;
      }
    }

    // Step 4: Append query parameters
    const finalUrl = appendQueryParams(urlWithPathParams, queryParams);

    return finalUrl;
  };
}
