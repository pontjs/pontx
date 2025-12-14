/**
 * Request body serialization module
 *
 * This module provides functionality to serialize request bodies based on Content-Type.
 * Supports JSON, URLSearchParams, FormData, and text/plain serialization.
 */

import type { ContentType } from '../types/base';
import type { PontxAPI } from '@pontx/spec';

/**
 * Checks if a value is null or undefined
 * @internal
 */
function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Serializes request body based on Content-Type
 *
 * @param body - Request body to serialize
 * @param contentType - Content-Type header value
 * @returns Serialized body (string, URLSearchParams, or FormData)
 */
export function serializeRequestBody(
  body: unknown,
  contentType: ContentType,
): string | URLSearchParams | FormData {
  if (contentType === 'application/json') {
    return JSON.stringify(body);
  }

  if (contentType === 'application/x-www-form-urlencoded') {
    return serializeToUrlSearchParams(body);
  }

  if (contentType === 'multipart/form-data') {
    return serializeToFormData(body);
  }

  if (contentType === 'text/plain') {
    if (typeof body === 'string') {
      return body;
    }
    return String(body);
  }

  throw new Error(
    `Unsupported Content-Type: ${contentType}. ` +
      `Supported types: application/json, application/x-www-form-urlencoded, multipart/form-data, text/plain`,
  );
}

/**
 * Serializes body to URLSearchParams
 *
 * @param body - Body object to serialize
 * @returns URLSearchParams instance
 *
 * @internal
 */
function serializeToUrlSearchParams(body: unknown): URLSearchParams {
  const params = new URLSearchParams();

  if (typeof body !== 'object' || body === null) {
    return params;
  }

  const bodyObj = body as Record<string, unknown>;

  for (const [key, value] of Object.entries(bodyObj)) {
    // Skip undefined and null values
    if (isNullOrUndefined(value)) {
      continue;
    }

    // Handle array values - append each item with the same key
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isNullOrUndefined(item)) {
          params.append(key, String(item));
        }
      }
      continue;
    }

    // Handle object values - serialize as JSON
    if (typeof value === 'object') {
      params.append(key, JSON.stringify(value));
      continue;
    }

    // Handle primitive values
    params.append(key, String(value));
  }

  return params;
}

/**
 * Serializes body to FormData
 *
 * @param body - Body object to serialize
 * @returns FormData instance
 *
 * @internal
 */
function serializeToFormData(body: unknown): FormData {
  const formData = new FormData();

  if (typeof body !== 'object' || body === null) {
    return formData;
  }

  const bodyObj = body as Record<string, unknown>;

  for (const [key, value] of Object.entries(bodyObj)) {
    // Skip undefined and null values
    if (isNullOrUndefined(value)) {
      continue;
    }

    // Handle array values - append each item with the same key
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isNullOrUndefined(item)) {
          appendToFormData(formData, key, item);
        }
      }
      continue;
    }

    // Append single value
    appendToFormData(formData, key, value);
  }

  return formData;
}

/**
 * Appends a value to FormData, handling different value types
 *
 * @param formData - FormData instance
 * @param key - Field name
 * @param value - Value to append
 *
 * @internal
 */
function appendToFormData(
  formData: FormData,
  key: string,
  value: unknown,
): void {
  // Handle File objects
  if (value instanceof File) {
    formData.append(key, value);
    return;
  }

  // Handle Blob objects
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  // Handle object values - serialize as JSON
  if (typeof value === 'object' && value !== null) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  // Handle primitive values
  formData.append(key, String(value));
}

/**
 * Gets Content-Type from API metadata
 *
 * Returns the first Content-Type from the consumes array in API metadata.
 * Returns undefined if consumes is not provided or is empty.
 *
 * @param apiMeta - API metadata from PontxSpecMeta
 * @returns Content-Type string or undefined
 *
 * @example
 * const apiMeta = {
 *   path: '/api/user',
 *   method: 'POST',
 *   consumes: ['application/json', 'application/xml']
 * };
 * const contentType = getContentType(apiMeta);
 * // Returns: 'application/json'
 */
export function getContentType(apiMeta: Partial<PontxAPI>): string | undefined {
  if (!apiMeta.consumes || apiMeta.consumes.length === 0) {
    return undefined;
  }

  return apiMeta.consumes[0];
}
