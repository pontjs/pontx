/**
 * Logger Module - Request/response logging for debugging
 *
 * This module provides logging functionality for requests, responses, and errors
 * with automatic sensitive data masking.
 *
 * Features:
 * - Request logging (URL, method, params)
 * - Response logging (status, duration)
 * - Error logging with context
 * - Automatic sensitive data masking
 * - Custom logger support
 * - Auto-enable in development mode
 */

import type { RequestFn, LoggerConfig, Logger } from '../types';

/**
 * Default sensitive field names to mask
 */
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'apiToken',
  'api_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'auth',
  'key',
  'privateKey',
  'private_key',
];

/**
 * Mask value constant
 */
const MASK_VALUE = '***';

/**
 * Extract API key from URL
 * @param url - Request URL
 * @returns API key (controller/method)
 */
function extractApiKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').filter(Boolean);
    return path.slice(-2).join('/');
  } catch {
    const match = url.match(/\/([^/]+)\/([^/?]+)/);
    return match ? `${match[1]}/${match[2]}` : '';
  }
}

/**
 * Check if a field name is sensitive
 * @param fieldName - Field name to check
 * @param customFields - Additional sensitive field names
 * @returns true if field is sensitive
 */
function isSensitiveField(
  fieldName: string,
  customFields: string[] = []
): boolean {
  const allFields = [...DEFAULT_SENSITIVE_FIELDS, ...customFields];
  const lowerFieldName = fieldName.toLowerCase();

  return allFields.some(sensitiveField =>
    lowerFieldName.includes(sensitiveField.toLowerCase())
  );
}

/**
 * Mask sensitive data in an object (deep copy with masking)
 *
 * @param data - Data to mask
 * @param customSensitiveFields - Additional sensitive field names
 * @returns Masked copy of data
 */
export function maskSensitiveData(
  data: any,
  customSensitiveFields: string[] = []
): any {
  // Handle primitive types
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, customSensitiveFields));
  }

  // Handle objects
  const masked: any = {};

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];

      if (isSensitiveField(key, customSensitiveFields)) {
        // Mask sensitive fields
        if (value === null || value === undefined) {
          masked[key] = value;
        } else {
          masked[key] = MASK_VALUE;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively mask nested objects
        masked[key] = maskSensitiveData(value, customSensitiveFields);
      } else {
        // Copy non-sensitive values
        masked[key] = value;
      }
    }
  }

  return masked;
}

/**
 * Safe logger wrapper that catches errors
 * @param logger - Logger instance
 * @param level - Log level
 * @param message - Log message
 * @param meta - Log metadata
 */
function safeLog(
  logger: Logger,
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>
): void {
  try {
    logger[level](message, meta);
  } catch (error) {
    // Silently ignore logger errors to avoid breaking the request
    // In production, logging failures should not break functionality
  }
}

/**
 * Wrapper function that adds logging to a request function
 *
 * This decorator logs requests, responses, and errors for debugging purposes.
 * Sensitive data is automatically masked.
 *
 * @param requestFn - Original request function to wrap
 * @param config - Logger configuration
 * @returns Wrapped request function with logging
 */
export function withLogging(
  requestFn: RequestFn,
  config?: LoggerConfig
): RequestFn {
  // If no config provided at all, return original function
  if (!config) {
    return requestFn;
  }

  // Check if logging should be enabled
  const shouldEnable = config.enabled ?? (process.env.NODE_ENV === 'development');

  // If logging disabled, return original function
  if (!shouldEnable) {
    return requestFn;
  }

  // Get logger instance (use custom or default to console)
  const logger = config?.instance || console;

  // Return wrapped function that maintains the same signature
  return async (url: string, init?: RequestInit): Promise<Response> => {
    // Extract request metadata
    const apiKey = extractApiKeyFromUrl(url);
    const method = init?.method || 'GET';
    const params = (init as any)?._params;
    const headers = init?.headers;

    // Record start time for duration calculation
    const startTime = Date.now();

    // Mask sensitive data before logging
    const maskedParams = params ? maskSensitiveData(params) : undefined;
    const maskedHeaders = headers ? maskSensitiveData(headers) : undefined;

    // Log request
    safeLog(logger, 'info', `Request: ${method} ${apiKey}`, {
      apiKey,
      url,
      method,
      ...(maskedParams && { params: maskedParams }),
      ...(maskedHeaders && { headers: maskedHeaders }),
    });

    try {
      // Execute the actual request
      const response = await requestFn(url, init);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log successful response
      safeLog(logger, 'info', `Response: ${method} ${apiKey}`, {
        apiKey,
        status: response.status,
        duration,
      });

      return response;
    } catch (error: any) {
      // Calculate duration even for errors
      const duration = Date.now() - startTime;

      // Log error
      safeLog(logger, 'error', `Error: ${method} ${apiKey}`, {
        apiKey,
        url,
        method,
        error: error.message,
        ...(error.status && { status: error.status }),
        ...(error.code && { code: error.code }),
        duration,
      });

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Create a default console logger
 * @returns Logger instance using console
 */
export function createConsoleLogger(): Logger {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.info(message, meta);
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(message, meta);
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(message, meta);
    },
  };
}
