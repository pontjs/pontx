/**
 * Feature modules for @pontx/nodejs-sdk
 *
 * Optional feature modules that can be composed with the core SDK:
 * - Validation: Parameter validation using Zod schemas
 * - Mock: Static mock data for testing (to be implemented)
 * - Retry: Automatic retry with backoff (to be implemented)
 * - Logger: Request/response logging (to be implemented)
 */

export {
  withValidation,
  VALIDATION_ERROR_CODES,
  isZodAvailable,
  validateZodAvailability,
} from './validation';

export {
  withMock,
  MOCK_ERROR_CODES,
  isMockResponse,
} from './mock';

export {
  withRetry,
  RETRY_ERROR_CODES,
} from './retry';

export {
  withLogging,
  maskSensitiveData,
  createConsoleLogger,
} from './logger';

export {
  PontxError,
  ERROR_CODES,
  wrapError,
  withTimeout,
} from './error-handling';
