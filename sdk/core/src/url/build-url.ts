/**
 * URL building module - buildUrl and getPathParamNames
 *
 * This module provides core URL building functionality for replacing
 * path parameters with their values and extracting parameter names.
 */

/**
 * Options for buildUrl function
 */
export interface BuildUrlOptions {
  /**
   * Placeholder to use when a path parameter is missing
   * Example: ':id' will replace {userId} with :id when userId is not in params
   */
  pathMark?: string;
}

/**
 * Build a URL by replacing path parameters with their values
 *
 * Requirements:
 * 1. When path contains {paramName} and params has the value, replace with URL-encoded value
 * 2. When path contains {paramName} but params lacks the value and pathMark is configured, use pathMark
 * 3. When path contains {paramName} but params lacks value and no pathMark, keep placeholder
 *
 * @param path - The URL path template with {paramName} placeholders
 * @param params - Object containing parameter values
 * @param options - Configuration options including pathMark
 * @returns The URL with parameters replaced
 *
 * @example
 * ```typescript
 * // Basic replacement
 * buildUrl('/users/{userId}', { userId: '123' })
 * // Returns: '/users/123'
 *
 * // URL encoding
 * buildUrl('/search/{query}', { query: 'hello world' })
 * // Returns: '/search/hello%20world'
 *
 * // Using pathMark for missing parameters
 * buildUrl('/users/{userId}', {}, { pathMark: ':id' })
 * // Returns: '/users/:id'
 *
 * // Keeping placeholder when no pathMark
 * buildUrl('/users/{userId}', {})
 * // Returns: '/users/{userId}'
 * ```
 */
export function buildUrl(
  path: string,
  params: Record<string, unknown> = {},
  options: BuildUrlOptions = {}
): string {
  const { pathMark } = options;

  // Regular expression to match {paramName} patterns
  // Matches parameter names that can contain letters, numbers, underscores, and hyphens
  const paramPattern = /\{([^}]+)\}/g;

  // Replace each {paramName} with the appropriate value
  return path.replace(paramPattern, (match, paramName) => {
    const value = params[paramName];

    // Check if the value exists and is not null/undefined/empty string
    if (hasValidValue(value)) {
      // Convert the value to string and URL-encode it
      return encodeURIComponent(String(value));
    } else if (pathMark !== undefined) {
      // Use pathMark when parameter is missing and pathMark is provided
      return pathMark;
    } else {
      // Keep the placeholder when parameter is missing and no pathMark
      return match;
    }
  });
}

/**
 * Check if a value is valid for use as a path parameter
 * A value is valid if it's not null, undefined, or empty string
 */
function hasValidValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Get the set of parameter names used in the path
 * Helper function to identify which params are path params vs query params
 *
 * @param path - The URL path template with {paramName} placeholders
 * @returns A Set of parameter names found in the path
 *
 * @example
 * ```typescript
 * getPathParamNames('/users/{userId}/posts/{postId}')
 * // Returns: Set { 'userId', 'postId' }
 * ```
 */
export function getPathParamNames(path: string): Set<string> {
  const paramNames = new Set<string>();
  // Use the same pattern as buildUrl for consistency
  const paramPattern = /\{([^}]+)\}/g;

  path.replace(paramPattern, (match, paramName) => {
    paramNames.add(paramName);
    return paramName;
  });

  return paramNames;
}
