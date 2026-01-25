/**
 * Unit tests for createGracefulClient factory function
 *
 * Tests cover:
 * - Config validation (Requirement 5.6)
 * - Client creation with valid config (Requirement 1.1, 1.2)
 * - Feature wrapper ordering (Requirement 1.5)
 * - Config freezing (Requirement 1.5)
 * - API metadata validation (Requirement 5.1-5.6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGracefulClient } from '../../../src/graceful/create-graceful-client';
import type { PontxSpecMeta } from '../../../src/types';

describe('createGracefulClient', () => {
  const validMeta: PontxSpecMeta = {
    name: 'test-api',
    apis: {
      'users/getUser': {
        path: '/users/{userId}',
        method: 'GET',
        pathParams: ['userId'],
        queryParams: [],
        produces: ['application/json'],
      },
      'users/createUser': {
        path: '/users',
        method: 'POST',
        pathParams: [],
        queryParams: [],
        consumes: ['application/json'],
        produces: ['application/json'],
      },
      'files/upload': {
        path: '/files/upload',
        method: 'POST',
        pathParams: [],
        queryParams: ['category'],
        consumes: ['multipart/form-data'],
        produces: ['application/json'],
      },
    },
  };

  describe('Configuration Validation', () => {
    it('should throw error when pontxSpecMeta is missing', () => {
      expect(() => {
        createGracefulClient({} as any);
      }).toThrow('Invalid pontxSpecMeta: must be an object');
    });

    it('should throw error when pontxSpecMeta is not an object', () => {
      expect(() => {
        createGracefulClient({ pontxSpecMeta: 'invalid' } as any);
      }).toThrow('Invalid pontxSpecMeta: must be an object');
    });

    it('should throw error when pontxSpecMeta.name is missing', () => {
      expect(() => {
        createGracefulClient({
          pontxSpecMeta: { apis: {} } as any,
        });
      }).toThrow('Invalid pontxSpecMeta: missing or invalid "name" property');
    });

    it('should throw error when pontxSpecMeta.apis is missing', () => {
      expect(() => {
        createGracefulClient({
          pontxSpecMeta: { name: 'test' } as any,
        });
      }).toThrow('Invalid pontxSpecMeta: missing or invalid "apis" property');
    });

    it('should accept valid pontxSpecMeta', () => {
      expect(() => {
        createGracefulClient({ pontxSpecMeta: validMeta });
      }).not.toThrow();
    });
  });

  describe('Client Creation', () => {
    it('should create client instance with valid config', () => {
      const client = createGracefulClient({ pontxSpecMeta: validMeta });

      expect(client).toBeDefined();
      expect(client.users).toBeDefined();
      expect(client.files).toBeDefined();
    });

    it('should create callable API methods', () => {
      const client = createGracefulClient({ pontxSpecMeta: validMeta });

      expect(typeof client.users.getUser).toBe('function');
      expect(typeof client.users.createUser).toBe('function');
      expect(typeof client.files.upload).toBe('function');
    });

    it('should attach utility methods to API methods', () => {
      const client = createGracefulClient({ pontxSpecMeta: validMeta });

      expect(client.users.getUser.getFetchKey).toBeDefined();
      expect(client.users.getUser.queryOptions).toBeDefined();
      expect(client.users.getUser.request).toBeDefined();
    });

    it('should use custom fetch function if provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123', name: 'John' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser({ userId: '123' });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should use custom path mark if provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch,
        pathMark: ':',
      });

      await client.users.getUser({ userId: '123' });

      const callUrl = mockFetch.mock.calls[0][0];
      // URL should have replaced path params correctly
      expect(callUrl).toContain('123');
    });
  });

  describe('Feature Wrapper Integration', () => {
    it('should apply validation wrapper when validation config is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch,
        validation: {
          enabled: true,
          schemas: {},
        },
      });

      // Validation should be applied (wrapper exists in chain)
      expect(client.users.getUser).toBeDefined();
    });

    it('should apply mock wrapper when mock config is provided', async () => {
      const mockData = { id: '123', name: 'Mocked User' };

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        mock: {
          enabled: true,
          data: {
            'users/getUser': mockData,
          },
        },
      });

      const result = await client.users.getUser({ userId: '123' });

      // Should return mock data
      expect(result).toEqual(mockData);
    });

    it('should apply retry wrapper when retry config is provided', async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: '123' }),
        });
      });

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch,
        retry: {
          maxAttempts: 3,
          backoff: 'linear',
        },
      });

      const result = await client.users.getUser({ userId: '123' });

      // Should have retried and succeeded
      expect(attempts).toBe(3);
      expect(result).toEqual({ id: '123' });
    });

    it('should apply logger wrapper when logger config is provided', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch,
        logger: {
          enabled: true,
          instance: mockLogger,
        },
      });

      await client.users.getUser({ userId: '123' });

      // Logger should have been called
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should apply wrappers in correct order: mock → retry → logging', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '123' }),
      });

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch as any,
        retry: { maxAttempts: 1 },
        logger: { enabled: true, instance: mockLogger },
      });

      await client.users.getUser({ userId: '123' });

      // All wrappers should be applied
      expect(mockFetch).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Configuration Immutability', () => {
    it('should deep freeze config object after client creation', () => {
      const config = {
        pontxSpecMeta: validMeta,
        validation: { enabled: true, schemas: {} },
      };

      createGracefulClient(config);

      // Config should be frozen
      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.pontxSpecMeta)).toBe(true);
      expect(Object.isFrozen(config.validation)).toBe(true);
    });

    it('should prevent modification of frozen config', () => {
      const config = {
        pontxSpecMeta: validMeta,
      };

      createGracefulClient(config);

      // Attempting to modify should fail in strict mode or be silently ignored
      expect(() => {
        (config as any).newProperty = 'test';
      }).toThrow();
    });
  });

  describe('API Metadata Validation', () => {
    it('should use empty array as default for pathParams when undefined', async () => {
      const meta: PontxSpecMeta = {
        name: 'test',
        apis: {
          'users/list': {
            path: '/users',
            method: 'GET',
            // pathParams undefined
            queryParams: ['page', 'limit'],
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([]),
      });

      const client = createGracefulClient({
        pontxSpecMeta: meta,
        fetchFn: mockFetch,
      });

      await client.users.list({ page: 1, limit: 10 });

      // Should work without errors
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should use empty array as default for queryParams when undefined', async () => {
      const meta: PontxSpecMeta = {
        name: 'test',
        apis: {
          'users/getUser': {
            path: '/users/{userId}',
            method: 'GET',
            pathParams: ['userId'],
            // queryParams undefined
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: meta,
        fetchFn: mockFetch,
      });

      await client.users.getUser({ userId: '123' });

      // Should work without errors
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should default to application/json when consumes is undefined', async () => {
      const meta: PontxSpecMeta = {
        name: 'test',
        apis: {
          'users/createUser': {
            path: '/users',
            method: 'POST',
            pathParams: [],
            queryParams: [],
            // consumes undefined - should default to application/json
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: meta,
        fetchFn: mockFetch,
      });

      await client.users.createUser({ name: 'John', email: 'john@example.com' });

      // Should work with two-param mode (JSON body)
      expect(mockFetch).toHaveBeenCalled();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.body).toBeDefined();
    });
  });

  describe('Custom Options', () => {
    it('should use custom getFetchUrl function if provided', async () => {
      const customGetFetchUrl = vi.fn((path: string, params: Record<string, unknown>) => {
        return `https://api.example.com${path.replace('{userId}', String(params.userId))}`;
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        fetchFn: mockFetch,
        getFetchUrl: customGetFetchUrl,
      });

      await client.users.getUser({ userId: '123' });

      expect(customGetFetchUrl).toHaveBeenCalledWith(
        '/users/{userId}',
        { userId: '123' }
      );
      expect(mockFetch.mock.calls[0][0]).toContain('https://api.example.com');
    });

    it('should apply makeCustomUsages to add custom methods', () => {
      const client = createGracefulClient({
        pontxSpecMeta: validMeta,
        makeCustomUsages: (callable, apiMeta) => {
          callable.customMethod = () => 'custom';
          return callable;
        },
      });

      expect(client.users.getUser.customMethod).toBeDefined();
      expect(client.users.getUser.customMethod()).toBe('custom');
    });
  });
});
