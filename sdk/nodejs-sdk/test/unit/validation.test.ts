/**
 * Unit tests for validation module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withValidation,
  VALIDATION_ERROR_CODES,
  isZodAvailable,
  validateZodAvailability,
} from '../../src/features/validation';
import type { RequestFn, ValidationConfig, PontxAPI } from '../../src/types';

describe('Validation Module', () => {
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

  describe('withValidation - basic functionality', () => {
    it('should return original function when validation config is not provided', async () => {
      const wrapped = withValidation(mockRequestFn);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should return original function when validation is explicitly disabled', async () => {
      const config: ValidationConfig = { enabled: false };
      const wrapped = withValidation(mockRequestFn, config);

      expect(wrapped).toBe(mockRequestFn);
    });

    it('should wrap function when validation config is provided', async () => {
      const config: ValidationConfig = { enabled: true, schemas: {} };
      const wrapped = withValidation(mockRequestFn, config);

      expect(wrapped).not.toBe(mockRequestFn);
    });

    it('should call original request function when validation passes', async () => {
      const config: ValidationConfig = { enabled: true, schemas: {} };
      const wrapped = withValidation(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      const result = await wrapped(url, init);

      expect(mockRequestFn).toHaveBeenCalledWith(url, init);
      expect(result).toBe(mockResponse);
    });
  });

  describe('withValidation - parameter existence checks', () => {
    it('should throw error when params are required but missing', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/getUser',
        method: 'GET',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [
          { name: 'id', required: true, in: 'query', schema: {} as any },
        ],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/getUser': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      await expect(wrapped(url, init)).rejects.toThrow(
        'API "users/getUser" requires params but none were provided'
      );
    });

    it('should throw error when body is required but missing', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/createUser',
        method: 'POST',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [
          { name: 'user', required: true, in: 'body', schema: {} as any },
        ],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/createUser': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/createUser';
      const init: RequestInit = { method: 'POST' };

      await expect(wrapped(url, init)).rejects.toThrow(
        'API "users/createUser" requires a request body but none was provided'
      );
    });

    it('should not throw when params are provided', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/getUser',
        method: 'GET',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [
          { name: 'id', required: true, in: 'query', schema: {} as any },
        ],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/getUser': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: { id: 1 },
      };

      const result = await wrapped(url, init);
      expect(result).toBe(mockResponse);
    });

    it('should not throw when body is provided', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/createUser',
        method: 'POST',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [
          { name: 'user', required: true, in: 'body', schema: {} as any },
        ],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/createUser': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/createUser';
      const init: RequestInit = {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User' }),
      };

      const result = await wrapped(url, init);
      expect(result).toBe(mockResponse);
    });

    it('should include error code in thrown error', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/getUser',
        method: 'GET',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [
          { name: 'id', required: true, in: 'query', schema: {} as any },
        ],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/getUser': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit = { method: 'GET' };

      try {
        await wrapped(url, init);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(VALIDATION_ERROR_CODES.MISSING_PARAMS);
        expect(error.apiKey).toBe('users/getUser');
      }
    });
  });

  describe('withValidation - Zod schema validation', () => {
    // These tests will only run if Zod is available
    const hasZod = isZodAvailable();

    it.skipIf(!hasZod)('should validate params with Zod schema', async () => {
      const { z } = await import('zod');

      const userSchema = z.object({
        id: z.number().positive(),
        email: z.string().email().optional(),
      });

      const config: ValidationConfig = {
        enabled: true,
        schemas: {
          'users/getUser': userSchema,
        },
      };

      const wrapped = withValidation(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: { id: 1, email: 'test@example.com' },
      };

      const result = await wrapped(url, init);
      expect(result).toBe(mockResponse);
    });

    it.skipIf(!hasZod)('should throw validation error when schema validation fails', async () => {
      const { z } = await import('zod');

      const userSchema = z.object({
        id: z.number().positive(),
        email: z.string().email(),
      });

      const config: ValidationConfig = {
        enabled: true,
        schemas: {
          'users/getUser': userSchema,
        },
      };

      const wrapped = withValidation(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: { id: -1, email: 'invalid-email' }, // Invalid data
      };

      await expect(wrapped(url, init)).rejects.toThrow(/Parameter validation failed/);
    });

    it.skipIf(!hasZod)('should include Zod error details in validation error', async () => {
      const { z } = await import('zod');

      const userSchema = z.object({
        id: z.number().positive(),
      });

      const config: ValidationConfig = {
        enabled: true,
        schemas: {
          'users/getUser': userSchema,
        },
      };

      const wrapped = withValidation(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: { id: -1 },
      };

      try {
        await wrapped(url, init);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED);
        expect(error.apiKey).toBe('users/getUser');
        expect(error.zodError).toBeDefined();
      }
    });

    it('should skip schema validation when no schema is configured for the API', async () => {
      const config: ValidationConfig = {
        enabled: true,
        schemas: {
          'other/api': {} as any, // Schema for different API
        },
      };

      const wrapped = withValidation(mockRequestFn, config);

      const url = 'http://api.example.com/users/getUser';
      const init: RequestInit & { _params?: any } = {
        method: 'GET',
        _params: { anyData: 'should be allowed' },
      };

      const result = await wrapped(url, init);
      expect(result).toBe(mockResponse);
    });
  });

  describe('withValidation - deprecated API warnings', () => {
    let consoleWarnSpy: any;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should warn when API is deprecated', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/oldMethod',
        method: 'GET',
        deprecated: true,
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/oldMethod': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/oldMethod';
      const init: RequestInit = { method: 'GET' };

      await wrapped(url, init);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('API "users/oldMethod" is deprecated')
      );
    });

    it('should include deprecation message when provided', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/oldMethod',
        method: 'GET',
        deprecated: true,
        description: 'Use newMethod instead',
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/oldMethod': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/oldMethod';
      const init: RequestInit = { method: 'GET' };

      await wrapped(url, init);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Use newMethod instead')
      );
    });

    it('should not warn when API is not deprecated', async () => {
      const apiMeta: PontxAPI = {
        path: '/users/newMethod',
        method: 'GET',
        deprecated: false,
        consumes: ['application/json'],
        produces: ['application/json'],
        parameters: [],
        responses: {},
      } as any;

      const apiMetaMap = {
        'users/newMethod': apiMeta,
      };

      const config: ValidationConfig = { enabled: true };
      const wrapped = withValidation(mockRequestFn, config, apiMetaMap);

      const url = 'http://api.example.com/users/newMethod';
      const init: RequestInit = { method: 'GET' };

      await wrapped(url, init);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateZodAvailability', () => {
    it('should not throw when validation is not configured', () => {
      expect(() => validateZodAvailability()).not.toThrow();
      expect(() => validateZodAvailability({ enabled: false })).not.toThrow();
    });

    it('should not throw when schemas are empty', () => {
      const config: ValidationConfig = {
        enabled: true,
        schemas: {},
      };
      expect(() => validateZodAvailability(config)).not.toThrow();
    });

    // Note: This test may fail if Zod is actually installed
    it.skip('should throw when schemas are configured but Zod is not available', () => {
      const config: ValidationConfig = {
        enabled: true,
        schemas: {
          'test/api': {} as any,
        },
      };

      // This test assumes Zod is not installed
      expect(() => validateZodAvailability(config)).toThrow(
        'Validation is configured but Zod is not installed'
      );
    });
  });

  describe('isZodAvailable', () => {
    it('should check if Zod is available', () => {
      const result = isZodAvailable();
      expect(typeof result).toBe('boolean');
    });
  });
});
