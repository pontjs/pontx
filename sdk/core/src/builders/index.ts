/**
 * Builders Module
 *
 * Exports client builder functions and utilities
 */

export {
  buildProxyClient,
  parseApiKey,
  buildHeaders,
  generateFetchKey,
} from './proxy-client';

export type {
  ProxyClientOptions,
  RequestOptions,
} from './proxy-client';

// Graceful client support
export {
  createGracefulClient,
  buildGracefulProxyClient,
  createCallableApiMethod,
  classifyParameters,
  selectSignatureMode,
} from './graceful';

export type {
  CreateGracefulClientConfig,
  GracefulClient,
  GracefulProxyOptions,
  CallableApiMethod,
  CallableMethodOptions,
  ClassifiedParameters,
  SignatureMode,
} from './graceful';
