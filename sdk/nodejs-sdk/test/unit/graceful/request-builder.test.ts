import { describe, it, expect } from 'vitest';
import { buildFullUrl, buildRequestBody } from '../../../src/graceful/request-builder';

/**
 * Unit tests for request building functions
 *
 * Requirements:
 * - 3.5: Extract path parameters and build URL
 * - 3.6: Extract query parameters and append to URL
 * - 3.7: Extract body parameters and serialize
 * - 4.3: Direct body usage in three-param mode
 * - 4.4: Pass body directly without serialization in three-param mode
 */

describe('RequestBuilder', () => {
  describe('buildFullUrl', () => {
    // Requirement 3.5: Build URL with path parameters
    it('should replace path parameters in URL', () => {
      const classified = {
        pathParams: { userId: '123', postId: '456' },
        queryParams: {},
        bodyParams: {}
      };

      const apiMeta = {
        path: '/users/{userId}/posts/{postId}',
        method: 'GET'
      };

      const url = buildFullUrl(classified, apiMeta);

      expect(url).toBe('/users/123/posts/456');
    });

    // Requirement 3.6: Append query parameters
    it('should append query parameters to URL', () => {
      const classified = {
        pathParams: {},
        queryParams: { page: 1, limit: 10, sort: 'desc' },
        bodyParams: {}
      };

      const apiMeta = {
        path: '/users',
        method: 'GET'
      };

      const url = buildFullUrl(classified, apiMeta);

      expect(url).toBe('/users?page=1&limit=10&sort=desc');
    });

    // Combined: path + query parameters
    it('should handle both path and query parameters', () => {
      const classified = {
        pathParams: { userId: '123' },
        queryParams: { include: 'profile', fields: ['name', 'email'] },
        bodyParams: {}
      };

      const apiMeta = {
        path: '/users/{userId}',
        method: 'GET'
      };

      const url = buildFullUrl(classified, apiMeta);

      expect(url).toContain('/users/123');
      expect(url).toContain('include=profile');
      expect(url).toContain('fields=name');
      expect(url).toContain('fields=email');
    });

    // Edge case: Empty classified params
    it('should handle empty parameters', () => {
      const classified = {
        pathParams: {},
        queryParams: {},
        bodyParams: {}
      };

      const apiMeta = {
        path: '/users',
        method: 'GET'
      };

      const url = buildFullUrl(classified, apiMeta);

      expect(url).toBe('/users');
    });

    // Special characters in params
    it('should URL-encode path and query parameters', () => {
      const classified = {
        pathParams: { query: 'hello world' },
        queryParams: { filter: 'status=active' },
        bodyParams: {}
      };

      const apiMeta = {
        path: '/search/{query}',
        method: 'GET'
      };

      const url = buildFullUrl(classified, apiMeta);

      expect(url).toContain('hello%20world');
      expect(url).toContain('filter=status%3Dactive');
    });
  });

  describe('buildRequestBody', () => {
    // Requirement 3.7: Serialize body parameters (two-param mode)
    it('should serialize body parameters to JSON in two-param mode', () => {
      const classified = {
        pathParams: {},
        queryParams: {},
        bodyParams: { name: 'John', email: 'john@example.com', age: 30 }
      };

      const body = buildRequestBody(
        classified,
        undefined,
        'two-param',
        'application/json'
      );

      expect(body).toBe('{"name":"John","email":"john@example.com","age":30}');
    });

    // Requirement 4.4: Direct body in three-param mode
    it('should use provided body directly in three-param mode', () => {
      const classified = {
        pathParams: {},
        queryParams: {},
        bodyParams: {}
      };

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const body = buildRequestBody(
        classified,
        formData,
        'three-param',
        'multipart/form-data'
      );

      expect(body).toBe(formData);
    });

    // Empty body in two-param mode
    it('should return undefined when no body params in two-param mode', () => {
      const classified = {
        pathParams: { userId: '123' },
        queryParams: { page: 1 },
        bodyParams: {}
      };

      const body = buildRequestBody(
        classified,
        undefined,
        'two-param',
        'application/json'
      );

      expect(body).toBeUndefined();
    });

    // Blob body in three-param mode
    it('should pass Blob body directly in three-param mode', () => {
      const classified = {
        pathParams: {},
        queryParams: {},
        bodyParams: {}
      };

      const blobBody = new Blob(['binary data'], { type: 'application/octet-stream' });

      const body = buildRequestBody(
        classified,
        blobBody,
        'three-param',
        'application/octet-stream'
      );

      expect(body).toBe(blobBody);
    });

    // Different content types in two-param mode
    it('should serialize to URLSearchParams for form-urlencoded', () => {
      const classified = {
        pathParams: {},
        queryParams: {},
        bodyParams: { username: 'john', password: 'secret' }
      };

      const body = buildRequestBody(
        classified,
        undefined,
        'two-param',
        'application/x-www-form-urlencoded'
      );

      expect(body).toBeInstanceOf(URLSearchParams);
      expect((body as URLSearchParams).get('username')).toBe('john');
      expect((body as URLSearchParams).get('password')).toBe('secret');
    });

    // Complex data structures
    it('should serialize complex objects in two-param mode', () => {
      const classified = {
        pathParams: {},
        queryParams: {},
        bodyParams: {
          user: { name: 'John', age: 30 },
          tags: ['frontend', 'backend'],
          active: true
        }
      };

      const body = buildRequestBody(
        classified,
        undefined,
        'two-param',
        'application/json'
      );

      const parsed = JSON.parse(body as string);
      expect(parsed.user).toEqual({ name: 'John', age: 30 });
      expect(parsed.tags).toEqual(['frontend', 'backend']);
      expect(parsed.active).toBe(true);
    });
  });
});
