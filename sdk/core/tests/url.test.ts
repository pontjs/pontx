/**
 * @author jasonHzq
 * @description URL 构建功能测试
 * 测试: buildUrl, normalizeURIComponent, decodeIfEncodedURIComponent
 */

import { describe, it, expect } from 'vitest';
import {
  buildUrl,
  normalizeURIComponent,
  decodeIfEncodedURIComponent,
} from '../src/core/build-url';

describe('buildUrl', () => {
  describe('基础参数替换', () => {
    it('应该替换单个路径参数', () => {
      const result = buildUrl('/users/{userId}', { userId: '123' });
      expect(result).toBe('/users/123');
    });

    it('应该替换多个路径参数', () => {
      const result = buildUrl('/users/{userId}/posts/{postId}', {
        userId: '123',
        postId: '456'
      });
      expect(result).toBe('/users/123/posts/456');
    });

    it('应该处理数字类型的参数', () => {
      const result = buildUrl('/users/{userId}', { userId: 123 });
      expect(result).toBe('/users/123');
    });

    it('应该将剩余参数作为查询参数', () => {
      const result = buildUrl('/users/{userId}', { userId: '123', page: 1, limit: 10 });
      expect(result).toBe('/users/123?page=1&limit=10');
    });
  });

  describe('pathMark 处理', () => {
    it('缺失参数时应该使用 pathMark', () => {
      const result = buildUrl('/users/{userId}', {}, ':id');
      expect(result).toBe('/users/:id');
    });

    it('有参数值时应该忽略 pathMark', () => {
      const result = buildUrl('/users/{userId}', { userId: '123' }, ':id');
      expect(result).toBe('/users/123');
    });

    it('默认 pathMark 为空字符串', () => {
      const result = buildUrl('/users/{userId}', {});
      expect(result).toBe('/users/');
    });
  });

  describe('查询参数处理', () => {
    it('应该序列化基本类型查询参数', () => {
      const result = buildUrl('/users', { name: 'John', age: 30 });
      expect(result).toBe('/users?name=John&age=30');
    });

    it('应该处理数组参数', () => {
      const result = buildUrl('/search', { tags: ['a', 'b', 'c'] });
      expect(result).toBe('/search?tags=a&tags=b&tags=c');
    });

    it('应该序列化对象参数为 JSON', () => {
      const result = buildUrl('/search', { filter: { status: 'active' } });
      const decoded = decodeURIComponent(result.split('=')[1]);
      expect(decoded).toBe('{"status":"active"}');
    });

    it('应该跳过 undefined 和 null 值', () => {
      const result = buildUrl('/users', { name: 'John', age: null, city: undefined });
      expect(result).toBe('/users?name=John');
    });
  });

  describe('URL 编码', () => {
    it('路径参数应该进行 URL 编码', () => {
      const result = buildUrl('/search/{query}', { query: 'hello world' });
      expect(result).toBe('/search/hello%20world');
    });

    it('应该编码特殊字符', () => {
      const result = buildUrl('/search/{query}', { query: 'a+b&c=d' });
      expect(result).toBe('/search/a%2Bb%26c%3Dd');
    });

    it('应该编码中文字符', () => {
      const result = buildUrl('/search/{query}', { query: '你好' });
      expect(result).toBe('/search/%E4%BD%A0%E5%A5%BD');
    });
  });

  describe('边界情况', () => {
    it('应该处理空参数对象', () => {
      const result = buildUrl('/users', {});
      expect(result).toBe('/users');
    });

    it('应该处理 null 参数', () => {
      const result = buildUrl('/users', null as any);
      expect(result).toBeNull();
    });

    it('应该处理没有路径参数的路径', () => {
      const result = buildUrl('/users', { page: 1 });
      expect(result).toBe('/users?page=1');
    });

    it('应该处理空字符串参数值', () => {
      const result = buildUrl('/users/{userId}', { userId: '' });
      expect(result).toBe('/users/');
    });
  });
});

describe('normalizeURIComponent', () => {
  it('应该对未编码的字符串进行编码', () => {
    const result = normalizeURIComponent('hello world');
    expect(result).toBe('hello%20world');
  });

  it('应该处理已编码的字符串（先解码再编码）', () => {
    const result = normalizeURIComponent('hello%20world');
    expect(result).toBe('hello%20world');
  });

  it('应该处理重复编码的字符串', () => {
    const result = normalizeURIComponent('hello%2520world');
    expect(result).toBe('hello%2520world');
  });

  it('应该处理特殊字符', () => {
    const result = normalizeURIComponent('a+b&c=d');
    expect(result).toBe('a%2Bb%26c%3Dd');
  });

  it('应该处理中文字符', () => {
    const result = normalizeURIComponent('你好');
    expect(result).toBe('%E4%BD%A0%E5%A5%BD');
  });

  it('应该处理 null 和 undefined', () => {
    expect(normalizeURIComponent(null as any)).toBe('');
    expect(normalizeURIComponent(undefined as any)).toBe('');
  });

  it('应该处理残缺的编码字符（不解码直接编码）', () => {
    const result = normalizeURIComponent('hello%2');
    // 残缺的 %2 会被当作普通字符编码
    expect(result).toBe('hello%252');
  });
});

describe('decodeIfEncodedURIComponent', () => {
  it('应该解码已编码的字符串', () => {
    const result = decodeIfEncodedURIComponent('hello%20world');
    expect(result).toBe('hello world');
  });

  it('应该保持未编码的字符串不变', () => {
    const result = decodeIfEncodedURIComponent('hello world');
    expect(result).toBe('hello world');
  });

  it('应该处理中文编码', () => {
    const result = decodeIfEncodedURIComponent('%E4%BD%A0%E5%A5%BD');
    expect(result).toBe('你好');
  });

  it('应该处理特殊字符编码', () => {
    const result = decodeIfEncodedURIComponent('a%2Bb%26c%3Dd');
    expect(result).toBe('a+b&c=d');
  });

  it('应该处理 null 和 undefined', () => {
    expect(decodeIfEncodedURIComponent(null as any)).toBe('');
    expect(decodeIfEncodedURIComponent(undefined as any)).toBe('');
  });

  it('应该处理残缺的编码（返回原字符串）', () => {
    const result = decodeIfEncodedURIComponent('hello%2');
    expect(result).toBe('hello%2');
  });

  it('应该处理混合的已编码和未编码字符串', () => {
    const result = decodeIfEncodedURIComponent('hello%20world test');
    // 如果重新编码后不等于原字符串，返回原字符串
    expect(result).toBe('hello%20world test');
  });
});
