/**
 * Core modules for @pontx/nodejs-sdk
 *
 * This module exports URL building, request body serialization,
 * and other core functionality used by the SDK.
 */

// URL Building (Tasks 3.1, 3.2, 3.3)
export { buildUrl, getPathParamNames } from './build-url';
export type { BuildUrlOptions } from './build-url';

export { appendQueryParams } from './query-params';

export { createUrlBuilder } from './url-builder';
export type { UrlBuilderOptions, UrlBuilder } from './url-builder';

// Request Body Serialization (Tasks 4.1, 4.2, 4.3, 4.4)
export { serializeRequestBody, getContentType } from './request-body';

// Flat Client Validation (Task 3.1)
export { validateFlatStructure } from './validate-flat';
