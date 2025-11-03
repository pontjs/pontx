/**
 * Request building module
 *
 * This module provides functions to build full URLs and request bodies
 * from classified parameters.
 *
 * Requirements covered:
 * - 3.5: Extract path parameters and build URL
 * - 3.6: Extract query parameters and append to URL
 * - 3.7: Extract body parameters and serialize
 * - 4.3: Direct body usage in three-param mode
 * - 4.4: Pass body directly without serialization in three-param mode
 */

import type { PontxAPI } from '@pontx/spec';
import type { ClassifiedParameters } from './parameter-classifier';
import type { SignatureMode } from './signature-selector';
import type { ContentType } from '../types/base';
import { buildUrl } from '../core/build-url';
import { appendQueryParams } from '../core/query-params';
import { serializeRequestBody } from '../core/request-body';

/**
 * Options for building URLs
 */
export interface BuildUrlOptions {
  /** Placeholder to use when a path parameter is missing */
  pathMark?: string;
}

/**
 * Build full URL with path and query parameters
 *
 * This function combines path parameter replacement and query parameter
 * appending to create a complete URL.
 *
 * @param classified - Classified parameters
 * @param apiMeta - API metadata
 * @param options - URL building options
 * @returns Full URL with path and query parameters
 *
 * @example
 * ```typescript
 * const url = buildFullUrl(
 *   {
 *     pathParams: { userId: '123' },
 *     queryParams: { page: 1 },
 *     bodyParams: {}
 *   },
 *   { path: '/users/{userId}' }
 * );
 * // Returns: '/users/123?page=1'
 * ```
 */
export function buildFullUrl(
  classified: ClassifiedParameters,
  apiMeta: Partial<PontxAPI>,
  options?: BuildUrlOptions
): string {
  // Step 1: Replace path parameters (Requirement 3.5)
  const pathUrl = buildUrl(apiMeta.path || '', classified.pathParams, options);

  // Step 2: Append query parameters (Requirement 3.6)
  const fullUrl = appendQueryParams(pathUrl, classified.queryParams);

  return fullUrl;
}

/**
 * Build request body based on mode and classified parameters
 *
 * In two-param mode, serializes bodyParams based on content type.
 * In three-param mode, uses the provided body directly.
 *
 * @param classified - Classified parameters
 * @param bodyArg - Body argument (used in three-param mode)
 * @param mode - Signature mode
 * @param contentType - Content-Type header value
 * @returns Request body (string, FormData, Blob, URLSearchParams, or undefined)
 *
 * @example
 * ```typescript
 * // Two-param mode (JSON)
 * const body = buildRequestBody(
 *   { pathParams: {}, queryParams: {}, bodyParams: { name: 'John' } },
 *   undefined,
 *   'two-param',
 *   'application/json'
 * );
 * // Returns: '{"name":"John"}'
 *
 * // Three-param mode (FormData)
 * const formData = new FormData();
 * const body = buildRequestBody(
 *   { pathParams: {}, queryParams: {}, bodyParams: {} },
 *   formData,
 *   'three-param',
 *   'multipart/form-data'
 * );
 * // Returns: formData (unchanged)
 * ```
 */
export function buildRequestBody(
  classified: ClassifiedParameters,
  bodyArg: unknown | undefined,
  mode: SignatureMode,
  contentType: ContentType
): string | FormData | Blob | URLSearchParams | undefined {
  if (mode === 'three-param') {
    // Requirement 4.4: Direct body in three-param mode
    // Pass body directly without serialization
    return bodyArg as FormData | Blob | undefined;
  }

  // Two-param mode: serialize bodyParams (Requirement 3.7)
  // Check if there are any body parameters
  if (Object.keys(classified.bodyParams).length === 0) {
    return undefined;
  }

  // Serialize based on content type
  return serializeRequestBody(classified.bodyParams, contentType);
}
