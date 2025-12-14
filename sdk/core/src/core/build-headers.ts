import { PontxAPIMeta } from '../types';

/**
 * Build request headers from API metadata and options
 *
 * @param apiMeta - API metadata
 * @param options - Request options
 * @returns Headers object
 */
export function buildHeaders(
  apiMeta: PontxAPIMeta,
  options?: RequestInit,
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Set Content-Type from consumes (first element)
  if (apiMeta.consumes && apiMeta.consumes.length > 0) {
    headers['Content-Type'] = apiMeta.consumes[0];
  }

  // Set Accept from produces (first element)
  if (apiMeta.produces && apiMeta.produces.length > 0) {
    headers['Accept'] = apiMeta.produces[0];
  }

  // Merge user-provided headers (user headers override defaults)
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  return headers;
}
