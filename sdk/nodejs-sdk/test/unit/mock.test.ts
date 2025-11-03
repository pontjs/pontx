/**
 * Unit tests for Mock module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestFn, MockConfig } from '../../src/types';

// Import the mock module (to be implemented)
import { withMock, MOCK_ERROR_CODES } from '../../src/features/mock';

describe('Mock Module', () => {
  let mockRequestFn: RequestFn;
  let mockResponse: Response;

  beforeEach(() => {
    // Create mock response
    mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Create mock request function
    mockRequestFn = vi.fn().mockResolvedValue(mockResponse);
  });

  describe('withMock - basic functionality', () => {
    it('should return original function when mock config is not provided', async () => {
      const wrapped = withMock(mockRequestFn);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should return original function when mock is explicitly disabled', async () => {
      const config: MockConfig = {
        enabled: false,
        data: {},
      };
      const wrapped = withMock(mockRequestFn, config);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should wrap function when mock config is provided', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': { id: 1, name: 'Test User' },
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      expect(wrapped).not.toBe(mockRequestFn);
    });

    it('should call original request function when API has no mock data', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'other/api': { data: 'test' },
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);

      expect(mockRequestFn).toHaveBeenCalledWith(url, init);
      expect(result).toBe(mockResponse);
    });
  });

  describe('withMock - mock data return', () => {
    it('should return mock data when configured', async () => {
      const mockData = { id: 1, name: 'Mock User', email: 'mock@example.com' };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': mockData,
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);

      // Should not call original request function
      expect(mockRequestFn).not.toHaveBeenCalled();

      // Should return Response object
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(200);

      // Should contain mock data
      const body = await result.json();
      expect(body).toEqual(mockData);
    });

    it('should set correct content-type header for mock response', async () => {
      const mockData = { id: 1, name: 'Mock User' };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': mockData,
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);

      expect(result.headers.get('content-type')).toBe('application/json');
    });

    it('should handle array mock data', async () => {
      const mockData = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/list': mockData,
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/list';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);
      const body = await result.json();
      expect(body).toEqual(mockData);
    });

    it('should handle primitive mock data', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/count': 42,
          'users/status': 'active',
          'users/enabled': true,
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      // Test number
      let result = await wrapped('http://api.example.com/users/count', { method: 'GET' });
      let body = await result.json();
      expect(body).toBe(42);

      // Test string
      result = await wrapped('http://api.example.com/users/status', { method: 'GET' });
      body = await result.json();
      expect(body).toBe('active');

      // Test boolean
      result = await wrapped('http://api.example.com/users/enabled', { method: 'GET' });
      body = await result.json();
      expect(body).toBe(true);
    });

    it('should match API key from different URL formats', async () => {
      const mockData = { success: true };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': mockData,
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      // Test various URL formats
      const urls = [
        'http://api.example.com/users/getUser',
        'https://api.example.com/users/getUser?id=1',
        'http://localhost:3000/users/getUser',
        'https://example.com/api/v1/users/getUser',
      ];

      for (const url of urls) {
        const result = await wrapped(url, { method: 'GET' });
        const body = await result.json();
        expect(body).toEqual(mockData);
      }
    });
  });

  describe('withMock - delay functionality', () => {
    it('should delay response when delay is configured', async () => {
      const mockData = { id: 1, name: 'Mock User' };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': mockData,
        },
        delay: 100, // 100ms delay
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const startTime = Date.now();
      const result = await wrapped(url, init);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have delayed at least 100ms
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some timing variance

      const body = await result.json();
      expect(body).toEqual(mockData);
    });

    it('should not delay when delay is 0', async () => {
      const mockData = { id: 1, name: 'Mock User' };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': mockData,
        },
        delay: 0,
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const startTime = Date.now();
      const result = await wrapped(url, init);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should be very fast (< 10ms)
      expect(duration).toBeLessThan(10);

      const body = await result.json();
      expect(body).toEqual(mockData);
    });

    it('should not delay when delay is not configured', async () => {
      const mockData = { id: 1, name: 'Mock User' };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': mockData,
        },
        // No delay configured
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const startTime = Date.now();
      const result = await wrapped(url, init);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should be very fast (< 10ms)
      expect(duration).toBeLessThan(10);

      const body = await result.json();
      expect(body).toEqual(mockData);
    });

    it('should handle different delay values', async () => {
      const mockData = { id: 1 };

      // Test with 50ms delay
      let config: MockConfig = {
        enabled: true,
        data: { 'test/api': mockData },
        delay: 50,
      };
      let wrapped = withMock(mockRequestFn, config);

      let startTime = Date.now();
      await wrapped('http://api.example.com/test/api', { method: 'GET' });
      let duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(40); // Allow variance

      // Test with 200ms delay
      config = {
        enabled: true,
        data: { 'test/api': mockData },
        delay: 200,
      };
      wrapped = withMock(mockRequestFn, config);

      startTime = Date.now();
      await wrapped('http://api.example.com/test/api', { method: 'GET' });
      duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(190); // Allow variance
    });
  });

  describe('withMock - error handling', () => {
    it('should throw error when mock data is missing in strict mode', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'other/api': { data: 'test' },
        },
        strict: true, // Strict mode - all APIs must have mock data
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      await expect(wrapped(url, init)).rejects.toThrow(/Mock data not found/);
    });

    it('should include API key in error message', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {},
        strict: true,
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      try {
        await wrapped(url, init);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('users/getUser');
        expect(error.code).toBe(MOCK_ERROR_CODES.MOCK_NOT_FOUND);
        expect(error.apiKey).toBe('users/getUser');
      }
    });

    it('should fall back to real request when not in strict mode', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'other/api': { data: 'test' },
        },
        strict: false, // Not strict - fall back to real request
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);

      // Should call original request function
      expect(mockRequestFn).toHaveBeenCalledWith(url, init);
      expect(result).toBe(mockResponse);
    });

    it('should default to non-strict mode when strict is not specified', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'other/api': { data: 'test' },
        },
        // strict not specified - should default to false
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      // Should not throw
      const result = await wrapped(url, init);
      expect(mockRequestFn).toHaveBeenCalled();
      expect(result).toBe(mockResponse);
    });
  });

  describe('withMock - integration scenarios', () => {
    it('should work with POST requests', async () => {
      const mockData = { id: 1, created: true };
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/create': mockData,
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      const url = 'http://api.example.com/users/create';
      const init: RequestInit = {
        method: 'POST',
        body: JSON.stringify({ name: 'New User' }),
      };

      const result = await wrapped(url, init);
      const body = await result.json();
      expect(body).toEqual(mockData);
      expect(mockRequestFn).not.toHaveBeenCalled();
    });

    it('should work with different HTTP methods', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/get': { method: 'GET' },
          'users/create': { method: 'POST' },
          'users/update': { method: 'PUT' },
          'users/delete': { method: 'DELETE' },
        },
      };
      const wrapped = withMock(mockRequestFn, config);

      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      const apis = ['get', 'create', 'update', 'delete'];

      for (let i = 0; i < methods.length; i++) {
        const result = await wrapped(
          `http://api.example.com/users/${apis[i]}`,
          { method: methods[i] }
        );
        const body = await result.json();
        expect(body).toEqual({ method: methods[i] });
      }

      // Original request should never be called
      expect(mockRequestFn).not.toHaveBeenCalled();
    });

    it('should handle mixed scenario with some APIs mocked and others not', async () => {
      const config: MockConfig = {
        enabled: true,
        data: {
          'users/getUser': { id: 1, name: 'Mock User' },
          // 'users/list' not mocked
        },
        strict: false,
      };
      const wrapped = withMock(mockRequestFn, config);

      // First call - mocked
      let result = await wrapped('http://api.example.com/users/getUser', { method: 'GET' });
      let body = await result.json();
      expect(body).toEqual({ id: 1, name: 'Mock User' });
      expect(mockRequestFn).not.toHaveBeenCalled();

      // Second call - not mocked, should call real request
      result = await wrapped('http://api.example.com/users/list', { method: 'GET' });
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });
});
