/**
 * @author jasonHzq
 * @description Test buildBaseProxyClient - verify dual access pattern support
 */

import { describe, it, expect, vi } from 'vitest';
import { buildBaseProxyClient } from '../src/core/create-client';
import { PontxSpecMeta, PontxAPIMeta } from '../src/types/base';

describe('buildBaseProxyClient', () => {
  describe('with tags (hasTags: true)', () => {
    const mockSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      hasTags: true,
      apis: {
        'user/getUser': {
          path: '/api/user/{id}',
          method: 'GET',
          hasBody: false,
          hasParams: true,
        },
        'user/createUser': {
          path: '/api/user',
          method: 'POST',
          hasBody: true,
          hasParams: false,
        },
        'product/getProduct': {
          path: '/api/product/{id}',
          method: 'GET',
          hasBody: false,
          hasParams: true,
        },
      },
    };

    const mockCreateRequester = vi.fn((apiKey: string, apiMeta: PontxAPIMeta) => {
      return {
        request: vi.fn(),
        apiKey,
        apiMeta,
      };
    });

    it('should support client.tagName.apiName access pattern', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      // Access via tag
      const userClient = client.user;
      expect(userClient).toBeDefined();

      const getUserApi = userClient.getUser;
      expect(getUserApi).toBeDefined();
      expect(getUserApi.apiKey).toBe('user/getUser');
      expect(getUserApi.apiMeta.path).toBe('/api/user/{id}');
    });

    it('should support client.apiName direct access pattern', () => {
      mockCreateRequester.mockClear();
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      // Direct access by API name (without tag)
      const getUserApi = client.getUser;
      expect(getUserApi).toBeDefined();
      expect(getUserApi.apiKey).toBe('user/getUser');
      expect(getUserApi.apiMeta.path).toBe('/api/user/{id}');
    });

    it('should cache API requesters', () => {
      mockCreateRequester.mockClear();
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      // Access same API multiple times
      const api1 = client.user.getUser;
      const api2 = client.user.getUser;

      // Should be the same instance (cached)
      expect(api1).toBe(api2);

      // createRequester should only be called once
      expect(mockCreateRequester).toHaveBeenCalledTimes(1);
    });

    it('should cache tag proxies', () => {
      mockCreateRequester.mockClear();
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      // Access same tag multiple times
      const user1 = client.user;
      const user2 = client.user;

      // Should be the same instance (cached)
      expect(user1).toBe(user2);
    });

    it('should throw error for non-existent API', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      expect(() => {
        // @ts-expect-error - testing runtime error
        client.nonExistent;
      }).toThrow('API "nonExistent" not found in client');
    });

    it('should throw error for non-existent API in tag', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      expect(() => {
        // @ts-expect-error - testing runtime error
        client.user.nonExistent;
      }).toThrow('API "user/nonExistent" not found in client');
    });

    it('should support multiple tags', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      const userClient = client.user;
      const productClient = client.product;

      expect(userClient).toBeDefined();
      expect(productClient).toBeDefined();

      expect(userClient.getUser.apiKey).toBe('user/getUser');
      expect(productClient.getProduct.apiKey).toBe('product/getProduct');
    });
  });

  describe('without tags (hasTags: false)', () => {
    const mockSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      hasTags: false,
      apis: {
        getUser: {
          path: '/api/user/{id}',
          method: 'GET',
          hasBody: false,
          hasParams: true,
        },
        createUser: {
          path: '/api/user',
          method: 'POST',
          hasBody: true,
          hasParams: false,
        },
      },
    };

    const mockCreateRequester = vi.fn((apiKey: string, apiMeta: PontxAPIMeta) => {
      return {
        request: vi.fn(),
        apiKey,
        apiMeta,
      };
    });

    it('should support direct API access only', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      const getUserApi = client.getUser;
      expect(getUserApi).toBeDefined();
      expect(getUserApi.apiKey).toBe('getUser');
      expect(getUserApi.apiMeta.path).toBe('/api/user/{id}');
    });

    it('should cache API requesters', () => {
      mockCreateRequester.mockClear();
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      const api1 = client.getUser;
      const api2 = client.getUser;

      expect(api1).toBe(api2);
      expect(mockCreateRequester).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent API', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      expect(() => {
        // @ts-expect-error - testing runtime error
        client.nonExistent;
      }).toThrow('API "nonExistent" not found in client');
    });
  });

  describe('Proxy behavior', () => {
    const mockSpecMeta: PontxSpecMeta = {
      name: 'test-api',
      hasTags: true,
      apis: {
        'user/getUser': {
          path: '/api/user/{id}',
          method: 'GET',
          hasBody: false,
          hasParams: true,
        },
      },
    };

    const mockCreateRequester = vi.fn((apiKey: string) => ({
      apiKey,
    }));

    it('should support "in" operator for tags', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      expect('user' in client).toBe(true);
      expect('nonExistent' in client).toBe(false);
    });

    it('should support "in" operator for APIs', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      // Tags are enumerable
      expect('user' in client).toBe(true);

      // Direct API access should also work
      expect('getUser' in client).toBe(true);
    });

    it('should support Object.keys for enumeration', () => {
      const client = buildBaseProxyClient(mockSpecMeta, mockCreateRequester);

      const keys = Object.keys(client);

      // Should include both tags and API keys
      expect(keys).toContain('user');
      expect(keys).toContain('user/getUser');
    });
  });
});
