import { PontxSpec } from "@pontx/spec";
import { withMock, withRetry } from "../features";
import { PontxSpecMeta } from "../types";
import {
  BaseRequestFn,
  CreateRequester,
  EnhancedRequestInit,
  PontxAPIMeta,
} from "../types/base";
import { FetchClient } from "../types/client";
import { MockConfig, RetryConfig } from "../types/feature";
import { BaseRequesterConfig, createFetchRequester } from "./create-requester";

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
  if (!meta || typeof meta !== "object") {
    throw new Error("Invalid pontxSpecMeta: must be an object");
  }

  if (!meta.name || typeof meta.name !== "string") {
    throw new Error(
      'Invalid pontxSpecMeta: missing or invalid "name" property'
    );
  }

  if (!meta.apis || typeof meta.apis !== "object") {
    throw new Error(
      'Invalid pontxSpecMeta: missing or invalid "apis" property'
    );
  }
}

/**
 * Deep freeze an object and all its nested properties
 */
function deepFreeze<T>(obj: T): T {
  // Freeze the object itself
  Object.freeze(obj);

  // Freeze all nested objects
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as any)[prop];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj;
}

/**
 * Configuration for creating a pontx sdk client
 */
export interface BaseSDKClientConfig extends BaseRequesterConfig {
  baseUrl?: string;

  createRequester?: CreateRequester;

  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Placeholder for missing path parameters
   */
  pathMark?: string;

  /**
   * Function to add custom methods to each API method object
   */
  makeCustomUsages?: (
    usages: Record<string, any>,
    apiMeta?: PontxAPIMeta
  ) => Record<string, any>;

  /**
   * API parameter validation (optional)
   * Uses Zod schemas to validate request/response data
   *
   * When enabled:
   * - Request parameters are validated before sending
   * - Response data is validated after receiving
   * - Validation errors are thrown with detailed messages
   */
  //   validation?: ValidationConfig;

  /**
   * Mock data for testing (optional)
   * Returns static data instead of making real HTTP requests
   *
   * When enabled:
   * - All API calls return mock data
   * - No actual network requests are made
   * - Optional delay can simulate network latency
   */
  mock?: MockConfig;

  /**
   * Automatic retry on failure (optional)
   * Retries failed requests with exponential/linear backoff
   *
   * When enabled:
   * - Failed requests are automatically retried
   * - Configurable retry attempts and backoff strategy
   * - Retryable errors can be customized
   */
  retry?: RetryConfig;

  /**
   * Request/response logging (optional)
   * Logs API calls for debugging and monitoring
   *
   * When enabled:
   * - Logs request details (URL, method, params)
   * - Logs response details (status, data, timing)
   * - Custom logger instance can be provided
   */
  //   logger?: LoggerConfig;
}

export interface FetchSDKClientConfig extends BaseSDKClientConfig {
  /**
   * Custom fetch function (optional)
   * Defaults to Node.js native fetch (Node.js >= 18)
   *
   * Use this to:
   * - Add authentication headers globally
   * - Implement custom retry logic at transport level
   * - Use a different HTTP client (axios, got, etc.)
   */
  baseRequestFn?: BaseRequestFn;

  baseUrl?: string;

  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Placeholder for missing path parameters
   */
  pathMark?: string;

  beforeRequest?: (
    url: string,
    init: EnhancedRequestInit
  ) => Promise<{ url: string; init: EnhancedRequestInit }>;
}

/**
 * Helper function to create API proxy for a specific tag
 *
 * @param tagName - Tag name (controller name)
 * @param pontxSpecMeta - Pontx spec metadata
 * @param createRequester - Function to create API requester
 * @returns Proxy object for accessing APIs under this tag
 */
function createTagProxy(config: BaseSDKClientConfig, tagName: string) {
  const pontxSpecMeta = config.pontxSpecMeta;
  const tagProxy: Record<string, any> = {};

  return new Proxy(tagProxy, {
    get(target, apiName: string) {
      // Cache the API requester
      if (!target[apiName]) {
        const apiKey = `${tagName}/${apiName}`;
        const apiMeta = pontxSpecMeta.apis[apiKey];

        if (!apiMeta) {
          throw new Error(`API "${apiKey}" not found in client`);
        }

        target[apiName] = config.createRequester({
          apiMeta: pontxSpecMeta.apis?.[apiKey],
          apiKey,
          apiSelector: {
            specName: pontxSpecMeta.name,
            // tagName,
            controllerName: tagName,
            apiName,
          },
        });
      }

      return target[apiName];
    },
  });
}

/**
 * Helper function to extract tag names from pontxSpecMeta
 *
 * @param pontxSpecMeta - Pontx spec metadata
 * @returns Array of unique tag names
 */
function getTagNames(pontxSpecMeta: PontxSpecMeta): string[] {
  const tagSet = new Set<string>();

  Object.keys(pontxSpecMeta.apis).forEach((apiKey) => {
    const parts = apiKey.split("/");
    if (parts.length > 1) {
      tagSet.add(parts[0]);
    }
  });

  return Array.from(tagSet);
}

/**
 * Build a reusable proxy client that supports both:
 * - client.tagName.apiName(...args) - Access API via tag
 * - client.apiName(...args) - Direct API access
 *
 * @param pontxSpecMeta - Pontx spec metadata
 * @param createRequester - Function to create API requester for given apiKey and apiMeta
 * @returns Proxy client supporting both access patterns
 */
export function buildBaseProxyClient(config: BaseSDKClientConfig) {
  const pontxSpecMeta = config.pontxSpecMeta;
  // Create target object to hold all API methods and tag proxies
  const target: Record<string, any> = {};

  // Create Proxy to handle property access and provide clear error messages
  return new Proxy(target, {
    get(target, prop: string) {
      // Return cached property if it exists
      if (prop in target) {
        return target[prop];
      }

      if (pontxSpecMeta.hasTags) {
        const tagNames = getTagNames(pontxSpecMeta);

        // Check if prop is a tag name
        if (tagNames.includes(prop)) {
          // Create and cache tag proxy
          target[prop] = createTagProxy(config, prop);
          return target[prop];
        }

        // Also check for APIs without tag prefix
        // First check exact match
        if (pontxSpecMeta.apis[prop]) {
          target[prop] = config.createRequester({
            apiMeta: pontxSpecMeta.apis?.[prop],
            apiKey: prop,
            apiSelector: {
              specName: pontxSpecMeta.name,
              controllerName: "",
              apiName: prop,
            },
          });
          return target[prop];
        }

        // Then check for API with tag prefix (e.g., "user/getUser" when accessing "getUser")
        const matchingApiKey = Object.keys(pontxSpecMeta.apis).find(
          (apiKey) => {
            const parts = apiKey.split("/");
            return parts.length > 1 && parts[parts.length - 1] === prop;
          }
        );

        if (matchingApiKey) {
          const parts = matchingApiKey.split("/");
          const controllerName = parts.slice(0, -1).join("/");
          target[prop] = config.createRequester({
            apiMeta: pontxSpecMeta.apis?.[matchingApiKey],
            apiKey: matchingApiKey,
            apiSelector: {
              specName: pontxSpecMeta.name,
              controllerName,
              apiName: prop,
            },
          });
          return target[prop];
        }
      } else {
        // No tags: direct API access only
        const apiMeta = pontxSpecMeta.apis[prop];
        if (apiMeta) {
          target[prop] = config.createRequester({
            apiMeta: pontxSpecMeta.apis?.[prop],
            apiKey: prop,
            apiSelector: {
              specName: pontxSpecMeta.name,
              controllerName: "",
              apiName: prop,
            },
          });
          return target[prop];
        }
      }

      // Throw clear error for non-existent APIs
      throw new Error(`API "${prop}" not found in client`);
    },

    // Support property enumeration
    ownKeys(target) {
      if (pontxSpecMeta.hasTags) {
        const tagNames = getTagNames(pontxSpecMeta);
        return [...tagNames, ...Object.keys(pontxSpecMeta.apis)];
      }
      return Object.keys(pontxSpecMeta.apis);
    },

    // Support Object.getOwnPropertyDescriptor
    getOwnPropertyDescriptor(target, prop) {
      if (pontxSpecMeta.hasTags) {
        const tagNames = getTagNames(pontxSpecMeta);
        if (
          tagNames.includes(prop as string) ||
          pontxSpecMeta.apis[prop as string]
        ) {
          return {
            enumerable: true,
            configurable: true,
          };
        }
      } else if (pontxSpecMeta.apis[prop as string]) {
        return {
          enumerable: true,
          configurable: true,
        };
      }
      return undefined;
    },

    // Support "in" operator
    has(target, prop) {
      if (pontxSpecMeta.hasTags) {
        const tagNames = getTagNames(pontxSpecMeta);
        // Check if it's a tag name
        if (tagNames.includes(prop as string)) {
          return true;
        }

        // Check exact API key match
        if (pontxSpecMeta.apis[prop as string]) {
          return true;
        }

        // Check for API with tag prefix (e.g., "user/getUser" when checking "getUser")
        const hasMatchingApi = Object.keys(pontxSpecMeta.apis).some(
          (apiKey) => {
            const parts = apiKey.split("/");
            return parts.length > 1 && parts[parts.length - 1] === prop;
          }
        );

        return hasMatchingApi;
      }
      // Check if prop is a direct API key
      return !!pontxSpecMeta.apis[prop as string];
    },
  });
}

export function createBaseClient(config: BaseSDKClientConfig) {
  // Validate pontxSpecMeta
  validatePontxSpecMeta(config.pontxSpecMeta);

  // Get base request function (default to native fetch)
  let requestFn = config.baseRequestFn;

  // Build request function wrapping chain
  // Order: validation → mock → retry → logging
  // Only wrap if feature is configured

  // 1. Validation wrapper
  //   if (config.validation) {
  //     requestFn = withValidation(
  //       requestFn,
  //       config.validation,
  //       config.pontxSpecMeta.apis,
  //     );
  //   }

  // 2. Mock wrapper
  if (config.mock) {
    requestFn = withMock(requestFn, config.mock);
  }

  // 3. Retry wrapper
  if (config.retry) {
    requestFn = withRetry(requestFn, config.retry);
  }

  // 4. Logging wrapper
  //   if (config.logger) {
  //     requestFn = withLogging(requestFn, config.logger);
  //   }

  // Build proxy client
  const client = buildBaseProxyClient(config);

  // Freeze configuration to prevent modifications
  deepFreeze(config);

  return client;
}

/**
 * Create SDK client from configuration
 */
export function createFetchClient<T>(
  config: FetchSDKClientConfig
): FetchClient<T> {
  // Create requester factory

  const clientConfig = { ...config } as any;

  if (!config.createRequester) {
    clientConfig.createRequester = createFetchRequester(config);
  }

  return createBaseClient(clientConfig) as FetchClient<T>;
}
