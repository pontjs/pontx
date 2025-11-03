/**
 * Unit tests for Logger module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestFn, LoggerConfig, Logger } from '../../src/types';

// Import the logger module (to be implemented)
import { withLogging, maskSensitiveData } from '../../src/features/logger';

describe('Logger Module', () => {
  let mockRequestFn: RequestFn;
  let mockResponse: Response;
  let mockLogger: Logger;

  beforeEach(() => {
    // Create mock response
    mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Create mock request function
    mockRequestFn = vi.fn().mockResolvedValue(mockResponse);

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('withLogging - basic functionality', () => {
    it('should return original function when logging config is not provided', async () => {
      const wrapped = withLogging(mockRequestFn);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should return original function when logging is explicitly disabled', async () => {
      const config: LoggerConfig = {
        enabled: false,
      };
      const wrapped = withLogging(mockRequestFn, config);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should wrap function when logging is enabled', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      expect(wrapped).not.toBe(mockRequestFn);
    });

    it('should use custom logger instance when provided', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      await wrapped(url, init);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should enable logging by default when NODE_ENV is development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const config: LoggerConfig = {
        // enabled not specified - should auto-detect
      };
      const wrapped = withLogging(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      await wrapped(url, {});

      expect(consoleInfoSpy).toHaveBeenCalled();

      consoleInfoSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should use console as default logger when no instance provided', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const config: LoggerConfig = {
        enabled: true,
      };
      const wrapped = withLogging(mockRequestFn, config);

      await wrapped('http://api.example.com/test', {});

      expect(consoleInfoSpy).toHaveBeenCalled();

      consoleInfoSpy.mockRestore();
    });
  });

  describe('withLogging - request logging', () => {
    it('should log request before execution', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      await wrapped(url, init);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Request'),
        expect.objectContaining({
          url,
          method: 'GET',
        })
      );
    });

    it('should extract API key from URL for logging', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      await wrapped('http://api.example.com/users/getUser', { method: 'POST' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          apiKey: 'users/getUser',
        })
      );
    });

    it('should log params if present', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: { id: 123, name: 'test' },
      };

      await wrapped('http://api.example.com/users/getUser', init);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { id: 123, name: 'test' },
        })
      );
    });

    it('should record timestamp for duration calculation', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      await wrapped('http://api.example.com/test', {});

      // Should have called logger.info twice (request + response)
      expect(mockLogger.info).toHaveBeenCalledTimes(2);

      // Second call (response) should include duration
      const secondCall = (mockLogger.info as any).mock.calls[1];
      expect(secondCall[1]).toHaveProperty('duration');
      expect(typeof secondCall[1].duration).toBe('number');
    });
  });

  describe('withLogging - response logging', () => {
    it('should log successful response', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      await wrapped('http://api.example.com/test', {});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Response'),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should include response duration', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      await wrapped('http://api.example.com/test', {});

      const responseLogs = (mockLogger.info as any).mock.calls.filter((call: any) =>
        call[0].includes('Response')
      );

      expect(responseLogs.length).toBe(1);
      expect(responseLogs[0][1]).toHaveProperty('duration');
      expect(responseLogs[0][1].duration).toBeGreaterThanOrEqual(0);
    });

    it('should log different status codes', async () => {
      const responses = [
        new Response('OK', { status: 200 }),
        new Response('Created', { status: 201 }),
        new Response('Accepted', { status: 202 }),
      ];

      const expectedStatuses = [200, 201, 202];

      for (let i = 0; i < responses.length; i++) {
        const mockFn = vi.fn().mockResolvedValue(responses[i]);
        const config: LoggerConfig = {
          enabled: true,
          instance: mockLogger,
        };
        const wrapped = withLogging(mockFn, config);

        await wrapped('http://api.example.com/test', {});

        const responseLogs = (mockLogger.info as any).mock.calls.filter((call: any) =>
          call[0].includes('Response')
        );
        const lastLog = responseLogs[responseLogs.length - 1];
        expect(lastLog[1].status).toBe(expectedStatuses[i]);
      }
    });
  });

  describe('withLogging - error logging', () => {
    it('should log errors with error level', async () => {
      const error = new Error('Request failed');
      const failingFn = vi.fn().mockRejectedValue(error);

      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should include error message in logs', async () => {
      const error = new Error('Network timeout');
      const failingFn = vi.fn().mockRejectedValue(error);

      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error: 'Network timeout',
        })
      );
    });

    it('should include status code if present in error', async () => {
      const error = Object.assign(new Error('Server Error'), { status: 500 });
      const failingFn = vi.fn().mockRejectedValue(error);

      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 500,
        })
      );
    });

    it('should include request context in error logs', async () => {
      const error = new Error('Failed');
      const failingFn = vi.fn().mockRejectedValue(error);

      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(failingFn, config);

      const url = 'http://api.example.com/users/getUser';
      await expect(wrapped(url, {}))
        .rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          url,
        })
      );
    });

    it('should still throw error after logging', async () => {
      const error = new Error('Test error');
      const failingFn = vi.fn().mockRejectedValue(error);

      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow('Test error');
    });
  });

  describe('maskSensitiveData - data masking', () => {
    it('should mask password fields', () => {
      const data = { username: 'test', password: 'secret123' };
      const masked = maskSensitiveData(data);

      expect(masked.username).toBe('test');
      expect(masked.password).toBe('***');
    });

    it('should mask token fields', () => {
      const data = { id: 1, token: 'abc123xyz', apiToken: 'secret' };
      const masked = maskSensitiveData(data);

      expect(masked.id).toBe(1);
      expect(masked.token).toBe('***');
      expect(masked.apiToken).toBe('***');
    });

    it('should mask apiKey fields', () => {
      const data = { name: 'test', apiKey: 'sk-123456' };
      const masked = maskSensitiveData(data);

      expect(masked.name).toBe('test');
      expect(masked.apiKey).toBe('***');
    });

    it('should mask authorization headers', () => {
      const data = { Authorization: 'Bearer token123', 'x-api-key': 'secret' };
      const masked = maskSensitiveData(data);

      expect(masked.Authorization).toBe('***');
      expect(masked['x-api-key']).toBe('***');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'test',
          password: 'secret',
        },
        config: {
          apiKey: 'key123',
        },
      };
      const masked = maskSensitiveData(data);

      expect(masked.user.name).toBe('test');
      expect(masked.user.password).toBe('***');
      expect(masked.config.apiKey).toBe('***');
    });

    it('should handle arrays', () => {
      const data = {
        users: [
          { name: 'user1', password: 'pass1' },
          { name: 'user2', token: 'token2' },
        ],
      };
      const masked = maskSensitiveData(data);

      expect(masked.users[0].name).toBe('user1');
      expect(masked.users[0].password).toBe('***');
      expect(masked.users[1].name).toBe('user2');
      expect(masked.users[1].token).toBe('***');
    });

    it('should support custom sensitive fields', () => {
      const data = { username: 'test', customSecret: 'value' };
      const masked = maskSensitiveData(data, ['customSecret']);

      expect(masked.username).toBe('test');
      expect(masked.customSecret).toBe('***');
    });

    it('should handle null and undefined values', () => {
      const data = { name: 'test', password: null, token: undefined };
      const masked = maskSensitiveData(data);

      expect(masked.name).toBe('test');
      expect(masked.password).toBeNull();
      expect(masked.token).toBeUndefined();
    });

    it('should not modify original object', () => {
      const data = { name: 'test', password: 'secret' };
      const masked = maskSensitiveData(data);

      expect(data.password).toBe('secret'); // Original unchanged
      expect(masked.password).toBe('***');  // Masked copy
    });

    it('should handle primitive values', () => {
      expect(maskSensitiveData('string')).toBe('string');
      expect(maskSensitiveData(123)).toBe(123);
      expect(maskSensitiveData(true)).toBe(true);
      expect(maskSensitiveData(null)).toBeNull();
      expect(maskSensitiveData(undefined)).toBeUndefined();
    });
  });

  describe('withLogging - integration with masking', () => {
    it('should mask sensitive data in request logs', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      const init: RequestInit & { _params?: any } = {
        method: 'POST',
        _params: { username: 'test', password: 'secret123' },
      };

      await wrapped('http://api.example.com/auth/login', init);

      const requestLogs = (mockLogger.info as any).mock.calls.filter((call: any) =>
        call[0].includes('Request')
      );

      expect(requestLogs[0][1].params.username).toBe('test');
      expect(requestLogs[0][1].params.password).toBe('***');
    });

    it('should mask sensitive headers', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      const init: RequestInit = {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token123',
          'Content-Type': 'application/json',
        },
      };

      await wrapped('http://api.example.com/test', init);

      const requestLogs = (mockLogger.info as any).mock.calls.filter((call: any) =>
        call[0].includes('Request')
      );

      const loggedHeaders = requestLogs[0][1].headers;
      expect(loggedHeaders.Authorization).toBe('***');
      expect(loggedHeaders['Content-Type']).toBe('application/json');
    });
  });

  describe('withLogging - edge cases', () => {
    it('should handle requests without init object', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      await wrapped('http://api.example.com/test');

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle requests with null params', async () => {
      const config: LoggerConfig = {
        enabled: true,
        instance: mockLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: null,
      };

      await wrapped('http://api.example.com/test', init);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle logger methods that throw errors', async () => {
      const throwingLogger: Logger = {
        info: vi.fn().mockImplementation(() => { throw new Error('Logger error'); }),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const config: LoggerConfig = {
        enabled: true,
        instance: throwingLogger,
      };
      const wrapped = withLogging(mockRequestFn, config);

      // Should not throw even if logger fails
      await expect(wrapped('http://api.example.com/test', {}))
        .resolves.toBe(mockResponse);
    });
  });
});
