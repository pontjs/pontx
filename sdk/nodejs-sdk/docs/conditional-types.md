# Conditional Type Inference

## Overview

The Node.js SDK implements intelligent conditional type inference based on API metadata. This ensures that TypeScript provides accurate type checking and autocomplete based on whether an API requires body parameters, query parameters, or both.

## Key Features

### 1. Body Parameter Conditional Type

When `BodyParams` is provided (not `void`), the `body` field is available in `RequestOptions`:

```typescript
// API with body parameters
type CreateUserAPI = APIMethod<
  { organizationId: string },
  { name: string; email: string },
  { id: number; name: string; email: string }
>;

// Usage: body is available
await client.users.createUser(
  { organizationId: '123' },
  {
    body: { name: 'John', email: 'john@example.com' },
  }
);
```

When `BodyParams` is `void`, the `body` field is NOT available in `RequestOptions`:

```typescript
// API without body parameters
type ListUsersAPI = APIMethod<
  { page: number; limit: number },
  void,
  Array<{ id: number; name: string }>
>;

// Usage: body is not available
await client.users.listUsers(
  { page: 1, limit: 10 },
  {
    headers: { 'x-api-key': 'secret' },
    // body: ... // TypeScript error: Property 'body' does not exist
  }
);
```

### 2. Parameter Type Inference

All parameter types are correctly inferred from the `APIMethod` generic:

```typescript
// Params are inferred as { id: number; includeDetails?: boolean }
type GetUserAPI = APIMethod<
  { id: number; includeDetails?: boolean },
  void,
  { id: number; name: string; details?: Record<string, unknown> }
>;

// TypeScript knows the exact param types
await client.users.getUser({ id: 1, includeDetails: true });
```

### 3. Response Type Inference

Response types are automatically inferred from the `APIMethod` generic:

```typescript
// Response is inferred as Array<{ id: number; name: string }>
const users = await client.users.listUsers({ page: 1, limit: 10 });

// TypeScript knows users is an array
users.forEach((user) => {
  console.log(user.id); // TypeScript knows user.id is a number
  console.log(user.name); // TypeScript knows user.name is a string
});
```

## Implementation Details

### APIMethod Interface

The `APIMethod` interface uses conditional types to provide different method signatures based on whether `BodyParams` is `void`:

```typescript
export interface APIMethod<Params = void, BodyParams = void, Response = unknown> {
  request: BodyParams extends void
    ? (params: Params, options?: Omit<RequestOptions<BodyParams>, 'body'>) => Promise<Response>
    : (params: Params, options?: RequestOptions<BodyParams>) => Promise<Response>;

  getFetchKey: (params: Params) => string;

  queryOptions: (params: Params, options?: RequestOptions<BodyParams>) => {
    queryKey: string[];
    queryFn: () => Promise<Response>;
  };
}
```

### SdkUsage Interface

The `SdkUsage` interface mirrors the conditional logic from `APIMethod`:

```typescript
export interface SdkUsage<T extends APIMethod<any, any, any>> {
  request: T extends APIMethod<infer Params, infer BodyParams, infer Response>
    ? BodyParams extends void
      ? (params: Params, options?: Omit<RequestOptions<BodyParams>, 'body'>) => Promise<Response>
      : (params: Params, options?: RequestOptions<BodyParams>) => Promise<Response>
    : never;

  getFetchKey: T extends APIMethod<infer Params, any, any>
    ? (params: Params) => string
    : never;

  queryOptions: T extends APIMethod<infer Params, infer BodyParams, infer Response>
    ? (params: Params, options?: RequestOptions<BodyParams>) => {
        queryKey: string[];
        queryFn: () => Promise<Response>;
      }
    : never;
}
```

## Test Coverage

Comprehensive type tests verify the following scenarios:

1. **API with body** - body parameter is available and typed correctly
2. **API without body** - body parameter is not available (TypeScript error if accessed)
3. **Complex API with optional body params** - optional properties are correctly inferred
4. **DELETE API** - params required, body not available
5. **GET API with complex params** - optional params properties are correctly inferred
6. **RequestOptions type inference** - body field presence depends on `BodyParams`
7. **getFetchKey method** - accepts params with correct types
8. **queryOptions method** - returns correct type structure
9. **APIMethod structure** - interface behaves correctly for both with-body and without-body cases

## Benefits

1. **Type Safety** - TypeScript catches errors at compile time
2. **Better IDE Support** - Accurate autocomplete and parameter hints
3. **Reduced Errors** - Impossible to pass body when API doesn't accept it
4. **Clear API Contract** - Types document whether body is required or optional
5. **Backward Compatible** - Works with existing code patterns

## Examples

### Example 1: REST API Operations

```typescript
// POST - create user (with body)
await client.users.createUser(
  { organizationId: '123' },
  {
    body: { name: 'John', email: 'john@example.com' },
  }
);

// GET - list users (no body)
const users = await client.users.listUsers({ page: 1, limit: 10 });

// PUT - update user (with body)
await client.users.updateUser(
  { id: 1 },
  {
    body: { name: 'John Doe' },
  }
);

// DELETE - delete user (no body)
await client.users.deleteUser({ id: 1 });
```

### Example 2: Type Inference in Action

```typescript
// TypeScript infers all types automatically
const response = await client.users.getUser({ id: 1 });

// response type is inferred as { id: number; name: string; email: string }
console.log(response.id); // number
console.log(response.name); // string
console.log(response.email); // string

// TypeScript error: Property 'age' does not exist
// console.log(response.age);
```

## Future Enhancements

Potential improvements for future versions:

1. **Runtime metadata integration** - Detect hasBody/hasParams from PontxAPI metadata at runtime
2. **Stricter param validation** - Make params required when hasParams=true, optional when hasParams=false
3. **Custom type guards** - Allow users to define custom type narrowing logic
4. **Advanced conditional types** - Support for union types and complex API scenarios

## Related Documentation

- [API Method Types](./api-method-types.md)
- [Request Options](./request-options.md)
- [SDK Usage Guide](./sdk-usage.md)