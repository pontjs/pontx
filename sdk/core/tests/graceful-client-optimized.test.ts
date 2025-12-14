/**
 * Test for optimized createGracefulClient
 * Verify that the refactored version using buildApiCaller works correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { createGracefulClient } from '../src/client/graceful-client/index';
import type { GracefulSpecMeta } from '../src/client/graceful-client/index';

describe('Optimized createGracefulClient', () => {
  it('should handle simple GET request with path params', async () => {
    const specMeta: GracefulSpecMeta = {
      name: 'test-api',
      url: [{ url: 'https://api.example.com' }],
      apis: {
        'pet/getPetById': {
          method: 'GET',
          path: '/pet/{petId}',
          pathParams: ['petId'],
          queryParams: null,
          bodyParams: null,
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: 123, name: 'Fluffy' }),
    });

    const client = createGracefulClient(specMeta, {
      baseURL: 'https://api.example.com',
      fetch: mockFetch,
    });

    const result = await client.pet.getPetById(123);

    expect(result).toEqual({ id: 123, name: 'Fluffy' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/pet/123'),
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('should handle query parameters', async () => {
    const specMeta: GracefulSpecMeta = {
      name: 'test-api',
      url: [{ url: 'https://api.example.com' }],
      apis: {
        'pet/findByStatus': {
          method: 'GET',
          path: '/pet/findByStatus',
          pathParams: null,
          queryParams: ['status'],
          bodyParams: null,
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([{ id: 1, status: 'available' }]),
    });

    const client = createGracefulClient(specMeta, {
      baseURL: 'https://api.example.com',
      fetch: mockFetch,
    });

    await client.pet.findByStatus({ status: 'available' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('status=available'),
      expect.any(Object),
    );
  });

  it('should handle JSON body', async () => {
    const specMeta: GracefulSpecMeta = {
      name: 'test-api',
      url: [{ url: 'https://api.example.com' }],
      apis: {
        'pet/updatePet': {
          method: 'PUT',
          path: '/pet',
          pathParams: null,
          queryParams: null,
          bodyParams: {
            contentType: 'application/json',
            canMerge: false,
          },
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true }),
    });

    const client = createGracefulClient(specMeta, {
      baseURL: 'https://api.example.com',
      fetch: mockFetch,
    });

    await client.pet.updatePet({ id: 123, name: 'Fluffy' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('PUT');
    // Headers might be a Headers object or plain object
    const contentType = init.headers instanceof Headers
      ? init.headers.get('Content-Type')
      : init.headers['Content-Type'];
    expect(contentType).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ id: 123, name: 'Fluffy' }));
  });

  it('should handle multipart/form-data body', async () => {
    const specMeta: GracefulSpecMeta = {
      name: 'test-api',
      url: [{ url: 'https://api.example.com' }],
      apis: {
        'pet/uploadFile': {
          method: 'POST',
          path: '/pet/{petId}/uploadImage',
          pathParams: ['petId'],
          queryParams: null,
          bodyParams: {
            contentType: 'multipart/form-data',
            canMerge: false,
          },
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true }),
    });

    const client = createGracefulClient(specMeta, {
      baseURL: 'https://api.example.com',
      fetch: mockFetch,
    });

    await client.pet.uploadFile(123, {
      file: new File(['content'], 'test.txt'),
    });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/pet/123/uploadImage');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('should merge headers correctly', async () => {
    const specMeta: GracefulSpecMeta = {
      name: 'test-api',
      url: [{ url: 'https://api.example.com' }],
      apis: {
        'pet/getPetById': {
          method: 'GET',
          path: '/pet/{petId}',
          pathParams: ['petId'],
          queryParams: null,
          bodyParams: null,
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: 123 }),
    });

    const client = createGracefulClient(specMeta, {
      baseURL: 'https://api.example.com',
      headers: {
        'X-Global-Header': 'global',
      },
      fetch: mockFetch,
    });

    await client.pet.getPetById(123, {
      headers: {
        'X-Request-Header': 'request',
      },
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['X-Global-Header']).toBe('global');
    expect(init.headers['X-Request-Header']).toBe('request');
  });
});
