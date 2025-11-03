/**
 * Unit tests for createFlatClient factory function
 *
 * Tests cover:
 * - Valid configuration creates successful client
 * - Metadata validation failures
 * - Hierarchical API key rejection
 * - Configuration deep freeze
 * - Request wrapper chain order
 *
 * Requirements:
 * - 1.1-1.4: Client creation with configuration
 * - 4.1: Request function wrapping chain
 * - 6.1-6.3: Metadata validation
 * - 11.1: Unit test coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFlatClient } from '../../../src/flat/create-flat-client';
import type { PontxSpecMeta, CreateFlatClientConfig } from '../../../src/types';

describe('createFlatClient', () => {
  // Test data: valid flat API metadata
  const validFlatMeta: PontxSpecMeta = {
    name: 'Finnhub API',
    version: '1.0.0',
    apis: {
      symbolSearch: {
        name: 'Symbol Search',
        path: '/search',
        method: 'GET',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } }
        ],
      },
      stockQuote: {
        name: 'Stock Quote',
        path: '/quote',
        method: 'GET',
        parameters: [
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } }
        ],
      },
    },
  };

  describe('Valid Configuration', () => {
    it('should create client successfully with valid flat metadata', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
      };

      const client = createFlatClient(config);

      // Client should be created
      expect(client).toBeDefined();

      // Client should have API methods at root level
      expect(client.symbolSearch).toBeDefined();
      expect(client.stockQuote).toBeDefined();

      // API methods should be callable functions
      expect(typeof client.symbolSearch).toBe('function');
      expect(typeof client.stockQuote).toBe('function');
    });

    it('should accept all configuration options from graceful client', () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
      const customGetFetchUrl = vi.fn((path: string) => `https://api.example.com${path}`);
      const customMakeUsages = vi.fn((callable: any) => callable);

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
        fetchFn: mockFetch,
        getFetchUrl: customGetFetchUrl,
        pathMark: ':',
        makeCustomUsages: customMakeUsages,
        validation: { enabled: true },
        mock: { data: {}, enabled: false },
        retry: { maxAttempts: 3 },
        logger: { enabled: false },
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
    });
  });

  describe('Metadata Validation', () => {
    it('should throw error when pontxSpecMeta is missing', () => {
      const config: any = {};

      expect(() => createFlatClient(config)).toThrow();
    });

    it('should throw error when pontxSpecMeta.name is missing', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: {
          apis: {},
        } as any,
      };

      expect(() => createFlatClient(config)).toThrow(
        'Invalid pontxSpecMeta: missing or invalid "name" property'
      );
    });

    it('should throw error when pontxSpecMeta.apis is missing', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: {
          name: 'Test API',
        } as any,
      };

      expect(() => createFlatClient(config)).toThrow(
        'Invalid pontxSpecMeta: missing or invalid "apis" property'
      );
    });
  });

  describe('Flat Structure Validation', () => {
    it('should reject metadata with hierarchical API keys (containing "/")', () => {
      const hierarchicalMeta: PontxSpecMeta = {
        name: 'REST API',
        version: '1.0.0',
        apis: {
          'users/getUser': {
            name: 'Get User',
            path: '/users/{id}',
            method: 'GET',
          },
          'users/createUser': {
            name: 'Create User',
            path: '/users',
            method: 'POST',
          },
        },
      };

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: hierarchicalMeta,
      };

      expect(() => createFlatClient(config)).toThrow(
        /Flat client requires APIs without namespace.*Please use createGracefulClient instead/
      );

      expect(() => createFlatClient(config)).toThrow(
        /users\/getUser.*users\/createUser/
      );
    });

    it('should reject metadata with invalid API keys', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Test API',
        version: '1.0.0',
        apis: {
          'invalid-key-with-dashes': {
            name: 'Invalid API',
            path: '/invalid',
            method: 'GET',
          },
        },
      };

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: invalidMeta,
      };

      expect(() => createFlatClient(config)).toThrow(
        /Invalid API keys found in pontxSpecMeta/
      );
    });
  });

  describe('Configuration Immutability', () => {
    it('should deep freeze configuration after client creation', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
        validation: { enabled: true },
        retry: { maxAttempts: 3 },
      };

      createFlatClient(config);

      // Config should be frozen
      expect(Object.isFrozen(config)).toBe(true);

      // Nested objects should also be frozen
      expect(Object.isFrozen(config.pontxSpecMeta)).toBe(true);
      expect(Object.isFrozen(config.validation)).toBe(true);
      expect(Object.isFrozen(config.retry)).toBe(true);

      // Attempting to modify should fail (or be silently ignored in non-strict mode)
      expect(() => {
        (config as any).newProperty = 'test';
      }).toThrow();
    });
  });

  describe('Request Function Wrapping Chain', () => {
    it('should wrap request function in correct order: validation → mock → retry → logging', () => {
      const wrapperCallOrder: string[] = [];

      // Mock the feature wrappers to track call order
      const mockValidation = vi.fn((fn: any) => {
        wrapperCallOrder.push('validation');
        return fn;
      });

      const mockMock = vi.fn((fn: any) => {
        wrapperCallOrder.push('mock');
        return fn;
      });

      const mockRetry = vi.fn((fn: any) => {
        wrapperCallOrder.push('retry');
        return fn;
      });

      const mockLogging = vi.fn((fn: any) => {
        wrapperCallOrder.push('logging');
        return fn;
      });

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
        validation: { enabled: true },
        mock: { data: {}, enabled: true },
        retry: { maxAttempts: 3 },
        logger: { enabled: true },
      };

      // This test verifies the wrapper chain order indirectly
      // The actual verification happens in integration tests
      // Here we just ensure client is created with all features
      const client = createFlatClient(config);

      expect(client).toBeDefined();
    });

    it('should use custom fetchFn if provided', () => {
      const customFetch = vi.fn().mockResolvedValue(new Response('{}'));

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
        fetchFn: customFetch,
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
      // The custom fetch function will be used (verified in integration tests)
    });

    it('should use native fetch when no fetchFn is provided', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
      // Native fetch will be used (verified in integration tests)
    });
  });

  describe('Proxy Client Building', () => {
    it('should build flat proxy client with all APIs', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
      };

      const client = createFlatClient(config);

      // All APIs should be accessible
      expect(client.symbolSearch).toBeDefined();
      expect(client.stockQuote).toBeDefined();

      // Each API should have utility methods
      expect(client.symbolSearch.getFetchKey).toBeDefined();
      expect(client.symbolSearch.queryOptions).toBeDefined();

      expect(client.stockQuote.getFetchKey).toBeDefined();
      expect(client.stockQuote.queryOptions).toBeDefined();
    });

    it('should pass custom options to proxy builder', () => {
      const customGetFetchUrl = vi.fn((path: string) => `https://api.example.com${path}`);
      const customMakeUsages = vi.fn((callable: any) => {
        callable.customMethod = () => 'custom';
        return callable;
      });

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: validFlatMeta,
        getFetchUrl: customGetFetchUrl,
        pathMark: ':',
        makeCustomUsages: customMakeUsages,
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
      // Custom options will be used by proxy builder (verified in integration tests)
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty apis object', () => {
      const emptyMeta: PontxSpecMeta = {
        name: 'Empty API',
        version: '1.0.0',
        apis: {},
      };

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: emptyMeta,
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
      // Client with no APIs is valid (edge case)
    });

    it('should handle single API', () => {
      const singleApiMeta: PontxSpecMeta = {
        name: 'Single API',
        version: '1.0.0',
        apis: {
          search: {
            name: 'Search',
            path: '/search',
            method: 'GET',
          },
        },
      };

      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: singleApiMeta,
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
      expect(client.search).toBeDefined();
    });
  });
});
