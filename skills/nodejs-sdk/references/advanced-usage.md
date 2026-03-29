# Advanced Usage

Advanced patterns and integrations for @pontx/nodejs-sdk.

## Custom Fetch Function

Replace the default fetch with your own implementation:

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';

// Custom fetch with default headers
const customFetch = async (url: string, init?: RequestInit) => {
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      'Authorization': `Bearer ${getToken()}`,
      'X-Request-ID': generateRequestId(),
    },
  });
};

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  fetchFn: customFetch,
});
```

## React Query Integration

Use with @tanstack/react-query:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { createGracefulClient } from '@pontx/nodejs-sdk';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Query hook
function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => client.users.getUser({ userId }),
  });
}

// Using queryOptions helper
function useUser(userId: string) {
  const opts = client.users.getUser.queryOptions({ userId });
  return useQuery(opts);
}

// Mutation hook
function useCreateUser() {
  return useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      client.users.createUser(data),
  });
}
```

## SWR Integration

Use with SWR:

```typescript
import useSWR from 'swr';
import { createGracefulClient } from '@pontx/nodejs-sdk';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// SWR hook
function useUser(userId: string) {
  const key = client.users.getUser.getFetchKey({ userId });
  return useSWR(key, () => client.users.getUser({ userId }));
}
```

## Error Handling Strategies

### Centralized Error Handler

```typescript
import { PontxError, ERROR_CODES } from '@pontx/nodejs-sdk';

function handleApiError(error: unknown): never {
  if (error instanceof PontxError) {
    switch (error.code) {
      case ERROR_CODES.VALIDATION_ERROR:
        throw new ValidationError(error.message);

      case ERROR_CODES.RETRY_EXHAUSTED:
        throw new ServiceUnavailableError('Service temporarily unavailable');

      case ERROR_CODES.TIMEOUT:
        throw new TimeoutError('Request timed out');

      default:
        throw new ApiError(error.message, error.code);
    }
  }

  throw error;
}

// Usage
try {
  await client.users.getUser({ userId: '123' });
} catch (error) {
  handleApiError(error);
}
```

### Error Boundary Pattern

```typescript
async function safeApiCall<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('API call failed:', error);
    return fallback;
  }
}

// Usage
const users = await safeApiCall(
  () => client.users.listUsers({ page: 1 }),
  []
);
```

## Environment-Based Configuration

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';

interface EnvConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  logEnabled: boolean;
}

const envConfigs: Record<string, EnvConfig> = {
  development: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retryAttempts: 1,
    logEnabled: true,
  },
  staging: {
    baseUrl: 'https://staging-api.example.com',
    timeout: 10000,
    retryAttempts: 2,
    logEnabled: true,
  },
  production: {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retryAttempts: 3,
    logEnabled: false,
  },
};

const env = process.env.NODE_ENV || 'development';
const config = envConfigs[env];

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `${config.baseUrl}${path}`,
  retry: { maxAttempts: config.retryAttempts },
  logger: { enabled: config.logEnabled },
});
```

## Multiple API Clients

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { userSpecMeta } from './services/users/apiMeta';
import { orderSpecMeta } from './services/orders/apiMeta';
import type { UserAPIs } from './services/users/apis';
import type { OrderAPIs } from './services/orders/apis';

const userClient = createGracefulClient<UserAPIs>({
  pontxSpecMeta: userSpecMeta,
  getFetchUrl: (path) => `https://users.api.example.com${path}`,
});

const orderClient = createGracefulClient<OrderAPIs>({
  pontxSpecMeta: orderSpecMeta,
  getFetchUrl: (path) => `https://orders.api.example.com${path}`,
});

// Export as unified API
export const api = {
  users: userClient,
  orders: orderClient,
};
```

## Request Interceptors

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';

// Intercept and modify requests
const createInterceptedFetch = (
  interceptors: Array<(url: string, init: RequestInit) => RequestInit>
) => {
  return async (url: string, init?: RequestInit) => {
    let modifiedInit = init || {};

    for (const interceptor of interceptors) {
      modifiedInit = interceptor(url, modifiedInit);
    }

    return fetch(url, modifiedInit);
  };
};

// Example interceptors
const addAuthHeader = (url: string, init: RequestInit) => ({
  ...init,
  headers: {
    ...init.headers,
    'Authorization': `Bearer ${getToken()}`,
  },
});

const addCorrelationId = (url: string, init: RequestInit) => ({
  ...init,
  headers: {
    ...init.headers,
    'X-Correlation-ID': crypto.randomUUID(),
  },
});

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  fetchFn: createInterceptedFetch([addAuthHeader, addCorrelationId]),
});
```

## Response Transformers

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';

// Transform responses
const createTransformingFetch = (
  transform: (response: Response) => Promise<Response>
) => {
  return async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    return transform(response);
  };
};

// Example: Add caching headers
const addCacheHeaders = async (response: Response) => {
  // Clone response to modify
  const body = await response.json();
  return new Response(JSON.stringify(body), {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers),
      'X-Cache': 'MISS',
    },
  });
};

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  fetchFn: createTransformingFetch(addCacheHeaders),
});
```

## Testing Patterns

### Unit Testing with Mocks

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  const client = createGracefulClient<APIs>({
    pontxSpecMeta: specMeta,
    getFetchUrl: (path) => `https://api.example.com${path}`,
    mock: {
      enabled: true,
      responses: {
        'users/getUser': { id: '123', name: 'Test User' },
        'users/listUsers': [{ id: '1', name: 'User 1' }],
      },
    },
  });

  it('should get user by ID', async () => {
    const user = await client.users.getUser({ userId: '123' });
    expect(user.id).toBe('123');
    expect(user.name).toBe('Test User');
  });
});
```

### Integration Testing

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

describe('API Integration', () => {
  const client = createGracefulClient<APIs>({
    pontxSpecMeta: specMeta,
    getFetchUrl: (path) => `${process.env.TEST_API_URL}${path}`,
    logger: { enabled: true },
  });

  let testUserId: string;

  beforeAll(async () => {
    const user = await client.users.createUser({
      name: 'Integration Test User',
      email: 'test@example.com',
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await client.users.deleteUser({ userId: testUserId });
  });

  it('should get created user', async () => {
    const user = await client.users.getUser({ userId: testUserId });
    expect(user.name).toBe('Integration Test User');
  });
});
```

## Performance Optimization

### Request Batching

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
});

// Batch multiple requests
async function getMultipleUsers(userIds: string[]) {
  return Promise.all(
    userIds.map(userId => client.users.getUser({ userId }))
  );
}
```

### Connection Pooling (Node.js)

```typescript
import { Agent } from 'http';
import { createGracefulClient } from '@pontx/nodejs-sdk';

// Create HTTP agent with connection pooling
const agent = new Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
});

const pooledFetch = async (url: string, init?: RequestInit) => {
  return fetch(url, {
    ...init,
    // @ts-ignore - Node.js specific
    agent,
  });
};

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  fetchFn: pooledFetch,
});
```
