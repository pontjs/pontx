/**
 * URL building functionality tests
 * Testing: buildUrl, getPathParamNames, appendQueryParams, createUrlBuilder
 */

import { describe, it, expect } from 'vitest';
import {
  buildUrl,
  getPathParamNames,
  appendQueryParams,
  createUrlBuilder,
  type BuildUrlOptions,
  type UrlBuilder
} from '../src/url';

describe('buildUrl', () => {
  describe('basic parameter replacement', () => {
    it('should replace single path parameter with value', () => {
      const result = buildUrl('/users/{userId}', { userId: '123' });
      expect(result).toBe('/users/123');
    });

    it('should replace multiple path parameters', () => {
      const result = buildUrl('/users/{userId}/posts/{postId}', {
        userId: '123',
        postId: '456'
      });
      expect(result).toBe('/users/123/posts/456');
    });

    it('should handle empty params object', () => {
      const result = buildUrl('/users/{userId}', {});
      expect(result).toBe('/users/{userId}');
    });

    it('should handle path without parameters', () => {
      const result = buildUrl('/users', { foo: 'bar' });
      expect(result).toBe('/users');
    });
  });

  describe('URL encoding', () => {
    it('should URL-encode parameter values with spaces', () => {
      const result = buildUrl('/search/{query}', { query: 'hello world' });
      expect(result).toBe('/search/hello%20world');
    });

    it('should URL-encode special characters', () => {
      const result = buildUrl('/search/{query}', { query: 'a+b&c=d' });
      expect(result).toBe('/search/a%2Bb%26c%3Dd');
    });

    it('should URL-encode unicode characters', () => {
      const result = buildUrl('/search/{query}', { query: '你好' });
      expect(result).toBe('/search/%E4%BD%A0%E5%A5%BD');
    });
  });

  describe('pathMark handling', () => {
    it('should use pathMark when parameter is missing', () => {
      const result = buildUrl('/users/{userId}', {}, { pathMark: ':id' });
      expect(result).toBe('/users/:id');
    });

    it('should use pathMark for multiple missing parameters', () => {
      const result = buildUrl(
        '/users/{userId}/posts/{postId}',
        {},
        { pathMark: ':id' }
      );
      expect(result).toBe('/users/:id/posts/:id');
    });

    it('should use actual value when both value and pathMark exist', () => {
      const result = buildUrl(
        '/users/{userId}',
        { userId: '123' },
        { pathMark: ':id' }
      );
      expect(result).toBe('/users/123');
    });

    it('should keep placeholder when no pathMark and parameter missing', () => {
      const result = buildUrl('/users/{userId}', {});
      expect(result).toBe('/users/{userId}');
    });
  });

  describe('edge cases', () => {
    it('should handle null parameter value as missing', () => {
      const result = buildUrl('/users/{userId}', { userId: null });
      expect(result).toBe('/users/{userId}');
    });

    it('should handle undefined parameter value as missing', () => {
      const result = buildUrl('/users/{userId}', { userId: undefined });
      expect(result).toBe('/users/{userId}');
    });

    it('should handle empty string parameter value as missing', () => {
      const result = buildUrl('/users/{userId}', { userId: '' });
      expect(result).toBe('/users/{userId}');
    });

    it('should handle number parameter values', () => {
      const result = buildUrl('/users/{userId}', { userId: 123 });
      expect(result).toBe('/users/123');
    });

    it('should handle boolean parameter values', () => {
      const result = buildUrl('/users/{active}', { active: true });
      expect(result).toBe('/users/true');
    });

    it('should handle parameter names with underscores', () => {
      const result = buildUrl('/api/{user_id}', { user_id: '123' });
      expect(result).toBe('/api/123');
    });

    it('should handle parameter names with hyphens', () => {
      const result = buildUrl('/api/{user-id}', { 'user-id': '123' });
      expect(result).toBe('/api/123');
    });
  });
});

describe('getPathParamNames', () => {
  it('should extract single parameter name', () => {
    const result = getPathParamNames('/users/{userId}');
    expect(result).toEqual(new Set(['userId']));
  });

  it('should extract multiple parameter names', () => {
    const result = getPathParamNames('/users/{userId}/posts/{postId}');
    expect(result).toEqual(new Set(['userId', 'postId']));
  });

  it('should return empty set for path without parameters', () => {
    const result = getPathParamNames('/users');
    expect(result).toEqual(new Set());
  });

  it('should handle parameters with underscores', () => {
    const result = getPathParamNames('/api/{user_id}');
    expect(result).toEqual(new Set(['user_id']));
  });

  it('should handle parameters with hyphens', () => {
    const result = getPathParamNames('/api/{user-id}');
    expect(result).toEqual(new Set(['user-id']));
  });

  it('should handle empty path', () => {
    const result = getPathParamNames('');
    expect(result).toEqual(new Set());
  });

  it('should handle complex path with multiple segments', () => {
    const result = getPathParamNames('/api/v1/{org}/{project}/issues/{issueId}');
    expect(result).toEqual(new Set(['org', 'project', 'issueId']));
  });
});

describe('appendQueryParams', () => {
  describe('basic query parameters', () => {
    it('should append single query parameter', () => {
      const result = appendQueryParams('/users', { page: 1 });
      expect(result).toBe('/users?page=1');
    });

    it('should append multiple query parameters', () => {
      const result = appendQueryParams('/users', { page: 1, limit: 10 });
      expect(result).toBe('/users?page=1&limit=10');
    });

    it('should handle existing query string with ?', () => {
      const result = appendQueryParams('/users?sort=name', { page: 1 });
      expect(result).toBe('/users?sort=name&page=1');
    });

    it('should return original URL when params is empty', () => {
      const result = appendQueryParams('/users', {});
      expect(result).toBe('/users');
    });
  });

  describe('array parameters', () => {
    it('should append array values as repeated parameters', () => {
      const result = appendQueryParams('/users', { tags: ['frontend', 'backend'] });
      expect(result).toBe('/users?tags=frontend&tags=backend');
    });

    it('should handle empty array by skipping it', () => {
      const result = appendQueryParams('/users', { tags: [] });
      expect(result).toBe('/users');
    });

    it('should handle array of numbers', () => {
      const result = appendQueryParams('/users', { ids: [1, 2, 3] });
      expect(result).toBe('/users?ids=1&ids=2&ids=3');
    });
  });

  describe('object parameters', () => {
    it('should serialize object to JSON string', () => {
      const result = appendQueryParams('/users', { filter: { status: 'active' } });
      const decoded = decodeURIComponent(result.split('=')[1]);
      expect(decoded).toBe('{"status":"active"}');
    });

    it('should serialize nested objects', () => {
      const result = appendQueryParams('/users', {
        filter: { user: { name: 'John' } }
      });
      const decoded = decodeURIComponent(result.split('=')[1]);
      expect(decoded).toBe('{"user":{"name":"John"}}');
    });

    it('should serialize array of objects', () => {
      const result = appendQueryParams('/users', {
        items: [{ id: 1 }, { id: 2 }]
      });
      expect(result).toContain('items=');
      expect(result.split('&').length).toBe(2);
    });
  });

  describe('special characters', () => {
    it('should URL-encode parameter values', () => {
      const result = appendQueryParams('/search', { q: 'hello world' });
      expect(result).toBe('/search?q=hello%20world');
    });

    it('should URL-encode special characters', () => {
      const result = appendQueryParams('/search', { q: 'a+b&c=d' });
      expect(result).toBe('/search?q=a%2Bb%26c%3Dd');
    });

    it('should URL-encode unicode characters', () => {
      const result = appendQueryParams('/search', { q: '你好' });
      expect(result).toBe('/search?q=%E4%BD%A0%E5%A5%BD');
    });
  });

  describe('edge cases', () => {
    it('should skip null values', () => {
      const result = appendQueryParams('/users', { page: 1, filter: null });
      expect(result).toBe('/users?page=1');
    });

    it('should skip undefined values', () => {
      const result = appendQueryParams('/users', { page: 1, filter: undefined });
      expect(result).toBe('/users?page=1');
    });

    it('should handle boolean values', () => {
      const result = appendQueryParams('/users', { active: true });
      expect(result).toBe('/users?active=true');
    });

    it('should handle zero as valid value', () => {
      const result = appendQueryParams('/users', { page: 0 });
      expect(result).toBe('/users?page=0');
    });

    it('should handle empty string as valid value', () => {
      const result = appendQueryParams('/users', { search: '' });
      expect(result).toBe('/users?search=');
    });
  });
});

describe('createUrlBuilder', () => {
  describe('default behavior', () => {
    it('should create builder that replaces path params and appends query params', () => {
      const builder = createUrlBuilder();
      const result = builder('/users/{userId}', { userId: '123', page: 1 });
      expect(result).toBe('/users/123?page=1');
    });

    it('should handle pathMark option', () => {
      const builder = createUrlBuilder({ pathMark: ':id' });
      const result = builder('/users/{userId}', { page: 1 });
      expect(result).toBe('/users/:id?page=1');
    });

    it('should separate path params from query params', () => {
      const builder = createUrlBuilder();
      const result = builder('/users/{userId}/posts/{postId}', {
        userId: '123',
        postId: '456',
        sort: 'date',
        limit: 10
      });
      expect(result).toBe('/users/123/posts/456?sort=date&limit=10');
    });
  });

  describe('custom getFetchUrl', () => {
    it('should use custom getFetchUrl when provided', () => {
      const builder = createUrlBuilder({
        getFetchUrl: (path, params) => `https://api.example.com${path}?token=${params.token}`
      });
      const result = builder('/users/{id}', { id: 123, token: 'abc' });
      expect(result).toBe('https://api.example.com/users/{id}?token=abc');
    });

    it('should pass all params to custom getFetchUrl', () => {
      let capturedPath: string;
      let capturedParams: Record<string, unknown>;

      const builder = createUrlBuilder({
        getFetchUrl: (path, params) => {
          capturedPath = path;
          capturedParams = params;
          return '/custom';
        }
      });

      builder('/users/{id}', { id: 123, page: 1 });

      expect(capturedPath!).toBe('/users/{id}');
      expect(capturedParams!).toEqual({ id: 123, page: 1 });
    });

    it('should not apply default URL building when custom getFetchUrl is provided', () => {
      const builder = createUrlBuilder({
        getFetchUrl: (path) => `https://example.com${path}`
      });
      const result = builder('/users/{id}', { id: 123 });
      expect(result).toBe('https://example.com/users/{id}');
      expect(result).not.toContain('/users/123');
    });
  });

  describe('edge cases', () => {
    it('should handle builder without params', () => {
      const builder = createUrlBuilder();
      const result = builder('/users');
      expect(result).toBe('/users');
    });

    it('should handle builder with empty params object', () => {
      const builder = createUrlBuilder();
      const result = builder('/users/{id}', {});
      expect(result).toBe('/users/{id}');
    });

    it('should create multiple independent builders', () => {
      const builder1 = createUrlBuilder({ pathMark: ':id' });
      const builder2 = createUrlBuilder({ pathMark: '_' });

      const result1 = builder1('/users/{userId}', {});
      const result2 = builder2('/users/{userId}', {});

      expect(result1).toBe('/users/:id');
      expect(result2).toBe('/users/_');
    });
  });
});
