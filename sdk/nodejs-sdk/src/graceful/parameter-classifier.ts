/**
 * Parameter classification module
 *
 * This module provides functionality to classify parameters into path, query, and body
 * based on API metadata (pathParams and queryParams arrays).
 *
 * Requirements covered:
 * - 3.1: Extract path parameters based on pathParams array
 * - 3.2: Extract query parameters based on queryParams array
 * - 3.3: Extract body parameters (remaining params in two-param mode)
 * - 3.4: Ignore extra parameters in three-param mode
 * - 3.8: Handle parameter conflicts with priority path > query > body
 */

import type { PontxAPI } from '@pontx/spec';

/**
 * Result of parameter classification
 */
export interface ClassifiedParameters {
  /** Path parameters extracted from params */
  pathParams: Record<string, unknown>;
  /** Query parameters extracted from params */
  queryParams: Record<string, unknown>;
  /** Body parameters extracted from params (two-param mode only) */
  bodyParams: Record<string, unknown>;
}

/**
 * Signature mode for API method
 */
export type SignatureMode = 'two-param' | 'three-param';

/**
 * Classify parameters based on API metadata
 *
 * This function takes a flat params object and classifies each parameter
 * into path, query, or body based on the API metadata's pathParams and queryParams arrays.
 *
 * Priority for parameter conflicts: path > query > body
 * This means if a parameter name appears in multiple arrays, it will be assigned
 * to the highest priority category only.
 *
 * @param params - Input parameter object
 * @param apiMeta - API metadata containing pathParams and queryParams arrays
 * @param mode - Signature mode ('two-param' or 'three-param')
 * @returns Classified parameters
 *
 * @example
 * ```typescript
 * // Two-param mode (JSON body)
 * const result = classifyParameters(
 *   { userId: '123', name: 'John', email: 'john@x.com' },
 *   { pathParams: ['userId'], queryParams: [] },
 *   'two-param'
 * );
 * // Returns:
 * // {
 * //   pathParams: { userId: '123' },
 * //   queryParams: {},
 * //   bodyParams: { name: 'John', email: 'john@x.com' }
 * // }
 *
 * // Three-param mode (FormData body)
 * const result = classifyParameters(
 *   { userId: '123', category: 'docs' },
 *   { pathParams: ['userId'], queryParams: ['category'] },
 *   'three-param'
 * );
 * // Returns:
 * // {
 * //   pathParams: { userId: '123' },
 * //   queryParams: { category: 'docs' },
 * //   bodyParams: {}  // Empty in three-param mode
 * // }
 * ```
 */
export function classifyParameters(
  params: Record<string, unknown>,
  apiMeta: Partial<PontxAPI>,
  mode: SignatureMode
): ClassifiedParameters {
  const pathParams: Record<string, unknown> = {};
  const queryParams: Record<string, unknown> = {};
  const bodyParams: Record<string, unknown> = {};

  // Use pathParams and queryParams arrays directly (Requirement 3.1, 3.2)
  // These arrays are now part of the API metadata for graceful client
  const pathParamNames = new Set(apiMeta.pathParams || []);
  const queryParamNames = new Set(apiMeta.queryParams || []);

  // Fallback: Extract from parameters array if pathParams/queryParams not provided
  // This maintains backward compatibility with existing code
  if (pathParamNames.size === 0 && queryParamNames.size === 0 && apiMeta.parameters) {
    apiMeta.parameters.forEach((p) => {
      if (p.in === 'path') {
        pathParamNames.add(p.name);
      } else if (p.in === 'query') {
        queryParamNames.add(p.name);
      }
    });
  }

  // Special case: For GET requests with empty queryParams, treat all non-path params as query
  const isGetRequest = apiMeta.method?.toUpperCase() === 'GET';
  const hasExplicitQueryParams = queryParamNames.size > 0;

  // Classify each parameter
  for (const [key, value] of Object.entries(params)) {
    // Priority: path > query > body (Requirement 3.8)
    if (pathParamNames.has(key)) {
      // Assign to path params (highest priority)
      pathParams[key] = value;
    } else if (queryParamNames.has(key)) {
      // Assign to query params (second priority)
      queryParams[key] = value;
    } else if (isGetRequest && !hasExplicitQueryParams) {
      // GET request with no explicit queryParams: treat remaining as query (Requirement 3.3)
      queryParams[key] = value;
    } else if (mode === 'two-param') {
      // In two-param mode, remaining params go to body (Requirement 3.3)
      bodyParams[key] = value;
    }
    // In three-param mode, extra params are ignored (Requirement 3.4)
  }

  return {
    pathParams,
    queryParams,
    bodyParams
  };
}
