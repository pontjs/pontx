/**
 * @pontx/sdk-core - Shared core utilities for Pontx SDK
 *
 * This package provides:
 * 1. URL building and query parameter handling
 * 2. Request body serialization
 * 3. Type definitions for API clients
 * 4. Feature modules (validation, mock, retry, logging, error handling)
 * 5. Multiple SDK calling styles (standard, graceful, flat)
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Utilities
// ============================================================================

// URL building
export {
  buildUrl,
  getPathParamNames,
  appendQueryParams,
  createUrlBuilder,
} from "./url";
export type { BuildUrlOptions, UrlBuilder, UrlBuilderOptions } from "./url";

// Request body serialization
export { serializeRequestBody, getContentType } from "./request-body";

// Type definitions
export type {
  PontxSpecMeta,
  PontxAPIMeta,
  APIMethod,
  Controller,
  Client,
  RequestHeaders,
  ContentType,
  FetchFunction,
  SdkUsage,
} from "./types";

// ============================================================================
// Feature Modules
// ============================================================================

// Validation and Mock
export { withMock, type MockConfig } from "./features";
export { withRetry, type RetryConfig } from "./features";

// ============================================================================
// SDK Builders
// ============================================================================

// Proxy client builder
export {
  buildProxyClient,
  parseApiKey,
  buildHeaders,
  generateFetchKey,
} from "./builders";
export type { ProxyClientOptions, RequestOptions } from "./builders";

// Graceful client builder (Requirement 8.4)
export {
  createGracefulClient,
  buildGracefulProxyClient,
  createCallableApiMethod,
  classifyParameters,
  selectSignatureMode,
} from "./builders";
export type {
  CreateGracefulClientConfig,
  GracefulClient,
  GracefulProxyOptions,
  CallableApiMethod,
  CallableMethodOptions,
  ClassifiedParameters,
  SignatureMode,
} from "./builders";

// Version
export const VERSION = "0.1.0";
