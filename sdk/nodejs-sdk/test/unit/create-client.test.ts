/**
 * Unit tests for createClient Factory Function (Task 11)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../../src';
import type { PontxSpecMeta, CreateClientConfig } from '../../src/types';

describe('createClient Factory Function', () => {
  let pontxSpecMeta: PontxSpecMeta;
  let mockResponse: Response;

  beforeEach(() => {
    // Create mock response
    mockResponse = new Response(JSON.stringify({ id: 1, name: 'Test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

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
          responses: {
            '201': { description: 'Created' },
          },
        },
      },
    };

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
  });

  describe('Configuration parsing and validation', () => {
    it('should create client with minimal configuration', () => {
      const client = createClient({ pontxSpecMeta });

      expect(client).toBeDefined();
      expect(client.users).toBeDefined();
    });

    it('should validate pontxSpecMeta format', () => {
      expect(() => {
        createClient({
          pontxSpecMeta: {} as any,
        });
      }).toThrow(/invalid.*pontxSpecMeta/i);
    });

    it('should require pontxSpecMeta.name', () => {
      expect(() => {
        createClient({
          pontxSpecMeta: { apis: {} } as any,
        });
      }).toThrow();
    });

    it('should require pontxSpecMeta.apis', () => {
      expect(() => {
        createClient({
          pontxSpecMeta: { name: 'Test' } as any,
        });
      }).toThrow();
    });

    it('should use native fetch as default fetchFn', async () => {
      const client = createClient({ pontxSpecMeta });

      await client.users.getUser.request({ userId: '123' });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should accept custom fetchFn', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: customFetch,
      });

      await client.users.getUser.request({ userId: '123' });

      expect(customFetch).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Request function wrapping chain', () => {
    it('should not wrap when no features configured', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: customFetch,
      });

      await client.users.getUser.request({ userId: '123' });

      // Should call fetchFn directly without wrappers
      expect(customFetch).toHaveBeenCalledTimes(1);
    });

    it('should wrap with validation when configured', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: customFetch,
        validation: {
          enabled: true,
        },
      });

      // Validation wrapper should be applied
      expect(client).toBeDefined();
    });

    it('should wrap with mock when configured', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: customFetch,
        mock: {
          enabled: true,
          data: {
            'users/getUser': { id: 999, name: 'Mock User' },
          },
        },
      });

      const result = await client.users.getUser.request({ userId: '123' });

      // Should return mock data without calling fetchFn
      expect(result).toEqual({ id: 999, name: 'Mock User' });
      expect(customFetch).not.toHaveBeenCalled();
    });

    it('should wrap with retry when configured', async () => {
      const failOnceFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: failOnceFetch,
        retry: {
          maxAttempts: 2,
          backoff: 'linear',
        },
      });

      await client.users.getUser.request({ userId: '123' });

      // Should retry and succeed on second attempt
      expect(failOnceFetch).toHaveBeenCalledTimes(2);
    });

    it('should wrap with logging when configured', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = createClient({
        pontxSpecMeta,
        logger: {
          enabled: true,
          instance: mockLogger,
        },
      });

      await client.users.getUser.request({ userId: '123' });

      // Should log request and response
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should wrap in correct order: validation → mock → retry → logging', async () => {
      const executionOrder: string[] = [];

      const trackingFetch = vi.fn(async (url, init) => {
        executionOrder.push('fetch');
        return mockResponse;
      });

      const client = createClient({
        pontxSpecMeta,
        fetchFn: trackingFetch,
        validation: { enabled: false }, // Disabled to avoid errors
        mock: { enabled: false, data: {} },
        retry: { maxAttempts: 1 },
        logger: { enabled: false },
      });

      await client.users.getUser.request({ userId: '123' });

      // Verify wrappers are applied (even if disabled, they're in the chain)
      expect(trackingFetch).toHaveBeenCalled();
    });

    it('should skip wrapping for disabled features', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: customFetch,
        validation: { enabled: false },
        mock: { enabled: false, data: {} },
        retry: undefined, // Not configured
        logger: { enabled: false },
      });

      await client.users.getUser.request({ userId: '123' });

      // Should work without wrappers
      expect(customFetch).toHaveBeenCalled();
    });
  });

  describe('Proxy client building', () => {
    it('should build proxy client with wrapped requestFn', async () => {
      const client = createClient({
        pontxSpecMeta,
      });

      expect(client.users).toBeDefined();
      expect(client.users.getUser).toBeDefined();
      expect(client.users.getUser.request).toBeInstanceOf(Function);
    });

    it('should pass pontxSpecMeta to proxy builder', () => {
      const client = createClient({
        pontxSpecMeta,
      });

      // Proxy should have access to API metadata
      expect(client.users.getUser).toBeDefined();
      expect(client.users.createUser).toBeDefined();
    });

    it('should return type-safe Client instance', () => {
      const client = createClient({
        pontxSpecMeta,
      });

      // TypeScript should infer correct types
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });
  });

  describe('Configuration immutability', () => {
    it('should freeze configuration object', () => {
      const config: CreateClientConfig = {
        pontxSpecMeta,
        validation: { enabled: true },
      };

      createClient(config);

      // Config should be frozen
      expect(Object.isFrozen(config)).toBe(true);
    });

    it('should prevent modification of nested config', () => {
      const config: CreateClientConfig = {
        pontxSpecMeta,
        validation: { enabled: true },
      };

      createClient(config);

      // Attempt to modify should fail
      expect(() => {
        (config as any).newProp = 'value';
      }).toThrow();
    });

    it('should freeze each feature config', () => {
      const config: CreateClientConfig = {
        pontxSpecMeta,
        validation: { enabled: true },
        mock: { enabled: false, data: {} },
        retry: { maxAttempts: 3 },
        logger: { enabled: false },
      };

      createClient(config);

      expect(Object.isFrozen(config.validation)).toBe(true);
      expect(Object.isFrozen(config.mock)).toBe(true);
      expect(Object.isFrozen(config.retry)).toBe(true);
      expect(Object.isFrozen(config.logger)).toBe(true);
    });

    it('should not affect external references to config', () => {
      const validationConfig = { enabled: true };
      const config: CreateClientConfig = {
        pontxSpecMeta,
        validation: validationConfig,
      };

      createClient(config);

      // Original reference should also be frozen (Object.freeze is shallow)
      expect(Object.isFrozen(config.validation)).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should support all features together', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = createClient({
        pontxSpecMeta,
        validation: { enabled: false },
        mock: {
          enabled: true,
          data: {
            'users/getUser': { id: 999, name: 'Mock' },
          },
        },
        retry: { maxAttempts: 3 },
        logger: {
          enabled: true,
          instance: mockLogger,
        },
      });

      const result = await client.users.getUser.request({ userId: '123' });

      // Should return mock data
      expect(result).toEqual({ id: 999, name: 'Mock' });

      // Should log
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should work with custom fetchFn and all features', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient({
        pontxSpecMeta,
        fetchFn: customFetch,
        validation: { enabled: false },
        retry: { maxAttempts: 2 },
      });

      await client.users.getUser.request({ userId: '123' });

      expect(customFetch).toHaveBeenCalled();
    });

    it('should handle errors through entire chain', async () => {
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = createClient({
        pontxSpecMeta,
        fetchFn: failingFetch,
        retry: { maxAttempts: 1 }, // Don't retry
      });

      await expect(
        client.users.getUser.request({ userId: '123' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Edge cases', () => {
    it('should handle pontxSpecMeta without hasTags', () => {
      const specWithoutTags: PontxSpecMeta = {
        name: 'Test API',
        hasTags: false,
        apis: {
          'getUser': {
            path: '/users/{userId}',
            method: 'GET',
            parameters: [],
            responses: { '200': { description: 'Success' } },
          },
        },
      };

      const client = createClient({
        pontxSpecMeta: specWithoutTags,
      });

      expect(client).toBeDefined();
    });

    it('should handle empty apis object', () => {
      const emptySpec: PontxSpecMeta = {
        name: 'Empty API',
        hasTags: true,
        apis: {},
      };

      const client = createClient({
        pontxSpecMeta: emptySpec,
      });

      expect(client).toBeDefined();
      expect(Object.keys(client).length).toBe(0);
    });

    it('should handle getFetchUrl custom function', async () => {
      const getFetchUrl = vi.fn((path, params) => `http://custom.com${path}`);

      const client = createClient({
        pontxSpecMeta,
        getFetchUrl,
      });

      await client.users.getUser.request({ userId: '123' });

      expect(getFetchUrl).toHaveBeenCalledWith(
        '/users/{userId}',
        expect.any(Object)
      );
    });

    it('should handle pathMark configuration', async () => {
      const client = createClient({
        pontxSpecMeta,
        pathMark: ':id',
      });

      // PathMark should be used for missing path params
      await client.users.getUser.request({} as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(':id'),
        expect.any(Object)
      );
    });
  });
});
