/**
 * Proxy Client Builder Tests
 *
 * Tests for buildProxyClient, parseApiKey, buildHeaders, generateFetchKey
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildProxyClient,
  parseApiKey,
  buildHeaders,
  generateFetchKey,
} from '../src/builders/proxy-client';
import type { PontxSpecMeta, PontxAPI } from '../src/types';

describe('parseApiKey', () => {
  it('should parse controller/method format', () => {
    const [controllerPath, methodName] = parseApiKey('users/getUser');
    expect(controllerPath).toEqual(['users']);
    expect(methodName).toBe('getUser');
  });

  it('should parse namespace/controller/method format', () => {
    const [controllerPath, methodName] = parseApiKey('api/users/getUser');
    expect(controllerPath).toEqual(['api', 'users']);
    expect(methodName).toBe('getUser');
  });

  it('should handle deep nested paths', () => {
    const [controllerPath, methodName] = parseApiKey('api/v1/users/profile/getAvatar');
    expect(controllerPath).toEqual(['api', 'v1', 'users', 'profile']);
    expect(methodName).toBe('getAvatar');
  });

  it('should handle single level paths', () => {
    const [controllerPath, methodName] = parseApiKey('healthCheck');
    expect(controllerPath).toEqual([]);
    expect(methodName).toBe('healthCheck');
  });
});

describe('buildHeaders', () => {
  it('should set Content-Type from API consumes', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'POST',
      consumes: ['application/json'],
      produces: [],
      parameters: [],
    };

    const headers = buildHeaders(apiMeta);
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should set Accept from API produces', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'GET',
      consumes: [],
      produces: ['application/json', 'application/xml'],
      parameters: [],
    };

    const headers = buildHeaders(apiMeta);
    expect(headers['Accept']).toBe('application/json');
  });

  it('should set both Content-Type and Accept', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'POST',
      consumes: ['application/json'],
      produces: ['application/json'],
      parameters: [],
    };

    const headers = buildHeaders(apiMeta);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });

  it('should merge custom headers', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'GET',
      consumes: ['application/json'],
      produces: ['application/json'],
      parameters: [],
    };

    const headers = buildHeaders(apiMeta, {
      headers: {
        'Authorization': 'Bearer token',
        'X-Custom': 'value',
      },
    });

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer token');
    expect(headers['X-Custom']).toBe('value');
  });

  it('should allow custom headers to override defaults', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'POST',
      consumes: ['application/json'],
      produces: ['application/json'],
      parameters: [],
    };

    const headers = buildHeaders(apiMeta, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });

    expect(headers['Content-Type']).toBe('application/xml');
  });

  it('should handle empty consumes and produces', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'GET',
      consumes: [],
      produces: [],
      parameters: [],
    };

    const headers = buildHeaders(apiMeta);
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['Accept']).toBeUndefined();
  });

  it('should handle undefined consumes and produces', () => {
    const apiMeta: PontxAPI = {
      path: '/api/users',
      method: 'GET',
      parameters: [],
    };

    const headers = buildHeaders(apiMeta);
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['Accept']).toBeUndefined();
  });
});

describe('generateFetchKey', () => {
  it('should generate key with sorted parameters', () => {
    const key = generateFetchKey('users/getUser', {
      userId: '123',
      includeProfile: true,
    });

    // Parameters should be sorted alphabetically
    expect(key).toBe('users/getUser?includeProfile=true&userId=123');
  });

  it('should handle empty parameters', () => {
    const key = generateFetchKey('users/list', {});
    expect(key).toBe('users/list');
  });

  it('should handle single parameter', () => {
    const key = generateFetchKey('users/getUser', { userId: '123' });
    expect(key).toBe('users/getUser?userId=123');
  });

  it('should handle numeric values', () => {
    const key = generateFetchKey('items/get', { id: 42, page: 1 });
    expect(key).toBe('items/get?id=42&page=1');
  });

  it('should handle boolean values', () => {
    const key = generateFetchKey('users/list', { active: true });
    expect(key).toBe('users/list?active=true');
  });

  it('should ensure consistent ordering for cache keys', () => {
    const key1 = generateFetchKey('api/search', { query: 'test', limit: 10, offset: 0 });
    const key2 = generateFetchKey('api/search', { offset: 0, query: 'test', limit: 10 });

    expect(key1).toBe(key2);
  });
});

describe('buildProxyClient', () => {
  const mockFetch = vi.fn();

  const mockSpecMeta: PontxSpecMeta = {
    name: 'Test API',
    apis: {
      'users/getUser': {
        path: '/users/{userId}',
        method: 'GET',
        consumes: [],
        produces: ['application/json'],
        parameters: [
          { name: 'userId', in: 'path', required: true, type: 'string' },
        ],
      },
      'users/createUser': {
        path: '/users',
        method: 'POST',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [],
      },
      'posts/getPosts': {
        path: '/posts',
        method: 'GET',
        consumes: [],
        produces: ['application/json'],
        parameters: [],
      },
    },
  };

  it('should create two-level proxy structure (controller.method)', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta);

    expect(client.users).toBeDefined();
    expect(client.users.getUser).toBeDefined();
    expect(client.users.createUser).toBeDefined();
    expect(client.posts).toBeDefined();
    expect(client.posts.getPosts).toBeDefined();
  });

  it('should return method object with request, getFetchKey, queryOptions', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta);

    expect(client.users.getUser.request).toBeInstanceOf(Function);
    expect(client.users.getUser.getFetchKey).toBeInstanceOf(Function);
    expect(client.users.getUser.queryOptions).toBeInstanceOf(Function);
  });

  it('should generate correct fetch key', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta);

    const key = client.users.getUser.getFetchKey({ userId: '123' });
    expect(key).toBe('users/getUser?userId=123');
  });

  it('should generate queryOptions with queryKey and queryFn', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta);

    const options = client.users.getUser.queryOptions({ userId: '123' });
    expect(options.queryKey).toEqual(['users/getUser?userId=123']);
    expect(options.queryFn).toBeInstanceOf(Function);
  });

  it('should throw error for non-existent API', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta);

    expect(() => client.users.nonExistentMethod).toThrow('API "users/nonExistentMethod" not found');
  });

  it('should throw error for non-existent controller', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta);

    // Proxy doesn't throw until you access a property on it
    // Accessing a method on non-existent controller will throw
    expect(() => client.nonExistentController.someMethod).toThrow('API "nonExistentController/someMethod" not found');
  });

  it('should support custom getFetchUrl', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: '123', name: 'John' }),
    });

    const customGetFetchUrl = vi.fn((path: string, params: Record<string, any>) => {
      return `https://api.example.com${path}`;
    });

    const client = buildProxyClient(mockFetch, mockSpecMeta, {
      getFetchUrl: customGetFetchUrl,
    });

    await client.users.getUser.request({ userId: '123' });

    expect(customGetFetchUrl).toHaveBeenCalledWith('/users/{userId}', { userId: '123' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users/{userId}',
      expect.any(Object)
    );
  });

  it('should support makeCustomUsages for adding custom methods', () => {
    const client = buildProxyClient(mockFetch, mockSpecMeta, {
      makeCustomUsages: (usages, apiMeta) => {
        return {
          ...usages,
          customMethod: () => 'custom',
        };
      },
    });

    expect(client.users.getUser.customMethod).toBeInstanceOf(Function);
    expect(client.users.getUser.customMethod()).toBe('custom');
  });

  it('should support pathMark for missing path parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({}),
    });

    const client = buildProxyClient(mockFetch, mockSpecMeta, {
      pathMark: ':auto',
    });

    await client.users.getUser.request({});

    expect(mockFetch).toHaveBeenCalledWith(
      '/users/:auto',
      expect.any(Object)
    );
  });

  it('should execute request with correct method and headers', async () => {
    const mockResponse = new Response(JSON.stringify({ id: '123', name: 'John' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const client = buildProxyClient(mockFetch, mockSpecMeta);
    const response = await client.users.getUser.request({ userId: '123' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/users/123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json',
        }),
        _apiKey: 'users/getUser',
      })
    );

    // Verify Response object is returned
    expect(response).toBeInstanceOf(Response);
    const result = await response.json();
    expect(result).toEqual({ id: '123', name: 'John' });
  });

  it('should serialize request body for POST requests', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: '456', name: 'Jane' }),
    });

    const client = buildProxyClient(mockFetch, mockSpecMeta);
    await client.users.createUser.request({}, {
      body: { name: 'Jane', email: 'jane@example.com' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }),
        body: JSON.stringify({ name: 'Jane', email: 'jane@example.com' }),
      })
    );
  });

  // Note: Nested namespace structure (api/v1/users/getUser) is not supported
  // Following browser SDK's createClient which only supports two-level structure (controller/method)
  // APIs with nested paths should use the full path as controller name, e.g., 'api/v1/users' as controller
});
