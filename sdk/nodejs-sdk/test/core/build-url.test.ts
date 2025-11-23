import { describe, it, expect } from 'vitest';
import { buildUrl, type BuildUrlOptions } from '../../src/core/build-url';

/**
 * Test suite for buildUrl function - Path Parameter Replacement
 *
 * Requirements (from requirements.md 5.1-5.2):
 * 1. WHEN API path contains {paramName} placeholder and params has the value,
 *    THEN replace with URL-encoded value
 * 2. WHEN API path contains {paramName} but params lacks the value and pathMark is configured,
 *    THEN use pathMark
 * 3. WHEN API path contains {paramName} but params lacks value and no pathMark,
 *    THEN keep placeholder
 */

describe('buildUrl - path parameter replacement', () => {
  describe('Basic path parameter replacement', () => {
    it('should replace single path parameter with encoded value', () => {
      const result = buildUrl('/users/{userId}', { userId: '123' });
      expect(result).toBe('/users/123');
    });

    it('should replace multiple path parameters', () => {
      const result = buildUrl('/users/{userId}/posts/{postId}', {
        userId: '123',
        postId: '456',
      });
      expect(result).toBe('/users/123/posts/456');
    });

    it('should handle path without parameters', () => {
      const result = buildUrl('/users', {});
      expect(result).toBe('/users');
    });

    it('should handle empty path', () => {
      const result = buildUrl('', {});
      expect(result).toBe('');
    });

    it('should handle root path', () => {
      const result = buildUrl('/', {});
      expect(result).toBe('/');
    });
  });

  describe('URL encoding of path parameters', () => {
    it('should URL-encode path parameter values with spaces', () => {
      const result = buildUrl('/search/{query}', { query: 'hello world' });
      expect(result).toBe('/search/hello%20world');
    });

    it('should URL-encode special characters in path parameters', () => {
      const result = buildUrl('/files/{path}', { path: 'folder/file.txt' });
      expect(result).toBe('/files/folder%2Ffile.txt');
    });

    it('should URL-encode Chinese characters', () => {
      const result = buildUrl('/search/{query}', { query: '中文' });
      expect(result).toBe('/search/%E4%B8%AD%E6%96%87');
    });

    it('should URL-encode special URL characters', () => {
      const result = buildUrl('/users/{id}', { id: 'user@example.com' });
      expect(result).toBe('/users/user%40example.com');
    });

    it('should handle already encoded values correctly', () => {
      const result = buildUrl('/search/{query}', { query: 'hello%20world' });
      expect(result).toBe('/search/hello%2520world');
    });
  });

  describe('Missing parameters with pathMark', () => {
    it('should use pathMark when parameter is missing and pathMark provided', () => {
      const result = buildUrl('/users/{userId}', {}, { pathMark: ':id' });
      expect(result).toBe('/users/:id');
    });

    it('should use pathMark for multiple missing parameters', () => {
      const result = buildUrl(
        '/users/{userId}/posts/{postId}',
        {},
        { pathMark: ':param' }
      );
      expect(result).toBe('/users/:param/posts/:param');
    });

    it('should use pathMark only for missing parameters', () => {
      const result = buildUrl(
        '/users/{userId}/posts/{postId}',
        { userId: '123' },
        { pathMark: ':id' }
      );
      expect(result).toBe('/users/123/posts/:id');
    });

    it('should handle pathMark with special characters', () => {
      const result = buildUrl('/users/{userId}', {}, { pathMark: '${id}' });
      expect(result).toBe('/users/${id}');
    });
  });

  describe('Missing parameters without pathMark', () => {
    it('should keep placeholder when parameter missing and no pathMark', () => {
      const result = buildUrl('/users/{userId}', {});
      expect(result).toBe('/users/{userId}');
    });

    it('should keep all placeholders when all parameters missing', () => {
      const result = buildUrl('/users/{userId}/posts/{postId}', {});
      expect(result).toBe('/users/{userId}/posts/{postId}');
    });

    it('should replace available and keep missing parameters', () => {
      const result = buildUrl('/users/{userId}/posts/{postId}', {
        userId: '123',
      });
      expect(result).toBe('/users/123/posts/{postId}');
    });
  });

  describe('Edge cases and type handling', () => {
    it('should handle numeric parameter values', () => {
      const result = buildUrl('/users/{userId}', { userId: 123 });
      expect(result).toBe('/users/123');
    });

    it('should handle boolean parameter values', () => {
      const result = buildUrl('/settings/{enabled}', { enabled: true });
      expect(result).toBe('/settings/true');
    });

    it('should handle null parameter values as missing', () => {
      const result = buildUrl('/users/{userId}', { userId: null });
      expect(result).toBe('/users/{userId}');
    });

    it('should handle undefined parameter values as missing', () => {
      const result = buildUrl('/users/{userId}', { userId: undefined });
      expect(result).toBe('/users/{userId}');
    });

    it('should handle empty string parameter values', () => {
      const result = buildUrl('/users/{userId}', { userId: '' });
      expect(result).toBe('/users/{userId}');
    });

    it('should handle parameter names with underscores', () => {
      const result = buildUrl('/users/{user_id}', { user_id: '123' });
      expect(result).toBe('/users/123');
    });

    it('should handle parameter names with numbers', () => {
      const result = buildUrl('/users/{userId1}', { userId1: '123' });
      expect(result).toBe('/users/123');
    });

    it('should handle complex paths with multiple segments', () => {
      const result = buildUrl(
        '/api/v1/users/{userId}/posts/{postId}/comments/{commentId}',
        { userId: '1', postId: '2', commentId: '3' }
      );
      expect(result).toBe('/api/v1/users/1/posts/2/comments/3');
    });

    it('should handle adjacent parameters', () => {
      const result = buildUrl('/path/{param1}{param2}', {
        param1: 'a',
        param2: 'b',
      });
      expect(result).toBe('/path/ab');
    });

    it('should handle parameters at path start', () => {
      const result = buildUrl('{userId}/posts', { userId: '123' });
      expect(result).toBe('123/posts');
    });

    it('should handle parameters at path end', () => {
      const result = buildUrl('/users/{userId}', { userId: '123' });
      expect(result).toBe('/users/123');
    });
  });

  describe('Type safety', () => {
    it('should accept string values', () => {
      const result = buildUrl('/users/{id}', { id: 'test' });
      expect(result).toBe('/users/test');
    });

    it('should accept number values', () => {
      const result = buildUrl('/users/{id}', { id: 42 });
      expect(result).toBe('/users/42');
    });

    it('should accept boolean values', () => {
      const result = buildUrl('/settings/{flag}', { flag: false });
      expect(result).toBe('/settings/false');
    });

    it('should handle mixed types in params', () => {
      const result = buildUrl('/api/{version}/{id}', {
        version: 1,
        id: 'test',
      });
      expect(result).toBe('/api/1/test');
    });
  });
});
