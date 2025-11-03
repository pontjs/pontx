/**
 * Conditional Type Tests for @pontx/nodejs-sdk
 *
 * Tests conditional type inference for body and params based on API metadata.
 * These tests verify that:
 * - body is required when BodyParams is provided, optional when BodyParams is void
 * - params types are correctly inferred
 * - Response type is correctly inferred from APIMethod
 */

import type { APIMethod, SdkUsage, RequestOptions } from '../../src/types';

// ============================================================================
// Test Case 1: API with body (BodyParams provided)
// body parameter should be available in options
// ============================================================================

type CreateUserAPI = APIMethod<
  { organizationId: string },
  { name: string; email: string },
  { id: number; name: string; email: string; createdAt: string }
>;

// Test: body should be available in RequestOptions
const createUserWithBody: SdkUsage<CreateUserAPI>['request'] = async (params, options?) => {
  // params should be inferred correctly
  const orgId: string = params.organizationId;

  // options.body should be available and typed
  if (options?.body) {
    const name: string = options.body.name;
    const email: string = options.body.email;
  }

  return {
    id: 1,
    name: 'John',
    email: 'john@example.com',
    createdAt: '2024-01-01',
  };
};

// Test: Response type is correctly inferred
type CreateUserResponse = Awaited<ReturnType<SdkUsage<CreateUserAPI>['request']>>;
const testResponse1: CreateUserResponse = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  createdAt: '2024-01-01',
};

// ============================================================================
// Test Case 2: API without body (BodyParams is void)
// body parameter should not be in options
// ============================================================================

type ListUsersAPI = APIMethod<
  { page: number; limit: number },
  void,
  Array<{ id: number; name: string }>
>;

// Test: body should NOT be available in RequestOptions when BodyParams is void
const listUsersNoBody: SdkUsage<ListUsersAPI>['request'] = async (params, options?) => {
  // params should be inferred correctly
  const page: number = params.page;
  const limit: number = params.limit;

  // options.body should NOT exist (TypeScript will error if we try to access it)
  if (options) {
    // We can only access headers, not body
    const headers: Record<string, string> | undefined = options.headers;

    // This should cause a type error if uncommented:
    // const body = options.body; // Error: Property 'body' does not exist
  }

  return [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ];
};

// Test: Response type is correctly inferred
type ListUsersResponse = Awaited<ReturnType<SdkUsage<ListUsersAPI>['request']>>;
const testResponse2: ListUsersResponse = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
];

// ============================================================================
// Test Case 3: Complex API with optional body params
// ============================================================================

type UpdateUserAPI = APIMethod<
  { id: number },
  { name?: string; email?: string },
  { id: number; name: string; email: string; updatedAt: string }
>;

// Test: optional body properties
const updateUser: SdkUsage<UpdateUserAPI>['request'] = async (params, options?) => {
  const id: number = params.id;

  if (options?.body) {
    // These are optional properties
    const name: string | undefined = options.body.name;
    const email: string | undefined = options.body.email;
  }

  return {
    id: 1,
    name: 'John',
    email: 'john@example.com',
    updatedAt: '2024-01-01',
  };
};

// ============================================================================
// Test Case 4: DELETE API - void body, params required
// ============================================================================

type DeleteUserAPI = APIMethod<
  { id: number },
  void,
  { success: boolean }
>;

// Test: params required, body not available
const deleteUser: SdkUsage<DeleteUserAPI>['request'] = async (params, options?) => {
  const id: number = params.id;

  // options.body should NOT exist
  if (options) {
    const headers: Record<string, string> | undefined = options.headers;
  }

  return { success: true };
};

// ============================================================================
// Test Case 5: GET API with complex params
// ============================================================================

type GetUserAPI = APIMethod<
  { id: number; includeDetails?: boolean },
  void,
  { id: number; name: string; details?: Record<string, unknown> }
>;

// Test: optional params properties
const getUser: SdkUsage<GetUserAPI>['request'] = async (params, options?) => {
  const id: number = params.id;
  const includeDetails: boolean | undefined = params.includeDetails;

  return {
    id: 1,
    name: 'John',
    details: includeDetails ? { age: 30 } : undefined,
  };
};

// ============================================================================
// Test Case 6: RequestOptions type inference
// ============================================================================

// RequestOptions with body
type CreateUserOptions = RequestOptions<{ name: string; email: string }>;
const createUserOptions: CreateUserOptions = {
  body: { name: 'John', email: 'john@example.com' },
  headers: { 'x-api-key': 'secret' },
};

// RequestOptions without body (void)
type ListUsersOptions = RequestOptions<void>;
const listUsersOptions: ListUsersOptions = {
  headers: { 'x-api-key': 'secret' },
  timeout: 5000,
};

// ============================================================================
// Test Case 7: getFetchKey method
// ============================================================================

// Test: getFetchKey accepts params
const getUserFetchKey: SdkUsage<GetUserAPI>['getFetchKey'] = (params) => {
  const id: number = params.id;
  return `getUser-${id}`;
};

// ============================================================================
// Test Case 8: queryOptions method
// ============================================================================

// Test: queryOptions returns correct type
const getUserQueryOptions: SdkUsage<GetUserAPI>['queryOptions'] = (params, options?) => {
  return {
    queryKey: ['getUser', String(params.id)],
    queryFn: async () => ({
      id: params.id,
      name: 'John',
    }),
  };
};

// ============================================================================
// Test Case 9: Verify APIMethod structure itself
// ============================================================================

// APIMethod with body should have body-enabled request
type WithBodyMethod = APIMethod<{ id: number }, { data: string }, { result: string }>;
const withBodyApi: WithBodyMethod = {
  request: async (params, options?) => {
    if (options?.body) {
      return { result: options.body.data };
    }
    return { result: '' };
  },
  getFetchKey: (params) => `key-${params.id}`,
  queryOptions: (params, options?) => ({
    queryKey: [`key-${params.id}`],
    queryFn: async () => ({ result: '' }),
  }),
};

// APIMethod without body should NOT have body in options
type WithoutBodyMethod = APIMethod<{ id: number }, void, { result: string }>;
const withoutBodyApi: WithoutBodyMethod = {
  request: async (params, options?) => {
    // options.body should NOT be accessible here
    return { result: 'success' };
  },
  getFetchKey: (params) => `key-${params.id}`,
  queryOptions: (params, options?) => ({
    queryKey: [`key-${params.id}`],
    queryFn: async () => ({ result: 'success' }),
  }),
};

// ============================================================================
// Export to make this a module
// ============================================================================

export {};