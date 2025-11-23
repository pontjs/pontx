/**
 * Query parameter concatenation utilities
 *
 * This module provides functionality to append query parameters to URLs
 * with proper encoding and handling of various data types.
 */

/**
 * Appends query parameters to a URL
 *
 * @param url - The base URL to append parameters to
 * @param params - Object containing query parameters to append
 * @returns URL with query parameters appended
 *
 * @example
 * \`\`\`typescript
 * appendQueryParams('/api/users', { page: 1, limit: 10 });
 * // Returns: '/api/users?page=1&limit=10'
 *
 * appendQueryParams('/api/users', { tags: ['frontend', 'backend'] });
 * // Returns: '/api/users?tags=frontend&tags=backend'
 *
 * appendQueryParams('/api/users', { filter: { status: 'active' } });
 * // Returns: '/api/users?filter=%7B%22status%22%3A%22active%22%7D'
 * \`\`\`
 */
export function appendQueryParams(
  url: string,
  params: Record<string, unknown>
): string {
  // Filter out undefined and null values
  const validParams = Object.entries(params).filter(
    ([_, value]) => value !== undefined && value !== null
  );

  // If no valid parameters, return original URL
  if (validParams.length === 0) {
    return url;
  }

  // Build query string
  const queryParts: string[] = [];

  for (const [key, value] of validParams) {
    if (Array.isArray(value)) {
      // Handle arrays: add multiple params with same key
      if (value.length === 0) {
        continue; // Skip empty arrays
      }
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          // Serialize object items to JSON
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(item))}`);
        } else {
          // Convert primitive items to string
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle objects: serialize to JSON
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`);
    } else {
      // Handle primitives: convert to string
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  // If no query parts after processing, return original URL
  if (queryParts.length === 0) {
    return url;
  }

  // Determine separator (? or &)
  const separator = url.includes('?') ? '&' : '?';

  // Append and return
  return `${url}${separator}${queryParts.join('&')}`;
}
