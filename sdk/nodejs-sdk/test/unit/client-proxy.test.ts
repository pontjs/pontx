/**
 * Unit tests for Client Proxy System (Task 10)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProxyClient } from '../../src/core/proxy-client';
import type { PontxSpecMeta, RequestFn } from '../../src/types';

describe('Client Proxy System', () => {
  let mockRequestFn: RequestFn;
  let mockResponse: Response;
  let pontxSpecMeta: PontxSpecMeta;

  beforeEach(() => {
    // Create mock response
    mockResponse = new Response(JSON.stringify({ id: 1, name: 'Test User' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Create mock request function
    mockRequestFn = vi.fn().mockResolvedValue(mockResponse);

    // Create test API metadata
    pontxSpecMeta = {
      name: 'Test API',
      hasTags: true,
      apis: {
        'users/getUser': {
          path: '/users/{userId}',
          method: 'GET',
          parameters: [
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Success' },
          },
        },
        'users/createUser': {
          path: '/users',
          method: 'POST',
          parameters: [
            { name: 'body', in: 'body', required: true, schema: { type: 'object' } },
          ],
          consumes: ['application/json'],
          produces: ['application/json'],
          responses: {
            '201': { description: 'Created' },
          },
        },
        'posts/getPost': {
          path: '/posts/{postId}',
          method: 'GET',
          parameters: [
            { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Success' },
          },
        },
      },
    };
  });

  describe('Basic Proxy functionality', () => {
    it('should create a proxy client from metadata', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should support nested controller.method access', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      expect(client.users).toBeDefined();
      expect(client.users.getUser).toBeDefined();
      expect(client.posts).toBeDefined();
      expect(client.posts.getPost).toBeDefined();
    });

    it('should return method objects with request, getFetchKey, queryOptions', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const method = client.users.getUser;

      expect(method.request).toBeInstanceOf(Function);
      expect(method.getFetchKey).toBeInstanceOf(Function);
      expect(method.queryOptions).toBeInstanceOf(Function);
    });

    it('should handle multiple controllers from API keys', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      expect(client.users).toBeDefined();
      expect(client.posts).toBeDefined();
      expect(client.users.getUser).toBeDefined();
      expect(client.users.createUser).toBeDefined();
      expect(client.posts.getPost).toBeDefined();
    });
  });

  describe('Request method execution', () => {
    it('should execute request with correct URL', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      await client.users.getUser.request({ userId: '123' });

      expect(mockRequestFn).toHaveBeenCalledWith(
        '/users/123',
        expect.any(Object)
      );
    });

    it('should execute request with correct HTTP method', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      await client.users.createUser.request({ name: 'John' }, { body: { name: 'John' } });

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set Content-Type from consumes array', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      await client.users.createUser.request({ name: 'John' }, { body: { name: 'John' } });

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should set Accept from produces array', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      await client.users.createUser.request({ name: 'John' }, { body: { name: 'John' } });

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should merge user-provided headers', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      await client.users.getUser.request(
        { userId: '123' },
        { headers: { 'X-Custom-Header': 'value' } }
      );

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
          }),
        })
      );
    });

    it('should allow user headers to override defaults', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      await client.users.createUser.request(
        { name: 'John' },
        {
          body: { name: 'John' },
          headers: { 'Content-Type': 'text/plain' },
        }
      );

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        })
      );
    });

    it('should serialize request body as JSON for application/json', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const bodyData = { name: 'John', email: 'john@example.com' };
      await client.users.createUser.request(bodyData, { body: bodyData });

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(bodyData),
        })
      );
    });

    it('should return parsed response', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const result = await client.users.getUser.request({ userId: '123' });

      expect(result).toEqual({ id: 1, name: 'Test User' });
    });
  });

  describe('getFetchKey method', () => {
    it('should generate fetch key from API path and params', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const key = client.users.getUser.getFetchKey({ userId: '123' });

      expect(key).toContain('users/getUser');
      expect(key).toContain('userId=123');
    });

    it('should sort parameters alphabetically for consistency', () => {
      const specWithQuery: PontxSpecMeta = {
        name: 'Test API',
        hasTags: true,
        apis: {
          'users/search': {
            path: '/users',
            method: 'GET',
            parameters: [
              { name: 'name', in: 'query', schema: { type: 'string' } },
              { name: 'age', in: 'query', schema: { type: 'number' } },
            ],
            responses: { '200': { description: 'Success' } },
          },
        },
      };

      const client = buildProxyClient(mockRequestFn, specWithQuery);

      const key = client.users.search.getFetchKey({ name: 'John', age: 30 });

      // Parameters should be alphabetically sorted: age before name
      const ageIndex = key.indexOf('age=');
      const nameIndex = key.indexOf('name=');
      expect(ageIndex).toBeLessThan(nameIndex);
    });

    it('should handle different parameter values correctly', () => {
      const specWithQuery: PontxSpecMeta = {
        name: 'Test API',
        hasTags: true,
        apis: {
          'users/search': {
            path: '/users',
            method: 'GET',
            parameters: [
              { name: 'query', in: 'query', schema: { type: 'string' } },
            ],
            responses: { '200': { description: 'Success' } },
          },
        },
      };

      const client = buildProxyClient(mockRequestFn, specWithQuery);

      const key1 = client.users.search.getFetchKey({ query: 'test' });
      const key2 = client.users.search.getFetchKey({ query: 'test' });
      const key3 = client.users.search.getFetchKey({ query: 'different' });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('queryOptions method', () => {
    it('should return object with queryKey and queryFn', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const options = client.users.getUser.queryOptions({ userId: '123' });

      expect(options).toHaveProperty('queryKey');
      expect(options).toHaveProperty('queryFn');
      expect(Array.isArray(options.queryKey)).toBe(true);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should use getFetchKey for queryKey array', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const fetchKey = client.users.getUser.getFetchKey({ userId: '123' });
      const options = client.users.getUser.queryOptions({ userId: '123' });

      expect(options.queryKey).toContain(fetchKey);
    });

    it('should execute request when queryFn is called', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const options = client.users.getUser.queryOptions({ userId: '123' });
      const result = await options.queryFn();

      expect(mockRequestFn).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'Test User' });
    });

    it('should pass requestOptions to queryFn', async () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      const options = client.users.getUser.queryOptions(
        { userId: '123' },
        { headers: { 'X-Custom': 'value' } }
      );

      await options.queryFn();

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('Custom usage methods', () => {
    it('should support makeCustomUsages configuration', () => {
      const makeCustomUsages = (usages: any, apiMeta: any) => ({
        ...usages,
        customMethod: () => 'custom',
      });

      const client = buildProxyClient(mockRequestFn, pontxSpecMeta, {
        makeCustomUsages,
      });

      expect(client.users.getUser.customMethod).toBeDefined();
      expect(client.users.getUser.customMethod()).toBe('custom');
    });

    it('should pass API metadata to makeCustomUsages', () => {
      const makeCustomUsages = vi.fn((usages, apiMeta) => ({
        ...usages,
        getPath: () => apiMeta.path,
      }));

      const client = buildProxyClient(mockRequestFn, pontxSpecMeta, {
        makeCustomUsages,
      });

      expect(makeCustomUsages).toHaveBeenCalled();
      expect(client.users.getUser.getPath()).toBe('/users/{userId}');
    });

    it('should preserve standard usages when adding custom methods', () => {
      const makeCustomUsages = (usages: any) => ({
        ...usages,
        extra: () => 'extra',
      });

      const client = buildProxyClient(mockRequestFn, pontxSpecMeta, {
        makeCustomUsages,
      });

      expect(client.users.getUser.request).toBeDefined();
      expect(client.users.getUser.getFetchKey).toBeDefined();
      expect(client.users.getUser.queryOptions).toBeDefined();
      expect(client.users.getUser.extra).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle API keys with multiple slashes', () => {
      const specWithDeepPath: PontxSpecMeta = {
        name: 'Test API',
        hasTags: true,
        apis: {
          'api/v1/users/getUser': {
            path: '/api/v1/users/{userId}',
            method: 'GET',
            parameters: [],
            responses: { '200': { description: 'Success' } },
          },
        },
      };

      const client = buildProxyClient(mockRequestFn, specWithDeepPath);

      expect(client.api).toBeDefined();
      expect(client.api.v1).toBeDefined();
    });

    it('should handle empty parameters', async () => {
      const specNoParams: PontxSpecMeta = {
        name: 'Test API',
        hasTags: true,
        apis: {
          'health/check': {
            path: '/health',
            method: 'GET',
            parameters: [],
            responses: { '200': { description: 'Success' } },
          },
        },
      };

      const client = buildProxyClient(mockRequestFn, specNoParams);

      await client.health.check.request({});

      expect(mockRequestFn).toHaveBeenCalledWith(
        '/health',
        expect.any(Object)
      );
    });

    it('should throw error for non-existent API', () => {
      const client = buildProxyClient(mockRequestFn, pontxSpecMeta);

      expect(() => {
        (client as any).nonexistent.api.request({});
      }).toThrow();
    });
  });
});
