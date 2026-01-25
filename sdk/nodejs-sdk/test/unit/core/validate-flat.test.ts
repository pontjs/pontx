/**
 * Unit tests for flat structure validation
 *
 * Tests for task 3.2: Flat Structure Validation
 * Requirements covered:
 * - 3.2: validateFlatStructure unit tests
 * - 6.4: Detect hierarchical API keys
 * - 6.5: Fast-fail validation
 * - 11.4: Metadata validation tests
 */

import { describe, it, expect } from 'vitest';
import { validateFlatStructure } from '../../../src/core/validate-flat';
import type { PontxSpecMeta } from '../../../src/types';

describe('validateFlatStructure', () => {
  describe('Valid flat structures', () => {
    it('should pass validation for pure flat structure', () => {
      const flatMeta: PontxSpecMeta = {
        name: 'Finnhub API',
        apis: {
          symbolSearch: {
            path: '/api/v1/search',
            method: 'GET',
            responses: {},
          },
          stockQuote: {
            path: '/api/v1/quote',
            method: 'GET',
            responses: {},
          },
          companyProfile: {
            path: '/api/v1/stock/profile',
            method: 'GET',
            responses: {},
          },
        },
      };

      // Should not throw any error
      expect(() => validateFlatStructure(flatMeta)).not.toThrow();
    });

    it('should pass validation for single API', () => {
      const flatMeta: PontxSpecMeta = {
        name: 'Simple API',
        apis: {
          getData: {
            path: '/data',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(flatMeta)).not.toThrow();
    });

    it('should pass validation for API keys with underscores', () => {
      const flatMeta: PontxSpecMeta = {
        name: 'API with underscores',
        apis: {
          get_user_data: {
            path: '/user',
            method: 'GET',
            responses: {},
          },
          create_new_item: {
            path: '/item',
            method: 'POST',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(flatMeta)).not.toThrow();
    });

    it('should pass validation for API keys with $ prefix', () => {
      const flatMeta: PontxSpecMeta = {
        name: 'API with $ prefix',
        apis: {
          $getUser: {
            path: '/user',
            method: 'GET',
            responses: {},
          },
          $createItem: {
            path: '/item',
            method: 'POST',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(flatMeta)).not.toThrow();
    });

    it('should pass validation for camelCase API keys', () => {
      const flatMeta: PontxSpecMeta = {
        name: 'CamelCase API',
        apis: {
          getUserProfile: {
            path: '/user/profile',
            method: 'GET',
            responses: {},
          },
          createNewDocument: {
            path: '/document',
            method: 'POST',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(flatMeta)).not.toThrow();
    });

    it('should pass validation for empty apis object', () => {
      const flatMeta: PontxSpecMeta = {
        name: 'Empty API',
        apis: {},
      };

      expect(() => validateFlatStructure(flatMeta)).not.toThrow();
    });
  });

  describe('Invalid hierarchical structures', () => {
    it('should reject API keys containing "/" (single hierarchical key)', () => {
      const hierarchicalMeta: PontxSpecMeta = {
        name: 'Hierarchical API',
        apis: {
          'users/getUser': {
            path: '/users/{id}',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/Flat client requires APIs without namespace/);
      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/Found hierarchical API keys: \["users\/getUser"\]/);
      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/Please use createGracefulClient instead/);
    });

    it('should reject API keys containing "/" (multiple hierarchical keys)', () => {
      const hierarchicalMeta: PontxSpecMeta = {
        name: 'Hierarchical API',
        apis: {
          'users/getUser': {
            path: '/users/{id}',
            method: 'GET',
            responses: {},
          },
          'users/createUser': {
            path: '/users',
            method: 'POST',
            responses: {},
          },
          'posts/getPosts': {
            path: '/posts',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/Flat client requires APIs without namespace/);
      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/users\/getUser/);
      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/users\/createUser/);
      expect(() => validateFlatStructure(hierarchicalMeta))
        .toThrow(/posts\/getPosts/);
    });

    it('should reject mixed flat and hierarchical structure', () => {
      const mixedMeta: PontxSpecMeta = {
        name: 'Mixed API',
        apis: {
          getData: {
            path: '/data',
            method: 'GET',
            responses: {},
          },
          'users/getUser': {
            path: '/users/{id}',
            method: 'GET',
            responses: {},
          },
          updateItem: {
            path: '/item',
            method: 'PUT',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(mixedMeta))
        .toThrow(/Flat client requires APIs without namespace/);
      expect(() => validateFlatStructure(mixedMeta))
        .toThrow(/users\/getUser/);
    });

    it('should list all hierarchical keys in error message', () => {
      const hierarchicalMeta: PontxSpecMeta = {
        name: 'Multi-namespace API',
        apis: {
          'users/getUser': { path: '/users/{id}', method: 'GET', responses: {} },
          'users/createUser': { path: '/users', method: 'POST', responses: {} },
          'posts/getPost': { path: '/posts/{id}', method: 'GET', responses: {} },
          'comments/getComment': { path: '/comments/{id}', method: 'GET', responses: {} },
        },
      };

      try {
        validateFlatStructure(hierarchicalMeta);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        // Check that all hierarchical keys are listed
        expect(error.message).toContain('users/getUser');
        expect(error.message).toContain('users/createUser');
        expect(error.message).toContain('posts/getPost');
        expect(error.message).toContain('comments/getComment');
      }
    });
  });

  describe('Invalid API keys (non-hierarchical)', () => {
    it('should reject API keys with special characters', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Invalid API',
        apis: {
          'get-user': {
            path: '/user',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/Invalid API keys found/);
      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/must be a valid JavaScript identifier/);
    });

    it('should reject API keys starting with numbers', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Invalid API',
        apis: {
          '123getUser': {
            path: '/user',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/Invalid API keys found/);
      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/must be a valid JavaScript identifier/);
    });

    it('should reject API keys with spaces', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Invalid API',
        apis: {
          'get user': {
            path: '/user',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/Invalid API keys found/);
      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/must be a valid JavaScript identifier/);
    });

    it('should reject API keys with dots', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Invalid API',
        apis: {
          'user.getProfile': {
            path: '/user/profile',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/Invalid API keys found/);
      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/must be a valid JavaScript identifier/);
    });

    it('should reject multiple invalid API keys and list all errors', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Multiple Invalid API',
        apis: {
          'get-user': {
            path: '/user',
            method: 'GET',
            responses: {},
          },
          '123item': {
            path: '/item',
            method: 'GET',
            responses: {},
          },
          'create post': {
            path: '/post',
            method: 'POST',
            responses: {},
          },
        },
      };

      try {
        validateFlatStructure(invalidMeta);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        // Check that all invalid keys are mentioned
        expect(error.message).toContain('Invalid API keys found');
        expect(error.message).toContain('get-user');
        expect(error.message).toContain('123item');
        expect(error.message).toContain('create post');
      }
    });
  });

  describe('Error message clarity', () => {
    it('should provide clear suggestion to use createGracefulClient for hierarchical APIs', () => {
      const hierarchicalMeta: PontxSpecMeta = {
        name: 'Hierarchical API',
        apis: {
          'users/getUser': {
            path: '/users/{id}',
            method: 'GET',
            responses: {},
          },
        },
      };

      try {
        validateFlatStructure(hierarchicalMeta);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('createGracefulClient');
        expect(error.message).toContain('namespace');
      }
    });

    it('should provide detailed error for invalid identifier', () => {
      const invalidMeta: PontxSpecMeta = {
        name: 'Invalid API',
        apis: {
          'get-data': {
            path: '/data',
            method: 'GET',
            responses: {},
          },
        },
      };

      try {
        validateFlatStructure(invalidMeta);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('Invalid API keys found');
        expect(error.message).toContain('get-data');
        expect(error.message).toContain('JavaScript identifier');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle metadata with undefined apis', () => {
      const meta: any = {
        name: 'Test API',
        apis: undefined,
      };

      // validateFlatStructure expects apis to be an object
      // If apis is undefined, Object.keys will throw or return []
      // Let's handle this gracefully
      expect(() => validateFlatStructure(meta)).not.toThrow();
    });

    it('should handle metadata with null apis', () => {
      const meta: any = {
        name: 'Test API',
        apis: null,
      };

      // Similar to above - should not crash
      expect(() => validateFlatStructure(meta)).not.toThrow();
    });
  });

  describe('Integration with @pontx/spec validation', () => {
    it('should delegate validation to validateFlatApiKey from @pontx/spec', () => {
      // This test verifies that validateFlatStructure correctly uses
      // the validateFlatApiKey function from @pontx/spec package

      const validMeta: PontxSpecMeta = {
        name: 'Test API',
        apis: {
          validApiKey: {
            path: '/api',
            method: 'GET',
            responses: {},
          },
        },
      };

      // Should pass validation
      expect(() => validateFlatStructure(validMeta)).not.toThrow();

      // Should fail for hierarchical key (validated by @pontx/spec)
      const invalidMeta: PontxSpecMeta = {
        name: 'Test API',
        apis: {
          'invalid/apiKey': {
            path: '/api',
            method: 'GET',
            responses: {},
          },
        },
      };

      expect(() => validateFlatStructure(invalidMeta))
        .toThrow(/hierarchical API keys/);
    });
  });
});
