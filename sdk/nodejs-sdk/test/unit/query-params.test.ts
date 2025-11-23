import { describe, it, expect } from 'vitest';
import { appendQueryParams } from '../../src/core/query-params';

/**
 * Test suite for query parameter concatenation functionality
 *
 * Requirements:
 * - WHEN params contain keys not used in path, THEN add as query parameters
 * - WHEN query param value is undefined/null, THEN ignore it
 * - WHEN query param value is array, THEN add multiple same-name params
 * - WHEN query param value is object, THEN serialize to JSON string
 */

describe('appendQueryParams', () => {
  it('should append simple query parameters', () => {
    const result = appendQueryParams('/api/users', { page: 1, limit: 10 });
    expect(result).toBe('/api/users?page=1&limit=10');
  });

  it('should skip undefined and null values', () => {
    const result = appendQueryParams('/api/users', { name: 'john', age: undefined, city: null });
    expect(result).toBe('/api/users?name=john');
  });

  it('should handle array values by repeating parameter name', () => {
    const result = appendQueryParams('/api/users', { tags: ['frontend', 'backend'] });
    expect(result).toBe('/api/users?tags=frontend&tags=backend');
  });

  it('should serialize object values to JSON', () => {
    const result = appendQueryParams('/api/users', { filter: { status: 'active', role: 'admin' } });
    const decoded = decodeURIComponent(result);
    expect(decoded).toBe('/api/users?filter={"status":"active","role":"admin"}');
  });

  it('should URL-encode query parameter values', () => {
    const result = appendQueryParams('/api/search', { q: 'hello world' });
    expect(result).toBe('/api/search?q=hello%20world');
  });

  it('should handle empty params object', () => {
    const result = appendQueryParams('/api/users', {});
    expect(result).toBe('/api/users');
  });

  it('should preserve existing query parameters', () => {
    const result = appendQueryParams('/api/users?existing=value', { new: 'param' });
    expect(result).toBe('/api/users?existing=value&new=param');
  });

  it('should handle boolean values', () => {
    const result = appendQueryParams('/api/users', { active: true, deleted: false });
    expect(result).toBe('/api/users?active=true&deleted=false');
  });

  it('should handle numeric values', () => {
    const result = appendQueryParams('/api/users', { page: 1, limit: 50, score: 3.14 });
    expect(result).toBe('/api/users?page=1&limit=50&score=3.14');
  });

  it('should handle empty string values', () => {
    const result = appendQueryParams('/api/users', { search: '', filter: 'active' });
    expect(result).toBe('/api/users?search=&filter=active');
  });

  it('should handle special characters in values', () => {
    const result = appendQueryParams('/api/users', { email: 'test@example.com' });
    expect(result).toBe('/api/users?email=test%40example.com');
  });

  it('should handle empty array', () => {
    const result = appendQueryParams('/api/users', { tags: [] });
    expect(result).toBe('/api/users');
  });

  it('should handle mixed parameter types', () => {
    const result = appendQueryParams('/api/users', {
      name: 'john',
      age: undefined,
      tags: ['frontend', 'backend'],
      active: true,
      filter: { status: 'active' }
    });

    // Parse the result to check each part
    expect(result).toContain('name=john');
    expect(result).toContain('tags=frontend');
    expect(result).toContain('tags=backend');
    expect(result).toContain('active=true');
    expect(result).toContain('filter=');
    expect(result).not.toContain('age=');
  });

  it('should handle nested objects in serialization', () => {
    const result = appendQueryParams('/api/users', {
      filter: {
        user: { name: 'john', age: 30 },
        status: 'active'
      }
    });

    const decoded = decodeURIComponent(result);
    const parsed = JSON.parse(decoded.split('filter=')[1]);
    expect(parsed).toEqual({
      user: { name: 'john', age: 30 },
      status: 'active'
    });
  });

  it('should handle array of objects', () => {
    const result = appendQueryParams('/api/users', {
      filters: [
        { field: 'name', value: 'john' },
        { field: 'age', value: 30 }
      ]
    });

    // Array of objects should create multiple params with same key
    expect(result).toContain('filters=');

    // Extract and parse each filter parameter
    const params = new URLSearchParams(result.split('?')[1]);
    const filterValues = params.getAll('filters');

    expect(filterValues).toHaveLength(2);
    expect(JSON.parse(filterValues[0])).toEqual({ field: 'name', value: 'john' });
    expect(JSON.parse(filterValues[1])).toEqual({ field: 'age', value: 30 });
  });
});
