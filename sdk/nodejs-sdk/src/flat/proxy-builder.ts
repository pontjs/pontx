/**
 * Flat Proxy Builder Module
 *
 * This module builds a single-layer Proxy client that exposes all APIs directly
 * at the root level without controller/namespace hierarchy.
 *
 * Requirements covered:
 * - 2.1: Direct API access pattern (client.apiName)
 * - 4.2: Reuse createCallableApiMethod for each API
 * - Design Decision 2: Simplified single-layer proxy builder
 */

import type { PontxSpecMeta, RequestFn } from '../types';
import { createCallableApiMethod, type CallableMethodOptions } from '../graceful/callable-method';

/**
 * Options for building flat proxy client
 */
export interface FlatProxyOptions extends CallableMethodOptions {}

/**
 * Build flat proxy client from API metadata
 *
 * Creates a single-layer Proxy supporting `client.apiName(...)` access pattern.
 * Each API method is a callable function object that can be invoked directly.
 *
 * Unlike the graceful client which has a two-layer structure (client.controller.method),
 * the flat client exposes all APIs directly at the root level.
 *
 * @param requestFn - Request function to execute API calls
 * @param pontxSpecMeta - API metadata (must be flat structure)
 * @param options - Proxy client options
 * @returns Proxy client with dynamic callable API methods
 *
 * @example
 * ```typescript
 * const client = buildFlatProxyClient(fetch, pontxSpecMeta);
 *
 * // Direct API call (no controller layer)
 * const results = await client.symbolSearch({ q: 'AAPL' });
 * const quote = await client.stockQuote({ symbol: 'AAPL' });
 *
 * // Utility methods
 * const key = client.symbolSearch.getFetchKey({ q: 'AAPL' });
 * const opts = client.symbolSearch.queryOptions({ q: 'AAPL' });
 * ```
 *
 * Requirements:
 * - 2.1: Support direct API access pattern
 * - 4.2: Reuse createCallableApiMethod for consistency
 * - Design: Single-layer proxy for performance and simplicity
 */
export function buildFlatProxyClient(
  requestFn: RequestFn,
  pontxSpecMeta: PontxSpecMeta,
  options?: FlatProxyOptions
): any {
  // Create target object to hold all API methods
  const target: Record<string, any> = {};

  // Iterate through all APIs and create callable methods
  for (const [apiKey, apiMeta] of Object.entries(pontxSpecMeta.apis)) {
    // Create callable method using the same factory as graceful client
    // This ensures feature parity (validation, mock, retry, logger, etc.)
    target[apiKey] = createCallableApiMethod(
      apiKey,
      apiMeta,
      requestFn,
      options
    );
  }

  // Create Proxy to handle property access and provide clear error messages
  return new Proxy(target, {
    get(target, prop: string) {
      // Return property if it exists
      if (prop in target) {
        return target[prop];
      }

      // Throw clear error for non-existent APIs
      throw new Error(`API "${prop}" not found in client`);
    },

    // Support property enumeration
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },

    // Support Object.getOwnPropertyDescriptor
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },

    // Support "in" operator
    has(target, prop) {
      return prop in target;
    },
  });
}
