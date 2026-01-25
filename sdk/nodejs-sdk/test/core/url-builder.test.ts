/**
 * Tests for URL builder module (Task 3.3)
 *
 * These tests verify the createUrlBuilder function which supports:
 * - Custom getFetchUrl function for complete URL building control
 * - Default URL building using buildUrl + appendQueryParams
 * - Path parameter replacement and query parameter appending
 */

import { describe, test, expect, vi } from 'vitest';
import { createUrlBuilder } from '../../src/core/url-builder';

describe('createUrlBuilder with custom getFetchUrl', () => {
  test('should use custom getFetchUrl when provided', () => {
    const customGetFetchUrl = (path: string, params: Record<string, unknown>) => {
      return `https://api.example.com${path}?custom=${params.id}`;
    };

    const builder = createUrlBuilder({ getFetchUrl: customGetFetchUrl });
    const result = builder('/users/{userId}', { userId: '123', id: 'abc' });

    expect(result).toBe('https://api.example.com/users/{userId}?custom=abc');
  });

  test('should use default buildUrl when getFetchUrl not provided', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}', { userId: '123', page: 1 });

    expect(result).toBe('/users/123?page=1');
  });

  test('should pass pathMark to default builder', () => {
    const builder = createUrlBuilder({ pathMark: ':id' });
    const result = builder('/users/{userId}', {});

    expect(result).toBe('/users/:id');
  });

  test('custom getFetchUrl receives correct path and params', () => {
    const mockGetFetchUrl = vi.fn((path, params) => path);
    const builder = createUrlBuilder({ getFetchUrl: mockGetFetchUrl });

    builder('/test/{id}', { id: '1', foo: 'bar' });

    expect(mockGetFetchUrl).toHaveBeenCalledWith('/test/{id}', { id: '1', foo: 'bar' });
  });

  test('custom getFetchUrl receives empty params object when no params provided', () => {
    const mockGetFetchUrl = vi.fn((path) => path);
    const builder = createUrlBuilder({ getFetchUrl: mockGetFetchUrl });

    builder('/test');

    expect(mockGetFetchUrl).toHaveBeenCalledWith('/test', {});
  });
});

describe('createUrlBuilder with default behavior', () => {
  test('should replace path parameters and append query params', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}/posts/{postId}', {
      userId: '123',
      postId: '456',
      page: 1,
      limit: 10,
    });

    expect(result).toBe('/users/123/posts/456?page=1&limit=10');
  });

  test('should handle URLs with no path parameters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users', { page: 1, limit: 10 });

    expect(result).toBe('/users?page=1&limit=10');
  });

  test('should handle URLs with no query parameters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}', { userId: '123' });

    expect(result).toBe('/users/123');
  });

  test('should handle empty params object', () => {
    const builder = createUrlBuilder();
    const result = builder('/users');

    expect(result).toBe('/users');
  });

  test('should filter out undefined and null query params', () => {
    const builder = createUrlBuilder();
    const result = builder('/users', {
      page: 1,
      filter: undefined,
      sort: null,
      limit: 10,
    });

    expect(result).toBe('/users?page=1&limit=10');
  });

  test('should handle array query parameters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users', { tags: ['javascript', 'typescript'] });

    expect(result).toBe('/users?tags=javascript&tags=typescript');
  });

  test('should handle object query parameters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users', { filter: { name: 'John', age: 30 } });

    expect(result).toContain('/users?filter=');
    expect(result).toContain(encodeURIComponent('{"name":"John","age":30}'));
  });

  test('should use pathMark for missing path parameters', () => {
    const builder = createUrlBuilder({ pathMark: ':param' });
    const result = builder('/users/{userId}/posts/{postId}', { userId: '123' });

    expect(result).toBe('/users/123/posts/:param');
  });

  test('should preserve path parameters when missing and no pathMark', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}', {});

    expect(result).toBe('/users/{userId}');
  });

  test('should encode path parameters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}', { userId: 'user name@test' });

    expect(result).toBe('/users/user%20name%40test');
  });

  test('should encode query parameters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users', { name: 'John Doe', email: 'test@example.com' });

    expect(result).toContain('name=John%20Doe');
    expect(result).toContain('email=test%40example.com');
  });
});

describe('createUrlBuilder edge cases', () => {
  test('should handle no params argument', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}');

    expect(result).toBe('/users/{userId}');
  });

  test('should handle mixed path and query params with special characters', () => {
    const builder = createUrlBuilder();
    const result = builder('/users/{userId}', {
      userId: 'user@123',
      filter: 'name=John&age=30',
    });

    expect(result).toContain('/users/user%40123');
    expect(result).toContain('filter=name%3DJohn%26age%3D30');
  });

  test('should not modify original params object', () => {
    const builder = createUrlBuilder();
    const params = { userId: '123', page: 1 };
    const paramsCopy = { ...params };

    builder('/users/{userId}', params);

    expect(params).toEqual(paramsCopy);
  });

  test('custom getFetchUrl should take precedence over pathMark', () => {
    const customGetFetchUrl = (path: string) => `https://custom.com${path}`;
    const builder = createUrlBuilder({
      getFetchUrl: customGetFetchUrl,
      pathMark: ':id',
    });

    const result = builder('/users/{userId}', {});

    expect(result).toBe('https://custom.com/users/{userId}');
  });
});
