import { describe, it, expect } from 'vitest';
import { classifyParameters } from '../../../src/graceful/parameter-classifier';

/**
 * Unit tests for parameter classifier
 *
 * Requirements:
 * - 3.1: Extract path parameters based on pathParams array
 * - 3.2: Extract query parameters based on queryParams array
 * - 3.3: Extract body parameters (remaining params in two-param mode)
 * - 3.4: Ignore extra parameters in three-param mode
 * - 3.8: Handle parameter conflicts with priority path > query > body
 */

describe('ParameterClassifier', () => {
  describe('classifyParameters', () => {
    // Requirement 3.1: Extract path parameters
    it('should extract path parameters based on pathParams array', () => {
      const params = {
        userId: '123',
        postId: '456',
        page: 1
      };

      const apiMeta = {
        path: '/users/{userId}/posts/{postId}',
        method: 'GET',
        pathParams: ['userId', 'postId'],
        queryParams: ['page']
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({
        userId: '123',
        postId: '456'
      });
    });

    // Requirement 3.2: Extract query parameters
    it('should extract query parameters based on queryParams array', () => {
      const params = {
        userId: '123',
        page: 1,
        limit: 10,
        sort: 'desc'
      };

      const apiMeta = {
        path: '/users/{userId}/posts',
        method: 'GET',
        pathParams: ['userId'],
        queryParams: ['page', 'limit', 'sort']
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.queryParams).toEqual({
        page: 1,
        limit: 10,
        sort: 'desc'
      });
    });

    // Requirement 3.3: Extract body parameters (two-param mode)
    it('should extract remaining parameters as body in two-param mode', () => {
      const params = {
        userId: '123',
        name: 'John',
        email: 'john@example.com',
        age: 30
      };

      const apiMeta = {
        path: '/users/{userId}',
        method: 'PUT',
        pathParams: ['userId'],
        queryParams: [],
        consumes: ['application/json']
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.bodyParams).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: 30
      });
    });

    // Requirement 3.4: Ignore extra parameters in three-param mode
    it('should ignore extra parameters in three-param mode', () => {
      const params = {
        userId: '123',
        category: 'docs',
        extraParam: 'ignored'
      };

      const apiMeta = {
        path: '/users/{userId}/upload',
        method: 'POST',
        pathParams: ['userId'],
        queryParams: ['category'],
        consumes: ['multipart/form-data']
      };

      const result = classifyParameters(params, apiMeta, 'three-param');

      expect(result.pathParams).toEqual({ userId: '123' });
      expect(result.queryParams).toEqual({ category: 'docs' });
      expect(result.bodyParams).toEqual({});
    });

    // Requirement 3.8: Parameter conflict priority (path > query > body)
    it('should handle parameter conflicts with path > query > body priority', () => {
      const params = {
        id: '123',
        name: 'John'
      };

      // Conflict: 'id' is in both pathParams and queryParams
      const apiMeta = {
        path: '/users/{id}',
        method: 'PUT',
        pathParams: ['id'],
        queryParams: ['id'], // Same param in query (conflict)
        consumes: ['application/json']
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      // 'id' should only appear in pathParams (highest priority)
      expect(result.pathParams).toEqual({ id: '123' });
      expect(result.queryParams).toEqual({});
      expect(result.bodyParams).toEqual({ name: 'John' });
    });

    // Edge case: Empty params
    it('should handle empty params object', () => {
      const params = {};

      const apiMeta = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: []
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({});
      expect(result.queryParams).toEqual({});
      expect(result.bodyParams).toEqual({});
    });

    // Edge case: Missing metadata arrays
    it('should use empty arrays when pathParams/queryParams are undefined', () => {
      const params = {
        name: 'John',
        email: 'john@example.com'
      };

      const apiMeta = {
        path: '/users',
        method: 'POST',
        // pathParams and queryParams are undefined
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({});
      expect(result.queryParams).toEqual({});
      expect(result.bodyParams).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
    });

    // Edge case: Complex types in params
    it('should handle complex types (arrays, objects) in params', () => {
      const params = {
        userId: '123',
        tags: ['frontend', 'backend'],
        metadata: { version: '1.0' },
        name: 'John'
      };

      const apiMeta = {
        path: '/users/{userId}',
        method: 'PUT',
        pathParams: ['userId'],
        queryParams: ['tags'],
        consumes: ['application/json']
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({ userId: '123' });
      expect(result.queryParams).toEqual({ tags: ['frontend', 'backend'] });
      expect(result.bodyParams).toEqual({
        metadata: { version: '1.0' },
        name: 'John'
      });
    });

    // Performance: Using Set for lookups
    it('should efficiently classify large parameter sets', () => {
      const params: Record<string, unknown> = {};
      for (let i = 0; i < 100; i++) {
        params[`param${i}`] = i;
      }

      const apiMeta = {
        path: '/api',
        method: 'POST',
        pathParams: ['param0'],
        queryParams: ['param1', 'param2'],
        consumes: ['application/json']
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({ param0: 0 });
      expect(result.queryParams).toEqual({ param1: 1, param2: 2 });
      expect(Object.keys(result.bodyParams).length).toBe(97);
    });

    // GET request special handling
    it('should treat all non-path params as query params for GET requests with empty queryParams', () => {
      const params = {
        page: 1,
        limit: 10,
        sort: 'desc'
      };

      const apiMeta = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: [] // Empty - should auto-treat as query
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({});
      expect(result.queryParams).toEqual({
        page: 1,
        limit: 10,
        sort: 'desc'
      });
      expect(result.bodyParams).toEqual({});
    });

    // GET request with explicit queryParams
    it('should respect explicit queryParams for GET requests', () => {
      const params = {
        page: 1,
        limit: 10,
        extra: 'should-go-to-body'
      };

      const apiMeta = {
        path: '/users',
        method: 'GET',
        pathParams: [],
        queryParams: ['page', 'limit'] // Explicit query params
      };

      const result = classifyParameters(params, apiMeta, 'two-param');

      expect(result.pathParams).toEqual({});
      expect(result.queryParams).toEqual({
        page: 1,
        limit: 10
      });
      // Extra param goes to body when queryParams is explicitly defined
      expect(result.bodyParams).toEqual({
        extra: 'should-go-to-body'
      });
    });
  });
});
