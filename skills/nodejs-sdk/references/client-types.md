# Client Types

@pontx/nodejs-sdk provides three client types for different use cases.

## Comparison Table

| Feature | `createClient` | `createGracefulClient` | `createFlatClient` |
|---------|---------------|------------------------|-------------------|
| API Structure | Hierarchical (controller.method) | Hierarchical (controller.method) | Flat (method only) |
| Call Pattern | `.request()` required | Direct call | Direct call |
| Signature Mode | Single mode | Two-param / Three-param | Two-param / Three-param |
| Use Case | Traditional REST APIs | Most JSON APIs | Simple/Flat APIs |

## createClient (Standard)

The original client with explicit `.request()` method calls.

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Call pattern: controller.method.request(params)
const user = await client.users.getUser.request({ userId: '123' });

// Utility methods
const fetchKey = client.users.getUser.getFetchKey({ userId: '123' });
const queryOpts = client.users.getUser.queryOptions({ userId: '123' });
```

**When to use**:
- Legacy codebases
- When you need explicit request/utility method separation
- Custom request handling requirements

## createGracefulClient (Recommended)

The improved client with direct method calls and intelligent signature selection.

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Call pattern: controller.method(params) - no .request() needed
const user = await client.users.getUser({ userId: '123' });

// Utility methods still available
const fetchKey = client.users.getUser.getFetchKey({ userId: '123' });
const queryOpts = client.users.getUser.queryOptions({ userId: '123' });
```

**When to use**:
- New projects (recommended default)
- When you want cleaner API calls
- APIs with mixed JSON/FormData endpoints

## createFlatClient

Client for flat API specifications without controller hierarchy.

```typescript
import { createFlatClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createFlatClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Call pattern: method(params) - no controller layer
const results = await client.symbolSearch({ q: 'AAPL' });
const quote = await client.getQuote({ symbol: 'AAPL' });

// Utility methods available
const fetchKey = client.symbolSearch.getFetchKey({ q: 'AAPL' });
```

**When to use**:
- APIs without controller/tag hierarchy
- Simple REST APIs with flat structure
- Single-purpose microservices

## Configuration Options

All client types share common configuration:

```typescript
interface CreateClientConfig<T> {
  // Required: API metadata from pontx generate
  pontxSpecMeta: PontxSpecMeta;

  // Required: URL builder function
  getFetchUrl: (path: string) => string;

  // Optional: Custom fetch function
  fetchFn?: FetchFunction;

  // Optional: Path parameter marker (default: ':')
  pathMark?: string;

  // Optional: Custom utility methods
  makeCustomUsages?: (apiMeta: PontxAPI) => Record<string, any>;

  // Optional: Validation configuration
  validation?: ValidationConfig;

  // Optional: Mock configuration
  mock?: MockConfig;

  // Optional: Retry configuration
  retry?: RetryConfig;

  // Optional: Logger configuration
  logger?: LoggerConfig;
}
```

## Migration Guide

### From createClient to createGracefulClient

```typescript
// Before (createClient)
const user = await client.users.getUser.request({ userId: '123' });

// After (createGracefulClient)
const user = await client.users.getUser({ userId: '123' });
```

No other changes needed - utility methods work the same way.

### From createGracefulClient to createFlatClient

Only applicable if your API structure is flat:

```typescript
// Before (createGracefulClient with hierarchical API)
const user = await client.users.getUser({ userId: '123' });

// After (createFlatClient with flat API)
const user = await client.getUser({ userId: '123' });
```

Requires regenerating API metadata with flat structure.
