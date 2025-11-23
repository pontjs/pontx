/**
 * createClient Factory Function
 *
 * Main entry point for creating SDK clients. Handles:
 * - Configuration parsing and validation
 * - Request function wrapping chain (validation → mock → retry → logging)
 * - Proxy client building
 * - Configuration immutability
 */

import type {
  CreateClientConfig,
  PontxSpecMeta,
  RequestFn,
  Client,
} from '../types';
import { buildProxyClient } from './proxy-client';
import { withValidation } from '../features/validation';
import { withMock } from '../features/mock';
import { withRetry } from '../features/retry';
import { withLogging } from '../features/logger';

/**
 * Validate pontxSpecMeta format
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
 * Create SDK client from configuration
 *
 * This is the main entry point for creating a Pontx SDK client. It:
 * 1. Validates the configuration
 * 2. Wraps the request function with optional features (validation, mock, retry, logging)
 * 3. Builds a Proxy-based client with dynamic API methods
 * 4. Freezes the configuration to prevent modifications
 *
 * @param config - Client configuration
 * @returns Type-safe SDK client
 *
 * @example
 * ```typescript
 * import { createClient } from '@pontx/nodejs-sdk';
 * import pontxMeta from './api-meta.json';
 *
 * const client = createClient({
 *   pontxSpecMeta: pontxMeta,
 *   validation: { enabled: true },
 *   retry: { maxAttempts: 3 },
 *   logger: { enabled: true },
 * });
 *
 * // Use the client
 * const user = await client.users.getUser.request({ userId: '123' });
 * ```
 */
export function createClient<T extends Record<string, Record<string, any>>>(
  config: CreateClientConfig<T>
): Client<T> {
  // Validate pontxSpecMeta
  validatePontxSpecMeta(config.pontxSpecMeta);

  // Get base request function (default to native fetch)
  let requestFn: RequestFn = config.fetchFn || (global.fetch as RequestFn);

  // Build request function wrapping chain
  // Order: validation → mock → retry → logging
  // Only wrap if feature is configured

  // 1. Validation wrapper
  if (config.validation) {
    requestFn = withValidation(
      requestFn,
      config.validation,
      config.pontxSpecMeta.apis
    );
  }

  // 2. Mock wrapper
  if (config.mock) {
    requestFn = withMock(requestFn, config.mock);
  }

  // 3. Retry wrapper
  if (config.retry) {
    requestFn = withRetry(requestFn, config.retry);
  }

  // 4. Logging wrapper
  if (config.logger) {
    requestFn = withLogging(requestFn, config.logger);
  }

  // Build proxy client
  const client = buildProxyClient(requestFn, config.pontxSpecMeta, {
    getFetchUrl: config.getFetchUrl,
    pathMark: config.pathMark,
    makeCustomUsages: config.makeCustomUsages,
  });

  // Freeze configuration to prevent modifications
  deepFreeze(config);

  return client;
}
