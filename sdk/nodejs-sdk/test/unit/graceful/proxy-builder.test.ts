import { describe, it, expect, vi } from 'vitest';
import { buildGracefulProxyClient } from '../../../src/graceful/proxy-builder';
import type { PontxSpecMeta } from '../../../src/types';

/**
 * Unit tests for graceful proxy builder
 *
 * Requirements:
 * - 1.2: Return client instance using new API pattern
 * - 2.1: Direct method call executes request
 * - 3.1: Implement two-layer Proxy structure (client.controller.method)
 */

describe('GracefulProxyBuilder', () => {
  describe('buildGracefulProxyClient', () => {
    const mockRequestFn = vi.fn(async () => ({
      json: async () => ({ success: true }),
    }));

    // Requirement 3.1: Two-layer Proxy structure
    it('should build two-layer Proxy structure (client.controller.method)', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
          'users/createUser': {
            path: '/users',
            method: 'POST',
            pathParams: [],
            queryParams: [],
            consumes: ['application/json'],
          },
        },
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // First layer: controller
      expect(client.users).toBeDefined();

      // Second layer: methods
      expect(typeof client.users.getUser).toBe('function');
      expect(typeof client.users.createUser).toBe('function');
    });

    // Requirement 2.1: Direct method call executes request
    it('should allow direct method call without .request suffix', async () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      mockRequestFn.mockResolvedValueOnce({
        json: async () => ({ id: '123', name: 'John' }),
      } as any);

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Direct call (no .request)
      const result = await client.users.getUser({ userId: '123' });

      expect(result).toEqual({ id: '123', name: 'John' });
      expect(mockRequestFn).toHaveBeenCalled();
    });

    // Requirement 1.2: Return client instance using new API pattern
    it('should attach utility methods to callable functions', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Check utility methods exist
      expect(typeof client.users.getUser.getFetchKey).toBe('function');
      expect(typeof client.users.getUser.queryOptions).toBe('function');
      expect(typeof client.users.getUser.request).toBe('function');
    });

    // Nested controller support
    it('should support nested controller structure (namespace/controller/method)', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'admin/users/createUser': {
            path: '/admin/users',
            method: 'POST',
            pathParams: [],
            queryParams: [],
            consumes: ['application/json'],
          },
          'admin/users/deleteUser': {
            path: '/admin/users/{userId}',
            method: 'DELETE',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Three-layer structure: client.admin.users.method
      expect(client.admin).toBeDefined();
      expect(client.admin.users).toBeDefined();
      expect(typeof client.admin.users.createUser).toBe('function');
      expect(typeof client.admin.users.deleteUser).toBe('function');
    });

    // Error handling: non-existent API
    it('should throw error when accessing non-existent API', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Try to access non-existent method
      expect(() => {
        // @ts-ignore - intentional type error for testing
        client.users.nonExistent;
      }).toThrow('API "nonExistent" not found in client');
    });

    // Error handling: non-existent controller
    it('should throw error when accessing non-existent controller', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Try to access non-existent controller
      expect(() => {
        // @ts-ignore - intentional type error for testing
        client.nonExistent;
      }).toThrow('API "nonExistent" not found in client');
    });

    // Multiple controllers and methods
    it('should support multiple controllers with multiple methods', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
          'users/createUser': {
            path: '/users',
            method: 'POST',
            pathParams: [],
            queryParams: [],
            consumes: ['application/json'],
          },
          'posts/getPost': {
            path: '/posts/{postId}',
            method: 'GET',
            pathParams: ['postId'],
            queryParams: [],
          },
          'posts/createPost': {
            path: '/posts',
            method: 'POST',
            pathParams: [],
            queryParams: [],
            consumes: ['application/json'],
          },
        },
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Check both controllers exist
      expect(client.users).toBeDefined();
      expect(client.posts).toBeDefined();

      // Check all methods exist
      expect(typeof client.users.getUser).toBe('function');
      expect(typeof client.users.createUser).toBe('function');
      expect(typeof client.posts.getPost).toBe('function');
      expect(typeof client.posts.createPost).toBe('function');
    });

    // Empty API metadata
    it('should handle empty API metadata gracefully', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {},
      };

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta);

      // Should create a valid proxy even with no APIs
      expect(client).toBeDefined();

      // Accessing any API should throw error
      expect(() => {
        // @ts-ignore
        client.users;
      }).toThrow('API "users" not found in client');
    });

    // Custom options: getFetchUrl
    it('should pass custom getFetchUrl option to callable methods', async () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      const customGetFetchUrl = vi.fn((path: string) => `https://api.example.com${path}`);

      mockRequestFn.mockResolvedValueOnce({
        json: async () => ({ success: true }),
      } as any);

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta, {
        getFetchUrl: customGetFetchUrl,
      });

      await client.users.getUser({ userId: '123' });

      // Custom URL builder should be called
      expect(customGetFetchUrl).toHaveBeenCalled();
    });

    // Custom options: makeCustomUsages
    it('should apply custom usages to callable methods', () => {
      const pontxSpecMeta: PontxSpecMeta = {
        name: 'TestAPI',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            queryParams: [],
          },
        },
      };

      const makeCustomUsages = vi.fn((callable: any) => {
        callable.customMethod = () => 'custom';
        return callable;
      });

      const client = buildGracefulProxyClient(mockRequestFn, pontxSpecMeta, {
        makeCustomUsages,
      });

      // Custom method should be added
      expect(makeCustomUsages).toHaveBeenCalled();
      expect(typeof client.users.getUser.customMethod).toBe('function');
      expect(client.users.getUser.customMethod()).toBe('custom');
    });
  });
});
