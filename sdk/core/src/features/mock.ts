/**
 * Mock Module - Static mock data for testing
 *
 * This module provides mock functionality for testing without making real API calls.
 * It intercepts requests and returns pre-configured static data.
 *
 * Features:
 * - Static mock data by API key
 * - Configurable response delay
 * - Enabled/disabled toggle
 * - x-mock header for identification
 * - Standard Response object format
 */

import type { FetchFunction } from '../types';
import { BaseRequestFn, EnhancedRequestInit } from '../types/base';

/**
 * Configuration for mock feature
 */
export interface MockConfig {
  /**
   * Enable or disable mock functionality
   * @default true
   */
  enabled?: boolean;

  /**
   * Mock data indexed by API key (e.g., 'user/getUser')
   * Each key represents an API endpoint and its corresponding mock response
   */
  data: Record<string, any>;

  /**
   * Delay in milliseconds before returning mock data
   * Useful for simulating network latency
   * @default 0
   */
  delay?: number;
}

/**
 * Error codes for mock-related errors
 */
export const MOCK_ERROR_CODES = {
  MOCK_NOT_FOUND: 'MOCK_NOT_FOUND',
} as const;

/**
 * Create a delay promise
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock Response object from data
 * @param data - Mock data to return
 * @returns Standard Response object with x-mock header
 */
function createMockResponse(data: unknown): Response {
  // Serialize data to JSON string
  const body = JSON.stringify(data);

  // Create Response with standard headers
  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
      'x-mock': 'true', // Marker to indicate this is a mock response
    },
  });
}

/**
 * Wrapper function that adds mock functionality to a request function
 *
 * This decorator intercepts API requests and returns static mock data
 * when configured, without executing the actual network request.
 *
 * @param requestFn - Original request function to wrap
 * @param config - Mock configuration
 * @returns Wrapped request function with mock capability
 *
 * @example
 * ```ts
 * const mockFetch = withMock(fetch, {
 *   enabled: true,
 *   data: {
 *     'user/getUser': { id: '123', name: 'Mock User' },
 *     'user/list': [{ id: '1' }, { id: '2' }],
 *   },
 *   delay: 500, // Optional: simulate 500ms network delay
 * });
 * ```
 */
export function withMock(requestFn: BaseRequestFn, config?: MockConfig) {
  // If mock is not configured or explicitly disabled, return original function
  if (!config || config.enabled === false) {
    return requestFn;
  }

  // Extract config values with defaults
  const { data, delay: delayMs = 0 } = config;

  // Return wrapped function
  return async (url: string, init?: EnhancedRequestInit) => {
    // Extract API key from init._apiKey
    const apiKey = (init as any)?._apiKey;

    // If no API key provided, throw error
    if (!apiKey) {
      const error = new Error(
        'Mock requires _apiKey in RequestInit to identify the API.',
      );
      error.name = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).code = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      throw error;
    }

    // Check if mock data exists for this API
    const hasMockData = apiKey in data;

    if (!hasMockData) {
      const error = new Error(
        `Mock data not found for API "${apiKey}". ` +
          `Please configure mock data for this API.`,
      );
      error.name = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).code = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).apiKey = apiKey;
      throw error;
    }

    // Get mock data for this API
    const mockData = data[apiKey];

    // Apply delay if configured
    if (delayMs > 0) {
      await delay(delayMs);
    }

    // Return mock response
    return createMockResponse(mockData);
  };
}

/**
 * Type guard to check if a response is a mock response
 *
 * @param response - Response object to check
 * @returns true if response has the x-mock header set to 'true'
 *
 * @example
 * ```ts
 * const response = await fetch('/api/users');
 * if (isMockResponse(response)) {
 *   console.log('This is a mock response');
 * }
 * ```
 */
export function isMockResponse(response: Response): boolean {
  return response.headers.get('x-mock') === 'true';
}
