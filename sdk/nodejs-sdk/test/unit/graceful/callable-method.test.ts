import { describe, it, expect, vi } from 'vitest';
import { createCallableApiMethod } from '../../../src/graceful/callable-method';
import type { PontxAPI, RequestFn } from '../../../src/types';

/**
 * Unit tests for callable API method factory
 *
 * Requirements:
 * - 2.1: Direct method call executes request
 * - 2.2: Two-param signature for JSON APIs
 * - 2.3: Three-param signature for special body types
 * - 2.4: Omit options parameter uses defaults
 * - 2.5: Handle empty parameters
 * - 8.1: Attach getFetchKey method
 * - 8.2: Attach queryOptions method
 * - 8.3: Attach request property (backward compatibility)
 */

describe('CallableMethodFactory', () => {
  describe('createCallableApiMethod', () => {
    // Requirement 2.1: Direct method call executes request
    it('should create a function object that can be called directly', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ userId: '123', name: 'John' })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users/{userId}',
        method: 'GET',
        pathParams: ['userId'],
        queryParams: []
      };

      const callable = createCallableApiMethod(
        'users/getUser',
        apiMeta,
        mockRequestFn
      );

      // Should be callable as a function
      expect(typeof callable).toBe('function');

      const result = await callable({ userId: '123' });

      expect(result).toEqual({ userId: '123', name: 'John' });
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    // Requirement 2.2: Two-param signature for JSON APIs
    it('should support two-param mode (params, options) for JSON APIs', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ success: true })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users',
        method: 'POST',
        pathParams: [],
        queryParams: [],
        consumes: ['application/json']
      };

      const callable = createCallableApiMethod(
        'users/create',
        apiMeta,
        mockRequestFn
      );

      // Call with params (containing body fields)
      const result = await callable(
        { name: 'John', email: 'john@example.com' },
        { headers: { 'X-Custom': 'value' } }
      );

      expect(result).toEqual({ success: true });

      // Verify request was called with correct body
      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John', email: 'john@example.com' })
        })
      );
    });

    // Requirement 2.3: Three-param signature for special body types
    it('should support three-param mode (params, body, options) for FormData', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ fileId: 'abc123' })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/files/upload',
        method: 'POST',
        pathParams: [],
        queryParams: ['category'],
        consumes: ['multipart/form-data']
      };

      const callable = createCallableApiMethod(
        'files/upload',
        apiMeta,
        mockRequestFn
      );

      const formData = new FormData();
      formData.append('file', 'file content');

      // Call with three params: (params, body, options)
      const result = await callable(
        { category: 'docs' },
        formData,
        { headers: { 'X-Custom': 'value' } }
      );

      expect(result).toEqual({ fileId: 'abc123' });

      // Verify request was called with FormData directly
      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.stringContaining('category=docs'),
        expect.objectContaining({
          method: 'POST',
          body: formData
        })
      );
    });

    // Requirement 2.4: Omit options parameter uses defaults
    it('should use default config when options is omitted', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ users: [] })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: ['page', 'limit']
      };

      const callable = createCallableApiMethod(
        'users/list',
        apiMeta,
        mockRequestFn
      );

      // Call without options
      const result = await callable({ page: 1, limit: 10 });

      expect(result).toEqual({ users: [] });
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    // Requirement 2.5: Handle empty parameters
    it('should handle empty parameters or no parameters', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ status: 'ok' })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/health',
        method: 'GET',
        pathParams: [],
        queryParams: []
      };

      const callable = createCallableApiMethod(
        'system/health',
        apiMeta,
        mockRequestFn
      );

      // Call with empty params
      const result1 = await callable({});
      expect(result1).toEqual({ status: 'ok' });

      // Call with no params (undefined)
      const result2 = await callable();
      expect(result2).toEqual({ status: 'ok' });

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    // Requirement 8.1: Attach getFetchKey method
    it('should attach getFetchKey method to function object', () => {
      const mockRequestFn: RequestFn = vi.fn();

      const apiMeta: PontxAPI = {
        path: '/users/{userId}',
        method: 'GET',
        pathParams: ['userId'],
        queryParams: []
      };

      const callable = createCallableApiMethod(
        'users/getUser',
        apiMeta,
        mockRequestFn
      );

      expect(callable.getFetchKey).toBeDefined();
      expect(typeof callable.getFetchKey).toBe('function');

      const key = callable.getFetchKey({ userId: '123' });
      expect(key).toBe('users/getUser?userId=123');
    });

    // Requirement 8.2: Attach queryOptions method
    it('should attach queryOptions method to function object', () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ userId: '123' })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users/{userId}',
        method: 'GET',
        pathParams: ['userId'],
        queryParams: []
      };

      const callable = createCallableApiMethod(
        'users/getUser',
        apiMeta,
        mockRequestFn
      );

      expect(callable.queryOptions).toBeDefined();
      expect(typeof callable.queryOptions).toBe('function');

      const options = callable.queryOptions({ userId: '123' });

      expect(options).toHaveProperty('queryKey');
      expect(options).toHaveProperty('queryFn');
      expect(options.queryKey).toEqual(['users/getUser?userId=123']);
      expect(typeof options.queryFn).toBe('function');
    });

    // Requirement 8.3: Attach request property (backward compatibility)
    it('should attach request property pointing to itself for backward compatibility', () => {
      const mockRequestFn: RequestFn = vi.fn();

      const apiMeta: PontxAPI = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: []
      };

      const callable = createCallableApiMethod(
        'users/list',
        apiMeta,
        mockRequestFn
      );

      expect(callable.request).toBeDefined();
      expect(callable.request).toBe(callable);
    });

    // Integration: Parameter classification
    it('should correctly classify parameters for two-param mode', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ success: true })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users/{userId}',
        method: 'PUT',
        pathParams: ['userId'],
        queryParams: [],
        consumes: ['application/json']
      };

      const callable = createCallableApiMethod(
        'users/update',
        apiMeta,
        mockRequestFn
      );

      await callable({
        userId: '123',
        name: 'John Updated',
        email: 'john.updated@example.com'
      });

      // Verify path param in URL, body params in body
      expect(mockRequestFn).toHaveBeenCalledWith(
        '/users/123',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'John Updated',
            email: 'john.updated@example.com'
          })
        })
      );
    });

    // Integration: Parameter classification for three-param mode
    it('should correctly classify parameters for three-param mode', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ fileId: 'xyz' })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users/{userId}/files',
        method: 'POST',
        pathParams: ['userId'],
        queryParams: ['category'],
        consumes: ['multipart/form-data']
      };

      const callable = createCallableApiMethod(
        'files/uploadForUser',
        apiMeta,
        mockRequestFn
      );

      const formData = new FormData();
      formData.append('file', 'content');

      await callable(
        { userId: '123', category: 'docs' },
        formData
      );

      // Verify path param in URL, query param in query string, FormData as body
      expect(mockRequestFn).toHaveBeenCalledWith(
        '/users/123/files?category=docs',
        expect.objectContaining({
          method: 'POST',
          body: formData
        })
      );
    });

    // Edge case: makeCustomUsages support
    it('should support makeCustomUsages to add custom methods', () => {
      const mockRequestFn: RequestFn = vi.fn();

      const apiMeta: PontxAPI = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: []
      };

      const makeCustomUsages = (callable: any) => {
        callable.customMethod = () => 'custom';
        return callable;
      };

      const callable = createCallableApiMethod(
        'users/list',
        apiMeta,
        mockRequestFn,
        { makeCustomUsages }
      );

      expect(callable.customMethod).toBeDefined();
      expect(callable.customMethod()).toBe('custom');
    });

    // Error handling: Invalid signature mode detection
    it('should handle GET requests by treating non-path params as query params', async () => {
      const mockRequestFn: RequestFn = vi.fn().mockResolvedValue({
        json: async () => ({ users: [] })
      } as Response);

      const apiMeta: PontxAPI = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: [] // Empty, but should auto-detect
      };

      const callable = createCallableApiMethod(
        'users/list',
        apiMeta,
        mockRequestFn
      );

      await callable({ page: 1, limit: 10 });

      // GET requests should put params in query string
      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.stringContaining('?'),
        expect.any(Object)
      );
    });
  });
});
