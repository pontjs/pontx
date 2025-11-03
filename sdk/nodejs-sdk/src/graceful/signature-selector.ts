/**
 * Signature mode selection module
 *
 * This module provides functionality to select the appropriate API signature mode
 * (two-param or three-param) based on the Content-Type and bodyType in API metadata.
 *
 * Requirements covered:
 * - 4.1: multipart/form-data triggers three-param mode
 * - 4.2: application/octet-stream triggers three-param mode
 * - 4.6: application/json with object body triggers two-param mode
 * - 4.7: undefined consumes triggers two-param mode
 * - NEW: bodyType determines signature mode (object → two-param, others → three-param)
 */

import type { PontxAPI } from '@pontx/spec';

/**
 * Signature mode for API method
 */
export type SignatureMode = 'two-param' | 'three-param';

/**
 * Select signature mode based on API metadata
 *
 * Determines whether an API should use two-parameter mode (params, options)
 * or three-parameter mode (params, body, options) based on the Content-Type
 * and bodyType.
 *
 * Three-param mode is triggered by:
 * - multipart/form-data (file uploads)
 * - application/octet-stream (binary data)
 * - bodyType: 'map' | 'array' | 'string' | 'number' | 'boolean' | 'integer'
 *
 * Two-param mode is used for:
 * - bodyType: 'object' (JSON object body, can merge with params)
 * - bodyType: 'none' (no body, GET/DELETE requests)
 * - bodyType: undefined (default, assume object)
 *
 * @param apiMeta - API metadata containing consumes array and bodyType
 * @returns 'two-param' or 'three-param'
 *
 * @example
 * ```typescript
 * // File upload API
 * const mode = selectSignatureMode({
 *   consumes: ['multipart/form-data']
 * });
 * // Returns: 'three-param'
 *
 * // JSON API with object body
 * const mode = selectSignatureMode({
 *   consumes: ['application/json'],
 *   bodyType: 'object'
 * });
 * // Returns: 'two-param'
 *
 * // JSON API with string body
 * const mode = selectSignatureMode({
 *   consumes: ['application/json'],
 *   bodyType: 'string'
 * });
 * // Returns: 'three-param'
 *
 * // GET request (no body)
 * const mode = selectSignatureMode({
 *   method: 'GET',
 *   bodyType: 'none'
 * });
 * // Returns: 'two-param'
 * ```
 */
export function selectSignatureMode(apiMeta: Partial<PontxAPI>): SignatureMode {
  // Get first content type from consumes array
  const contentType = apiMeta.consumes?.[0];

  // Check for non-JSON content types (always three-param)
  // Use includes() to handle content types with parameters (e.g., "multipart/form-data; boundary=...")
  if (contentType?.includes('multipart/form-data')) {
    // Requirement 4.1: multipart/form-data -> three-param
    return 'three-param';
  }

  if (contentType?.includes('application/octet-stream')) {
    // Requirement 4.2: application/octet-stream -> three-param
    return 'three-param';
  }

  // Check bodyType to determine signature mode
  const bodyType = (apiMeta as any).bodyType;

  if (bodyType) {
    // Use bodyType for precise signature selection
    switch (bodyType) {
      case 'object':
      case 'none':
        // Object body can be merged with params → two-param mode
        // No body → two-param mode (params, options)
        return 'two-param';

      case 'map':
      case 'array':
      case 'string':
      case 'number':
      case 'boolean':
      case 'integer':
        // Non-object types cannot be merged → three-param mode
        return 'three-param';

      default:
        // Unknown bodyType, assume object (two-param)
        return 'two-param';
    }
  }

  // No bodyType specified, default to two-param (Requirement 4.6, 4.7)
  // This assumes JSON object body or no body
  return 'two-param';
}
