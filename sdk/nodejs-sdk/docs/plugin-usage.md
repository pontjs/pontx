# Graceful Codegen Plugin

The graceful codegen plugin enhances the generated API types and metadata to provide better support for the graceful client pattern.

## Installation

```bash
npm install @pontx/nodejs-sdk
# or
pnpm add @pontx/nodejs-sdk
```

## Usage

Add the plugin to your `pontx.config.ts`:

```typescript
import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin'

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

## What It Does

The plugin enhances code generation in two ways:

### 1. Enhanced API Metadata (`apiMeta.ts`)

Adds three new fields to each API's metadata:

- **`pathParams: string[]`** - Array of path parameter names (e.g., `['userId', 'postId']`)
- **`queryParams: string[]`** - Array of query parameter names (e.g., `['limit', 'offset']`)
- **`bodyType: BodyType`** - Type of request body for signature selection

#### Body Types

```typescript
type BodyType =
  | 'object'    // JSON object body
  | 'map'       // Key-value map
  | 'array'     // Array body
  | 'string'    // Plain string
  | 'number'    // Number value
  | 'boolean'   // Boolean value
  | 'integer'   // Integer value
  | 'none'      // No body
```

#### Example Output

```typescript
export const specMeta = {
  "name": "petstore",
  "apis": {
    "pet/uploadFile": {
      "method": "POST",
      "consumes": ["multipart/form-data"],
      "produces": ["application/json"],
      "path": "/pet/{petId}/uploadImage",
      "pathParams": ["petId"],
      "queryParams": [],
      "bodyType": "none"
    },
    "pet/addPet": {
      "method": "POST",
      "consumes": ["application/json"],
      "path": "/pet",
      "pathParams": [],
      "queryParams": [],
      "bodyType": "object"
    }
  }
}
```

### 2. Enhanced API Types (`apis.ts`)

Adds a `consume` field to API type definitions:

```typescript
export type APIs = {
  pet: {
    uploadFile: {
      params: { petId: number };
      method: 'POST';
      consume: 'multipart/form-data';  // New field
      bodyParams: undefined;
      Response: schemas.ApiResponse;
    };

    addPet: {
      params: {};
      method: 'POST';
      consume: 'application/json';  // New field
      bodyParams: schemas.Pet;
      Response: schemas.Pet;
    };
  }
}
```

## Use with Graceful Client

The enhanced metadata enables the graceful client to automatically select the correct signature mode:

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>(specMeta, {
  baseURL: 'https://petstore.swagger.io/v2'
});

// Two-param mode (object body)
await client.pet.addPet({ name: 'Fluffy', status: 'available' });

// Three-param mode (FormData body)
const formData = new FormData();
formData.append('file', file);
await client.pet.uploadFile({ petId: 123 }, formData);
```

## Body Type Detection Rules

The plugin uses the following rules to detect body types:

1. **No body parameter** → `'none'`
2. **Schema type: 'object'** → `'object'`
3. **Schema type: 'array'** → `'array'`
4. **Schema type: 'string'** → `'string'`
5. **Schema type: 'number'** → `'number'`
6. **Schema type: 'boolean'** → `'boolean'`
7. **Schema type: 'integer'** → `'integer'`
8. **Complex schemas** (oneOf, allOf, anyOf, $ref) → `'object'` (default)

## API Reference

### `gracefulCodegenPlugin()`

Creates a Pontx plugin instance that enhances code generation.

**Returns:** `Plugin`

**Example:**

```typescript
import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin';

const plugin = gracefulCodegenPlugin();
```

### Utility Functions

The plugin also exports utility functions for manual metadata extraction:

#### `extractPathParams(api: PontxAPI): string[]`

Extracts path parameter names from an API definition.

```typescript
import { extractPathParams } from '@pontx/nodejs-sdk/plugin';

const pathParams = extractPathParams({
  path: '/users/{userId}/posts/{postId}',
  parameters: [
    { name: 'userId', in: 'path', required: true },
    { name: 'postId', in: 'path', required: true }
  ]
});
// ['userId', 'postId']
```

#### `extractQueryParams(api: PontxAPI): string[]`

Extracts query parameter names from an API definition.

```typescript
import { extractQueryParams } from '@pontx/nodejs-sdk/plugin';

const queryParams = extractQueryParams({
  parameters: [
    { name: 'limit', in: 'query' },
    { name: 'offset', in: 'query' }
  ]
});
// ['limit', 'offset']
```

#### `detectBodyType(api: PontxAPI): BodyType`

Detects the body type from an API's schema.

```typescript
import { detectBodyType } from '@pontx/nodejs-sdk/plugin';

const bodyType = detectBodyType({
  parameters: [
    {
      name: 'body',
      in: 'body',
      schema: { type: 'array', items: { type: 'string' } }
    }
  ]
});
// 'array'
```

## TypeScript Types

The plugin exports the following TypeScript types:

### `BodyType`

```typescript
type BodyType =
  | 'object'
  | 'map'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer'
  | 'none';
```

### `GracefulApiMeta`

```typescript
interface GracefulApiMeta {
  method: string;
  consumes?: string[];
  produces?: string[];
  path: string;
  pathParams: string[];
  queryParams: string[];
  bodyType: BodyType;
}
```

## Compatibility

- **Node.js:** >= 18.0.0
- **TypeScript:** >= 4.5
- **@pontx/spec:** workspace:*

## Related

- [Graceful Client Documentation](./usage-guide.md)
- [API Key Design](./api-key-design.md)
- [Conditional Types Guide](./conditional-types.md)
