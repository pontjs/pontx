// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Validation configuration (optional feature)
 */
export type ValidationConfig = {
  /** Zod schemas by API key (controllerName/methodName) */
  schemas?: Record<string, any>; // ZodSchema
  /** Enable validation */
  enabled?: boolean;
};

/**
 * Mock configuration (optional feature)
 */
export type MockConfig = {
  /** Mock data by API key (controllerName/methodName) */
  data: Record<string, unknown>;
  /** Delay in milliseconds before returning mock data */
  delay?: number;
  /** Enable mock mode */
  enabled?: boolean;
  /** Strict mode - require all APIs to have mock data (default: false) */
  strict?: boolean;
};

/**
 * Retry configuration (optional feature)
 */
export type RetryConfig = {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Backoff strategy (default: exponential) */
  backoff?: 'exponential' | 'linear';
  /** Custom retryable error codes/messages */
  retryableErrors?: Array<string | number>;
};

/**
 * Logger interface
 */
export type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

/**
 * Logger configuration (optional feature)
 */
export type LoggerConfig = {
  /** Custom logger instance */
  instance?: Logger;
  /** Enable logging (default: NODE_ENV === 'development') */
  enabled?: boolean;
};
