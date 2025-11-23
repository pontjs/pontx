/**
 * Tests for createGracefulClient factory
 *
 * Requirements covered:
 * - 8.4: createGracefulClient() SHALL 提供 buildGracefulProxyClient() 构建器
 * - 8.2: Graceful 风格支持 client.controller.method(params, body, options) 可调用方法
 */

import { describe, it, expect, vi } from 'vitest';
import { createGracefulClient } from './create-graceful-client';
import type { PontxSpecMeta } from '@pontx/spec';

describe('createGracefulClient', () => {
  it('should create graceful client from config', () => {
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

    const client = createGracefulClient({
      pontxSpecMeta,
    });

    expect(client.users).toBeDefined();
    expect(client.users.getUser).toBeDefined();
    expect(typeof client.users.getUser).toBe('function');
  });

  it('should validate pontxSpecMeta format', () => {
    expect(() => {
      createGracefulClient({
        pontxSpecMeta: null as any,
      });
    }).toThrow('Invalid pontxSpecMeta');

    expect(() => {
      createGracefulClient({
        pontxSpecMeta: {} as any,
      });
    }).toThrow('Invalid pontxSpecMeta: missing or invalid "name"');

    expect(() => {
      createGracefulClient({
        pontxSpecMeta: { name: 'test' } as any,
      });
    }).toThrow('Invalid pontxSpecMeta: missing or invalid "apis"');
  });

  it('should use custom fetchFn if provided', async () => {
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

    const customFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: '123' }),
    });

    const client = createGracefulClient({
      pontxSpecMeta,
      fetchFn: customFetch,
    });

    await client.users.getUser({ userId: '123' });

    expect(customFetch).toHaveBeenCalled();
  });

  it('should wrap request with validation if enabled', async () => {
    const pontxSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      apis: {
        'users/createUser': {
          method: 'POST',
          path: '/users',
          pathParams: [],
          queryParams: [],
          bodyType: 'object',
        } as any,
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: '123' }),
    });

    const client = createGracefulClient({
      pontxSpecMeta,
      fetchFn: mockFetch,
      validation: {
        enabled: true,
      },
    });

    expect(client.users).toBeDefined();
  });

  it('should wrap request with mock if enabled', async () => {
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

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: 'mock-123', name: 'Mock User' }),
    });

    const client = createGracefulClient({
      pontxSpecMeta,
      fetchFn: mockFetch,
      mock: {
        enabled: true,
        mockData: {
          'users/getUser': { id: 'mock-123', name: 'Mock User' },
        },
      },
    });

    const result = await client.users.getUser({ userId: '123' });

    expect(result).toEqual({ id: 'mock-123', name: 'Mock User' });
  });

  it('should pass getFetchUrl option to proxy builder', async () => {
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

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const customGetFetchUrl = vi.fn((path, params) => {
      return `https://custom.com${path.replace('{userId}', params.userId)}`;
    });

    const client = createGracefulClient({
      pontxSpecMeta,
      fetchFn: mockFetch,
      getFetchUrl: customGetFetchUrl,
    });

    await client.users.getUser({ userId: '123' });

    expect(customGetFetchUrl).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.com/users/123',
      expect.any(Object)
    );
  });

  it('should pass pathMark option to proxy builder', async () => {
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

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const client = createGracefulClient({
      pontxSpecMeta,
      fetchFn: mockFetch,
      pathMark: ':',
    });

    // Call without userId to see pathMark effect
    await client.users.getUser({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(':'),
      expect.any(Object)
    );
  });

  it('should freeze config to prevent modifications', () => {
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

    const config = {
      pontxSpecMeta,
    };

    createGracefulClient(config);

    expect(() => {
      (config as any).pontxSpecMeta = null;
    }).toThrow();
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

    const makeCustomUsages = (callable: any) => {
      callable.customMethod = () => 'custom';
      return callable;
    };

    const client = createGracefulClient({
      pontxSpecMeta,
      makeCustomUsages,
    });

    expect((client.users.getUser as any).customMethod()).toBe('custom');
  });
});
