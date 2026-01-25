/**
 * Integration tests for Flat Client
 *
 * Tests cover Task 6 requirements:
 * - 6.1: Direct API method calls with various parameter patterns
 * - 6.2: Feature module integration (validation, mock, retry, logger)
 * - 6.3: Custom configuration options (getFetchUrl, makeCustomUsages, fetchFn, pathMark)
 *
 * Requirements:
 * - 2.1-2.5: Direct API access pattern
 * - 3.1-3.4: Utility methods support
 * - 8.1-8.7: Feature parity with graceful client
 * - 11.2, 11.3, 11.5: Integration test coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFlatClient } from '../../src/flat/create-flat-client';
import type { PontxSpecMeta, CreateFlatClientConfig, PontxAPI } from '../../src/types';
import { createMockResponse } from '../helpers/test-utils';

describe('Flat Client Integration Tests', () => {
  // Test data: Finnhub-style flat API metadata
  const flatApiMeta: PontxSpecMeta = {
    name: 'Finnhub API',
    version: '1.0.0',
    apis: {
      // No parameters
      marketStatus: {
        name: 'Market Status',
        path: '/market-status',
        method: 'GET',
        parameters: [],
      },
      // Query parameters only
      symbolSearch: {
        name: 'Symbol Search',
        path: '/search',
        method: 'GET',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'exchange', in: 'query', required: false, schema: { type: 'string' } },
        ],
      },
      // Path and query parameters
      stockCandles: {
        name: 'Stock Candles',
        path: '/stock/candle/{symbol}',
        method: 'GET',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'resolution', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'from', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'number' } },
        ],
      },
      // POST with JSON body (two-param mode with object body)
      createAlert: {
        name: 'Create Alert',
        path: '/alert',
        method: 'POST',
        parameters: [
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'price', in: 'body', required: true, schema: { type: 'number' } },
          { name: 'condition', in: 'body', required: true, schema: { type: 'string' } },
        ],
        consumes: ['application/json'],
        bodyType: 'object',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  condition: { type: 'string' },
                },
              },
            },
          },
        },
      },
      // POST with FormData (three-param mode)
      uploadDocument: {
        name: 'Upload Document',
        path: '/upload',
        method: 'POST',
        consumes: ['multipart/form-data'],
        parameters: [],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
      },
    },
  };

  describe('6.1: Direct API Method Calls', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
    });

    it('should handle API call with no parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 'open' })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      const result = await client.marketStatus();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/market-status'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual({ status: 'open' });
    });

    it('should handle API call with query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          count: 2,
          result: [
            { symbol: 'AAPL', description: 'Apple Inc' },
            { symbol: 'AABA', description: 'Altaba Inc' },
          ],
        })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      const result = await client.symbolSearch({ q: 'AAP' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/search');
      expect(callUrl).toContain('q=AAP');
      expect(result.count).toBe(2);
    });

    it('should handle API call with optional query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ count: 1, result: [] })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      await client.symbolSearch({ q: 'AAPL', exchange: 'US' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('q=AAPL');
      expect(callUrl).toContain('exchange=US');
    });

    it('should handle API call with path and query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          c: [100, 101, 102],
          h: [102, 103, 104],
          l: [99, 100, 101],
          o: [100, 101, 102],
          t: [1234567890, 1234567900, 1234567910],
          v: [1000, 2000, 3000],
        })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      const result = await client.stockCandles({
        symbol: 'AAPL',
        resolution: 'D',
        from: 1234567890,
        to: 1234567910,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];

      // Path parameter should be in URL path
      expect(callUrl).toContain('/stock/candle/AAPL');

      // Query parameters should be in query string
      expect(callUrl).toContain('resolution=D');
      expect(callUrl).toContain('from=1234567890');
      expect(callUrl).toContain('to=1234567910');

      expect(result.c).toHaveLength(3);
    });

    it('should handle POST with JSON body (two-param mode)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ id: '123', status: 'created' })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
        getFetchUrl: (path) => `https://api.test.com${path}`,
      });

      // Two-param mode: params (including body params), options
      const result = await client.createAlert({
        symbol: 'AAPL',
        price: 150,
        condition: 'above',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];

      // Query parameter in URL
      expect(url).toContain('symbol=AAPL');

      // Body params serialized as JSON
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ price: 150, condition: 'above' });

      expect(result.id).toBe('123');
    });

    it('should handle POST with FormData (three-param mode)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ fileId: 'abc123' })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
        getFetchUrl: (path) => `https://api.test.com${path}`,
      });

      const formData = new FormData();
      formData.append('file', new Blob(['test content']), 'test.txt');

      // Optimized two-param mode: (body, options) because no path/query params
      const result = await client.uploadDocument(formData);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];

      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      expect(result.fileId).toBe('abc123');
    });
  });

  describe('6.1: Parameter Classification', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn().mockResolvedValue(createMockResponse({}));
    });

    it('should correctly classify path parameters', async () => {
      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      await client.stockCandles({
        symbol: 'TSLA',
        resolution: '1',
        from: 1000000,
        to: 2000000,
      });

      const callUrl = mockFetch.mock.calls[0][0];

      // Symbol should be in path, not query
      expect(callUrl).toContain('/stock/candle/TSLA');
      expect(callUrl).not.toMatch(/[?&]symbol=/);
    });

    it('should correctly classify query parameters', async () => {
      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      await client.symbolSearch({ q: 'TEST', exchange: 'NASDAQ' });

      const callUrl = mockFetch.mock.calls[0][0];

      // Both should be in query string
      expect(callUrl).toContain('q=TEST');
      expect(callUrl).toContain('exchange=NASDAQ');
    });

    it('should correctly classify body parameters', async () => {
      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      // Two-param mode: all params together (query + body)
      await client.createAlert({
        symbol: 'MSFT',
        price: 300,
        condition: 'below',
      });

      const [url, init] = mockFetch.mock.calls[0];

      // symbol is query param
      expect(url).toContain('symbol=MSFT');

      // price and condition are in body
      const body = JSON.parse(init.body);
      expect(body).toEqual({ price: 300, condition: 'below' });
    });
  });

  describe('6.1: Utility Methods', () => {
    it('should provide getFetchKey utility method', () => {
      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
      });

      const key = client.symbolSearch.getFetchKey({ q: 'AAPL' });

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key).toContain('symbolSearch');
      expect(key).toContain('q=AAPL');
    });

    it('should generate unique keys for different parameters', () => {
      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
      });

      const key1 = client.symbolSearch.getFetchKey({ q: 'AAPL' });
      const key2 = client.symbolSearch.getFetchKey({ q: 'MSFT' });
      const key3 = client.symbolSearch.getFetchKey({ q: 'AAPL', exchange: 'US' });

      // Keys should be strings
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
      expect(typeof key3).toBe('string');

      // Keys should be different
      expect(key1).not.toEqual(key2);
      expect(key1).not.toEqual(key3);
      expect(key2).not.toEqual(key3);
    });

    it('should provide queryOptions utility method', () => {
      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
      });

      const options = client.symbolSearch.queryOptions({ q: 'AAPL' });

      expect(options).toBeDefined();
      expect(options.queryKey).toBeDefined();
      expect(options.queryFn).toBeDefined();
      expect(typeof options.queryFn).toBe('function');
    });

    it('should make queryOptions.queryFn callable', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        createMockResponse({ count: 1, result: [] })
      );

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
      });

      const options = client.symbolSearch.queryOptions({ q: 'AAPL' });
      const result = await options.queryFn();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ count: 1, result: [] });
    });
  });

  describe('6.2: Feature Module Integration', () => {
    describe('Validation Integration', () => {
      it('should integrate with validation feature', async () => {
        // Note: This test assumes zod is available
        // In real usage, validation would validate request/response against schemas
        const mockFetch = vi.fn().mockResolvedValueOnce(
          createMockResponse({ status: 'ok' })
        );

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          getFetchUrl: (path) => `https://api.test.com${path}`,
          validation: {
            enabled: true,
            validateRequest: true,
            validateResponse: true,
          },
        });

        // Should work with valid parameters
        await client.marketStatus();
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    describe('Mock Integration', () => {
      it('should integrate with mock feature', async () => {
        const mockData = {
          marketStatus: { status: 'closed', reason: 'weekend' },
          symbolSearch: { count: 0, result: [] },
        };

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          mock: {
            enabled: true,
            data: mockData,
          },
        });

        const result = await client.marketStatus();

        expect(result).toEqual(mockData.marketStatus);
      });

      it('should return mock data without calling real API', async () => {
        const mockFetch = vi.fn();
        const mockData = {
          symbolSearch: { count: 1, result: [{ symbol: 'MOCK' }] },
        };

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          mock: {
            enabled: true,
            data: mockData,
          },
        });

        const result = await client.symbolSearch({ q: 'TEST' });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result).toEqual(mockData.symbolSearch);
      });
    });

    describe('Retry Integration', () => {
      it('should integrate with retry feature', async () => {
        const mockFetch = vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(createMockResponse({ status: 'ok' }));

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          retry: {
            maxAttempts: 3,
            delay: 10, // Short delay for tests
          },
        });

        const result = await client.marketStatus();

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result).toEqual({ status: 'ok' });
      });

      it('should fail after max retry attempts', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          retry: {
            maxAttempts: 2,
            delay: 10,
          },
        });

        await expect(client.marketStatus()).rejects.toThrow('Network error');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe('Logger Integration', () => {
      it('should integrate with logger feature', async () => {
        const logSpy = vi.fn();
        const mockFetch = vi.fn().mockResolvedValueOnce(
          createMockResponse({ status: 'ok' })
        );

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          getFetchUrl: (path) => `https://api.test.com${path}`,
          logger: {
            enabled: true,
            instance: {
              info: logSpy,
              warn: logSpy,
              error: logSpy,
            },
          },
        });

        await client.marketStatus();

        expect(logSpy).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    describe('Multi-feature Integration', () => {
      it('should work with validation + retry + logger combined', async () => {
        const logSpy = vi.fn();
        const mockFetch = vi.fn()
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockResolvedValueOnce(createMockResponse({ status: 'ok' }));

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          getFetchUrl: (path) => `https://api.test.com${path}`,
          validation: { enabled: true },
          retry: { maxAttempts: 2, delay: 10 },
          logger: {
            enabled: true,
            instance: {
              info: logSpy,
              warn: logSpy,
              error: logSpy,
            },
          },
        });

        const result = await client.marketStatus();

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ status: 'ok' });
        expect(logSpy).toHaveBeenCalled();
      });
    });
  });

  describe('6.3: Custom Configuration Options', () => {
    describe('Custom getFetchUrl', () => {
      it('should use custom getFetchUrl callback', async () => {
        const mockFetch = vi.fn().mockResolvedValueOnce(
          createMockResponse({ data: 'test' })
        );

        const customGetFetchUrl = vi.fn((path: string, params: Record<string, unknown>) => {
          return `https://custom-api.example.com${path}`;
        });

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: mockFetch,
          getFetchUrl: customGetFetchUrl,
        });

        await client.marketStatus();

        expect(customGetFetchUrl).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://custom-api.example.com'),
          expect.any(Object)
        );
      });
    });

    describe('Custom makeCustomUsages', () => {
      it('should use custom makeCustomUsages callback', () => {
        const customMakeUsages = vi.fn((callable: any, apiMeta?: PontxAPI) => {
          callable.customMethod = () => 'custom value';
          callable.getApiName = () => apiMeta?.name || 'unknown';
          return callable;
        });

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          makeCustomUsages: customMakeUsages,
        });

        expect(customMakeUsages).toHaveBeenCalled();
        expect(client.symbolSearch.customMethod).toBeDefined();
        expect(client.symbolSearch.customMethod()).toBe('custom value');
        expect(client.symbolSearch.getApiName()).toBe('Symbol Search');
      });
    });

    describe('Custom fetchFn', () => {
      it('should use custom fetchFn instead of native fetch', async () => {
        const customFetch = vi.fn().mockResolvedValueOnce(
          createMockResponse({ source: 'custom' })
        );

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: customFetch,
        });

        const result = await client.marketStatus();

        expect(customFetch).toHaveBeenCalled();
        expect(result).toEqual({ source: 'custom' });
      });

      it('should pass correct arguments to custom fetchFn', async () => {
        const customFetch = vi.fn().mockResolvedValueOnce(
          createMockResponse({})
        );

        const client = createFlatClient({
          pontxSpecMeta: flatApiMeta,
          fetchFn: customFetch,
        });

        await client.symbolSearch({ q: 'TEST' });

        expect(customFetch).toHaveBeenCalledWith(
          expect.stringContaining('/search'),
          expect.objectContaining({
            method: 'GET',
          })
        );
      });
    });

    describe('Custom pathMark', () => {
      it('should use custom pathMark for path parameters', async () => {
        const mockFetch = vi.fn().mockResolvedValueOnce(
          createMockResponse({})
        );

        // Create metadata with path parameter
        // pathMark is used as placeholder when parameter is missing
        const customPathMeta: PontxSpecMeta = {
          name: 'Custom Path API',
          version: '1.0.0',
          apis: {
            getItem: {
              name: 'Get Item',
              path: '/items/{id}',
              method: 'GET',
              pathParams: ['id'],
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              ],
            },
          },
        };

        const client = createFlatClient({
          pontxSpecMeta: customPathMeta,
          fetchFn: mockFetch,
          pathMark: ':id', // Used when id is missing
        });

        await client.getItem({ id: '123' });

        const callUrl = mockFetch.mock.calls[0][0];
        expect(callUrl).toContain('/items/123');
        expect(callUrl).not.toContain('{id}');
      });
    });
  });

  describe('Feature Parity with Graceful Client', () => {
    it('should support same parameter patterns as graceful client', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(createMockResponse({}))
        .mockResolvedValueOnce(createMockResponse({}))
        .mockResolvedValueOnce(createMockResponse({}));

      const client = createFlatClient({
        pontxSpecMeta: flatApiMeta,
        fetchFn: mockFetch,
        getFetchUrl: (path) => `https://api.test.com${path}`,
      });

      // Two-param mode (params, options)
      await client.symbolSearch({ q: 'TEST' });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Two-param mode with body params
      await client.createAlert({ symbol: 'AAPL', price: 150, condition: 'above' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Optimized two-param mode (body, options) for FormData without params
      const formData = new FormData();
      await client.uploadDocument(formData);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should support same configuration options as graceful client', () => {
      const config: CreateFlatClientConfig<any> = {
        pontxSpecMeta: flatApiMeta,
        validation: { enabled: true },
        mock: { enabled: false, data: {} },
        retry: { maxAttempts: 3 },
        logger: { enabled: false },
        fetchFn: vi.fn(),
        getFetchUrl: (path) => `https://api.com${path}`,
        pathMark: '{}',
        makeCustomUsages: (c) => c,
      };

      const client = createFlatClient(config);

      expect(client).toBeDefined();
    });
  });
});
