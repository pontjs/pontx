/**
 * @pontx/nodejs-sdk - Type-safe API client for Node.js >= 18
 *
 * Main entry point for the SDK
 */

// Export all types
export type {
  // Base types from @pontx/spec
  PontxSpecMeta,
  PontxAPI,
  // Core SDK types
  APIType,
  SdkUsage,
  Controller,
  Client,
  // Request/Response types
  RequestHeaders,
  ContentType,
  RequestOptions,
  // Configuration types
  CreateClientConfig,
  ValidationConfig,
  MockConfig,
  RetryConfig,
  LoggerConfig,
  Logger,
  FetchFunction,
  RequestFn, // Deprecated alias for FetchFunction
  // Graceful client types
  GracefulClient,
  GracefulController,
  CreateGracefulClientConfig,
  CallableApiMethod,
  CallableApiMethodTwoParam,
  CallableApiMethodThreeParam,
  MergeParamsAndBody,
  GracefulProxyOptions,
  SignatureMode,
  ClassifiedParameters,
  // Flat client types
  FlatClient,
  CreateFlatClientConfig,
  FlatProxyOptions,
} from "./types";

// Export feature modules
export {
  withValidation,
  VALIDATION_ERROR_CODES,
  isZodAvailable,
  validateZodAvailability,
  withMock,
  MOCK_ERROR_CODES,
  isMockResponse,
  withRetry,
  RETRY_ERROR_CODES,
  withLogging,
  maskSensitiveData,
  createConsoleLogger,
  PontxError,
  ERROR_CODES,
  wrapError,
  withTimeout,
} from "./features";

// Core functionality
export { createClient } from "./core/create-client";
export { buildProxyClient } from "./core/proxy-client";

// Graceful client (NEW entry point)
export { createGracefulClient } from "./graceful/create-graceful-client";
export { buildGracefulProxyClient } from "./graceful/proxy-builder";
export { createCallableApiMethod } from "./graceful/callable-method";
export { classifyParameters } from "./graceful/parameter-classifier";
export { selectSignatureMode } from "./graceful/signature-selector";

// Flat client (NEW entry point for flat API specifications)
export { createFlatClient } from "./flat/create-flat-client";
export { buildFlatProxyClient } from "./flat/proxy-builder";

// Version constant
export const VERSION = "0.1.0";
