---
name: nodejs-sdk
description: Type-safe Node.js API client SDK with validation, mocking, retry, and logging. Use when building API clients for Node.js applications.
license: MIT
metadata:
  author: pontx
  version: "0.1.0"
---

# @pontx/nodejs-sdk

Type-safe Node.js SDK for API integration, featuring automatic validation, mocking, retry, and logging capabilities.

**Requirements**: Node.js >= 18.0.0 (uses native `fetch` and `FormData`)

## Quick Start

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Direct method call - no .request() needed
const user = await client.users.getUser({ userId: '123' });
```

## Core Workflows

### 1. Standard Client (Basic Usage)

<!-- @file: references/client-types.md -->

Use `createClient` for traditional API calls with explicit `.request()` method:

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Requires .request() suffix
const user = await client.users.getUser.request({ userId: '123' });

// Utility methods available
const fetchKey = client.users.getUser.getFetchKey({ userId: '123' });
```

### 2. Graceful Client (Recommended)

<!-- @file: references/graceful-client.md -->

Use `createGracefulClient` for improved ergonomics with direct method calls:

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  validation: { enabled: true },
  retry: { maxAttempts: 3 },
  logger: { enabled: true },
});

// Two-param mode: JSON body merged with params
await client.users.createUser({ name: 'John', email: 'john@example.com' });

// Three-param mode: FormData/Binary separate from params
const formData = new FormData();
formData.append('file', file);
await client.files.upload({ userId: '123' }, formData);
```

**Signature Mode Selection**:
- **Two-param** `(params, options?)`: JSON APIs where body is an object
- **Three-param** `(params, body, options?)`: FormData, binary, or non-object body

### 3. Flat Client (No Hierarchy)

Use `createFlatClient` for APIs without namespace/controller hierarchy:

```typescript
import { createFlatClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createFlatClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Direct API access at root level
const results = await client.symbolSearch({ q: 'AAPL' });
```

## Features

<!-- @file: references/features.md -->

### Validation (Zod)

Enable parameter validation with optional Zod schemas:

```typescript
import { z } from 'zod';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  validation: {
    enabled: true,
    schemas: {
      'users/getUser': z.object({ userId: z.string() }),
    },
  },
});
```

### Mock

Enable mock responses for testing:

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  mock: {
    enabled: true,
    responses: {
      'users/getUser': { id: '123', name: 'Mock User' },
    },
  },
});
```

### Retry

Configure automatic retry with backoff:

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  retry: {
    maxAttempts: 3,
    backoff: 'exponential', // or 'linear'
  },
});
```

### Logger

Enable request/response logging with sensitive data masking:

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  logger: {
    enabled: true,
    // Auto-masks: password, token, apiKey, authorization, etc.
  },
});
```

## Code Generation

<!-- @file: references/code-generation.md -->

Use `gracefulCodegenPlugin` to generate enhanced metadata:

```typescript
// pontx.config.ts
import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin';

export default {
  outDir: './src/services',
  plugins: [gracefulCodegenPlugin()],
  origins: [
    {
      name: 'petstore',
      url: 'https://petstore.swagger.io/v2/swagger.json',
    },
  ],
};
```

Generate code:

```bash
npx pontx generate
```

This generates:
- `apiMeta.ts` - Enhanced metadata with `pathParams`, `queryParams`, `bodyType`
- `apis.ts` - Type definitions with `consume` field
- `schemas.ts` - TypeScript types for request/response

## Safety & Best Practices

### Type Safety

- Always use generated types: `createGracefulClient<APIs>(...)`
- Enable validation in development: `validation: { enabled: true }`
- Use TypeScript strict mode for maximum type safety

### Error Handling

```typescript
import { PontxError, ERROR_CODES } from '@pontx/nodejs-sdk';

try {
  await client.users.getUser({ userId: '123' });
} catch (error) {
  if (error instanceof PontxError) {
    switch (error.code) {
      case ERROR_CODES.VALIDATION_ERROR:
        // Handle validation error
        break;
      case ERROR_CODES.RETRY_EXHAUSTED:
        // Handle retry exhaustion
        break;
    }
  }
}
```

### Environment Configuration

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => {
    const baseUrl = process.env.API_BASE_URL || 'https://api.example.com';
    return `${baseUrl}${path}`;
  },
  logger: {
    // Auto-enable in development
    enabled: process.env.NODE_ENV === 'development',
  },
});
```

### Sensitive Data

- Logger auto-masks: `password`, `token`, `apiKey`, `authorization`, `secret`
- Never log full request/response bodies in production
- Use environment variables for API keys

## Learn More

<!-- @file: references/client-types.md -->
<!-- @file: references/graceful-client.md -->
<!-- @file: references/features.md -->
<!-- @file: references/code-generation.md -->
<!-- @file: references/advanced-usage.md -->

- **Client Types**: See `references/client-types.md` for detailed comparison
- **Graceful Client**: See `references/graceful-client.md` for signature modes
- **Features**: See `references/features.md` for validation, mock, retry, logger
- **Code Generation**: See `references/code-generation.md` for plugin usage
- **Advanced Usage**: See `references/advanced-usage.md` for React Query, custom fetch

---

_This SKILL file helps AI assistants understand and use @pontx/nodejs-sdk effectively._
