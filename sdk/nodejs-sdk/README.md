# @pontx/nodejs-sdk

Node.js SDK for pontx with full TypeScript support, API validation, mocks, and retry capabilities.

## Requirements

- Node.js >= 18.0.0 (uses native `fetch` and `FormData`)

## Features

- Full TypeScript support with type safety
- Native Node.js fetch API integration (no external dependencies)
- Request/Response validation using Zod (optional peer dependency)
- Built-in retry logic with exponential backoff
- Request/Response interceptors
- Mock server capabilities for testing
- Graceful client with intelligent API signature selection
- Code generation plugin with enhanced metadata
- Dual module format support (ESM + CommonJS)

## Installation

```bash
npm install @pontx/nodejs-sdk
# or
pnpm add @pontx/nodejs-sdk
# or
yarn add @pontx/nodejs-sdk
```

### Optional: Install Zod for validation

```bash
npm install zod
```

## Quick Start

### 1. Configure Pontx with the Plugin

Add the graceful codegen plugin to your `pontx.config.ts`:

```typescript
import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin';

export default {
  outDir: './src/services',
  plugins: [gracefulCodegenPlugin()],
  origins: [
    {
      name: 'petstore',
      url: 'https://petstore.swagger.io/v2/swagger.json'
    }
  ]
}
```

### 2. Generate Code

```bash
npx pontx
```

This generates:
- `apiMeta.ts` - Enhanced metadata with `pathParams`, `queryParams`, `bodyType`
- `apis.ts` - Type definitions with `consume` field
- `schemas.ts` - TypeScript types for request/response bodies

### 3. Create Graceful Client

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>(specMeta, {
  baseURL: 'https://petstore.swagger.io/v2'
});

// Use the client with intelligent signatures
await client.pet.addPet({ name: 'Fluffy', status: 'available' });

const formData = new FormData();
formData.append('file', file);
await client.pet.uploadFile({ petId: 123 }, formData);
```

## Documentation

- [Graceful Client Usage Guide](./docs/usage-guide.md)
- [Plugin Documentation](./docs/plugin-usage.md)
- [API Key Design](./docs/api-key-design.md)
- [Conditional Types](./docs/conditional-types.md)
- [FAQ](./docs/FAQ.md)

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm watch

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## License

MIT