/**
 * Unit tests for request options handling
 *
 * Tests cover:
 * - Task 6.1: Options object processing (headers, timeout, fetch options)
 * - Task 6.2: Headers merging logic
 */

import { describe, it, expect, vi } from 'vitest';
import { createGracefulClient } from '../../../src/graceful/create-graceful-client';
import type { PontxSpecMeta } from '../../../src/types';

describe('Request Options Handling', () => {
  const testMeta: PontxSpecMeta = {
    name: 'test-api',
    apis: {
      'users/getUser': {
        path: '/users/{userId}',
        method: 'GET',
        pathParams: ['userId'],
        queryParams: [],
        produces: ['application/json'],
      },
      'users/createUser': {
        path: '/users',
        method: 'POST',
        pathParams: [],
        queryParams: [],
        consumes: ['application/json'],
        produces: ['application/json'],
      },
    },
  };

  describe('Headers Merging (Task 6.2)', () => {
    it('should set Content-Type from consumes metadata', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.createUser({ name: 'John' });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('should set Accept from produces metadata', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser({ userId: '123' });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Accept']).toBe('application/json');
    });

    it('should merge user-provided custom headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { headers: { 'X-Custom-Header': 'custom-value' } }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['X-Custom-Header']).toBe('custom-value');
    });

    it('should allow user headers to override default headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      // Override Accept header instead of Content-Type to avoid serialization issues
      await client.users.getUser(
        { userId: '123' },
        { headers: { 'Accept': 'application/xml' } }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Accept']).toBe('application/xml');
    });
  });

  describe('Options Processing (Task 6.1)', () => {
    it('should use options as last parameter in two-param mode', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { headers: { 'Authorization': 'Bearer token' } }
      );

      expect(mockFetch).toHaveBeenCalled();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer token');
    });

    it('should forward timeout option to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { timeout: 5000 }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.timeout).toBe(5000);
    });

    it('should forward signal option to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const abortController = new AbortController();
      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { signal: abortController.signal }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.signal).toBe(abortController.signal);
    });

    it('should forward credentials option to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { credentials: 'include' }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.credentials).toBe('include');
    });

    it('should forward cache option to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { cache: 'no-cache' }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.cache).toBe('no-cache');
    });

    it('should forward mode option to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      await client.users.getUser(
        { userId: '123' },
        { mode: 'cors' }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.mode).toBe('cors');
    });

    it('should use default config when options not provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      // Call without options
      await client.users.getUser({ userId: '123' });

      expect(mockFetch).toHaveBeenCalled();
      const [, init] = mockFetch.mock.calls[0];
      // Should have default headers from metadata
      expect(init.headers['Accept']).toBe('application/json');
    });

    it('should merge multiple options correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      });

      const client = createGracefulClient({
        pontxSpecMeta: testMeta,
        fetchFn: mockFetch,
      });

      const abortController = new AbortController();
      await client.users.getUser(
        { userId: '123' },
        {
          headers: { 'Authorization': 'Bearer token' },
          timeout: 5000,
          signal: abortController.signal,
          credentials: 'include',
          mode: 'cors',
        }
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer token');
      expect(init.timeout).toBe(5000);
      expect(init.signal).toBe(abortController.signal);
      expect(init.credentials).toBe('include');
      expect(init.mode).toBe('cors');
    });
  });
});
