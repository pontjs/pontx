/**
 * Type tests for basic TypeScript types
 *
 * This file tests the core type definitions of the SDK:
 * - PontxSpecMeta and PontxAPI imports from @pontx/spec
 * - APIMethod generic interface
 * - Controller type mapping
 * - Client type mapping
 * - RequestHeaders and ContentType types
 */

import { describe, it, expectTypeOf } from 'vitest';
import type {
  PontxSpecMeta,
  PontxAPI,
  APIMethod,
  Controller,
  Client,
  RequestHeaders,
  ContentType,
  SdkUsage,
} from '../../src/types';

describe('Type Tests: Basic Types', () => {
  describe('Imported Types from @pontx/spec', () => {
    it('should import PontxSpecMeta type', () => {
      type TestMeta = PontxSpecMeta;
      expectTypeOf<TestMeta>().toMatchTypeOf<{
        name: string;
        apis: Record<string, PontxAPI>;
      }>();
    });

    it('should import PontxAPI type', () => {
      type TestAPI = PontxAPI;
      expectTypeOf<TestAPI>().toMatchTypeOf<{
        path: string;
        method: string;
      }>();
    });
  });

  describe('RequestHeaders Type', () => {
    it('should be Record<string, string>', () => {
      const headers: RequestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      };

      expectTypeOf(headers).toEqualTypeOf<Record<string, string>>();
    });

    it('should allow any string key-value pairs', () => {
      const headers: RequestHeaders = {
        'X-Custom-Header': 'custom-value',
        'Another-Header': 'another-value',
      };

      expectTypeOf(headers).toMatchTypeOf<Record<string, string>>();
    });
  });

  describe('ContentType Type', () => {
    it('should accept standard content types', () => {
      const json: ContentType = 'application/json';
      const form: ContentType = 'application/x-www-form-urlencoded';
      const multipart: ContentType = 'multipart/form-data';
      const text: ContentType = 'text/plain';

      expectTypeOf(json).toEqualTypeOf<ContentType>();
      expectTypeOf(form).toEqualTypeOf<ContentType>();
      expectTypeOf(multipart).toEqualTypeOf<ContentType>();
      expectTypeOf(text).toEqualTypeOf<ContentType>();
    });

    it('should accept any string (custom content types)', () => {
      const custom: ContentType = 'application/vnd.api+json';
      expectTypeOf(custom).toEqualTypeOf<ContentType>();
    });
  });

  describe('APIMethod Type', () => {
    it('should have correct structure with all generic parameters', () => {
      type UserAPI = APIMethod<
        { id: number },           // Params
        { name: string },         // BodyParams
        { id: number; name: string }  // Response
      >;

      expectTypeOf<UserAPI>().toMatchTypeOf<{
        request: (
          params: { id: number },
          options?: {
            body?: { name: string };
            headers?: RequestHeaders;
          }
        ) => Promise<{ id: number; name: string }>;
        getFetchKey: (params: { id: number }) => string;
        queryOptions: (
          params: { id: number },
          options?: any
        ) => any;
      }>();
    });

    it('should handle void parameters correctly', () => {
      type NoParamsAPI = APIMethod<void, void, { success: boolean }>;

      expectTypeOf<NoParamsAPI>().toMatchTypeOf<{
        request: (
          params?: void,
          options?: {
            body?: void;
            headers?: RequestHeaders;
          }
        ) => Promise<{ success: boolean }>;
      }>();
    });

    it('should handle optional body parameter', () => {
      type GetAPI = APIMethod<{ id: number }, void, { data: string }>;

      expectTypeOf<GetAPI>().toMatchTypeOf<{
        request: (
          params: { id: number },
          options?: {
            headers?: RequestHeaders;
          }
        ) => Promise<{ data: string }>;
      }>();
    });

    it('should allow complex nested types', () => {
      type ComplexAPI = APIMethod<
        { id: number; filter?: { status: string[] } },
        { user: { name: string; email: string } },
        { success: boolean; data: any[] }
      >;

      expectTypeOf<ComplexAPI>().toMatchTypeOf<{
        request: (
          params: { id: number; filter?: { status: string[] } },
          options?: {
            body?: { user: { name: string; email: string } };
            headers?: RequestHeaders;
          }
        ) => Promise<{ success: boolean; data: any[] }>;
      }>();
    });
  });

  describe('SdkUsage Type', () => {
    it('should contain required methods for an API', () => {
      type Usage = SdkUsage<
        APIMethod<{ id: number }, void, { data: string }>
      >;

      expectTypeOf<Usage>().toMatchTypeOf<{
        request: (params: { id: number }, options?: any) => Promise<{ data: string }>;
        getFetchKey: (params: { id: number }) => string;
        queryOptions: (params: { id: number }, options?: any) => any;
      }>();
    });
  });

  describe('Controller Type', () => {
    it('should map API methods to their names', () => {
      type UserController = Controller<{
        getUser: APIMethod<{ id: number }, void, { id: number; name: string }>;
        updateUser: APIMethod<{ id: number }, { name: string }, { success: boolean }>;
      }>;

      expectTypeOf<UserController>().toMatchTypeOf<{
        getUser: SdkUsage<APIMethod<{ id: number }, void, { id: number; name: string }>>;
        updateUser: SdkUsage<APIMethod<{ id: number }, { name: string }, { success: boolean }>>;
      }>();
    });

    it('should handle empty controller', () => {
      type EmptyController = Controller<{}>;
      expectTypeOf<EmptyController>().toEqualTypeOf<{}>();
    });

    it('should preserve method names as keys', () => {
      type TestController = Controller<{
        listUsers: APIMethod<void, void, { users: any[] }>;
        createUser: APIMethod<void, { name: string }, { id: number }>;
      }>;

      // Should have exactly these keys
      type ControllerKeys = keyof TestController;
      expectTypeOf<ControllerKeys>().toEqualTypeOf<'listUsers' | 'createUser'>();
    });
  });

  describe('Client Type', () => {
    it('should map controllers to their names', () => {
      type TestClient = Client<{
        users: {
          getUser: APIMethod<{ id: number }, void, { id: number; name: string }>;
          listUsers: APIMethod<void, void, { users: any[] }>;
        };
        posts: {
          getPost: APIMethod<{ id: number }, void, { title: string }>;
        };
      }>;

      expectTypeOf<TestClient>().toMatchTypeOf<{
        users: Controller<{
          getUser: APIMethod<{ id: number }, void, { id: number; name: string }>;
          listUsers: APIMethod<void, void, { users: any[] }>;
        }>;
        posts: Controller<{
          getPost: APIMethod<{ id: number }, void, { title: string }>;
        }>;
      }>();
    });

    it('should allow accessing nested API methods', () => {
      type TestClient = Client<{
        users: {
          getUser: APIMethod<{ id: number }, void, { name: string }>;
        };
      }>;

      type GetUserMethod = TestClient['users']['getUser'];
      expectTypeOf<GetUserMethod>().toMatchTypeOf<
        SdkUsage<APIMethod<{ id: number }, void, { name: string }>>
      >();
    });

    it('should handle multiple namespaces', () => {
      type MultiClient = Client<{
        users: { getUser: APIMethod<{ id: number }, void, { name: string }> };
        posts: { getPost: APIMethod<{ id: number }, void, { title: string }> };
        comments: { getComment: APIMethod<{ id: number }, void, { text: string }> };
      }>;

      type ClientKeys = keyof MultiClient;
      expectTypeOf<ClientKeys>().toEqualTypeOf<'users' | 'posts' | 'comments'>();
    });
  });

  describe('Type Inference', () => {
    it('should correctly infer response type from APIMethod', () => {
      type TestAPI = APIMethod<{ id: number }, void, { data: { user: string } }>;
      type Response = Awaited<ReturnType<TestAPI['request']>>;

      expectTypeOf<Response>().toEqualTypeOf<{ data: { user: string } }>();
    });

    it('should correctly infer params type from APIMethod', () => {
      type TestAPI = APIMethod<{ id: number; name: string }, void, any>;
      type Params = Parameters<TestAPI['request']>[0];

      expectTypeOf<Params>().toEqualTypeOf<{ id: number; name: string }>();
    });

    it('should correctly infer body type from APIMethod', () => {
      type TestAPI = APIMethod<any, { email: string; password: string }, any>;
      type Options = Parameters<TestAPI['request']>[1];

      expectTypeOf<Options>().toMatchTypeOf<{
        body?: { email: string; password: string };
      } | undefined>();
    });
  });
});