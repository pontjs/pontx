# Graceful Client

The `createGracefulClient` provides an improved API calling experience with direct method invocation and intelligent signature selection.

## Key Features

- **Direct method calls**: No `.request()` suffix needed
- **Intelligent signature selection**: Automatically chooses two-param or three-param based on API metadata
- **Full feature support**: Validation, mock, retry, and logging
- **Type safety**: Full TypeScript support with generated types

## Basic Usage

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Direct method call
const user = await client.users.getUser({ userId: '123' });
```

## Signature Modes

### Two-Param Mode

Used when the request body is a JSON object that can be merged with parameters.

**Triggered by**:
- `bodyType: 'object'` (JSON object body)
- `bodyType: 'none'` (no body - GET/DELETE)
- `bodyType: undefined` (default, assumes object)

```typescript
// Two-param: (params, options?)
await client.users.getUser({ userId: '123' });
await client.users.createUser({ name: 'John', email: 'john@example.com' });
```

**Parameters are automatically classified**:
- Path params: Extracted to URL path
- Query params: Appended to URL query string
- Body params: Sent as JSON body

### Three-Param Mode

Used when the body cannot be merged with parameters.

**Triggered by**:
- `consumes: ['multipart/form-data']` (file uploads)
- `consumes: ['application/octet-stream']` (binary data)
- `bodyType: 'array'` (array body)
- `bodyType: 'string'` (string body)
- `bodyType: 'number'` | `'boolean'` | `'integer'`
- `bodyType: 'map'` (Record/Map body)

```typescript
// Three-param: (params, body, options?)

// File upload
const formData = new FormData();
formData.append('file', file);
await client.files.upload({ userId: '123' }, formData);

// Binary data
const buffer = await fs.readFile('./image.png');
await client.images.upload({ imageId: '456' }, buffer);

// Array body
await client.items.createBatch({}, [{ name: 'Item 1' }, { name: 'Item 2' }]);

// String body
await client.text.process({ format: 'markdown' }, '# Hello World');
```

## Signature Selection Logic

The SDK automatically selects the signature mode based on API metadata:

```typescript
function selectSignatureMode(apiMeta) {
  const contentType = apiMeta.consumes?.[0];

  // Non-JSON content types -> three-param
  if (contentType?.includes('multipart/form-data')) return 'three-param';
  if (contentType?.includes('application/octet-stream')) return 'three-param';

  // Based on bodyType
  switch (apiMeta.bodyType) {
    case 'object':
    case 'none':
    case undefined:
      return 'two-param';

    case 'array':
    case 'map':
    case 'string':
    case 'number':
    case 'boolean':
    case 'integer':
      return 'three-param';
  }
}
```

## Parameter Classification

For two-param mode, parameters are automatically classified:

```typescript
// API metadata:
// - path: '/users/{userId}/posts/{postId}'
// - pathParams: ['userId', 'postId']
// - queryParams: ['page', 'limit']

// Your call:
await client.users.getPosts({
  userId: '123',      // -> URL path: /users/123/posts/...
  postId: '456',      // -> URL path: /users/123/posts/456
  page: 1,            // -> Query string: ?page=1
  limit: 10,          // -> Query string: ?page=1&limit=10
  includeComments: true, // -> JSON body: { includeComments: true }
});

// Resulting request:
// GET /users/123/posts/456?page=1&limit=10
// Body: { "includeComments": true }
```

## Utility Methods

Every API method includes utility methods:

```typescript
// Get fetch key (for caching)
const key = client.users.getUser.getFetchKey({ userId: '123' });
// Returns: 'GET /users/123'

// Get query options (for React Query/SWR)
const opts = client.users.getUser.queryOptions({ userId: '123' });
// Returns: { queryKey: [...], queryFn: ... }
```

## Full Configuration Example

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>({
  // Required
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `${process.env.API_URL}${path}`,

  // Optional: Custom fetch function
  fetchFn: customFetch,

  // Optional: Path parameter marker
  pathMark: ':', // default is ':'

  // Optional: Features
  validation: {
    enabled: true,
    schemas: {
      'users/createUser': userCreateSchema,
    },
  },

  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },

  logger: {
    enabled: process.env.NODE_ENV === 'development',
  },

  mock: {
    enabled: process.env.NODE_ENV === 'test',
    responses: {
      'users/getUser': { id: '123', name: 'Test User' },
    },
  },
});
```

## Request Options

Both signature modes support an optional `options` parameter:

```typescript
// Two-param with options
await client.users.getUser(
  { userId: '123' },
  {
    headers: { 'X-Custom-Header': 'value' },
    signal: abortController.signal,
  }
);

// Three-param with options
await client.files.upload(
  { userId: '123' },
  formData,
  {
    headers: { 'X-Upload-ID': 'abc' },
  }
);
```
