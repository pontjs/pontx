/**
 * Flat Client Validation Module
 *
 * This module provides validation functions for flat client structure.
 * It ensures that API metadata conforms to flat structure requirements:
 * - All API keys must not contain "/" (no namespace hierarchy)
 * - All API keys must be valid JavaScript identifiers
 * - All API keys must meet length constraints
 *
 * Requirements covered:
 * - 6.4: Detect hierarchical API keys and provide clear error messages
 * - 6.5: Fast-fail validation before client construction
 * - 6.6: Call @pontx/spec validation methods
 * - 7.1-7.5: Delegate to @pontx/spec's validateFlatApiKey
 */

import { validateFlatApiKey } from '@pontx/spec';
import type { PontxSpecMeta } from '../types';

/**
 * Validates that the pontxSpecMeta conforms to flat structure requirements.
 *
 * A flat structure means:
 * 1. All API keys are at the root level (no namespace prefixes)
 * 2. No API key contains "/" character
 * 3. All API keys are valid JavaScript identifiers
 *
 * This function iterates through all API keys in the metadata and validates
 * each one using @pontx/spec's validateFlatApiKey function. If any API key
 * is hierarchical (contains "/"), it throws a descriptive error suggesting
 * the use of createGracefulClient instead.
 *
 * @param pontxSpecMeta - The API metadata to validate
 * @throws {Error} When hierarchical API keys are found or API keys are invalid
 *
 * @example
 * ```typescript
 * // Valid flat structure
 * const flatMeta = {
 *   name: 'Finnhub API',
 *   apis: {
 *     symbolSearch: { ... },
 *     stockQuote: { ... }
 *   }
 * };
 * validateFlatStructure(flatMeta); // ✓ Passes
 *
 * // Invalid hierarchical structure
 * const hierarchicalMeta = {
 *   name: 'REST API',
 *   apis: {
 *     'users/getUser': { ... },
 *     'users/createUser': { ... }
 *   }
 * };
 * validateFlatStructure(hierarchicalMeta); // ✗ Throws error
 * ```
 *
 * Requirements:
 * - 6.4: Reject metadata with namespace-prefixed API keys
 * - 6.5: Fast-fail validation before client construction
 * - 6.6: Call @pontx/spec's validateFlatApiKey for each key
 */
export function validateFlatStructure(pontxSpecMeta: PontxSpecMeta): void {
  const apiKeys = Object.keys(pontxSpecMeta.apis || {});

  // Collect all invalid keys for detailed error reporting
  const hierarchicalKeys: string[] = [];
  const invalidKeys: Array<{ key: string; error: string }> = [];

  // Validate each API key
  for (const apiKey of apiKeys) {
    const result = validateFlatApiKey(apiKey);

    if (!result.valid) {
      // Check if the error is due to "/" (hierarchical structure)
      if (apiKey.includes('/')) {
        hierarchicalKeys.push(apiKey);
      } else {
        // Other validation errors (invalid identifier, length, etc.)
        invalidKeys.push({ key: apiKey, error: result.error || 'Unknown error' });
      }
    }
  }

  // Throw error if hierarchical keys are found
  if (hierarchicalKeys.length > 0) {
    const keysList = hierarchicalKeys.map(k => `"${k}"`).join(', ');
    throw new Error(
      `Flat client requires APIs without namespace. Found hierarchical API keys: [${keysList}]. ` +
      `Please use createGracefulClient instead.`
    );
  }

  // Throw error if other invalid keys are found
  if (invalidKeys.length > 0) {
    const errorDetails = invalidKeys
      .map(({ key, error }) => `  - "${key}": ${error}`)
      .join('\n');
    throw new Error(
      `Invalid API keys found in pontxSpecMeta:\n${errorDetails}`
    );
  }
}
