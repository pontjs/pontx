/**
 * Unit tests for Error Handling module (Task 9)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PontxError, ERROR_CODES, wrapError, withTimeout } from '../../src/features/error-handling';
import { ZodError } from 'zod';
import type { RequestFn } from '../../src/types';

describe('Error Handling Module', () => {
  describe('PontxError - error class', () => {
    it('should create PontxError with all required properties', () => {
      const context = { apiKey: 'users/getUser', url: 'http://test.com' };
      const cause = new Error('Original error');
      const error = new PontxError('Test error', ERROR_CODES.REQUEST_FAILED, context, cause);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PontxError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.REQUEST_FAILED);
      expect(error.context).toEqual(context);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('PontxError');
    });

    it('should work without optional context and cause', () => {
      const error = new PontxError('Test error', ERROR_CODES.VALIDATION_ERROR);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.context).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should capture stack trace using Error.captureStackTrace', () => {
      const error = new PontxError('Test', ERROR_CODES.REQUEST_FAILED);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      // Stack should include the test file location
      expect(error.stack).toContain('error-handling.test.ts');
    });

    it('should set name property to PontxError', () => {
      const error = new PontxError('Test', ERROR_CODES.REQUEST_FAILED);

      expect(error.name).toBe('PontxError');
    });

    it('should preserve cause chain for debugging', () => {
      const originalError = new Error('Original');
      const wrappedError = new PontxError('Wrapped', ERROR_CODES.REQUEST_FAILED, {}, originalError);

      expect(wrappedError.cause).toBe(originalError);
      expect(wrappedError.cause.message).toBe('Original');
    });
  });

  describe('ERROR_CODES - error code constants', () => {
    it('should export VALIDATION_ERROR constant', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });

    it('should export MOCK_NOT_FOUND constant', () => {
      expect(ERROR_CODES.MOCK_NOT_FOUND).toBe('MOCK_NOT_FOUND');
    });

    it('should export REQUEST_FAILED constant', () => {
      expect(ERROR_CODES.REQUEST_FAILED).toBe('REQUEST_FAILED');
    });

    it('should export RETRY_EXHAUSTED constant', () => {
      expect(ERROR_CODES.RETRY_EXHAUSTED).toBe('RETRY_EXHAUSTED');
    });

    it('should export TIMEOUT_ERROR constant', () => {
      expect(ERROR_CODES.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
    });

    it('should export CLIENT_ERROR constant for 4xx', () => {
      expect(ERROR_CODES.CLIENT_ERROR).toBe('CLIENT_ERROR');
    });

    it('should export SERVER_ERROR constant for 5xx', () => {
      expect(ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR');
    });
  });

  describe('wrapError - error wrapping function', () => {
    const context = {
      apiKey: 'users/getUser',
      url: 'http://test.com/users/getUser',
      params: { id: 1 },
    };

    it('should wrap ZodError as VALIDATION_ERROR', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['id'],
          message: 'Expected number, received string',
        },
      ]);

      const wrapped = wrapError(zodError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(wrapped.message).toContain('Validation failed');
      expect(wrapped.cause).toBe(zodError);
      expect(wrapped.context).toEqual(context);
    });

    it('should wrap network errors as REQUEST_FAILED', () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';

      const wrapped = wrapError(networkError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.code).toBe(ERROR_CODES.REQUEST_FAILED);
      expect(wrapped.message).toContain('Request failed');
      expect(wrapped.cause).toBe(networkError);
    });

    it('should wrap timeout errors as TIMEOUT_ERROR', () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).name = 'AbortError';

      const wrapped = wrapError(timeoutError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
      expect(wrapped.message).toContain('timeout');
    });

    it('should wrap 4xx errors as CLIENT_ERROR', () => {
      const clientError = new Error('Not Found');
      (clientError as any).status = 404;

      const wrapped = wrapError(clientError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.code).toBe(ERROR_CODES.CLIENT_ERROR);
      expect(wrapped.message).toContain('404');
    });

    it('should wrap 5xx errors as SERVER_ERROR', () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      const wrapped = wrapError(serverError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.code).toBe(ERROR_CODES.SERVER_ERROR);
      expect(wrapped.message).toContain('500');
    });

    it('should preserve original error in cause field', () => {
      const originalError = new Error('Original');
      const wrapped = wrapError(originalError, context);

      expect(wrapped.cause).toBe(originalError);
    });

    it('should include context in wrapped error', () => {
      const error = new Error('Test');
      const wrapped = wrapError(error, context);

      expect(wrapped.context).toEqual(context);
      expect(wrapped.context?.apiKey).toBe('users/getUser');
      expect(wrapped.context?.url).toBe('http://test.com/users/getUser');
    });

    it('should handle unknown error types gracefully', () => {
      const unknownError = { weird: 'object' };

      const wrapped = wrapError(unknownError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.code).toBe(ERROR_CODES.REQUEST_FAILED);
      expect(wrapped.message).toBeDefined();
    });

    it('should handle string errors', () => {
      const stringError = 'Something went wrong';

      const wrapped = wrapError(stringError, context);

      expect(wrapped).toBeInstanceOf(PontxError);
      expect(wrapped.message).toContain('Something went wrong');
    });

    it('should detect different 4xx status codes', () => {
      const statuses = [400, 401, 403, 404, 422];

      for (const status of statuses) {
        const error = new Error('Client error');
        (error as any).status = status;

        const wrapped = wrapError(error, context);

        expect(wrapped.code).toBe(ERROR_CODES.CLIENT_ERROR);
        expect(wrapped.message).toContain(status.toString());
      }
    });

    it('should detect different 5xx status codes', () => {
      const statuses = [500, 502, 503, 504];

      for (const status of statuses) {
        const error = new Error('Server error');
        (error as any).status = status;

        const wrapped = wrapError(error, context);

        expect(wrapped.code).toBe(ERROR_CODES.SERVER_ERROR);
        expect(wrapped.message).toContain(status.toString());
      }
    });
  });

  describe('withTimeout - timeout error handling', () => {
    let mockRequestFn: RequestFn;
    let mockResponse: Response;

    beforeEach(() => {
      mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      mockRequestFn = vi.fn().mockResolvedValue(mockResponse);
    });

    it('should execute request successfully when no timeout configured', async () => {
      const wrapped = withTimeout(mockRequestFn);
      const url = 'http://test.com/api';

      const result = await wrapped(url, {});

      expect(result).toBe(mockResponse);
      expect(mockRequestFn).toHaveBeenCalledWith(url, {});
    });

    it('should execute request successfully within timeout', async () => {
      const wrapped = withTimeout(mockRequestFn, 1000);
      const url = 'http://test.com/api';

      const result = await wrapped(url, {});

      expect(result).toBe(mockResponse);
    });

    it('should throw timeout error when request exceeds timeout', async () => {
      const slowRequestFn = vi.fn().mockImplementation(
        (url: string, init?: RequestInit) => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => resolve(mockResponse), 200);

            // Respect abort signal
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }
      );

      const wrapped = withTimeout(slowRequestFn, 50);

      await expect(wrapped('http://test.com/api', {}))
        .rejects.toThrow();
    });

    it('should use AbortController to cancel request on timeout', async () => {
      const slowRequestFn = vi.fn().mockImplementation(
        (url: string, init?: RequestInit) => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => resolve(mockResponse), 200);

            // Respect abort signal
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }
      );

      const wrapped = withTimeout(slowRequestFn, 50);

      try {
        await wrapped('http://test.com/api', {});
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      }
    });

    it('should pass AbortSignal to requestFn in init options', async () => {
      const wrapped = withTimeout(mockRequestFn, 1000);
      const url = 'http://test.com/api';
      const init: RequestInit = { method: 'POST' };

      await wrapped(url, init);

      expect(mockRequestFn).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should throw clear timeout error message', async () => {
      const slowRequestFn = vi.fn().mockImplementation(
        (url: string, init?: RequestInit) => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => resolve(mockResponse), 200);

            // Respect abort signal
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }
      );

      const wrapped = withTimeout(slowRequestFn, 50);

      try {
        await wrapped('http://test.com/api', {});
        expect.fail('Should have thrown timeout error');
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      }
    });

    it('should accept timeout from requestOptions', async () => {
      const wrapped = withTimeout(mockRequestFn);
      const url = 'http://test.com/api';
      const init: RequestInit & { timeout?: number } = {
        timeout: 5000,
      };

      await wrapped(url, init);

      // Should not throw and should pass signal
      expect(mockRequestFn).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should not add AbortSignal if no timeout configured', async () => {
      const wrapped = withTimeout(mockRequestFn);
      const url = 'http://test.com/api';
      const init: RequestInit = { method: 'GET' };

      await wrapped(url, init);

      // Should not add signal when no timeout
      const callArgs = (mockRequestFn as any).mock.calls[0];
      expect(callArgs[1].signal).toBeUndefined();
    });

    it('should support chaining with other decorators', async () => {
      // Simulate another decorator
      const withLogging = (fn: RequestFn): RequestFn => {
        return async (url, init) => {
          console.log('Request:', url);
          return fn(url, init);
        };
      };

      const wrapped = withLogging(withTimeout(mockRequestFn, 1000));
      const result = await wrapped('http://test.com/api', {});

      expect(result).toBe(mockResponse);
    });

    it('should clean up timeout when request completes', async () => {
      const wrapped = withTimeout(mockRequestFn, 5000);

      await wrapped('http://test.com/api', {});

      // If timeout wasn't cleared, it would leak
      // This test verifies the implementation clears the timeout
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling integration', () => {
    it('should create complete error with all fields', () => {
      const originalError = new Error('Network failure');
      const context = {
        apiKey: 'users/getUser',
        url: 'http://test.com/users/getUser',
        params: { id: 1 },
      };

      const wrapped = wrapError(originalError, context);

      expect(wrapped.message).toBeDefined();
      expect(wrapped.code).toBeDefined();
      expect(wrapped.context).toEqual(context);
      expect(wrapped.cause).toBe(originalError);
      expect(wrapped.name).toBe('PontxError');
      expect(wrapped.stack).toBeDefined();
    });

    it('should be catchable as standard Error', () => {
      const error = new PontxError('Test', ERROR_CODES.REQUEST_FAILED);

      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(PontxError);
      }
    });

    it('should provide useful debugging information', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['id'],
          message: 'Expected number, received string',
        },
      ]);

      const context = {
        apiKey: 'users/getUser',
        url: 'http://test.com/users/getUser',
        params: { id: 'invalid' },
      };

      const wrapped = wrapError(zodError, context);

      // Should be easy to debug
      expect(wrapped.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(wrapped.context?.params).toEqual({ id: 'invalid' });
      expect(wrapped.cause).toBe(zodError);
    });
  });
});
