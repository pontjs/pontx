/**
 * Tests for Plugin apiExecutor lifecycle hook and pure functions
 */

import { describe, it, expect } from 'vitest';
import type { Plugin, ApiExecutorContext } from '../../src/type';
import {
  parseParams,
  normalizeBaseUrl,
  buildUrl,
  buildRequestConfig,
  buildApiRequest,
  handleResponse,
  requestToCurl,
} from '../../src/builtin/apiExecutor';

describe('Plugin apiExecutor lifecycle hook', () => {
  it('should allow plugins with apiExecutor hook', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      apiExecutor: async (context: ApiExecutorContext) => {
        return { success: true };
      },
    };

    expect(plugin.apiExecutor).toBeDefined();
    expect(typeof plugin.apiExecutor).toBe('function');
  });

  it('should allow plugins without apiExecutor hook (backward compatibility)', () => {
    const plugin: Plugin = {
      name: 'legacy-plugin',
      generate: async (spec, options) => {
        return {};
      },
    };

    expect(plugin.apiExecutor).toBeUndefined();
  });

  it('should have correct ApiExecutorContext interface', async () => {
    const context: ApiExecutorContext = {
      apiSelector: {
        specName: 'test-spec',
        tagName: 'pets',
        apiName: 'getPetById',
      },
      apiMeta: {
        path: '/pets/{petId}',
        method: 'GET',
        description: 'Get pet by ID',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      toolParams: {
        petId: '123',
      },
      options: {
        resolvedConfig: {
          rootDir: '/test',
          configDir: '/test',
          configPath: '/test/pontx.config.ts',
          outDir: '/test/api',
          origins: [],
        },
      },
    };

    const plugin: Plugin = {
      name: 'test-plugin',
      apiExecutor: async (ctx) => {
        expect(ctx.apiSelector.specName).toBe('test-spec');
        expect(ctx.apiMeta.path).toBe('/pets/{petId}');
        expect(ctx.toolParams.petId).toBe('123');
        return { data: 'test-response' };
      },
    };

    const result = await plugin.apiExecutor!(context);
    expect(result).toEqual({ data: 'test-response' });
  });

  it('should accept Promise<unknown> return type', async () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      apiExecutor: async () => {
        // Should accept any type: object, array, string, number, etc.
        return { id: 1, name: 'test' };
      },
    };

    const result = await plugin.apiExecutor!({} as ApiExecutorContext);
    expect(result).toHaveProperty('id');
  });

  it('should allow apiExecutor to throw errors', async () => {
    const plugin: Plugin = {
      name: 'error-plugin',
      apiExecutor: async () => {
        throw new Error('API execution failed');
      },
    };

    await expect(plugin.apiExecutor!({} as ApiExecutorContext)).rejects.toThrow(
      'API execution failed'
    );
  });
});

describe('parseParams', () => {
  it('should classify parameters by location', () => {
    const parameters = [
      { name: 'userId', in: 'path' as const, required: true, schema: { type: 'string' } },
      { name: 'page', in: 'query' as const, required: false, schema: { type: 'number' } },
      { name: 'Authorization', in: 'header' as const, required: true, schema: { type: 'string' } },
    ];
    const toolParams = {
      userId: '123',
      page: 1,
      Authorization: 'Bearer token',
    };

    const result = parseParams(parameters, toolParams);

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({ page: 1 });
    expect(result.headerParams).toEqual({ Authorization: 'Bearer token' });
    expect(result.bodyParams).toEqual({});
  });

  it('should put unused params into bodyParams', () => {
    const parameters = [
      { name: 'userId', in: 'path' as const, required: true, schema: { type: 'string' } },
    ];
    const toolParams = {
      userId: '123',
      name: 'John',
      email: 'john@example.com',
    };

    const result = parseParams(parameters, toolParams);

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.bodyParams).toEqual({ name: 'John', email: 'john@example.com' });
  });

  it('should handle body parameter', () => {
    const parameters = [
      { name: 'body', in: 'body' as const, required: true, schema: { type: 'object' } },
    ];
    const toolParams = {
      body: { name: 'John', age: 30 },
    };

    const result = parseParams(parameters, toolParams);

    expect(result.bodyParams).toEqual({ name: 'John', age: 30 });
  });

  it('should skip undefined values', () => {
    const parameters = [
      { name: 'userId', in: 'path' as const, required: true, schema: { type: 'string' } },
      { name: 'page', in: 'query' as const, required: false, schema: { type: 'number' } },
    ];
    const toolParams = {
      userId: '123',
      // page is undefined
    };

    const result = parseParams(parameters, toolParams);

    expect(result.pathParams).toEqual({ userId: '123' });
    expect(result.queryParams).toEqual({});
  });

  it('should handle empty parameters', () => {
    const result = parseParams(undefined, {});

    expect(result).toEqual({
      pathParams: {},
      queryParams: {},
      headerParams: {},
      bodyParams: {},
    });
  });

  it('should handle all params as body when no parameter definitions', () => {
    const toolParams = { name: 'John', age: 30 };

    const result = parseParams(undefined, toolParams);

    expect(result.bodyParams).toEqual({ name: 'John', age: 30 });
  });
});

describe('normalizeBaseUrl', () => {
  it('should add https:// prefix if missing', () => {
    expect(normalizeBaseUrl('api.example.com')).toBe('https://api.example.com');
  });

  it('should keep http:// prefix unchanged', () => {
    expect(normalizeBaseUrl('http://api.example.com')).toBe('http://api.example.com');
  });

  it('should keep https:// prefix unchanged', () => {
    expect(normalizeBaseUrl('https://api.example.com')).toBe('https://api.example.com');
  });

  it('should handle localhost without port', () => {
    expect(normalizeBaseUrl('localhost')).toBe('https://localhost');
  });

  it('should handle localhost with port', () => {
    expect(normalizeBaseUrl('localhost:3000')).toBe('https://localhost:3000');
  });

  it('should preserve existing http:// for localhost', () => {
    expect(normalizeBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });
});

describe('buildUrl', () => {
  it('should replace path parameters', () => {
    const result = buildUrl(
      'https://api.example.com',
      '/users/{userId}',
      { userId: '123' },
      {}
    );

    expect(result).toBe('https://api.example.com/users/123');
  });

  it('should append query parameters', () => {
    const result = buildUrl(
      'https://api.example.com',
      '/users',
      {},
      { page: 1, limit: 10 }
    );

    expect(result).toBe('https://api.example.com/users?page=1&limit=10');
  });

  it('should handle both path and query parameters', () => {
    const result = buildUrl(
      'https://api.example.com',
      '/users/{userId}/posts',
      { userId: '123' },
      { page: 1 }
    );

    expect(result).toBe('https://api.example.com/users/123/posts?page=1');
  });

  it('should remove trailing slash from baseUrl', () => {
    const result = buildUrl(
      'https://api.example.com/',
      '/users',
      {},
      {}
    );

    expect(result).toBe('https://api.example.com/users');
  });

  it('should encode path parameter values', () => {
    const result = buildUrl(
      'https://api.example.com',
      '/users/{name}',
      { name: 'John Doe' },
      {}
    );

    expect(result).toBe('https://api.example.com/users/John%20Doe');
  });

  it('should keep placeholder if path param is undefined', () => {
    const result = buildUrl(
      'https://api.example.com',
      '/users/{userId}',
      {},
      {}
    );

    expect(result).toBe('https://api.example.com/users/{userId}');
  });

  it('should normalize baseUrl without protocol', () => {
    const result = buildUrl(
      'api.example.com',
      '/users',
      {},
      {}
    );

    expect(result).toBe('https://api.example.com/users');
  });

  it('should handle multiple path parameters', () => {
    const result = buildUrl(
      'https://api.example.com',
      '/users/{userId}/posts/{postId}',
      { userId: '123', postId: '456' },
      {}
    );

    expect(result).toBe('https://api.example.com/users/123/posts/456');
  });
});

describe('requestToCurl', () => {
  it('should render URL, headers, and body as curl', async () => {
    const request = await buildApiRequest({
      api: {
        specName: 'test-spec',
        tagName: 'users',
        apiName: 'createUser',
      },
      meta: {
        path: '/users',
        method: 'POST',
        parameters: [
          { name: 'body', in: 'body' as const, required: true, schema: { type: 'object' } },
        ],
        consumes: ['application/json'],
        produces: ['application/json'],
      },
      params: {
        body: { name: 'John' },
      },
      executeApiConfig: {
        baseURL: 'https://api.example.com',
        headers: {
          Authorization: 'Bearer token',
        },
      },
      resolvedConfig: {
        rootDir: '/test',
        configDir: '/test',
        configPath: '/test/pontx.config.ts',
        outDir: '/test/api',
        origins: [],
      },
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      } as any,
    });

    expect(requestToCurl(request)).toBe(
      'curl -X \'POST\' \'https://api.example.com/users\' -H \'Accept: application/json\' -H \'Authorization: <redacted>\' -H \'Content-Type: application/json\' --data-raw \'{"name":"John"}\''
    );
  });

  it('redacts credentials from URL, headers, and JSON bodies in cURL previews', () => {
    expect(requestToCurl({
      url: 'https://api.example.com/users?api_key=secret&visible=yes',
      init: {
        method: 'POST',
        headers: { 'X-Api-Key': 'secret' },
        body: JSON.stringify({ accessToken: 'secret', nested: { password: 'secret' }, name: 'John' }),
      },
      meta: { specName: 'test', tagName: 'users', apiName: 'create', method: 'POST', path: '/users' },
    })).toBe(
      'curl -X \'POST\' \'https://api.example.com/users?api_key=%3Credacted%3E&visible=yes\' -H \'X-Api-Key: <redacted>\' --data-raw \'{"accessToken":"<redacted>","nested":{"password":"<redacted>"},"name":"John"}\''
    );
  });

  it('redacts product-specific fields from cURL previews', () => {
    expect(requestToCurl({
      url: 'https://api.example.com/issues',
      init: {
        method: 'POST',
        body: JSON.stringify({ description: 'private issue text', title: 'visible title' }),
      },
      meta: { specName: 'test', tagName: 'issues', apiName: 'create', method: 'POST', path: '/issues' },
    }, ['description'])).toBe(
      'curl -X \'POST\' \'https://api.example.com/issues\' --data-raw \'{"description":"<redacted>","title":"visible title"}\''
    );
  });
});

describe('buildRequestConfig', () => {
  it('should build GET request without body', () => {
    const result = buildRequestConfig('GET', {}, { ignored: 'value' });

    expect(result.method).toBe('GET');
    expect(result.body).toBeUndefined();
  });

  it('should build HEAD request without body', () => {
    const result = buildRequestConfig('HEAD', {}, { ignored: 'value' });

    expect(result.method).toBe('HEAD');
    expect(result.body).toBeUndefined();
  });

  it('should build POST request with JSON body', () => {
    const result = buildRequestConfig('POST', {}, { name: 'John', age: 30 });

    expect(result.method).toBe('POST');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    expect(result.body).toBe('{"name":"John","age":30}');
  });

  it('should use consumes for Content-Type', () => {
    const result = buildRequestConfig(
      'POST',
      {},
      { name: 'John' },
      ['application/x-www-form-urlencoded']
    );

    expect(result.headers).toHaveProperty('Content-Type', 'application/x-www-form-urlencoded');
    expect(result.body).toBe('name=John');
  });

  it('should add Accept header from produces', () => {
    const result = buildRequestConfig('GET', {}, {}, undefined, ['application/json']);

    expect(result.headers).toHaveProperty('Accept', 'application/json');
  });

  it('should not override custom Accept header', () => {
    const result = buildRequestConfig(
      'GET',
      { Accept: 'text/plain' },
      {},
      undefined,
      ['application/json']
    );

    expect(result.headers).toHaveProperty('Accept', 'text/plain');
  });

  it('should include custom headers', () => {
    const result = buildRequestConfig(
      'GET',
      { Authorization: 'Bearer token', 'X-Custom': 'value' },
      {}
    );

    expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
    expect(result.headers).toHaveProperty('X-Custom', 'value');
  });

  it('should handle form-urlencoded with object values', () => {
    const result = buildRequestConfig(
      'POST',
      {},
      { name: 'John', data: { nested: true } },
      ['application/x-www-form-urlencoded']
    );

    expect(result.body).toContain('name=John');
    expect(result.body).toContain('data=');
  });

  it('should uppercase method', () => {
    const result = buildRequestConfig('post', {}, { name: 'John' });

    expect(result.method).toBe('POST');
  });

  it('should handle text/plain content type', () => {
    const result = buildRequestConfig(
      'POST',
      { 'Content-Type': 'text/plain' },
      { message: 'Hello' }
    );

    expect(result.headers).toHaveProperty('Content-Type', 'text/plain');
    expect(result.body).toBe('Hello');
  });

  it('should return no body for POST with empty bodyParams', () => {
    const result = buildRequestConfig('POST', {}, {});

    expect(result.method).toBe('POST');
    expect(result.body).toBeUndefined();
  });
});

describe('handleResponse', () => {
  it('should preserve PDF responses as binary data', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const response = new Response(bytes, {
      headers: { 'Content-Type': 'application/pdf' },
    });

    const result = await handleResponse(response);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(result as ArrayBuffer))).toEqual(Array.from(bytes));
  });

  it('should keep NDJSON responses as text', async () => {
    const response = new Response('{"id":1}\n{"id":2}\n', {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

    await expect(handleResponse(response)).resolves.toBe('{"id":1}\n{"id":2}\n');
  });

  it('should parse structured JSON media types', async () => {
    const response = new Response('{"title":"invalid request"}', {
      headers: { 'Content-Type': 'application/problem+json' },
    });

    await expect(handleResponse(response)).resolves.toEqual({ title: 'invalid request' });
  });
});
