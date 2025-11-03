/**
 * Tests for callable API method factory
 *
 * Requirements covered:
 * - 8.8: createCallableApiMethod() SHALL 返回既是函数又是对象的混合类型
 * - 8.2: Graceful 风格支持 `client.controller.method(params, body, options)` 可调用方法
 */

import { describe, it, expect, vi } from 'vitest';
import { createCallableApiMethod } from './callable-method';
import type { PontxAPI } from '@pontx/spec';

describe('createCallableApiMethod', () => {
  it('should create a callable function', () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
      consumes: ['application/json'],
      produces: ['application/json'],
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: '123', name: 'John' }),
    });

    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn);

    expect(typeof callable).toBe('function');
  });

  it('should have getFetchKey method', () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
    } as any;

    const requestFn = vi.fn();
    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn);

    expect(typeof callable.getFetchKey).toBe('function');
    expect(callable.getFetchKey({ userId: '123' })).toBe('users/getUser?userId=123');
  });

  it('should have queryOptions method', () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
    } as any;

    const requestFn = vi.fn();
    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn);

    expect(typeof callable.queryOptions).toBe('function');
    const options = callable.queryOptions({ userId: '123' });
    expect(options.queryKey).toEqual(['users/getUser?userId=123']);
    expect(typeof options.queryFn).toBe('function');
  });

  it('should have request property that references itself', () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
    } as any;

    const requestFn = vi.fn();
    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn);

    expect(callable.request).toBe(callable);
  });

  it('should execute request in two-param mode', async () => {
    const apiMeta: PontxAPI = {
      method: 'POST',
      path: '/users',
      pathParams: [],
      queryParams: [],
      consumes: ['application/json'],
      produces: ['application/json'],
      bodyType: 'object',
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: '123', name: 'John' }),
    });

    const callable = createCallableApiMethod('users/createUser', apiMeta, requestFn);

    const result = await callable({ name: 'John', email: 'john@example.com' });

    expect(requestFn).toHaveBeenCalled();
    expect(result).toEqual({ id: '123', name: 'John' });
  });

  it('should execute request in three-param mode', async () => {
    const apiMeta: PontxAPI = {
      method: 'POST',
      path: '/files/{category}',
      pathParams: ['category'],
      queryParams: ['public'],
      consumes: ['multipart/form-data'],
      produces: ['application/json'],
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ fileId: 'file123' }),
    });

    const formData = new FormData();
    formData.append('file', 'test');

    const callable = createCallableApiMethod('files/upload', apiMeta, requestFn);

    const result = await callable(
      { category: 'docs', public: true },
      formData
    );

    expect(requestFn).toHaveBeenCalled();
    expect(result).toEqual({ fileId: 'file123' });
  });

  it('should classify parameters correctly in two-param mode', async () => {
    const apiMeta: PontxAPI = {
      method: 'PUT',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
      consumes: ['application/json'],
      bodyType: 'object',
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: '123' }),
    });

    const callable = createCallableApiMethod('users/updateUser', apiMeta, requestFn);

    await callable({ userId: '123', name: 'John', email: 'john@x.com' });

    expect(requestFn).toHaveBeenCalledWith(
      expect.stringContaining('/users/123'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(String),
      })
    );

    // Check body contains name and email but not userId
    const callArgs = requestFn.mock.calls[0];
    const bodyStr = callArgs[1].body;
    const body = JSON.parse(bodyStr);
    expect(body).toEqual({ name: 'John', email: 'john@x.com' });
  });

  it('should support custom getFetchUrl', async () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const customGetFetchUrl = vi.fn((path, params) => {
      return `https://api.example.com${path.replace('{userId}', params.userId)}`;
    });

    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn, {
      getFetchUrl: customGetFetchUrl,
    });

    await callable({ userId: '123' });

    expect(customGetFetchUrl).toHaveBeenCalledWith('/users/{userId}', { userId: '123' });
    expect(requestFn).toHaveBeenCalledWith(
      'https://api.example.com/users/123',
      expect.any(Object)
    );
  });

  it('should support pathMark option', async () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn, {
      pathMark: ':',
    });

    // Call without userId to trigger pathMark replacement
    await callable({});

    expect(requestFn).toHaveBeenCalledWith(
      expect.stringContaining(':'),
      expect.any(Object)
    );
  });

  it('should apply custom usages if makeCustomUsages provided', () => {
    const apiMeta: PontxAPI = {
      method: 'GET',
      path: '/users/{userId}',
      pathParams: ['userId'],
      queryParams: [],
    } as any;

    const requestFn = vi.fn();

    const makeCustomUsages = vi.fn((callable, meta) => {
      callable.customMethod = () => 'custom';
      return callable;
    });

    const callable = createCallableApiMethod('users/getUser', apiMeta, requestFn, {
      makeCustomUsages,
    });

    expect(makeCustomUsages).toHaveBeenCalled();
    expect((callable as any).customMethod()).toBe('custom');
  });

  it('should build headers from API metadata', async () => {
    const apiMeta: PontxAPI = {
      method: 'POST',
      path: '/users',
      pathParams: [],
      queryParams: [],
      consumes: ['application/json'],
      produces: ['application/json'],
      bodyType: 'object',
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const callable = createCallableApiMethod('users/createUser', apiMeta, requestFn);

    await callable({ name: 'John' });

    const callArgs = requestFn.mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });

  it('should allow user headers to override defaults', async () => {
    const apiMeta: PontxAPI = {
      method: 'POST',
      path: '/users',
      pathParams: [],
      queryParams: [],
      consumes: ['application/json'],
      bodyType: 'object',
    } as any;

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const callable = createCallableApiMethod('users/createUser', apiMeta, requestFn);

    await callable(
      { name: 'John' },
      { headers: { 'Content-Type': 'text/plain' } }
    );

    const callArgs = requestFn.mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers['Content-Type']).toBe('text/plain');
  });
});
