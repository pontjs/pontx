/**
 * Unit tests for Retry module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestFn, RetryConfig } from '../../src/types';

// Import the retry module (to be implemented)
import { withRetry, RETRY_ERROR_CODES } from '../../src/features/retry';

describe('Retry Module', () => {
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

  describe('withRetry - basic functionality', () => {
    it('should return original function when retry config is not provided', async () => {
      const wrapped = withRetry(mockRequestFn);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should wrap function when retry config is provided', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
      };
      const wrapped = withRetry(mockRequestFn, config);

      expect(wrapped).not.toBe(mockRequestFn);
    });

    it('should call original function once when request succeeds', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
      };
      const wrapped = withRetry(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
      expect(mockRequestFn).toHaveBeenCalledWith(url, init);
      expect(result).toBe(mockResponse);
    });

    it('should use default maxAttempts of 3 when not specified', async () => {
      const config: RetryConfig = {};
      const failingFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapped = withRetry(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();

      // Should try 3 times (default)
      expect(failingFn).toHaveBeenCalledTimes(3);
    });

    it('should use default exponential backoff when not specified', async () => {
      const config: RetryConfig = {
        maxAttempts: 2,
      };
      const failingFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapped = withRetry(failingFn, config);

      const startTime = Date.now();
      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();
      const duration = Date.now() - startTime;

      // Should have exponential delay (1s between retries)
      expect(duration).toBeGreaterThanOrEqual(900); // Allow some variance
    });
  });

  describe('withRetry - retryable vs non-retryable errors', () => {
    it('should retry on 5xx status codes', async () => {
      const error500 = Object.assign(
        new Error('Server Error'),
        { status: 500 }
      );

      const failingFn = vi.fn()
        .mockRejectedValueOnce(error500)
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      // Should have retried and eventually succeeded
      expect(failingFn).toHaveBeenCalledTimes(3);
      expect(result).toBe(mockResponse);
    });

    it('should NOT retry on 4xx status codes', async () => {
      const error404 = Object.assign(
        new Error('Not Found'),
        { status: 404 }
      );

      const failingFn = vi.fn().mockRejectedValue(error404);

      const config: RetryConfig = {
        maxAttempts: 3,
      };
      const wrapped = withRetry(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow('Not Found');

      // Should NOT retry - only 1 attempt
      expect(failingFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const networkError = Object.assign(
        new Error('Network failure'),
        { code: 'ECONNREFUSED' }
      );

      const failingFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      expect(failingFn).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    it('should retry on timeout errors', async () => {
      const timeoutError = Object.assign(
        new Error('Request timeout'),
        { code: 'ETIMEDOUT' }
      );

      const failingFn = vi.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 2,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      expect(failingFn).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    it('should support custom retryable errors', async () => {
      const customError = Object.assign(
        new Error('Custom error'),
        { code: 'CUSTOM_ERROR' }
      );

      const failingFn = vi.fn()
        .mockRejectedValueOnce(customError)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 3,
        retryableErrors: ['CUSTOM_ERROR', 429],
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      expect(failingFn).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    it('should support custom retryable status codes', async () => {
      const error429 = Object.assign(
        new Error('Too Many Requests'),
        { status: 429 }
      );

      const failingFn = vi.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 3,
        retryableErrors: [429],
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      expect(failingFn).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    it('should not retry when error is not in retryable list', async () => {
      const customError = Object.assign(
        new Error('Custom error'),
        { code: 'NON_RETRYABLE' }
      );

      const failingFn = vi.fn().mockRejectedValue(customError);

      const config: RetryConfig = {
        maxAttempts: 3,
        retryableErrors: ['CUSTOM_ERROR'], // Different error code
      };
      const wrapped = withRetry(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow('Custom error');

      // Should not retry
      expect(failingFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withRetry - exponential backoff', () => {
    it('should use exponential backoff delays', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'exponential',
      };
      const wrapped = withRetry(failingFn, config);

      const startTime = Date.now();
      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();
      const duration = Date.now() - startTime;

      // Exponential: 1000ms + 2000ms = 3000ms total
      // Allow 10% variance
      expect(duration).toBeGreaterThanOrEqual(2700);
      expect(duration).toBeLessThan(4000);
      expect(failingFn).toHaveBeenCalledTimes(3);
    });

    it('should cap exponential backoff at 10 seconds', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn()
        .mockRejectedValue(networkError);

      const config: RetryConfig = {
        maxAttempts: 5, // Would be 1s, 2s, 4s, 8s (16s capped at 10s)
        backoff: 'exponential',
      };
      const wrapped = withRetry(failingFn, config);

      const startTime = Date.now();
      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();
      const duration = Date.now() - startTime;

      // Should cap at 10s: delays are 1, 2, 4, 8 = 15s total
      // (5th attempt would wait 16s but it's the last, so no wait)
      expect(duration).toBeGreaterThanOrEqual(14000);
      expect(duration).toBeLessThan(17000);
      expect(failingFn).toHaveBeenCalledTimes(5);
    }, 20000); // Increase timeout for this test
  });

  describe('withRetry - linear backoff', () => {
    it('should use linear backoff delays', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const startTime = Date.now();
      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();
      const duration = Date.now() - startTime;

      // Linear: 1000ms + 2000ms = 3000ms total
      // Allow 10% variance
      expect(duration).toBeGreaterThanOrEqual(2700);
      expect(duration).toBeLessThan(4000);
      expect(failingFn).toHaveBeenCalledTimes(3);
    });

    it('should cap linear backoff at 10 seconds', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn()
        .mockRejectedValue(networkError);

      const config: RetryConfig = {
        maxAttempts: 5,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const startTime = Date.now();
      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow();
      const duration = Date.now() - startTime;

      // Linear: delays are 1s, 2s, 3s, 4s = 10s total
      // (5th attempt is last, so no wait after)
      expect(duration).toBeGreaterThanOrEqual(9000);
      expect(duration).toBeLessThan(12000);
      expect(failingFn).toHaveBeenCalledTimes(5);
    }, 15000); // Increase timeout for this test
  });

  describe('withRetry - retry exhaustion', () => {
    it('should throw RETRY_EXHAUSTED error after max attempts', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn().mockRejectedValue(networkError);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      try {
        await wrapped('http://api.example.com/test', {});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(RETRY_ERROR_CODES.RETRY_EXHAUSTED);
        expect(error.message).toContain('3 attempts');
        expect(error.attempts).toBe(3);
        expect(error.lastError).toBeDefined();
        expect(error.lastError.message).toBe('Network error');
      }

      expect(failingFn).toHaveBeenCalledTimes(3);
    });

    it('should include original error in RETRY_EXHAUSTED', async () => {
      const originalError = new Error('Original failure');

      const failingFn = vi.fn().mockRejectedValue(originalError);

      const config: RetryConfig = {
        maxAttempts: 2,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      try {
        await wrapped('http://api.example.com/test', {});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(RETRY_ERROR_CODES.RETRY_EXHAUSTED);
        expect(error.lastError).toBe(originalError);
      }
    });

    it('should succeed before exhausting retries', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 5,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      expect(result).toBe(mockResponse);
      expect(failingFn).toHaveBeenCalledTimes(2); // Should stop after success
    });
  });

  describe('withRetry - edge cases', () => {
    it('should handle maxAttempts of 1 (no retries)', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn().mockRejectedValue(networkError);

      const config: RetryConfig = {
        maxAttempts: 1,
      };
      const wrapped = withRetry(failingFn, config);

      await expect(wrapped('http://api.example.com/test', {}))
        .rejects.toThrow('Network error');

      expect(failingFn).toHaveBeenCalledTimes(1);
    });

    it('should handle immediate success', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
      };
      const wrapped = withRetry(mockRequestFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should preserve request URL and init across retries', async () => {
      const networkError = new Error('Network error');

      const failingFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const url = 'http://api.example.com/users/getUser?id=123';
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      };

      await wrapped(url, init);

      // Both calls should have same arguments
      expect(failingFn).toHaveBeenNthCalledWith(1, url, init);
      expect(failingFn).toHaveBeenNthCalledWith(2, url, init);
    });

    it('should handle errors without status or code properties', async () => {
      const plainError = new Error('Plain error');

      const failingFn = vi.fn()
        .mockRejectedValueOnce(plainError)
        .mockResolvedValueOnce(mockResponse);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped = withRetry(failingFn, config);

      const result = await wrapped('http://api.example.com/test', {});

      // Should treat as network error and retry
      expect(failingFn).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });
  });

  describe('withRetry - integration scenarios', () => {
    it('should work with different HTTP methods', async () => {
      const networkError = new Error('Network error');

      const methods = ['GET', 'POST', 'PUT', 'DELETE'];

      for (const method of methods) {
        const failingFn = vi.fn()
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce(mockResponse);

        const config: RetryConfig = {
          maxAttempts: 2,
          backoff: 'linear',
        };
        const wrapped = withRetry(failingFn, config);

        const result = await wrapped(
          'http://api.example.com/test',
          { method }
        );

        expect(failingFn).toHaveBeenCalledTimes(2);
        expect(result).toBe(mockResponse);
      }
    });

    it('should handle mixed error types in sequence', async () => {
      const error500 = Object.assign(new Error('Server Error'), { status: 500 });
      const error404 = Object.assign(new Error('Not Found'), { status: 404 });
      const networkError = new Error('Network error');

      // First call: 500 (retryable), second: 404 (not retryable)
      const failingFn1 = vi.fn()
        .mockRejectedValueOnce(error500)
        .mockRejectedValueOnce(error404);

      const config: RetryConfig = {
        maxAttempts: 3,
        backoff: 'linear',
      };
      const wrapped1 = withRetry(failingFn1, config);

      await expect(wrapped1('http://api.example.com/test', {}))
        .rejects.toThrow('Not Found');

      // Should retry once (500), then fail on 404
      expect(failingFn1).toHaveBeenCalledTimes(2);
    });
  });
});
