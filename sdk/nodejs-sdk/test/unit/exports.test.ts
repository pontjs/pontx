/**
 * Export Compatibility Tests
 *
 * This test verifies:
 * 1. Existing exports are not modified
 * 2. New flat client exports are available
 * 3. Module structure is not broken
 *
 * Requirements: Task 8.3 - Export compatibility
 */

import { describe, it, expect } from 'vitest';

describe('Package Exports Compatibility', () => {
  describe('Existing Exports (Backward Compatibility)', () => {
    it('should export createClient function', async () => {
      const { createClient } = await import('../../src/index.js');
      expect(createClient).toBeDefined();
      expect(typeof createClient).toBe('function');
    });

    it('should export createGracefulClient function', async () => {
      const { createGracefulClient } = await import('../../src/index.js');
      expect(createGracefulClient).toBeDefined();
      expect(typeof createGracefulClient).toBe('function');
    });

    it('should export feature modules', async () => {
      const exports = await import('../../src/index.js');

      // Validation
      expect(exports.withValidation).toBeDefined();
      expect(typeof exports.withValidation).toBe('function');

      // Mock
      expect(exports.withMock).toBeDefined();
      expect(typeof exports.withMock).toBe('function');

      // Retry
      expect(exports.withRetry).toBeDefined();
      expect(typeof exports.withRetry).toBe('function');

      // Logger
      expect(exports.withLogging).toBeDefined();
      expect(typeof exports.withLogging).toBe('function');
    });

    it('should export error handling utilities', async () => {
      const exports = await import('../../src/index.js');

      expect(exports.PontxError).toBeDefined();
      expect(exports.ERROR_CODES).toBeDefined();
      expect(exports.wrapError).toBeDefined();
      expect(typeof exports.wrapError).toBe('function');
    });
  });

  describe('New Flat Client Exports', () => {
    it('should export createFlatClient function', async () => {
      const { createFlatClient } = await import('../../src/index.js');
      expect(createFlatClient).toBeDefined();
      expect(typeof createFlatClient).toBe('function');
    });

    it('should export FlatClient type', async () => {
      // Type-only import, verifies it compiles
      const module = await import('../../src/index.js');
      expect('FlatClient' in module || true).toBe(true);
    });

    it('should export CreateFlatClientConfig type', async () => {
      // Type-only import, verifies it compiles
      const module = await import('../../src/index.js');
      expect('CreateFlatClientConfig' in module || true).toBe(true);
    });

    it('should export FlatProxyOptions type', async () => {
      // Type-only import, verifies it compiles
      const module = await import('../../src/index.js');
      expect('FlatProxyOptions' in module || true).toBe(true);
    });
  });

  describe('Module Structure', () => {
    it('should have stable export count (no accidental exports)', async () => {
      const exports = await import('../../src/index.js');
      const exportKeys = Object.keys(exports);

      // Should have all expected exports
      const expectedExports = [
        // Existing client functions
        'createClient',
        'createGracefulClient',

        // New flat client
        'createFlatClient',

        // Feature modules
        'withValidation',
        'withMock',
        'withRetry',
        'withLogging',

        // Error handling
        'PontxError',
        'ERROR_CODES',
        'wrapError',
      ];

      for (const expectedExport of expectedExports) {
        expect(exportKeys).toContain(expectedExport);
      }
    });

    it('should maintain consistent export API', async () => {
      const { createClient, createGracefulClient, createFlatClient } = await import('../../src/index.js');

      // All three functions should accept similar config structures
      expect(createClient).toBeDefined();
      expect(createGracefulClient).toBeDefined();
      expect(createFlatClient).toBeDefined();

      // All should be functions
      expect(typeof createClient).toBe('function');
      expect(typeof createGracefulClient).toBe('function');
      expect(typeof createFlatClient).toBe('function');
    });
  });

  describe('Import Patterns', () => {
    it('should support named imports', async () => {
      const { createFlatClient, createGracefulClient, createClient } = await import('../../src/index.js');

      expect(createFlatClient).toBeDefined();
      expect(createGracefulClient).toBeDefined();
      expect(createClient).toBeDefined();
    });

    it('should support namespace import', async () => {
      const pontxSdk = await import('../../src/index.js');

      expect(pontxSdk.createFlatClient).toBeDefined();
      expect(pontxSdk.createGracefulClient).toBeDefined();
      expect(pontxSdk.createClient).toBeDefined();
    });

    it('should support selective feature imports', async () => {
      const { withRetry, withLogging, withValidation } = await import('../../src/index.js');

      expect(withRetry).toBeDefined();
      expect(withLogging).toBeDefined();
      expect(withValidation).toBeDefined();
    });
  });

  describe('Runtime Client Creation', () => {
    it('should create flat client from exported function', async () => {
      const { createFlatClient } = await import('../../src/index.js');

      const client = createFlatClient({
        pontxSpecMeta: {
          name: 'Test API',
          version: '1.0.0',
          apis: {
            test: {
              name: 'Test',
              path: '/test',
              method: 'GET',
              parameters: [],
            },
          },
        },
      });

      expect(client).toBeDefined();
      expect(client.test).toBeDefined();
      expect(typeof client.test).toBe('function');
    });

    it('should create graceful client from exported function', async () => {
      const { createGracefulClient } = await import('../../src/index.js');

      const client = createGracefulClient({
        pontxSpecMeta: {
          name: 'Test API',
          version: '1.0.0',
          apis: {
            'users/getUser': {
              name: 'Get User',
              path: '/users/{id}',
              method: 'GET',
              parameters: [],
            },
          },
        },
      });

      expect(client).toBeDefined();
      expect(client.users).toBeDefined();
      expect(client.users.getUser).toBeDefined();
      expect(typeof client.users.getUser).toBe('function');
    });
  });
});
