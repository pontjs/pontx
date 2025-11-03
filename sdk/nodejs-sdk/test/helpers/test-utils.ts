/**
 * Test utilities and helpers
 *
 * Shared utilities for testing the nodejs-sdk package
 */

/**
 * Creates a mock Response object
 */
export function createMockResponse(
  data: unknown,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Creates a mock fetch function for testing
 */
export function createMockFetch(
  responses: Map<string, Response> | Response
): (url: string, init?: RequestInit) => Promise<Response> {
  return async (url: string) => {
    if (responses instanceof Map) {
      const response = responses.get(url);
      if (!response) {
        throw new Error(`No mock response configured for URL: ${url}`);
      }
      return response;
    }
    return responses;
  };
}

/**
 * Creates a simple PontxSpecMeta for testing
 */
export function createTestSpecMeta() {
  return {
    name: 'test-api',
    hasTags: true,
    apis: {
      'users/getUser': {
        path: '/api/users/{id}',
        method: 'GET',
        hasBody: false,
        hasParams: true,
        produces: ['application/json'],
      },
      'users/createUser': {
        path: '/api/users',
        method: 'POST',
        hasBody: true,
        hasParams: false,
        consumes: ['application/json'],
        produces: ['application/json'],
      },
    },
  };
}

/**
 * Delays execution for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a spy function similar to vitest's vi.fn()
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): T & { calls: any[][]; callCount: number } {
  const calls: any[][] = [];

  const spy = ((...args: any[]) => {
    calls.push(args);
    return implementation ? implementation(...args) : undefined;
  }) as T & { calls: any[][]; callCount: number };

  Object.defineProperty(spy, 'calls', {
    get: () => calls,
  });

  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length,
  });

  return spy;
}