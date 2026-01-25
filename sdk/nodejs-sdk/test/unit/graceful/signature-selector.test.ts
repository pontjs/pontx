import { describe, it, expect } from 'vitest';
import { selectSignatureMode } from '../../../src/graceful/signature-selector';

/**
 * Unit tests for signature mode selector
 *
 * Requirements:
 * - 4.1: multipart/form-data triggers three-param mode
 * - 4.2: application/octet-stream triggers three-param mode
 * - 4.6: application/json triggers two-param mode
 * - 4.7: undefined consumes triggers two-param mode
 */

describe('SignatureModeSelector', () => {
  describe('selectSignatureMode', () => {
    // Requirement 4.1: multipart/form-data -> three-param
    it('should return three-param for multipart/form-data', () => {
      const apiMeta = {
        path: '/files/upload',
        method: 'POST',
        consumes: ['multipart/form-data']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('three-param');
    });

    // Requirement 4.2: application/octet-stream -> three-param
    it('should return three-param for application/octet-stream', () => {
      const apiMeta = {
        path: '/files/upload',
        method: 'POST',
        consumes: ['application/octet-stream']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('three-param');
    });

    // Requirement 4.6: application/json -> two-param
    it('should return two-param for application/json', () => {
      const apiMeta = {
        path: '/users',
        method: 'POST',
        consumes: ['application/json']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('two-param');
    });

    // Requirement 4.7: undefined consumes -> two-param
    it('should return two-param when consumes is undefined', () => {
      const apiMeta = {
        path: '/users',
        method: 'GET'
        // consumes is undefined
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('two-param');
    });

    // Edge case: Empty consumes array
    it('should return two-param when consumes is empty array', () => {
      const apiMeta = {
        path: '/users',
        method: 'GET',
        consumes: []
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('two-param');
    });

    // Edge case: Multiple content types
    it('should use first content type when multiple are provided', () => {
      const apiMeta = {
        path: '/files/upload',
        method: 'POST',
        consumes: ['multipart/form-data', 'application/json']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('three-param');
    });

    // Edge case: Content type with charset
    it('should handle content type with charset parameter', () => {
      const apiMeta = {
        path: '/users',
        method: 'POST',
        consumes: ['application/json; charset=utf-8']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('two-param');
    });

    // Edge case: Partial match for multipart
    it('should match multipart content types with additional parameters', () => {
      const apiMeta = {
        path: '/files/upload',
        method: 'POST',
        consumes: ['multipart/form-data; boundary=----WebKitFormBoundary']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('three-param');
    });

    // Other content types default to two-param
    it('should return two-param for application/x-www-form-urlencoded', () => {
      const apiMeta = {
        path: '/form',
        method: 'POST',
        consumes: ['application/x-www-form-urlencoded']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('two-param');
    });

    it('should return two-param for text/plain', () => {
      const apiMeta = {
        path: '/text',
        method: 'POST',
        consumes: ['text/plain']
      };

      const mode = selectSignatureMode(apiMeta);

      expect(mode).toBe('two-param');
    });
  });
});
