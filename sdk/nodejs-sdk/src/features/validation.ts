/**
 * Validation Module - Parameter validation using Zod schemas
 *
 * This module provides optional parameter validation functionality using Zod.
 * It wraps the request function and validates parameters before making API calls.
 *
 * Features:
 * - Zod schema validation (optional)
 * - Basic parameter existence checks
 * - Deprecated API warnings
 * - Clear error messages
 */

import type { RequestFn, ValidationConfig, PontxAPI } from '../types';

/**
 * Error codes for validation failures
 */
export const VALIDATION_ERROR_CODES = {
  SCHEMA_VALIDATION_FAILED: 'VALIDATION_ERROR',
  MISSING_PARAMS: 'MISSING_PARAMS',
  MISSING_BODY: 'MISSING_BODY',
} as const;

/**
 * Context for validation - extracted from request metadata
 */
interface ValidationContext {
  apiKey: string;
  params?: Record<string, unknown>;
  body?: unknown;
  apiMeta?: PontxAPI;
}

/**
 * Extract API key from URL
 * Format: /controller/method or similar
 * This is a simplified version - actual implementation may need to be more sophisticated
 */
function extractApiKeyFromUrl(url: string): string {
  // Simple extraction - assumes URL format like http://domain/controller/method?params
  const urlObj = new URL(url);
  const path = urlObj.pathname.split('/').filter(Boolean);
  return path.slice(-2).join('/'); // Get last two segments
}

/**
 * Validate parameters using Zod schema if provided
 * @param apiKey - API identifier (controllerName/methodName)
 * @param params - Parameters to validate
 * @param config - Validation configuration
 * @throws {Error} Validation error with details
 */
function validateWithSchema(
  apiKey: string,
  params: unknown,
  config: ValidationConfig
): void {
  const schema = config.schemas?.[apiKey];

  if (!schema) {
    // No schema configured for this API
    return;
  }

  try {
    // Use Zod's parse method to validate
    schema.parse(params);
  } catch (error: any) {
    // Wrap Zod error with context
    const validationError = new Error(
      `Parameter validation failed for API "${apiKey}": ${error.message}`
    );
    validationError.name = VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED;
    (validationError as any).code = VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED;
    (validationError as any).apiKey = apiKey;
    (validationError as any).zodError = error;
    throw validationError;
  }
}

/**
 * Check if API has required parameters
 * @param apiMeta - API metadata
 * @returns true if API has required parameters
 */
function hasRequiredParams(apiMeta: PontxAPI): boolean {
  return (apiMeta.parameters || []).some(
    (param) => param.required && param.in !== 'body'
  );
}

/**
 * Check if API has required body
 * @param apiMeta - API metadata
 * @returns true if API has required body parameters
 */
function hasRequiredBody(apiMeta: PontxAPI): boolean {
  return (apiMeta.parameters || []).some(
    (param) => param.required && param.in === 'body'
  );
}

/**
 * Check basic parameter existence
 * @param apiMeta - API metadata
 * @param params - Parameters to check
 * @param body - Request body to check
 * @param apiKey - API identifier for error messages
 * @throws {Error} If required parameters are missing
 */
function checkParameterExistence(
  apiMeta: PontxAPI | undefined,
  params: unknown,
  body: unknown,
  apiKey: string
): void {
  if (!apiMeta) {
    return;
  }

  // Check if params are required but missing
  if (hasRequiredParams(apiMeta) && (params === undefined || params === null)) {
    const error = new Error(
      `API "${apiKey}" requires params but none were provided`
    );
    error.name = VALIDATION_ERROR_CODES.MISSING_PARAMS;
    (error as any).code = VALIDATION_ERROR_CODES.MISSING_PARAMS;
    (error as any).apiKey = apiKey;
    throw error;
  }

  // Check if body is required but missing
  if (hasRequiredBody(apiMeta) && (body === undefined || body === null)) {
    const error = new Error(
      `API "${apiKey}" requires a request body but none was provided`
    );
    error.name = VALIDATION_ERROR_CODES.MISSING_BODY;
    (error as any).code = VALIDATION_ERROR_CODES.MISSING_BODY;
    (error as any).apiKey = apiKey;
    throw error;
  }
}

/**
 * Warn about deprecated APIs
 * @param apiMeta - API metadata
 * @param apiKey - API identifier for warning message
 */
function warnDeprecated(apiMeta: PontxAPI | undefined, apiKey: string): void {
  if (!apiMeta || !apiMeta.deprecated) {
    return;
  }

  const message = apiMeta.description || 'This API is deprecated and may be removed in a future version.';
  console.warn(
    `⚠️ Warning: API "${apiKey}" is deprecated. ${message}`
  );
}

/**
 * Wrapper function that adds validation to a request function
 *
 * This is the core decorator that intercepts requests and validates parameters
 * before passing them to the actual fetch function.
 *
 * @param requestFn - Original request function to wrap
 * @param config - Validation configuration
 * @param apiMetaMap - Optional map of API metadata for existence checks
 * @returns Wrapped request function with validation
 */
export function withValidation(
  requestFn: RequestFn,
  config?: ValidationConfig,
  apiMetaMap?: Record<string, PontxAPI>
): RequestFn {
  // If validation is explicitly disabled or no config provided, return original function
  if (!config || config.enabled === false) {
    return requestFn;
  }

  // Return wrapped function that maintains the same signature
  return async (url: string, init?: RequestInit): Promise<Response> => {
    // Extract context from request
    const apiKey = extractApiKeyFromUrl(url);
    const apiMeta = apiMetaMap?.[apiKey];

    // Extract params and body from request init
    // Note: This is simplified - actual implementation may need more sophisticated extraction
    const body = (init as any)?.body;
    const params = (init as any)?._params; // Internal marker set by client

    // 1. Check basic parameter existence (hasParams, hasBody)
    checkParameterExistence(apiMeta, params, body, apiKey);

    // 2. Validate params with Zod schema if configured
    if (params && config.schemas) {
      validateWithSchema(apiKey, params, config);
    }

    // 3. Warn about deprecated APIs
    warnDeprecated(apiMeta, apiKey);

    // 4. Proceed with the actual request
    return requestFn(url, init);
  };
}

/**
 * Check if Zod is available
 * Since Zod is a peerDependency, we need to check if it's installed
 */
export function isZodAvailable(): boolean {
  try {
    require.resolve('zod');
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that Zod is available when validation is configured
 * @param config - Validation configuration
 * @throws {Error} If Zod is required but not installed
 */
export function validateZodAvailability(config?: ValidationConfig): void {
  if (!config || config.enabled === false) {
    return;
  }

  if (config.schemas && Object.keys(config.schemas).length > 0 && !isZodAvailable()) {
    throw new Error(
      'Validation is configured but Zod is not installed. ' +
      'Please install Zod with: npm install zod'
    );
  }
}
