/**
 * Mock Module - Static mock data for testing
 *
 * This module provides mock functionality for testing without making real API calls.
 * It intercepts requests and returns pre-configured static data.
 *
 * Features:
 * - Static mock data by API key
 * - Configurable response delay
 * - Strict mode (require all APIs to have mock data)
 * - Standard Response object format
 */

import type { RequestFn, MockConfig } from '../types';

/**
 * Error codes for mock-related errors
 */
export const MOCK_ERROR_CODES = {
  MOCK_NOT_FOUND: 'MOCK_NOT_FOUND',
} as const;

/**
 * Extract API key from URL
 * Format: /controller/method or similar
 * This is a simplified version - assumes URL format like http://domain/controller/method?params
 */
function extractApiKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').filter(Boolean);
    // Get last two segments as controller/method
    return path.slice(-2).join('/');
  } catch {
    // If URL parsing fails, try simple extraction
    const match = url.match(/\/([^/]+)\/([^/?]+)/);
    return match ? `${match[1]}/${match[2]}` : '';
  }
}

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
 * @returns Standard Response object
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
 */
export function withMock(
  requestFn: RequestFn,
  config?: MockConfig
): RequestFn {
  // If mock is not configured or explicitly disabled, return original function
  if (!config || config.enabled === false) {
    return requestFn;
  }

  // Extract config values with defaults
  const { data, delay: delayMs = 0, strict = false } = config;

  // Return wrapped function that maintains the same signature
  return async (url: string, init?: RequestInit): Promise<Response> => {
    // Extract API key from init (preferred) or URL (fallback)
    const apiKey = (init as any)?._apiKey || extractApiKeyFromUrl(url);

    // Check if mock data exists for this API
    const hasMockData = apiKey in data;

    if (hasMockData) {
      // Get mock data for this API
      const mockData = data[apiKey];

      // Apply delay if configured
      if (delayMs > 0) {
        await delay(delayMs);
      }

      // Return mock response
      return createMockResponse(mockData);
    }

    // No mock data found for this API
    if (strict) {
      // In strict mode, throw error
      const error = new Error(
        `Mock data not found for API "${apiKey}". ` +
        `Please configure mock data for this API or disable strict mode.`
      );
      error.name = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).code = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).apiKey = apiKey;
      throw error;
    }

    // In non-strict mode, fall back to real request
    return requestFn(url, init);
  };
}

/**
 * Type guard to check if a response is a mock response
 * @param response - Response to check
 * @returns true if response is a mock response
 */
export function isMockResponse(response: Response): boolean {
  return response.headers.get('x-mock') === 'true';
}
