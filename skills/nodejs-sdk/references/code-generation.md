# Code Generation

The `gracefulCodegenPlugin` enhances Pontx code generation with metadata required by the graceful client.

## Installation

The plugin is included in @pontx/nodejs-sdk:

```typescript
import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin';
```

## Configuration

Add the plugin to your `pontx.config.ts`:

```typescript
import { defineConfig } from 'pontx';
import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin';

export default defineConfig({
  outDir: './src/services',
  plugins: [gracefulCodegenPlugin()],
  specs: [
    {
      name: 'petstore',
      url: 'https://petstore.swagger.io/v2/swagger.json',
    },
  ],
});
```

## Generate Code

```bash
npx pontx generate
```

## Generated Files

### apiMeta.ts

Enhanced metadata with parameter classification:

```typescript
export const specMeta = {
  name: "petstore",
  apis: {
    "pet/addPet": {
      method: "POST",
      path: "/pet",
      pathParams: [],
      queryParams: [],
      bodyType: "object",
      consumes: ["application/json"],
      produces: ["application/json"]
    },
    "pet/uploadFile": {
      method: "POST",
      path: "/pet/{petId}/uploadImage",
      pathParams: ["petId"],
      queryParams: ["additionalMetadata"],
      bodyType: "none",
      consumes: ["multipart/form-data"],
      produces: ["application/json"]
    },
    "pet/findByStatus": {
      method: "GET",
      path: "/pet/findByStatus",
      pathParams: [],
      queryParams: ["status"],
      bodyType: "none",
      produces: ["application/json"]
    }
  }
};
```

### apis.ts

Type definitions with consume field:

```typescript
import type * as schemas from "./schemas";

export type APIs = {
  pet: {
    /** Add a new pet to the store */
    addPet: {
      params: {};
      method: 'POST';
      consume: 'application/json';
      bodyParams: schemas.Pet;
      Response: schemas.Pet;
    };

    /** Uploads an image */
    uploadFile: {
      params: { petId: number; additionalMetadata?: string };
      method: 'POST';
      consume: 'multipart/form-data';
      bodyParams: undefined;
      Response: schemas.ApiResponse;
    };

    /** Finds Pets by status */
    findByStatus: {
      params: { status: Array<'available' | 'pending' | 'sold'> };
      method: 'GET';
      bodyParams: undefined;
      Response: Array<schemas.Pet>;
    };
  };
};
```

### schemas.ts

TypeScript types for all schemas:

```typescript
export interface Pet {
  id?: number;
  name: string;
  status?: 'available' | 'pending' | 'sold';
}

export interface ApiResponse {
  code?: number;
  type?: string;
  message?: string;
}
```

## Enhanced Metadata Fields

### pathParams

Array of parameter names that go in the URL path:

```typescript
{
  path: "/users/{userId}/posts/{postId}",
  pathParams: ["userId", "postId"]
}
```

### queryParams

Array of parameter names that go in the query string:

```typescript
{
  path: "/users",
  queryParams: ["page", "limit", "sort"]
}
```

### bodyType

Type of the request body:

| bodyType | Description | Signature Mode |
|----------|-------------|----------------|
| `'object'` | JSON object body | two-param |
| `'none'` | No body (GET/DELETE) | two-param |
| `'array'` | JSON array body | three-param |
| `'string'` | String body | three-param |
| `'number'` | Number body | three-param |
| `'boolean'` | Boolean body | three-param |
| `'integer'` | Integer body | three-param |
| `'map'` | Record/Map body | three-param |

### consumes

Array of accepted Content-Types:

```typescript
{
  consumes: ["application/json", "application/xml"]
}
```

### produces

Array of response Content-Types:

```typescript
{
  produces: ["application/json"]
}
```

## bodyType Detection Logic

The plugin detects bodyType from the OpenAPI schema:

```typescript
function detectBodyType(api: PontxAPI): BodyType {
  const bodyParam = api.parameters?.find(p => p.in === 'body');

  if (!bodyParam?.schema) {
    return 'none';
  }

  switch (bodyParam.schema.type) {
    case 'object': return 'object';
    case 'array': return 'array';
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'integer': return 'integer';
    default: return 'object'; // Complex types default to object
  }
}
```

## Using with Graceful Client

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { specMeta } from './services/apiMeta';
import type { APIs } from './services/apis';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://petstore.swagger.io/v2${path}`,
});

// Two-param mode (bodyType: 'object')
await client.pet.addPet({ name: 'Fluffy', status: 'available' });

// Two-param mode (bodyType: 'none')
const pets = await client.pet.findByStatus({ status: ['available'] });

// Three-param mode (consumes: 'multipart/form-data')
const formData = new FormData();
formData.append('file', file);
await client.pet.uploadFile({ petId: 123 }, formData);
```

## Regenerating Code

When your OpenAPI spec changes:

```bash
# Regenerate all
npx pontx generate

# Regenerate specific spec
npx pontx generate --spec petstore
```

## Watching for Changes

```bash
npx pontx generate --watch
```
