/**
 * Graceful client module
 *
 * This module provides the new graceful client entry point with improved API ergonomics.
 * It exports all core components needed to create and use the graceful client.
 */

// Main entry point
export { createGracefulClient } from './create-graceful-client';

// Proxy builder
export { buildGracefulProxyClient } from './proxy-builder';
export type { GracefulProxyOptions } from './proxy-builder';

// Core factory functions
export { createCallableApiMethod } from './callable-method';
export type { CallableApiMethod, CallableMethodOptions } from './callable-method';

// Parameter processing
export { classifyParameters } from './parameter-classifier';
export type { ClassifiedParameters, SignatureMode } from './parameter-classifier';

// Signature mode selection
export { selectSignatureMode } from './signature-selector';

// Re-export signature mode type for convenience
export type { SignatureMode as ApiSignatureMode } from './signature-selector';
