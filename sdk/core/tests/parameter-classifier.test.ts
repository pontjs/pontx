/**
 * Tests for parameter classification module
 *
 * Requirements covered:
 * - 8.6: classifyParameters() SHALL区分路径参数、查询参数和请求体参数
 */

import { describe, it, expect } from 'vitest';
import { classifyParameters } from './parameter-classifier';
import type { PontxAPI } from '@pontx/spec';

describe('classifyParameters', () => {
  it('should classify path parameters in two-param mode', () => {
    const apiMeta: Partial<PontxAPI> = {
      pathParams: ['userId'],
      queryParams: [],
    };

    const result = classifyParameters(
      { userId: '123', name: 'John' },
      apiMeta,
      'two-param'
    );

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({});
    expect(result.bodyParams).toEqual({ name: 'John' });
  });

  it('should classify query parameters in two-param mode', () => {
    const apiMeta: Partial<PontxAPI> = {
      pathParams: [],
      queryParams: ['page', 'limit'],
    };

    const result = classifyParameters(
      { page: 1, limit: 10, name: 'test' },
      apiMeta,
      'two-param'
    );

    expect(result.pathParams).toEqual({});
    expect(result.queryParams).toEqual({ page: 1, limit: 10 });
    expect(result.bodyParams).toEqual({ name: 'test' });
  });

  it('should classify both path and query parameters', () => {
    const apiMeta: Partial<PontxAPI> = {
      pathParams: ['userId'],
      queryParams: ['page'],
    };

    const result = classifyParameters(
      { userId: '123', page: 1, name: 'John' },
      apiMeta,
      'two-param'
    );

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({ page: 1 });
    expect(result.bodyParams).toEqual({ name: 'John' });
  });

  it('should ignore body params in three-param mode', () => {
    const apiMeta: Partial<PontxAPI> = {
      pathParams: ['userId'],
      queryParams: ['page'],
    };

    const result = classifyParameters(
      { userId: '123', page: 1, name: 'John' },
      apiMeta,
      'three-param'
    );

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({ page: 1 });
    expect(result.bodyParams).toEqual({});
  });

  it('should handle parameter priority: path > query > body', () => {
    const apiMeta: Partial<PontxAPI> = {
      pathParams: ['id'],
      queryParams: ['id'], // Same name as path param
    };

    const result = classifyParameters(
      { id: '123' },
      apiMeta,
      'two-param'
    );

    // Should only appear in pathParams (higher priority)
    expect(result.pathParams).toEqual({ id: '123' });
    expect(result.queryParams).toEqual({});
    expect(result.bodyParams).toEqual({});
  });

  it('should handle GET requests with no explicit query params', () => {
    const apiMeta: Partial<PontxAPI> = {
      method: 'GET',
      pathParams: ['userId'],
      queryParams: [],
    };

    const result = classifyParameters(
      { userId: '123', page: 1, limit: 10 },
      apiMeta,
      'two-param'
    );

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({ page: 1, limit: 10 });
    expect(result.bodyParams).toEqual({});
  });

  it('should fallback to parameters array if pathParams/queryParams not provided', () => {
    const apiMeta: Partial<PontxAPI> = {
      parameters: [
        { name: 'userId', in: 'path', required: true },
        { name: 'page', in: 'query', required: false },
      ],
    };

    const result = classifyParameters(
      { userId: '123', page: 1, name: 'John' },
      apiMeta,
      'two-param'
    );

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({ page: 1 });
    expect(result.bodyParams).toEqual({ name: 'John' });
  });

  it('should handle empty parameters', () => {
    const apiMeta: Partial<PontxAPI> = {
      pathParams: [],
      queryParams: [],
    };

    const result = classifyParameters({}, apiMeta, 'two-param');

    expect(result.pathParams).toEqual({});
    expect(result.queryParams).toEqual({});
    expect(result.bodyParams).toEqual({});
  });
});
