/**
 * Tests for graceful proxy builder
 *
 * Requirements covered:
 * - 8.4: createGracefulClient() SHALL 提供 buildGracefulProxyClient() 构建器
 * - 8.2: Graceful 风格支持 `client.controller.method(params, body, options)` 可调用方法
 */

import { describe, it, expect, vi } from 'vitest';
import { buildGracefulProxyClient } from './proxy-builder';
import type { PontxSpecMeta } from '@pontx/spec';

describe('buildGracefulProxyClient', () => {
  it('should build two-layer proxy structure', () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn();
    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta);

    expect(client.users).toBeDefined();
    expect(client.users.getUser).toBeDefined();
    expect(typeof client.users.getUser).toBe('function');
  });

  it('should support nested namespaces', () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'admin/users/getUser': {
          method: 'GET',
          path: '/admin/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn();
    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta);

    expect(client.admin).toBeDefined();
    expect(client.admin.users).toBeDefined();
    expect(client.admin.users.getUser).toBeDefined();
    expect(typeof client.admin.users.getUser).toBe('function');
  });

  it('should create callable methods', async () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
          consumes: ['application/json'],
          produces: ['application/json'],
        } as any,
      },
    };

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: '123', name: 'John' }),
    });

    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta);

    const result = await client.users.getUser({ userId: '123' });

    expect(result).toEqual({ id: '123', name: 'John' });
    expect(requestFn).toHaveBeenCalled();
  });

  it('should attach utility methods to callable', () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn();
    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta);

    expect(typeof client.users.getUser.getFetchKey).toBe('function');
    expect(typeof client.users.getUser.queryOptions).toBe('function');
    expect(client.users.getUser.request).toBe(client.users.getUser);
  });

  it('should throw error for non-existent API', () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn();
    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta);

    expect(() => client.users.nonExistent).toThrow('API "nonExistent" not found');
  });

  it('should pass options to callable methods', async () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const customGetFetchUrl = vi.fn((path, params) => {
      return `https://custom.com${path}`;
    });

    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta, {
      getFetchUrl: customGetFetchUrl,
      pathMark: ':',
    });

    await client.users.getUser({ userId: '123' });

    expect(customGetFetchUrl).toHaveBeenCalled();
  });

  it('should support makeCustomUsages option', () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn();

    const makeCustomUsages = (callable: any) => {
      callable.customMethod = () => 'custom';
      return callable;
    };

    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta, {
      makeCustomUsages,
    });

    expect(client.users.getUser.customMethod()).toBe('custom');
  });

  it('should handle multiple APIs in same controller', () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/getUser': {
          method: 'GET',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
        'users/createUser': {
          method: 'POST',
          path: '/users',
          pathParams: [],
          queryParams: [],
        } as any,
        'users/deleteUser': {
          method: 'DELETE',
          path: '/users/{userId}',
          pathParams: ['userId'],
          queryParams: [],
        } as any,
      },
    };

    const requestFn = vi.fn();
    const client = buildGracefulProxyClient(requestFn, pontxSpecMeta);

    expect(client.users.getUser).toBeDefined();
    expect(client.users.createUser).toBeDefined();
    expect(client.users.deleteUser).toBeDefined();
  });
});
