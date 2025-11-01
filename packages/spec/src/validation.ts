/**
 * Validation result for API key validation
 */
export interface ValidationResult {
  /** Whether the API key is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Validates a flat API key according to the following rules:
 * 1. Must not contain '/' character (flat API keys have no namespace)
 * 2. Must be a valid JavaScript identifier (can be used as object property)
 * 3. Length must be between 1 and 255 characters
 * 4. Must not be empty or whitespace-only
 *
 * @param apiKey - The API key to validate
 * @returns Validation result with valid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = validateFlatApiKey('symbolSearch');
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateFlatApiKey(apiKey: string): ValidationResult {
  // Handle non-string input
  if (typeof apiKey !== "string") {
    return {
      valid: false,
      error: `API key must be a string. Received: ${typeof apiKey}`,
    };
  }

  // Check for empty or whitespace-only string
  if (apiKey.trim().length === 0) {
    return {
      valid: false,
      error: "API key cannot be empty",
    };
  }

  // Check length constraints (1-255 characters)
  if (apiKey.length > 255) {
    return {
      valid: false,
      error: `API key length must be between 1 and 255 characters. Found: ${apiKey.length}`,
    };
  }

  // Check for '/' character (indicates hierarchical structure)
  if (apiKey.includes("/")) {
    return {
      valid: false,
      error: `API key cannot contain '/'. Found: ${apiKey}`,
    };
  }

  // Check if it's a valid JavaScript identifier
  // Valid identifier: starts with letter, underscore, or $, followed by letters, digits, underscores, or $
  const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  if (!identifierRegex.test(apiKey)) {
    return {
      valid: false,
      error: `API key must be a valid JavaScript identifier. Found: ${apiKey}`,
    };
  }

  // All validations passed
  return {
    valid: true,
  };
}
