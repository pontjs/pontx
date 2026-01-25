/**
 * createFlatClient Factory Function
 *
 * Main entry point for creating flat SDK clients. Handles:
 * - Configuration parsing and validation (Requirement 1.1, 5.6)
 * - Request function wrapping chain (validation → mock → retry → logging)
 * - Flat proxy client building (Requirement 1.2)
 * - Configuration immutability (Requirement 1.5)
 *
 * This factory creates clients for flat API specifications (no namespace/controller hierarchy).
 * It provides the same features as createGracefulClient but with direct API access at root level.
 */

import type {
  CreateFlatClientConfig,
  PontxSpecMeta,
  FlatClient,
} from '../types';
import type { RequestFn } from '../types/graceful';
import { buildFlatProxyClient } from './proxy-builder';
import { validateFlatStructure } from '../core/validate-flat';
import { withValidation } from '../features/validation';
import { withMock } from '../features/mock';
import { withRetry } from '../features/retry';
import { withLogging } from '../features/logger';

/**
 * Validate pontxSpecMeta format
 *
 * Ensures the metadata has required fields:
 * - name: string
 * - apis: object
 *
 * @param meta - Metadata to validate
 * @throws Error if metadata is invalid
 */
function validatePontxSpecMeta(meta: any): asserts meta is PontxSpecMeta {
  if (!meta || typeof meta !== 'object') {
    throw new Error('Invalid pontxSpecMeta: must be an object');
  }

  if (!meta.name || typeof meta.name !== 'string') {
    throw new Error('Invalid pontxSpecMeta: missing or invalid "name" property');
  }

  if (!meta.apis || typeof meta.apis !== 'object') {
    throw new Error('Invalid pontxSpecMeta: missing or invalid "apis" property');
  }
}

/**
 * Deep freeze an object and all its nested properties
 *
 * This prevents runtime modifications to the configuration object,
 * ensuring immutability (Requirement 1.5, 4.4).
 *
 * @param obj - Object to freeze
 * @returns Frozen object
 */
function deepFreeze<T>(obj: T): T {
  // Freeze the object itself
  Object.freeze(obj);

  // Freeze all nested objects
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj;
}

/**
 * Create flat SDK client from configuration
 *
 * This factory creates a Pontx SDK client for flat API specifications
 * (without namespace/controller hierarchy). It provides direct API access:
 * - Direct method calls: client.symbolSearch({ q: 'AAPL' })
 * - No controller layer needed
 * - Intelligent parameter classification (path/query/body)
 * - Two-param mode for JSON APIs, three-param mode for FormData/Blob
 *
 * The client creation process:
 * 1. Validates the configuration (fail-fast on errors)
 * 2. Validates flat structure (rejects hierarchical API keys with "/")
 * 3. Wraps the request function with optional features in order:
 *    - validation → mock → retry → logging
 * 4. Builds a Proxy-based client with dynamic callable API methods
 * 5. Freezes the configuration to prevent modifications
 *
 * @param config - Client configuration
 * @returns Type-safe flat SDK client
 *
 * @example
 * ```typescript
 * import { createFlatClient } from '@pontx/nodejs-sdk';
 * import pontxMeta from './api-meta.json';
 *
 * const client = createFlatClient({
 *   pontxSpecMeta: pontxMeta,
 *   validation: { enabled: true },
 *   retry: { maxAttempts: 3 },
 *   logger: { enabled: true },
 * });
 *
 * // Direct method call (no controller layer)
 * const results = await client.symbolSearch({ q: 'AAPL' });
 *
 * // Utility methods still available
 * const key = client.symbolSearch.getFetchKey({ q: 'AAPL' });
 * const opts = client.symbolSearch.queryOptions({ q: 'AAPL' });
 * ```
 *
 * Requirements:
 * - 1.1-1.4: Client creation with configuration
 * - 4.1: Request function wrapping chain
 * - 6.1-6.3: Metadata validation
 * - 6.4: Reject hierarchical API keys
 */
export function createFlatClient<T extends Record<string, any>>(
  config: CreateFlatClientConfig<T>
): FlatClient<T> {
  // Validate pontxSpecMeta (Requirement 6.1, 6.2, 6.3)
  validatePontxSpecMeta(config.pontxSpecMeta);

  // Validate flat structure (Requirement 6.4, 6.5, 6.6)
  // This will throw if any API key contains "/" or is invalid
  validateFlatStructure(config.pontxSpecMeta);

  // Get base request function (default to native fetch) (Requirement 1.3, 4.1)
  let requestFn: RequestFn = config.fetchFn || (global.fetch as any);

  // Build request function wrapping chain (Requirement 4.1)
  // Order: validation → mock → retry → logging
  // This matches the existing createClient and createGracefulClient wrapper order

  // 1. Validation wrapper (Requirement 8.1)
  if (config.validation) {
    requestFn = withValidation(
      requestFn as any,
      config.validation,
      config.pontxSpecMeta.apis
    ) as any;
  }

  // 2. Mock wrapper (Requirement 8.2)
  if (config.mock) {
    requestFn = withMock(requestFn as any, config.mock) as any;
  }

  // 3. Retry wrapper (Requirement 8.3)
  if (config.retry) {
    requestFn = withRetry(requestFn as any, config.retry) as any;
  }

  // 4. Logging wrapper (Requirement 8.4)
  if (config.logger) {
    requestFn = withLogging(requestFn as any, config.logger) as any;
  }

  // Build flat proxy client (Requirement 1.1, 1.2, 4.2)
  const client = buildFlatProxyClient(requestFn as any, config.pontxSpecMeta, {
    getFetchUrl: config.getFetchUrl,
    pathMark: config.pathMark,
    makeCustomUsages: config.makeCustomUsages,
  });

  // Freeze configuration to prevent modifications (Requirement 1.4, 1.5)
  deepFreeze(config);

  return client as FlatClient<T>;
}
