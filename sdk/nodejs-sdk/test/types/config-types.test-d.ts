/**
 * Type tests for configuration-related types
 *
 * These tests verify that configuration types are correctly defined and enforced.
 */

import { expectType, expectError, expectAssignable } from 'tsd';
import type {
  CreateClientConfig,
  ValidationConfig,
  MockConfig,
  RetryConfig,
  LoggerConfig,
  Logger,
  SdkUsage,
  APIMethod,
  RequestFn,
  PontxSpecMeta,
} from '../../src/types';

// Mock types for testing
type TestAPIMethod = APIMethod<{ id: number }, { name: string }, { id: number; name: string }>;
type TestAPIs = {
  users: {
    getUser: TestAPIMethod;
  };
};

// ============================================================================
// Logger interface tests
// ============================================================================

declare const logger: Logger;

// Should have info, warn, error methods
expectType<void>(logger.info('message'));
expectType<void>(logger.info('message', { key: 'value' }));
expectType<void>(logger.warn('message'));
expectType<void>(logger.warn('message', { key: 'value' }));
expectType<void>(logger.error('message'));
expectType<void>(logger.error('message', { key: 'value' }));

// ============================================================================
// ValidationConfig type tests
// ============================================================================

declare const validationConfig: ValidationConfig;

// Should have optional schemas and enabled properties
expectAssignable<ValidationConfig>({
  schemas: {
    'users/getUser': {} as any, // ZodSchema placeholder
  },
});

expectAssignable<ValidationConfig>({
  schemas: {},
  enabled: true,
});

expectAssignable<ValidationConfig>({
  enabled: false,
});

expectAssignable<ValidationConfig>({});

// ============================================================================
// MockConfig type tests
// ============================================================================

declare const mockConfig: MockConfig;

// Should have required data property
expectAssignable<MockConfig>({
  data: {
    'users/getUser': { id: 1, name: 'Test' },
  },
});

// Should have optional delay and enabled properties
expectAssignable<MockConfig>({
  data: {},
  delay: 100,
  enabled: true,
});

// data is required - this should error
expectError<MockConfig>({
  delay: 100,
});

// ============================================================================
// RetryConfig type tests
// ============================================================================

declare const retryConfig: RetryConfig;

// Should have optional maxAttempts, backoff, retryableErrors properties
expectAssignable<RetryConfig>({
  maxAttempts: 3,
});

expectAssignable<RetryConfig>({
  backoff: 'exponential',
});

expectAssignable<RetryConfig>({
  backoff: 'linear',
});

// Invalid backoff value should error
expectError<RetryConfig>({
  backoff: 'invalid',
});

expectAssignable<RetryConfig>({
  retryableErrors: [500, 502, 'ECONNREFUSED'],
});

expectAssignable<RetryConfig>({
  maxAttempts: 3,
  backoff: 'exponential',
  retryableErrors: [500],
});

expectAssignable<RetryConfig>({});

// ============================================================================
// LoggerConfig type tests
// ============================================================================

declare const loggerConfig: LoggerConfig;

// Should have optional instance and enabled properties
expectAssignable<LoggerConfig>({
  instance: logger,
});

expectAssignable<LoggerConfig>({
  enabled: true,
});

expectAssignable<LoggerConfig>({
  instance: logger,
  enabled: false,
});

expectAssignable<LoggerConfig>({});

// ============================================================================
// SdkUsage type tests
// ============================================================================

declare const sdkUsage: SdkUsage<TestAPIMethod>;

// Should have request method - second parameter is RequestOptions with body
expectType<Promise<{ id: number; name: string }>>(
  sdkUsage.request({ id: 1 }, { body: { name: 'test' } })
);

// Should have getFetchKey method - only takes params
expectType<string>(sdkUsage.getFetchKey({ id: 1 }));

// Should have queryOptions method
const queryOptions = sdkUsage.queryOptions({ id: 1 }, { body: { name: 'test' } });
expectType<string[]>(queryOptions.queryKey);
expectType<() => Promise<{ id: number; name: string }>>(queryOptions.queryFn);

// ============================================================================
// RequestFn type tests
// ============================================================================

declare const requestFn: RequestFn;

// Should accept URL and RequestInit
expectType<Promise<Response>>(requestFn('https://api.example.com', {}));
expectType<Promise<Response>>(
  requestFn('https://api.example.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'value' }),
  })
);

// ============================================================================
// CreateClientConfig type tests
// ============================================================================

declare const pontxSpecMeta: PontxSpecMeta;

// Minimal config - only pontxSpecMeta is required
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
});

// fetchFn is optional
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  fetchFn: async (url, init) => {
    return new Response();
  },
});

// Full config with all options
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  fetchFn: requestFn,
  pathMark: ':id',
  getFetchUrl: (path, params) => `https://api.example.com${path}`,
  makeCustomUsages: (usages, apiMeta) => ({
    customMethod: () => 'custom',
  }),
  validation: {
    schemas: {},
    enabled: true,
  },
  mock: {
    data: {},
    delay: 100,
    enabled: true,
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    retryableErrors: [500],
  },
  logger: {
    instance: logger,
    enabled: true,
  },
});

// pontxSpecMeta is required - this should error
expectError<CreateClientConfig<TestAPIs>>({
  fetchFn: requestFn,
});

// Test that fetchFn has correct signature
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  fetchFn: async (url: string, init: RequestInit) => {
    return fetch(url, init);
  },
});

// Invalid fetchFn signature should error - returns wrong type
expectError<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  fetchFn: async (url: string, init: RequestInit) => {
    return 'invalid';
  },
});

// Test validation config
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  validation: {
    schemas: {
      'users/getUser': {} as any,
    },
  },
});

// Test mock config
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  mock: {
    data: {
      'users/getUser': { id: 1, name: 'Test' },
    },
  },
});

// Test retry config
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },
});

// Test logger config
expectAssignable<CreateClientConfig<TestAPIs>>({
  pontxSpecMeta,
  logger: {
    enabled: true,
  },
});