/**
 * E2E tests for Flat Client with Finnhub-like API
 *
 * Tests cover Task 6 requirements:
 * - Complete workflow from client creation to API calls
 * - Real-world flat API specification (Finnhub pattern)
 * - Utility methods (getFetchKey, queryOptions)
 * - Feature modules in realistic scenarios
 *
 * Requirements:
 * - 11.7: E2E test coverage with real flat API specification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFlatClient } from '../../src/flat/create-flat-client';
import type { PontxSpecMeta } from '../../src/types';
import { createMockResponse } from '../helpers/test-utils';

describe('Flat Client E2E - Finnhub API', () => {
  // Real Finnhub-like API metadata (flat structure)
  const finnhubMeta: PontxSpecMeta = {
    name: 'Finnhub Stock API',
    version: '1.0.0',
    baseUrl: 'https://finnhub.io/api/v1',
    apis: {
      // Market data APIs
      symbolSearch: {
        name: 'Symbol Search',
        description: 'Search for best-matching symbols based on your query',
        path: '/search',
        method: 'GET',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Query string',
            schema: { type: 'string' },
          },
        ],
      },
      quote: {
        name: 'Quote',
        description: 'Get real-time quote data for US stocks',
        path: '/quote',
        method: 'GET',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            description: 'Symbol',
            schema: { type: 'string' },
          },
        ],
      },
      stockCandles: {
        name: 'Stock Candles',
        description: 'Get candlestick data for stocks',
        path: '/stock/candle',
        method: 'GET',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            description: 'Symbol',
            schema: { type: 'string' },
          },
          {
            name: 'resolution',
            in: 'query',
            required: true,
            description: 'Supported resolution includes 1, 5, 15, 30, 60, D, W, M',
            schema: { type: 'string' },
          },
          {
            name: 'from',
            in: 'query',
            required: true,
            description: 'UNIX timestamp',
            schema: { type: 'integer' },
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            description: 'UNIX timestamp',
            schema: { type: 'integer' },
          },
        ],
      },
      companyProfile: {
        name: 'Company Profile',
        description: 'Get general information of a company',
        path: '/stock/profile2',
        method: 'GET',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            description: 'Symbol of the company',
            schema: { type: 'string' },
          },
        ],
      },
      marketNews: {
        name: 'Market News',
        description: 'Get latest market news',
        path: '/news',
        method: 'GET',
        parameters: [
          {
            name: 'category',
            in: 'query',
            required: true,
            description: 'News category (general, forex, crypto, merger)',
            schema: { type: 'string' },
          },
          {
            name: 'minId',
            in: 'query',
            required: false,
            description: 'Use this field to get only news after this ID',
            schema: { type: 'integer' },
          },
        ],
      },
      companyNews: {
        name: 'Company News',
        description: 'Get company news',
        path: '/company-news',
        method: 'GET',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            description: 'Company symbol',
            schema: { type: 'string' },
          },
          {
            name: 'from',
            in: 'query',
            required: true,
            description: 'From date YYYY-MM-DD',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            description: 'To date YYYY-MM-DD',
            schema: { type: 'string', format: 'date' },
          },
        ],
      },
    },
  };

  describe('E2E Workflow: Client Creation to API Calls', () => {
    it('should complete full workflow: create client -> call APIs -> verify results', async () => {
      const mockFetch = vi.fn();

      // Setup mock responses for different APIs
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            count: 2,
            result: [
              { symbol: 'AAPL', description: 'Apple Inc', type: 'Common Stock' },
              { symbol: 'AABA', description: 'Altaba Inc', type: 'Common Stock' },
            ],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            c: 150.25,
            d: 2.15,
            dp: 1.45,
            h: 151.00,
            l: 149.50,
            o: 149.75,
            pc: 148.10,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            country: 'US',
            currency: 'USD',
            exchange: 'NASDAQ',
            ipo: '1980-12-12',
            marketCapitalization: 2500000,
            name: 'Apple Inc',
            phone: '14089961010',
            shareOutstanding: 16530000,
            ticker: 'AAPL',
            weburl: 'https://www.apple.com/',
            logo: 'https://static.finnhub.io/logo/apple.png',
            finnhubIndustry: 'Technology',
          })
        );

      // Create flat client
      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
      });

      // 1. Search for symbol
      const searchResults = await client.symbolSearch({ q: 'AAP' });
      expect(searchResults.count).toBe(2);
      expect(searchResults.result[0].symbol).toBe('AAPL');

      // 2. Get quote for symbol
      const quote = await client.quote({ symbol: 'AAPL' });
      expect(quote.c).toBe(150.25);
      expect(quote.dp).toBe(1.45);

      // 3. Get company profile
      const profile = await client.companyProfile({ symbol: 'AAPL' });
      expect(profile.name).toBe('Apple Inc');
      expect(profile.ticker).toBe('AAPL');

      // Verify all APIs were called
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle complex multi-parameter API calls', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        createMockResponse({
          c: [150.25, 151.50, 152.00],
          h: [151.00, 152.25, 153.00],
          l: [149.50, 150.75, 151.25],
          o: [149.75, 151.00, 151.75],
          t: [1609459200, 1609545600, 1609632000],
          v: [100000000, 95000000, 98000000],
          s: 'ok',
        })
      );

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
      });

      const candles = await client.stockCandles({
        symbol: 'AAPL',
        resolution: 'D',
        from: 1609459200,
        to: 1609632000,
      });

      expect(candles.s).toBe('ok');
      expect(candles.c).toHaveLength(3);
      expect(candles.t).toHaveLength(3);

      // Verify URL was constructed correctly
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('symbol=AAPL');
      expect(callUrl).toContain('resolution=D');
      expect(callUrl).toContain('from=1609459200');
      expect(callUrl).toContain('to=1609632000');
    });

    it('should handle APIs with optional parameters', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          createMockResponse([
            { category: 'general', datetime: 1234567890, headline: 'News 1' },
            { category: 'general', datetime: 1234567891, headline: 'News 2' },
          ])
        )
        .mockResolvedValueOnce(
          createMockResponse([
            { category: 'general', datetime: 1234567892, headline: 'News 3' },
          ])
        );

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
      });

      // Call without optional parameter
      const news1 = await client.marketNews({ category: 'general' });
      expect(news1).toHaveLength(2);

      // Call with optional parameter
      const news2 = await client.marketNews({ category: 'general', minId: 100 });
      expect(news2).toHaveLength(1);

      // Verify optional parameter was included in URL
      const call2Url = mockFetch.mock.calls[1][0];
      expect(call2Url).toContain('minId=100');
    });
  });

  describe('E2E: Utility Methods', () => {
    it('should generate valid cache keys for React Query', () => {
      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
      });

      const key1 = client.quote.getFetchKey({ symbol: 'AAPL' });
      const key2 = client.quote.getFetchKey({ symbol: 'MSFT' });
      const key3 = client.symbolSearch.getFetchKey({ q: 'AAPL' });

      // Keys should be strings
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
      expect(typeof key3).toBe('string');

      // Keys for same API but different params should differ
      expect(key1).not.toEqual(key2);

      // Keys for different APIs should differ
      expect(key1).not.toEqual(key3);

      // Keys should be deterministic
      const key1Again = client.quote.getFetchKey({ symbol: 'AAPL' });
      expect(key1).toEqual(key1Again);
    });

    it('should provide React Query compatible queryOptions', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        createMockResponse({ c: 150.25 })
      );

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
      });

      const options = client.quote.queryOptions({ symbol: 'AAPL' });

      // Should have required React Query properties
      expect(options.queryKey).toBeDefined();
      expect(options.queryFn).toBeDefined();

      // queryFn should be callable
      expect(typeof options.queryFn).toBe('function');

      // Calling queryFn should execute the API call
      const result = await options.queryFn();
      expect(result).toEqual({ c: 150.25 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should support queryOptions for complex queries', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        createMockResponse({ c: [150, 151, 152] })
      );

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
      });

      const options = client.stockCandles.queryOptions({
        symbol: 'AAPL',
        resolution: 'D',
        from: 1000000,
        to: 2000000,
      });

      const result = await options.queryFn();
      expect(result.c).toHaveLength(3);

      // Verify all parameters were included
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('symbol=AAPL');
      expect(callUrl).toContain('resolution=D');
    });
  });

  describe('E2E: Feature Modules in Real Scenarios', () => {
    it('should use mock mode for development without API key', async () => {
      const mockData = {
        quote: { c: 150.25, d: 2.15, dp: 1.45, h: 151.00, l: 149.50, o: 149.75, pc: 148.10 },
        symbolSearch: { count: 1, result: [{ symbol: 'AAPL', description: 'Apple Inc' }] },
      };

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        mock: {
          enabled: true,
          data: mockData,
        },
      });

      // Mock should return predefined data
      const quote = await client.quote({ symbol: 'AAPL' });
      expect(quote).toEqual(mockData.quote);

      const search = await client.symbolSearch({ q: 'AAPL' });
      expect(search).toEqual(mockData.symbolSearch);
    });

    it('should retry on network failures with exponential backoff', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse({ c: 150.25 }));

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
        retry: {
          maxAttempts: 3,
          delay: 10,
          backoffMultiplier: 2,
        },
      });

      const result = await client.quote({ symbol: 'AAPL' });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.c).toBe(150.25);
    });

    it('should log API calls in debug mode', async () => {
      const logSpy = vi.fn();
      const mockFetch = vi.fn().mockResolvedValueOnce(
        createMockResponse({ c: 150.25 })
      );

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
        getFetchUrl: (path) => `https://finnhub.io/api/v1${path}`,
        logger: {
          enabled: true,
          instance: {
            info: logSpy,
            warn: logSpy,
            error: logSpy,
          },
        },
      });

      await client.quote({ symbol: 'AAPL' });

      // Logger should have been called
      expect(logSpy).toHaveBeenCalled();

      // Should log request details
      const logCalls = logSpy.mock.calls.flat();
      const logMessages = logCalls.join(' ');

      // Verify meaningful information was logged
      expect(logMessages).toContain('quote');
    });

    it('should combine multiple features in production-like setup', async () => {
      const logSpy = vi.fn();
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary network issue'))
        .mockResolvedValueOnce(createMockResponse({ c: 150.25 }));

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
        getFetchUrl: (path) => `https://finnhub.io/api/v1${path}`,
        retry: {
          maxAttempts: 2,
          delay: 10,
        },
        logger: {
          enabled: true,
          instance: {
            info: logSpy,
            warn: logSpy,
            error: logSpy,
          },
        },
        validation: {
          enabled: true,
        },
      });

      const result = await client.quote({ symbol: 'AAPL' });

      // Should succeed after retry
      expect(result.c).toBe(150.25);

      // Should have retried once
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Should have logged the operations
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('E2E: Custom Configuration in Real Scenarios', () => {
    it('should use custom URL builder for API gateway', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        createMockResponse({ c: 150.25 })
      );

      // Custom URL builder for API gateway pattern
      const customGetFetchUrl = (path: string, params: Record<string, unknown>) => {
        const baseUrl = 'https://api-gateway.example.com/finnhub/v1';
        return `${baseUrl}${path}`;
      };

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
        getFetchUrl: customGetFetchUrl,
      });

      await client.quote({ symbol: 'AAPL' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('https://api-gateway.example.com/finnhub/v1');
    });

    it('should add custom methods for domain-specific utilities', () => {
      const customMakeUsages = (callable: any, apiMeta: any) => {
        // Add custom method to format response
        callable.formatPrice = (result: any) => {
          if (result && typeof result.c === 'number') {
            return `$${result.c.toFixed(2)}`;
          }
          return 'N/A';
        };

        // Add method to get API description
        callable.getDescription = () => apiMeta?.description || '';

        return callable;
      };

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        makeCustomUsages: customMakeUsages,
      });

      // Custom methods should be available
      expect(client.quote.formatPrice).toBeDefined();
      expect(client.quote.getDescription).toBeDefined();

      // Should work correctly
      const formatted = client.quote.formatPrice({ c: 150.25 });
      expect(formatted).toBe('$150.25');

      const description = client.quote.getDescription();
      expect(description).toBe('Get real-time quote data for US stocks');
    });
  });

  describe('E2E: Error Scenarios', () => {
    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
        fetchFn: mockFetch,
      });

      // Should not throw, but return response
      const result = await client.quote({ symbol: 'AAPL' });
      expect(result.error).toBe('Invalid API key');
    });

    it('should provide clear error for non-existent API', () => {
      const client = createFlatClient({
        pontxSpecMeta: finnhubMeta,
      });

      // Should throw clear error for non-existent API
      expect(() => {
        (client as any).nonExistentApi;
      }).toThrow('API "nonExistentApi" not found in client');
    });
  });
});
