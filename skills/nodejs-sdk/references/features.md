# Features

@pontx/nodejs-sdk provides four optional features that can be composed with any client type.

## Feature Wrapping Order

Features are applied as middleware in this order:
```
Request → Validation → Mock → Retry → Logging → Fetch
```

Each feature wraps the request function, allowing clean composition.

## Validation

Parameter validation using Zod schemas (optional peer dependency).

### Installation

```bash
npm install zod
```

### Basic Usage

```typescript
import { createGracefulClient } from '@pontx/nodejs-sdk';
import { z } from 'zod';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  validation: {
    enabled: true,
  },
});
```

### With Zod Schemas

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  validation: {
    enabled: true,
    schemas: {
      'users/createUser': z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0).max(120).optional(),
      }),
      'users/getUser': z.object({
        userId: z.string().uuid(),
      }),
    },
  },
});
```

### Validation Behavior

1. **Schema Validation**: If a Zod schema is defined, params are validated against it
2. **Required Params Check**: Validates that required parameters are present
3. **Required Body Check**: Validates that required body is present
4. **Deprecation Warning**: Logs warning for deprecated APIs

### Error Codes

```typescript
import { VALIDATION_ERROR_CODES } from '@pontx/nodejs-sdk';

// VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED - Zod validation failed
// VALIDATION_ERROR_CODES.MISSING_PARAMS - Required params missing
// VALIDATION_ERROR_CODES.MISSING_BODY - Required body missing
```

### Checking Zod Availability

```typescript
import { isZodAvailable, validateZodAvailability } from '@pontx/nodejs-sdk';

if (isZodAvailable()) {
  // Zod is installed
}

// Throws if validation is configured but Zod is not installed
validateZodAvailability(config.validation);
```

## Mock

Static mock responses for testing without hitting real APIs.

### Basic Usage

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  mock: {
    enabled: true,
    responses: {
      'users/getUser': { id: '123', name: 'Mock User', email: 'mock@example.com' },
      'users/listUsers': [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ],
    },
  },
});
```

### Conditional Mocking

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  mock: {
    // Only enable in test environment
    enabled: process.env.NODE_ENV === 'test',
    responses: mockResponses,
  },
});
```

### Checking Mock Response

```typescript
import { isMockResponse } from '@pontx/nodejs-sdk';

const response = await client.users.getUser({ userId: '123' });
if (isMockResponse(response)) {
  // This is a mock response
}
```

### Error Codes

```typescript
import { MOCK_ERROR_CODES } from '@pontx/nodejs-sdk';

// MOCK_ERROR_CODES.MOCK_NOT_FOUND - No mock defined for this API
```

## Retry

Automatic retry with configurable backoff strategy.

### Basic Usage

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },
});
```

### Configuration Options

```typescript
interface RetryConfig {
  // Maximum number of retry attempts (default: 3)
  maxAttempts?: number;

  // Backoff strategy: 'exponential' or 'linear' (default: 'exponential')
  backoff?: 'exponential' | 'linear';

  // Custom retryable error codes/statuses
  retryableErrors?: Array<string | number>;
}
```

### Backoff Strategies

**Exponential** (default):
- Attempt 1 delay: 1s
- Attempt 2 delay: 2s
- Attempt 3 delay: 4s
- Maximum delay: 10s

**Linear**:
- Attempt 1 delay: 1s
- Attempt 2 delay: 2s
- Attempt 3 delay: 3s
- Maximum delay: 10s

### Retryable Errors

By default, these errors trigger retry:
- **5xx status codes**: Server errors (500, 502, 503, etc.)
- **Network errors**: ECONNREFUSED, ECONNRESET, ETIMEDOUT, ENOTFOUND, ENETUNREACH

**Not retried**:
- **4xx status codes**: Client errors (400, 401, 403, 404, etc.)

### Custom Retryable Errors

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    retryableErrors: [429, 503, 'RATE_LIMIT'],
  },
});
```

### Error Codes

```typescript
import { RETRY_ERROR_CODES } from '@pontx/nodejs-sdk';

// RETRY_ERROR_CODES.RETRY_EXHAUSTED - All retry attempts failed
```

## Logger

Request/response logging with automatic sensitive data masking.

### Basic Usage

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  logger: {
    enabled: true,
  },
});
```

### Auto-Enable in Development

```typescript
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  logger: {
    // Automatically enabled when NODE_ENV === 'development'
  },
});
```

### Custom Logger

```typescript
import { createConsoleLogger } from '@pontx/nodejs-sdk';

const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta,
  getFetchUrl: (path) => `https://api.example.com${path}`,
  logger: {
    enabled: true,
    instance: {
      info: (msg, meta) => myLogger.info(msg, meta),
      warn: (msg, meta) => myLogger.warn(msg, meta),
      error: (msg, meta) => myLogger.error(msg, meta),
    },
  },
});
```

### Sensitive Data Masking

The logger automatically masks these fields:
- `password`, `passwd`, `pwd`
- `secret`
- `token`, `apiToken`, `accessToken`, `refreshToken`
- `apiKey`, `api_key`
- `authorization`, `auth`
- `key`, `privateKey`

```typescript
import { maskSensitiveData } from '@pontx/nodejs-sdk';

const masked = maskSensitiveData({
  username: 'john',
  password: 'secret123',
  apiKey: 'sk-xxxxx',
});
// Result: { username: 'john', password: '***', apiKey: '***' }
```

### Log Output Example

```
INFO Request: POST users/createUser
  { apiKey: 'users/createUser', url: '/users', method: 'POST', params: { name: 'John', password: '***' } }

INFO Response: POST users/createUser
  { apiKey: 'users/createUser', status: 201, duration: 142 }

ERROR Error: POST users/createUser
  { apiKey: 'users/createUser', url: '/users', method: 'POST', error: 'Validation failed', status: 400, duration: 23 }
```

## Error Handling

All features use a common error pattern:

```typescript
import { PontxError, ERROR_CODES, wrapError } from '@pontx/nodejs-sdk';

try {
  await client.users.getUser({ userId: '123' });
} catch (error) {
  if (error instanceof PontxError) {
    console.log('Error code:', error.code);
    console.log('API key:', error.apiKey);
    console.log('Original error:', error.cause);
  }
}
```

### Timeout

```typescript
import { withTimeout } from '@pontx/nodejs-sdk';

// Wrap any request function with timeout
const timedFetch = withTimeout(fetch, 5000); // 5 second timeout
```
