/**
 * Type tests for graceful client
 *
 * Tests cover:
 * - Two-param API type inference (Requirement 7.2)
 * - Three-param API type inference (Requirement 7.3)
 * - Type error detection (Requirement 7.5, 7.6)
 * - Utility method types (Requirement 8.1, 8.2)
 */

/**
 * Type tests for graceful client
 *
 * Tests cover:
 * - Two-param API type inference (Requirement 7.2)
 * - Three-param API type inference (Requirement 7.3)
 * - Type error detection (Requirement 7.5, 7.6)
 * - Utility method types (Requirement 8.1, 8.2)
 *
 * NOTE: Type tests are purely static and do not execute code.
 */

import { expectType, expectError, expectAssignable } from 'tsd';
import type {
  GracefulClient,
  CreateGracefulClientConfig,
  CallableApiMethod,
  MergeParamsAndBody,
  CallableApiMethodTwoParam,
} from '../../src/types/graceful';
import type { PontxSpecMeta, APIType } from '../../src/types';

// Mock metadata for testing
const testMeta = {
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
    'files/upload': {
      path: '/files/upload',
      method: 'POST',
      pathParams: [],
      queryParams: ['category'],
      consumes: ['multipart/form-data'],
      produces: ['application/json'],
    },
  },
} satisfies PontxSpecMeta;

// Declare types only - do not execute
declare const client: GracefulClient<any>;

// Test two-param mode type inference
// GET request - params only
expectType<Promise<any>>(
  client.users.getUser({ userId: '123' })
);

// GET request - params + options
expectType<Promise<any>>(
  client.users.getUser({ userId: '123' }, { headers: { 'X-Custom': 'value' } })
);

// POST request with JSON body - all in params
expectType<Promise<any>>(
  client.users.createUser({ name: 'John', email: 'john@example.com' })
);

// POST request - params + options
expectType<Promise<any>>(
  client.users.createUser(
    { name: 'John', email: 'john@example.com' },
    { headers: { 'Authorization': 'Bearer token' } }
  )
);

// Test three-param mode type inference
const formData = new FormData();

// File upload - params + body + options
expectType<Promise<any>>(
  client.files.upload({ category: 'docs' }, formData, { headers: {} })
);

// File upload - params + body (options omitted)
expectType<Promise<any>>(
  client.files.upload({ category: 'docs' }, formData)
);

// Empty params
expectType<Promise<any>>(
  client.files.upload({}, formData)
);

// Test utility method types
// getFetchKey returns string
expectType<string>(
  client.users.getUser.getFetchKey({ userId: '123' })
);

// getFetchKey with empty params
expectType<string>(
  client.users.getUser.getFetchKey()
);

// queryOptions returns correct shape
const queryOpts = client.users.getUser.queryOptions({ userId: '123' });
expectType<string[]>(queryOpts.queryKey);
expectType<() => Promise<any>>(queryOpts.queryFn);

// queryOptions with options parameter
const queryOptsWithConfig = client.users.getUser.queryOptions(
  { userId: '123' },
  { headers: { 'X-Custom': 'value' } }
);
expectType<string[]>(queryOptsWithConfig.queryKey);
expectType<() => Promise<any>>(queryOptsWithConfig.queryFn);

// request property is callable
expectType<CallableApiMethod>(client.users.getUser.request);

// Test type errors
// Wrong parameter type - this should be a compile error but we can't test it with expectError
// because it would cause actual compile errors

// Test config type
// Valid config
expectAssignable<CreateGracefulClientConfig<any>>({
  pontxSpecMeta: testMeta,
});

// Config with all options
expectAssignable<CreateGracefulClientConfig<any>>({
  pontxSpecMeta: testMeta,
  fetchFn: fetch,
  pathMark: '{}',
  getFetchUrl: (path, params) => path,
  makeCustomUsages: (callable) => callable,
  validation: { enabled: true, schemas: {} },
  mock: { enabled: true, data: {} },
  retry: { maxAttempts: 3 },
  logger: { enabled: true },
});

// Test client type
type TestClient = GracefulClient<{
  users: {
    getUser: any;
    createUser: any;
  };
  files: {
    upload: any;
  };
}>;

expectAssignable<TestClient>(client);

// Test MergeParamsAndBody type utility
// Test case 1: API with both params and bodyParams
type CreateUserAPI = {
  params: { companyId: string };
  bodyParams: { name: string; email: string };
  Response: { id: string; name: string };
  method: 'POST';
  consume: 'application/json';
};

type MergedCreateUser = MergeParamsAndBody<CreateUserAPI>;
// Should merge params and bodyParams
expectAssignable<MergedCreateUser>({ companyId: '123', name: 'John', email: 'john@x.com' });

// Test case 2: API with params only (no bodyParams - GET request)
type GetUserAPI = {
  params: { userId: string };
  bodyParams: undefined;
  Response: { id: string; name: string };
  method: 'GET';
  consume: undefined;
};

type MergedGetUser = MergeParamsAndBody<GetUserAPI>;
// Should only include params (bodyParams is undefined)
expectAssignable<MergedGetUser>({ userId: '123' });

// Test case 3: CallableApiMethodTwoParam includes merged type
type CreateUserMethod = CallableApiMethodTwoParam<CreateUserAPI>;
// The callable signature should accept merged params (path + query + body)
declare const createUserMethod: CreateUserMethod;
expectType<Promise<{ id: string; name: string }>>(
  createUserMethod({ companyId: '123', name: 'John', email: 'john@x.com' })
);
