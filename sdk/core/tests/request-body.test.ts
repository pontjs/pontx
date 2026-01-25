/**
 * @author jasonHzq
 * @description Request body 序列化测试
 * 测试: serializeRequestBody, getContentType
 */

import { describe, it, expect } from 'vitest';
import { serializeRequestBody, getContentType } from '../src/core/request-body';
import type { PontxAPI } from '@pontx/spec';

describe('serializeRequestBody', () => {
  describe('application/json', () => {
    it('should serialize object to JSON string', () => {
      const body = { name: 'John', age: 30 };
      const result = serializeRequestBody(body, 'application/json');
      expect(result).toBe('{"name":"John","age":30}');
    });

    it('should serialize array to JSON string', () => {
      const body = [1, 2, 3];
      const result = serializeRequestBody(body, 'application/json');
      expect(result).toBe('[1,2,3]');
    });

    it('should serialize nested objects to JSON string', () => {
      const body = { user: { name: 'John', address: { city: 'NYC' } } };
      const result = serializeRequestBody(body, 'application/json');
      expect(result).toBe('{"user":{"name":"John","address":{"city":"NYC"}}}');
    });

    it('should serialize null to JSON string', () => {
      const result = serializeRequestBody(null, 'application/json');
      expect(result).toBe('null');
    });

    it('should serialize primitive values to JSON string', () => {
      expect(serializeRequestBody('hello', 'application/json')).toBe('"hello"');
      expect(serializeRequestBody(123, 'application/json')).toBe('123');
      expect(serializeRequestBody(true, 'application/json')).toBe('true');
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    it('should serialize object to URLSearchParams', () => {
      const body = { name: 'John', age: 30 };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded');
      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).get('name')).toBe('John');
      expect((result as URLSearchParams).get('age')).toBe('30');
    });

    it('should handle array values by appending multiple entries', () => {
      const body = { tags: ['frontend', 'backend'] };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result).toBeInstanceOf(URLSearchParams);
      expect(result.getAll('tags')).toEqual(['frontend', 'backend']);
    });

    it('should skip null values', () => {
      const body = { name: 'John', age: null };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result.has('name')).toBe(true);
      expect(result.has('age')).toBe(false);
    });

    it('should skip undefined values', () => {
      const body = { name: 'John', age: undefined };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result.has('name')).toBe(true);
      expect(result.has('age')).toBe(false);
    });

    it('should serialize object values to JSON', () => {
      const body = { filter: { status: 'active' } };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result.get('filter')).toBe('{"status":"active"}');
    });

    it('should handle empty object', () => {
      const body = {};
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result).toBeInstanceOf(URLSearchParams);
      expect(result.toString()).toBe('');
    });

    it('should handle null body', () => {
      const result = serializeRequestBody(null, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result).toBeInstanceOf(URLSearchParams);
      expect(result.toString()).toBe('');
    });

    it('should handle boolean values', () => {
      const body = { active: true, deleted: false };
      const result = serializeRequestBody(body, 'application/x-www-form-urlencoded') as URLSearchParams;
      expect(result.get('active')).toBe('true');
      expect(result.get('deleted')).toBe('false');
    });
  });

  describe('multipart/form-data', () => {
    it('should serialize object to FormData', () => {
      const body = { name: 'John', age: 30 };
      const result = serializeRequestBody(body, 'multipart/form-data');
      expect(result).toBeInstanceOf(FormData);
      expect((result as FormData).get('name')).toBe('John');
      expect((result as FormData).get('age')).toBe('30');
    });

    it('should handle File objects', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const body = { file };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result).toBeInstanceOf(FormData);
      expect(result.get('file')).toBe(file);
    });

    it('should handle Blob objects', () => {
      const blob = new Blob(['content'], { type: 'text/plain' });
      const body = { data: blob };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result).toBeInstanceOf(FormData);
      const retrieved = result.get('data');
      // In Node.js, FormData.get() may convert Blob to File
      expect(retrieved instanceof Blob || retrieved instanceof File).toBe(true);
    });

    it('should handle array values by appending multiple entries', () => {
      const body = { tags: ['frontend', 'backend'] };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result).toBeInstanceOf(FormData);
      expect(result.getAll('tags')).toEqual(['frontend', 'backend']);
    });

    it('should skip null values', () => {
      const body = { name: 'John', age: null };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result.has('name')).toBe(true);
      expect(result.has('age')).toBe(false);
    });

    it('should skip undefined values', () => {
      const body = { name: 'John', age: undefined };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result.has('name')).toBe(true);
      expect(result.has('age')).toBe(false);
    });

    it('should serialize object values to JSON', () => {
      const body = { metadata: { version: 1 } };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result.get('metadata')).toBe('{"version":1}');
    });

    it('should handle mixed types', () => {
      const file = new File(['content'], 'test.txt');
      const body = {
        name: 'John',
        file,
        tags: ['a', 'b'],
        metadata: { id: 1 }
      };
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result.get('name')).toBe('John');
      expect(result.get('file')).toBe(file);
      expect(result.getAll('tags')).toEqual(['a', 'b']);
      expect(result.get('metadata')).toBe('{"id":1}');
    });

    it('should handle empty object', () => {
      const body = {};
      const result = serializeRequestBody(body, 'multipart/form-data') as FormData;
      expect(result).toBeInstanceOf(FormData);
    });

    it('should handle null body', () => {
      const result = serializeRequestBody(null, 'multipart/form-data') as FormData;
      expect(result).toBeInstanceOf(FormData);
    });
  });

  describe('text/plain', () => {
    it('should return string body as-is', () => {
      const body = 'hello world';
      const result = serializeRequestBody(body, 'text/plain');
      expect(result).toBe('hello world');
    });

    it('should convert non-string values to string', () => {
      expect(serializeRequestBody(123, 'text/plain')).toBe('123');
      expect(serializeRequestBody(true, 'text/plain')).toBe('true');
      expect(serializeRequestBody(null, 'text/plain')).toBe('null');
    });

    it('should convert object to string', () => {
      const body = { name: 'John' };
      const result = serializeRequestBody(body, 'text/plain');
      expect(result).toBe('[object Object]');
    });
  });

  describe('unsupported content types', () => {
    it('should throw error for unsupported content type', () => {
      expect(() => {
        serializeRequestBody({ name: 'John' }, 'application/xml' as any);
      }).toThrow('Unsupported Content-Type: application/xml');
    });

    it('should include list of supported types in error message', () => {
      expect(() => {
        serializeRequestBody({}, 'application/xml' as any);
      }).toThrow(/application\/json/);
      expect(() => {
        serializeRequestBody({}, 'application/xml' as any);
      }).toThrow(/application\/x-www-form-urlencoded/);
      expect(() => {
        serializeRequestBody({}, 'application/xml' as any);
      }).toThrow(/multipart\/form-data/);
      expect(() => {
        serializeRequestBody({}, 'application/xml' as any);
      }).toThrow(/text\/plain/);
    });
  });
});

describe('getContentType', () => {
  it('should return first content type from consumes array', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['application/json', 'application/xml']
    };
    const result = getContentType(apiMeta);
    expect(result).toBe('application/json');
  });

  it('should return undefined when consumes is empty array', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: []
    };
    const result = getContentType(apiMeta);
    expect(result).toBeUndefined();
  });

  it('should return undefined when consumes is not defined', () => {
    const apiMeta: Partial<PontxAPI> = {};
    const result = getContentType(apiMeta);
    expect(result).toBeUndefined();
  });

  it('should return content type when consumes has single element', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['application/x-www-form-urlencoded']
    };
    const result = getContentType(apiMeta);
    expect(result).toBe('application/x-www-form-urlencoded');
  });

  it('should handle multipart/form-data', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['multipart/form-data']
    };
    const result = getContentType(apiMeta);
    expect(result).toBe('multipart/form-data');
  });

  it('should handle text/plain', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['text/plain']
    };
    const result = getContentType(apiMeta);
    expect(result).toBe('text/plain');
  });

  it('should handle empty object', () => {
    const result = getContentType({});
    expect(result).toBeUndefined();
  });
});
