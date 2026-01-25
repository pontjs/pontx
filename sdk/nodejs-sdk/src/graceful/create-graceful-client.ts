/**
 * createGracefulClient Factory Function
 *
 * Main entry point for creating graceful SDK clients. Handles:
 * - Configuration parsing and validation (Requirement 1.1, 5.6)
 * - Request function wrapping chain (validation → mock → retry → logging)
 * - Graceful proxy client building (Requirement 1.2)
 * - Configuration immutability (Requirement 1.5)
 *
 * This is a NEW entry point that coexists with createClient.
 * It provides improved API ergonomics with direct method calls.
 */

import type {
  CreateGracefulClientConfig,
  PontxSpecMeta,
  GracefulClient,
} from '../types';
import type { RequestFn as GracefulRequestFn } from '../types/graceful';
import { buildGracefulProxyClient } from './proxy-builder';
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
 * Create graceful SDK client from configuration
 *
 * This is the new entry point for creating a Pontx SDK client with improved ergonomics.
 * It provides the same features as createClient but with a different API pattern:
 * - Direct method calls: client.users.getUser({ userId: '123' })
 * - No .request() suffix needed
 * - Intelligent parameter classification (path/query/body)
 * - Two-param mode for JSON APIs, three-param mode for FormData/Blob
 *
 * The client creation process:
 * 1. Validates the configuration (fail-fast on errors)
 * 2. Wraps the request function with optional features in order:
 *    - validation → mock → retry → logging
 * 3. Builds a Proxy-based client with dynamic callable API methods
 * 4. Freezes the configuration to prevent modifications
 *
 * @param config - Client configuration
 * @returns Type-safe graceful SDK client
 *
 * @example
 * ```typescript
 * import { createGracefulClient } from '@pontx/nodejs-sdk';
 * import pontxMeta from './api-meta.json';
 *
 * const client = createGracefulClient({
 *   pontxSpecMeta: pontxMeta,
 *   validation: { enabled: true },
 *   retry: { maxAttempts: 3 },
 *   logger: { enabled: true },
 * });
 *
 * // Direct method call (no .request suffix)
 * const user = await client.users.getUser({ userId: '123' });
 *
 * // Utility methods still available
 * const key = client.users.getUser.getFetchKey({ userId: '123' });
 * const opts = client.users.getUser.queryOptions({ userId: '123' });
 * ```
 */
export function createGracefulClient<T extends Record<string, Record<string, any>>>(
  config: CreateGracefulClientConfig<T>
): GracefulClient<T> {
  // Validate pontxSpecMeta (Requirement 4.2)
  validatePontxSpecMeta(config.pontxSpecMeta);

  // Get base request function (default to native fetch) (Requirement 4.1)
  let requestFn: GracefulRequestFn = config.fetchFn || (global.fetch as any);

  // Build request function wrapping chain (Requirement 4.1)
  // Order: validation → mock → retry → logging
  // This matches the existing createClient wrapper order

  // 1. Validation wrapper
  if (config.validation) {
    requestFn = withValidation(
      requestFn as any,
      config.validation,
      config.pontxSpecMeta.apis
    ) as any;
  }

  // 2. Mock wrapper
  if (config.mock) {
    requestFn = withMock(requestFn as any, config.mock) as any;
  }

  // 3. Retry wrapper
  if (config.retry) {
    requestFn = withRetry(requestFn as any, config.retry) as any;
  }

  // 4. Logging wrapper
  if (config.logger) {
    requestFn = withLogging(requestFn as any, config.logger) as any;
  }

  // Build graceful proxy client (Requirement 3.1, 4.1)
  const client = buildGracefulProxyClient(requestFn as any, config.pontxSpecMeta, {
    getFetchUrl: config.getFetchUrl,
    pathMark: config.pathMark,
    makeCustomUsages: config.makeCustomUsages,
  });

  // Freeze configuration to prevent modifications (Requirement 4.4)
  deepFreeze(config);

  return client as GracefulClient<T>;
}
