/**
 * Performance Benchmark: Flat Client vs Graceful Client
 *
 * This benchmark compares the performance of createFlatClient and createGracefulClient
 * to ensure the flat client meets performance requirements:
 * - Client creation: <10% difference
 * - API call execution: <5% difference
 *
 * Requirements: Task 8.2 - Performance benchmarks
 */

import { bench, describe } from 'vitest';
import { createFlatClient } from '../../src/flat/create-flat-client';
import { createGracefulClient } from '../../src/graceful/create-graceful-client';
import type { PontxSpecMeta } from '../../src/types';

// Shared test metadata for fair comparison
const testApiMeta: PontxSpecMeta = {
  name: 'Benchmark API',
  version: '1.0.0',
  apis: {
    getUser: {
      name: 'Get User',
      path: '/users/{userId}',
      method: 'GET',
      pathParams: ['userId'],
      queryParams: [],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
    },
    listUsers: {
      name: 'List Users',
      path: '/users',
      method: 'GET',
      queryParams: ['page', 'limit'],
      parameters: [
        { name: 'page', in: 'query', required: false, schema: { type: 'number' } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'number' } },
      ],
    },
    createUser: {
      name: 'Create User',
      path: '/users',
      method: 'POST',
      queryParams: [],
      consumes: ['application/json'],
      bodyType: 'object',
      parameters: [
        { name: 'name', in: 'body', required: true, schema: { type: 'string' } },
        { name: 'email', in: 'body', required: true, schema: { type: 'string' } },
      ],
    },
  },
};

// Mock fetch function for testing
const mockFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

describe('Performance: Flat Client vs Graceful Client', () => {
  describe('Client Creation', () => {
    bench('createFlatClient', () => {
      createFlatClient({
        pontxSpecMeta: testApiMeta,
        fetchFn: mockFetch,
      });
    });

    bench('createGracefulClient', () => {
      createGracefulClient({
        pontxSpecMeta: testApiMeta,
        fetchFn: mockFetch,
      });
    });
  });

  describe('Client Creation with Features', () => {
    bench('createFlatClient with validation + retry + logger', () => {
      createFlatClient({
        pontxSpecMeta: testApiMeta,
        fetchFn: mockFetch,
        validation: { enabled: true },
        retry: { maxAttempts: 3 },
        logger: { enabled: true },
      });
    });

    bench('createGracefulClient with validation + retry + logger', () => {
      createGracefulClient({
        pontxSpecMeta: testApiMeta,
        fetchFn: mockFetch,
        validation: { enabled: true },
        retry: { maxAttempts: 3 },
        logger: { enabled: true },
      });
    });
  });

  describe('API Call Execution', () => {
    const flatClient = createFlatClient({
      pontxSpecMeta: testApiMeta,
      fetchFn: mockFetch,
    });

    const gracefulClient = createGracefulClient({
      pontxSpecMeta: testApiMeta,
      fetchFn: mockFetch,
    });

    bench('flatClient.getUser - path params', async () => {
      await flatClient.getUser({ userId: '123' });
    });

    bench('gracefulClient.getUser - path params', async () => {
      await gracefulClient.getUser({ userId: '123' });
    });

    bench('flatClient.listUsers - query params', async () => {
      await flatClient.listUsers({ page: 1, limit: 10 });
    });

    bench('gracefulClient.listUsers - query params', async () => {
      await gracefulClient.listUsers({ page: 1, limit: 10 });
    });

    bench('flatClient.createUser - POST with body', async () => {
      await flatClient.createUser({ name: 'John', email: 'john@example.com' });
    });

    bench('gracefulClient.createUser - POST with body', async () => {
      await gracefulClient.createUser({ name: 'John', email: 'john@example.com' });
    });
  });

  describe('Utility Methods', () => {
    const flatClient = createFlatClient({
      pontxSpecMeta: testApiMeta,
      fetchFn: mockFetch,
    });

    const gracefulClient = createGracefulClient({
      pontxSpecMeta: testApiMeta,
      fetchFn: mockFetch,
    });

    bench('flatClient.getUser.getFetchKey', () => {
      flatClient.getUser.getFetchKey({ userId: '123' });
    });

    bench('gracefulClient.getUser.getFetchKey', () => {
      gracefulClient.getUser.getFetchKey({ userId: '123' });
    });

    bench('flatClient.getUser.queryOptions', () => {
      flatClient.getUser.queryOptions({ userId: '123' });
    });

    bench('gracefulClient.getUser.queryOptions', () => {
      gracefulClient.getUser.queryOptions({ userId: '123' });
    });
  });
});
