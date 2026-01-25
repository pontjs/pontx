/**
 * Unit tests for request body serialization
 *
 * Tests for task 4: Request Body Serialization Module
 * - 4.1: JSON serialization
 * - 4.2: URLSearchParams serialization
 * - 4.3: FormData serialization
 * - 4.4: Content-Type auto-detection
 */

import { describe, it, expect } from 'vitest';
import { serializeRequestBody, getContentType } from '../../../src/core/request-body';

describe('Request Body Serialization', () => {
  describe('Task 4.1: JSON serialization', () => {
    it('should serialize object to JSON string', () => {
      const body = { name: 'John', age: 30 };
      const result = serializeRequestBody(body, 'application/json');

      expect(result).toBe(JSON.stringify(body));
    });

    it('should serialize array to JSON string', () => {
      const body = [1, 2, 3];
      const result = serializeRequestBody(body, 'application/json');

      expect(result).toBe(JSON.stringify(body));
    });

    it('should serialize nested object to JSON string', () => {
      const body = {
        user: {
          name: 'John',
          address: {
            city: 'NYC'
          }
        }
      };
      const result = serializeRequestBody(body, 'application/json');

      expect(result).toBe(JSON.stringify(body));
    });

    it('should handle null and undefined values in JSON', () => {
      const body = { name: 'John', age: null, email: undefined };
      const result = serializeRequestBody(body, 'application/json');

      // JSON.stringify removes undefined but keeps null
      expect(result).toBe(JSON.stringify(body));
    });

    it('should handle empty object', () => {
      const body = {};
      const result = serializeRequestBody(body, 'application/json');

      expect(result).toBe('{}');
    });
  });

  describe('Task 4.2: URLSearchParams serialization', () => {
    it('should serialize object to URLSearchParams', () => {
      const body = { name: 'John', age: '30' };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).toString()).toBe('name=John&age=30');
    });

    it('should serialize array values to repeated parameters', () => {
      const body = { tags: ['a', 'b', 'c'] };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      const params = result as URLSearchParams;
      expect(params.getAll('tags')).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty string values', () => {
      const body = { name: '', age: '30' };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).toString()).toBe('name=&age=30');
    });

    it('should skip undefined values', () => {
      const body = { name: 'John', age: undefined };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).toString()).toBe('name=John');
    });

    it('should skip null values', () => {
      const body = { name: 'John', age: null };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).toString()).toBe('name=John');
    });

    it('should handle numeric values by converting to string', () => {
      const body = { name: 'John', age: 30 };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).get('age')).toBe('30');
    });

    it('should serialize nested object by JSON.stringify', () => {
      const body = { user: { name: 'John' } };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).get('user')).toBe(JSON.stringify({ name: 'John' }));
    });
  });

  describe('Task 4.3: FormData serialization', () => {
    it('should serialize object to FormData', () => {
      const body = { name: 'John', age: '30' };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.get('name')).toBe('John');
      expect(formData.get('age')).toBe('30');
    });

    it('should handle File objects in FormData', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const body = { name: 'John', file };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.get('name')).toBe('John');
      expect(formData.get('file')).toBe(file);
    });

    it('should handle Blob objects in FormData', () => {
      const blob = new Blob(['content'], { type: 'text/plain' });
      const body = { name: 'John', data: blob };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.get('name')).toBe('John');
      // Note: In Node.js, FormData may convert Blob to File
      const data = formData.get('data');
      expect(data instanceof Blob || data instanceof File).toBe(true);
    });

    it('should handle array values by appending multiple times', () => {
      const body = { tags: ['a', 'b', 'c'] };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.getAll('tags')).toEqual(['a', 'b', 'c']);
    });

    it('should skip undefined values', () => {
      const body = { name: 'John', age: undefined };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.has('name')).toBe(true);
      expect(formData.has('age')).toBe(false);
    });

    it('should skip null values', () => {
      const body = { name: 'John', age: null };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.has('name')).toBe(true);
      expect(formData.has('age')).toBe(false);
    });

    it('should serialize nested objects as JSON', () => {
      const body = { user: { name: 'John' } };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.get('user')).toBe(JSON.stringify({ name: 'John' }));
    });

    it('should convert numeric values to string', () => {
      const body = { name: 'John', age: 30 };
      const result = serializeRequestBody(body, 'multipart/form-data');

      expect(result).toBeInstanceOf(FormData);
      const formData = result as FormData;
      expect(formData.get('age')).toBe('30');
    });
  });

  describe('Task 4.4: Content-Type auto-detection', () => {
    it('should return first consumes type from API metadata', () => {
      const apiMeta = {
        path: '/api/user',
        method: 'POST',
        hasBody: true,
        hasParams: false,
        consumes: ['application/json', 'application/xml']
      };

      const contentType = getContentType(apiMeta);
      expect(contentType).toBe('application/json');
    });

    it('should return undefined when consumes is empty', () => {
      const apiMeta = {
        path: '/api/user',
        method: 'POST',
        hasBody: true,
        hasParams: false,
        consumes: []
      };

      const contentType = getContentType(apiMeta);
      expect(contentType).toBeUndefined();
    });

    it('should return undefined when consumes is not provided', () => {
      const apiMeta = {
        path: '/api/user',
        method: 'POST',
        hasBody: true,
        hasParams: false
      };

      const contentType = getContentType(apiMeta);
      expect(contentType).toBeUndefined();
    });

    it('should handle multiple consumes types', () => {
      const apiMeta = {
        path: '/api/user',
        method: 'POST',
        hasBody: true,
        hasParams: false,
        consumes: [
          'application/x-www-form-urlencoded',
          'application/json',
          'multipart/form-data'
        ]
      };

      const contentType = getContentType(apiMeta);
      expect(contentType).toBe('application/x-www-form-urlencoded');
    });

    it('should handle text/plain content type', () => {
      const apiMeta = {
        path: '/api/user',
        method: 'POST',
        hasBody: true,
        hasParams: false,
        consumes: ['text/plain']
      };

      const contentType = getContentType(apiMeta);
      expect(contentType).toBe('text/plain');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty body object for JSON', () => {
      const result = serializeRequestBody({}, 'application/json');
      expect(result).toBe('{}');
    });

    it('should handle boolean values in URLSearchParams', () => {
      const body = { active: true, deleted: false };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      const params = result as URLSearchParams;
      expect(params.get('active')).toBe('true');
      expect(params.get('deleted')).toBe('false');
    });

    it('should handle special characters in URLSearchParams', () => {
      const body = { name: 'John & Jane', email: 'test@example.com' };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');

      expect(result).toBeInstanceOf(URLSearchParams);
      const params = result as URLSearchParams;
      expect(params.get('name')).toBe('John & Jane');
      expect(params.get('email')).toBe('test@example.com');
    });

    it('should throw error for unknown content type', () => {
      const body = { name: 'John' };

      expect(() => {
        serializeRequestBody(body, 'application/unknown' as any);
      }).toThrow();
    });

    it('should handle string body for text/plain', () => {
      const body = 'plain text content';
      const result = serializeRequestBody(body, 'text/plain');

      expect(result).toBe(body);
    });
  });
});
