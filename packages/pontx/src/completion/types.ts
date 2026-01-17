/**
 * Shell Completion Types
 *
 * Core type definitions for the pontx shell completion system.
 */

/**
 * Completion engine configuration
 */
export interface CompletionOptions {
  /**
   * Fixed specName (proxy CLI mode)
   * - When set, specName completion will be skipped
   * - API path completion will omit specName prefix
   */
  fixedSpecName?: string;

  /**
   * Single spec mode (only one spec configured)
   * - When set, specName completion will be skipped
   * - API path can use simplified format (tag.api or api)
   */
  singleSpecName?: string;

  /**
   * Whether the single spec has tags
   * - Used to determine API path format in single spec mode
   * - true: tag.api format
   * - false: api format only
   */
  hasTags?: boolean;

  /**
   * Working directory (for loading local pontx.config.ts)
   */
  cwd?: string;

  /**
   * Commands to expose (for proxy CLI command filtering)
   * @default all commands
   */
  commands?: string[];

  /**
   * Cache TTL in milliseconds
   * @default 60000 (1 minute)
   */
  cacheTTL?: number;
}

/**
 * Completion input from shell
 */
export interface CompletionInput {
  /** Full command line */
  line: string;

  /** Cursor position (character index) */
  cursor: number;

  /** Current word index (COMP_CWORD) */
  wordIndex: number;

  /** Tokenized words array (COMP_WORDS) */
  words: string[];
}

/**
 * Completion suggestion
 */
export interface CompletionSuggestion {
  /** Completion value */
  value: string;

  /** Display description (for zsh/fish) */
  description?: string;

  /** Completion type (for grouping) */
  type?: "command" | "spec" | "tag" | "api" | "param" | "value";
}

/**
 * Completion result
 */
export interface CompletionResult {
  /** Suggestion list */
  suggestions: CompletionSuggestion[];

  /** Whether to add space suffix */
  addSpace?: boolean;
}

/**
 * Parsed API path parts
 */
export interface ApiPathInfo {
  specName?: string;
  tagName?: string;
  apiName?: string;
  /** Partial input being typed */
  partial: string;
  /** Which part is being completed */
  completing: "spec" | "tag" | "api";
}

/**
 * Completion context (parsed input state)
 */
export interface CompletionContext {
  /** Current command (e.g., 'call', 'search') */
  command?: string;

  /** Current completion position */
  position: "command" | "argument" | "option" | "option-value";

  /** Parsed API path parts */
  apiPath?: ApiPathInfo;

  /** Current option (e.g., '--env') */
  currentOption?: string;

  /** Already provided options */
  providedOptions: Set<string>;

  /** Original input */
  input: CompletionInput;
}

/**
 * Parameter info for completion
 */
export interface ParamInfo {
  name: string;
  required: boolean;
  type: string;
  description?: string;
  enum?: string[];
}

/**
 * Completion provider interface
 */
export interface CompletionProvider {
  /** Check if this provider can handle the context */
  canHandle(context: CompletionContext): boolean;

  /** Provide completion suggestions */
  provide(context: CompletionContext): Promise<CompletionSuggestion[]>;
}

/**
 * Shell script generation options
 */
export interface ShellScriptOptions {
  /** Command name (pontx / yuque) */
  binName: string;

  /** Fixed specName (proxy mode) */
  fixedSpecName?: string;

  /** Supported commands */
  commands?: string[];
}

/**
 * Shell types supported
 */
export type ShellType = "bash" | "zsh" | "fish";
