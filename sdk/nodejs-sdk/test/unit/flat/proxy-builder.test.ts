/**
 * Unit tests for buildFlatProxyClient function
 *
 * Requirements covered:
 * - 4.2: Reuse createCallableApiMethod for each API
 * - 11.1: Unit tests for flat proxy client builder
 * - 11.2: Unit tests for direct API calls
 */

import { describe, it, expect, vi } from 'vitest';
import { buildFlatProxyClient } from '../../../src/flat/proxy-builder';
import type { PontxSpecMeta, RequestFn } from '../../../src/types';

describe('buildFlatProxyClient', () => {
  // Mock request function
  const mockRequestFn: RequestFn = vi.fn(async () => {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  // Sample flat API metadata
  const flatMeta: PontxSpecMeta = {
    name: 'Flat API',
    apis: {
      symbolSearch: {
        name: 'symbolSearch',
        path: '/search/symbol',
        method: 'GET',
        pathParams: [],
        queryParams: [{ name: 'q', required: true, schema: { type: 'string' } }],
        bodyParams: [],
        response: { type: 'object' },
        consumes: ['application/json'],
        produces: ['application/json'],
      },
      stockQuote: {
        name: 'stockQuote',
        path: '/quote',
        method: 'GET',
        pathParams: [],
        queryParams: [{ name: 'symbol', required: true, schema: { type: 'string' } }],
        bodyParams: [],
        response: { type: 'object' },
        consumes: ['application/json'],
        produces: ['application/json'],
      },
      createOrder: {
        name: 'createOrder',
        path: '/orders',
        method: 'POST',
        pathParams: [],
        queryParams: [],
        bodyParams: [
          { name: 'symbol', required: true, schema: { type: 'string' } },
          { name: 'quantity', required: true, schema: { type: 'number' } },
        ],
        response: { type: 'object' },
        consumes: ['application/json'],
        produces: ['application/json'],
      },
    },
  };

  describe('Single-layer proxy structure', () => {
    it('should create a single-layer proxy with all APIs at root level', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      // All APIs should be directly accessible
      expect(client.symbolSearch).toBeDefined();
      expect(client.stockQuote).toBeDefined();
      expect(client.createOrder).toBeDefined();

      // APIs should be callable functions
      expect(typeof client.symbolSearch).toBe('function');
      expect(typeof client.stockQuote).toBe('function');
      expect(typeof client.createOrder).toBe('function');
    });

    it('should mount API methods correctly with all utility methods', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      // Check utility methods exist
      expect(client.symbolSearch.getFetchKey).toBeDefined();
      expect(client.symbolSearch.queryOptions).toBeDefined();
      expect(client.symbolSearch.request).toBeDefined();

      expect(typeof client.symbolSearch.getFetchKey).toBe('function');
      expect(typeof client.symbolSearch.queryOptions).toBe('function');
      expect(typeof client.symbolSearch.request).toBe('function');
    });

    it('should support calling API methods directly', async () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      const result = await client.symbolSearch({ q: 'AAPL' });

      expect(result).toEqual({ success: true });
      expect(mockRequestFn).toHaveBeenCalled();
    });

    it('should handle multiple API calls correctly', async () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      const result1 = await client.symbolSearch({ q: 'AAPL' });
      const result2 = await client.stockQuote({ symbol: 'AAPL' });

      expect(result1).toEqual({ success: true });
      expect(result2).toEqual({ success: true });
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-existent API error handling', () => {
    it('should throw error when accessing non-existent API', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      expect(() => {
        // @ts-expect-error - Intentionally accessing non-existent API
        client.nonExistentApi;
      }).toThrow('API "nonExistentApi" not found in client');
    });

    it('should throw error for multiple non-existent APIs', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      expect(() => {
        // @ts-expect-error - Intentionally accessing non-existent API
        client.anotherMissingApi;
      }).toThrow('API "anotherMissingApi" not found in client');
    });

    it('should not throw error for valid APIs', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      expect(() => {
        client.symbolSearch;
        client.stockQuote;
        client.createOrder;
      }).not.toThrow();
    });
  });

  describe('Proxy property enumeration', () => {
    it('should enumerate all API keys correctly', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      const keys = Object.keys(client);

      expect(keys).toContain('symbolSearch');
      expect(keys).toContain('stockQuote');
      expect(keys).toContain('createOrder');
      expect(keys).toHaveLength(3);
    });

    it('should support Object.getOwnPropertyNames', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      const propertyNames = Object.getOwnPropertyNames(client);

      expect(propertyNames).toContain('symbolSearch');
      expect(propertyNames).toContain('stockQuote');
      expect(propertyNames).toContain('createOrder');
    });

    it('should support "in" operator for API existence checks', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      expect('symbolSearch' in client).toBe(true);
      expect('stockQuote' in client).toBe(true);
      expect('createOrder' in client).toBe(true);
      expect('nonExistent' in client).toBe(false);
    });
  });

  describe('Options support', () => {
    it('should pass getFetchUrl option to callable methods', () => {
      const getFetchUrl = vi.fn((path: string) => `https://api.example.com${path}`);

      const client = buildFlatProxyClient(mockRequestFn, flatMeta, {
        getFetchUrl,
      });

      expect(client.symbolSearch).toBeDefined();
      // The option should be passed to createCallableApiMethod internally
      // We'll verify this in integration tests
    });

    it('should pass pathMark option to callable methods', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta, {
        pathMark: ':',
      });

      expect(client.symbolSearch).toBeDefined();
    });

    it('should pass makeCustomUsages option to callable methods', () => {
      const makeCustomUsages = vi.fn((callable) => {
        callable.customMethod = () => 'custom';
        return callable;
      });

      const client = buildFlatProxyClient(mockRequestFn, flatMeta, {
        makeCustomUsages,
      });

      expect(client.symbolSearch.customMethod).toBeDefined();
      expect(client.symbolSearch.customMethod()).toBe('custom');
    });
  });

  describe('Empty metadata handling', () => {
    it('should handle empty APIs object', () => {
      const emptyMeta: PontxSpecMeta = {
        name: 'Empty API',
        apis: {},
      };

      const client = buildFlatProxyClient(mockRequestFn, emptyMeta);

      expect(Object.keys(client)).toHaveLength(0);
    });

    it('should throw error when accessing API on empty client', () => {
      const emptyMeta: PontxSpecMeta = {
        name: 'Empty API',
        apis: {},
      };

      const client = buildFlatProxyClient(mockRequestFn, emptyMeta);

      expect(() => {
        // @ts-expect-error - Intentionally accessing non-existent API
        client.anyApi;
      }).toThrow('API "anyApi" not found in client');
    });
  });

  describe('Callable method integration', () => {
    it('should create callable methods with correct API keys', async () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      // getFetchKey should use flat API key (no namespace)
      const key = client.symbolSearch.getFetchKey({ q: 'AAPL' });

      expect(key).toContain('symbolSearch');
      expect(key).not.toContain('/');
    });

    it('should create queryOptions with correct structure', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      const options = client.symbolSearch.queryOptions({ q: 'AAPL' });

      expect(options).toHaveProperty('queryKey');
      expect(options).toHaveProperty('queryFn');
      expect(Array.isArray(options.queryKey)).toBe(true);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should maintain request property for backward compatibility', () => {
      const client = buildFlatProxyClient(mockRequestFn, flatMeta);

      expect(client.symbolSearch.request).toBe(client.symbolSearch);
    });
  });
});
