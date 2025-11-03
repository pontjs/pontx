# @pontx/sdk-core

Shared core utilities for Pontx SDK (Browser & Node.js)

## 📦 Overview

`@pontx/sdk-core` is the foundational package that powers both `@pontx/browser-sdk` and `@pontx/nodejs-sdk`. It provides:

- **URL Building**: Path parameter replacement and query string serialization
- **Request Body Serialization**: Support for JSON, URLSearchParams, FormData, and text/plain
- **Type Definitions**: TypeScript types for type-safe API clients
- **Feature Modules** (Coming soon): Validation, Mock, Retry, Logging, Error Handling
- **SDK Builders** (Coming soon): Standard, Graceful, and Flat calling styles

## 🚀 Installation

```bash
pnpm add @pontx/sdk-core
```

## 📖 Usage

### URL Building

```typescript
import { buildUrl, appendQueryParams, createUrlBuilder } from '@pontx/sdk-core';

// Basic path parameter replacement
const url1 = buildUrl('/users/{userId}', { userId: 123 });
// Returns: '/users/123'

// With query parameters (use createUrlBuilder for automatic separation)
const builder = createUrlBuilder();
const url2 = builder('/users/{userId}', { userId: 123, page: 1, limit: 10 });
// Returns: '/users/123?page=1&limit=10'

// Append query params to existing URL
const url3 = appendQueryParams('/api/users', {
  tags: ['frontend', 'backend'],
  filter: { status: 'active' }
});
// Returns: '/api/users?tags=frontend&tags=backend&filter=%7B%22status%22%3A%22active%22%7D'
```

### Request Body Serialization

```typescript
import { serializeRequestBody } from '@pontx/sdk-core';

// JSON serialization
const json = serializeRequestBody(
  { name: 'John', age: 30 },
  'application/json'
);
// Returns: '{"name":"John","age":30}'

// URLSearchParams serialization
const params = serializeRequestBody(
  { name: 'John', tags: ['a', 'b'] },
  'application/x-www-form-urlencoded'
);
// Returns: URLSearchParams instance

// FormData serialization (for file uploads)
const formData = serializeRequestBody(
  { name: 'John', avatar: fileObject },
  'multipart/form-data'
);
// Returns: FormData instance
```

### Custom URL Builder

```typescript
import { createUrlBuilder } from '@pontx/sdk-core';

// With custom getFetchUrl
const builder = createUrlBuilder({
  getFetchUrl: (path, params) => {
    return `https://api.example.com${path}?token=${params.token}`;
  }
});

const url = builder('/users/{id}', { id: 123, token: 'abc' });
// Returns: 'https://api.example.com/users/{id}?token=abc'

// With pathMark for missing parameters
const builder2 = createUrlBuilder({ pathMark: ':id' });
const url2 = builder2('/users/{userId}', {});
// Returns: '/users/:id'
```

## 🏗️ Architecture

```
@pontx/sdk-core
├── url/                # URL building utilities
│   ├── build-url       # Path parameter replacement
│   ├── query-params    # Query string serialization
│   └── url-builder     # Unified URL builder factory
├── body/               # Request body serialization
│   └── serializer      # Multi-format body serialization
├── types/              # TypeScript type definitions
│   └── base            # Core types (APIMethod, Client, etc.)
├── features/           # (Coming soon) Feature modules
│   ├── validation      # Zod-based parameter validation
│   ├── mock            # Mock data interceptor
│   ├── retry           # Exponential backoff retry
│   ├── logging         # Development logging
│   └── error-handling  # Unified error handling
└── builders/           # (Coming soon) SDK builders
    ├── standard        # Standard Proxy-based SDK
    ├── graceful        # Graceful calling style
    └── flat            # Flat API specification support
```

## 📋 Roadmap

### Phase 1: Core Utilities (✅ Current)
- [x] URL building (buildUrl, appendQueryParams, createUrlBuilder)
- [x] Request body serialization (JSON, URLSearchParams, FormData)
- [x] Base type definitions

### Phase 2: Feature Modules (🚧 Next)
- [ ] Validation module (Zod integration)
- [ ] Mock module (static mock data)
- [ ] Retry module (exponential backoff)
- [ ] Logging module (development logs)
- [ ] Error handling module (PontxError)

### Phase 3: SDK Builders (📅 Planned)
- [ ] Standard SDK builder (Proxy-based)
- [ ] Graceful SDK builder (merged params + body)
- [ ] Flat SDK builder (flat API specs)

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm typecheck
```

## 📦 Exports

### Main Entry (`@pontx/sdk-core`)
```typescript
import {
  // URL utilities
  buildUrl,
  getPathParamNames,
  appendQueryParams,
  createUrlBuilder,

  // Body serialization
  serializeRequestBody,
  getContentType,

  // Types
  type PontxSpecMeta,
  type PontxAPI,
  type APIMethod,
  type Client,
  type ContentType,
} from '@pontx/sdk-core';
```

### Subpath Exports
```typescript
// URL utilities only
import { buildUrl } from '@pontx/sdk-core/url';

// Body serialization only
import { serializeRequestBody } from '@pontx/sdk-core/body';

// Types only
import type { APIMethod } from '@pontx/sdk-core/types';
```

## 🤝 Contributing

This package is part of the Pontx monorepo. Contributions are welcome!

## 📄 License

MIT

## 🔗 Related Packages

- [`@pontx/spec`](../spec) - API specification types
- [`@pontx/browser-sdk`](../../sdk/browser) - Browser SDK (uses this package)
- [`@pontx/nodejs-sdk`](../../sdk/nodejs) - Node.js SDK (uses this package)
