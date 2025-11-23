/**
 * Graceful Proxy Builder Module
 *
 * This module builds a two-layer Proxy client that supports direct method invocation
 * without the `.request()` suffix.
 *
 * Requirements covered:
 * - 1.2: Return client instance using new API pattern
 * - 2.1: Direct method call executes request
 * - 3.1: Implement two-layer Proxy structure (client.controller.method)
 */

import type { PontxSpecMeta, PontxAPI, RequestFn } from '../types';
import { createCallableApiMethod, type CallableMethodOptions } from './callable-method';

/**
 * Options for building graceful proxy client
 */
export interface GracefulProxyOptions extends CallableMethodOptions {}

/**
 * Parse API key into controller path and method name
 *
 * @param apiKey - API key in format "controller/method" or "namespace/controller/method"
 * @returns [controllerPath[], methodName]
 *
 * @example
 * ```typescript
 * parseApiKey('users/getUser')
 * // Returns: [['users'], 'getUser']
 *
 * parseApiKey('admin/users/createUser')
 * // Returns: [['admin', 'users'], 'createUser']
 * ```
 */
function parseApiKey(apiKey: string): [string[], string] {
  const parts = apiKey.split('/');
  const methodName = parts[parts.length - 1];
  const controllerPath = parts.slice(0, -1);
  return [controllerPath, methodName];
}

/**
 * Build graceful proxy client from API metadata
 *
 * Creates a two-layer Proxy supporting `client.controller.method(...)` access pattern.
 * Each API method is a callable function object that can be invoked directly.
 *
 * @param requestFn - Request function to execute API calls
 * @param pontxSpecMeta - API metadata
 * @param options - Proxy client options
 * @returns Proxy client with dynamic callable API methods
 *
 * @example
 * ```typescript
 * const client = buildGracefulProxyClient(fetch, pontxSpecMeta);
 *
 * // Direct method call (no .request suffix)
 * const user = await client.users.getUser({ userId: '123' });
 *
 * // Utility methods still available
 * const key = client.users.getUser.getFetchKey({ userId: '123' });
 * const opts = client.users.getUser.queryOptions({ userId: '123' });
 * ```
 */
export function buildGracefulProxyClient(
  requestFn: RequestFn,
  pontxSpecMeta: PontxSpecMeta,
  options?: GracefulProxyOptions
): any {
  // Build controller mapping from API keys
  const controllerMap = new Map<string, any>();

  for (const [apiKey, apiMeta] of Object.entries(pontxSpecMeta.apis)) {
    const [controllerPath, methodName] = parseApiKey(apiKey);

    // Build nested controller structure
    let currentMap = controllerMap;
    for (const controllerName of controllerPath) {
      if (!currentMap.has(controllerName)) {
        currentMap.set(controllerName, new Map());
      }
      currentMap = currentMap.get(controllerName)!;
    }

    // Add callable method to the final controller
    currentMap.set(
      methodName,
      createCallableApiMethod(apiKey, apiMeta, requestFn, options)
    );
  }

  // Convert Map structure to nested Proxy objects
  function buildProxyFromMap(map: Map<string, any>): any {
    const target: any = {};

    for (const [key, value] of map.entries()) {
      if (value instanceof Map) {
        // Nested controller - create nested Proxy
        target[key] = buildProxyFromMap(value);
      } else {
        // Callable API method object
        target[key] = value;
      }
    }

    return new Proxy(target, {
      get(target, prop: string) {
        if (prop in target) {
          return target[prop];
        }

        // Throw error for non-existent APIs
        throw new Error(`API "${prop}" not found in client`);
      },
    });
  }

  return buildProxyFromMap(controllerMap);
}
