/**
 * Completion Context Parser
 *
 * Parses command line input to determine the current completion context.
 */

import {
  CompletionInput,
  CompletionContext,
  CompletionOptions,
  ApiPathInfo,
} from "./types";

/** Commands that accept API path as argument */
const API_PATH_COMMANDS = ["call", "show-api", "gen"];

/** Options that require a value */
const OPTIONS_WITH_VALUES = new Set([
  "env",
  "e",
  "header",
  "H",
  "output",
  "o",
  "query",
  "q",
  "case",
  "params",
  "body",
  "max",
  "global",
  "port",
  "p",
  "interval",
  "i",
  "log-level",
  "l",
]);

/** Boolean options (no value) */
const BOOLEAN_OPTIONS = new Set([
  "debug",
  "dry-run",
  "use-remote",
  "help",
  "h",
  "version",
  "V",
  "no-watch",
  "no-sync",
  "no-web",
  "force",
  "f",
]);

/**
 * Check if an option requires a value
 */
export function optionNeedsValue(option: string): boolean {
  const name = option.replace(/^-+/, "");
  return OPTIONS_WITH_VALUES.has(name);
}

/**
 * Check if an option is a boolean flag
 */
export function isBooleanOption(option: string): boolean {
  const name = option.replace(/^-+/, "");
  return BOOLEAN_OPTIONS.has(name);
}

/**
 * Parse dot-separated API path into parts
 * Handles special cases like quoted segments
 */
export function parseDotSeparatedPath(path: string): string[] {
  if (!path) return [];

  // Simple case: no special characters
  return path.split(".");
}

/**
 * Parse partial API path input to determine completion context
 *
 * Examples:
 * - "pet" -> { partial: "pet", completing: "spec" }
 * - "petstore." -> { specName: "petstore", partial: "", completing: "tag" }
 * - "petstore.pet." -> { specName: "petstore", tagName: "pet", partial: "", completing: "api" }
 * - "petstore.pet.get" -> { specName: "petstore", tagName: "pet", partial: "get", completing: "api" }
 *
 * With fixedSpecName="yuque":
 * - "doc" -> { specName: "yuque", partial: "doc", completing: "tag" }
 * - "doc." -> { specName: "yuque", tagName: "doc", partial: "", completing: "api" }
 * - "doc.read" -> { specName: "yuque", tagName: "doc", partial: "read", completing: "api" }
 *
 * With singleSpecName="petstore" and hasTags=true:
 * - "pet" -> { specName: "petstore", partial: "pet", completing: "tag" }
 * - "pet." -> { specName: "petstore", tagName: "pet", partial: "", completing: "api" }
 * - "pet.get" -> { specName: "petstore", tagName: "pet", partial: "get", completing: "api" }
 *
 * With singleSpecName="petstore" and hasTags=false:
 * - "getPet" -> { specName: "petstore", partial: "getPet", completing: "api" }
 */
export function parsePartialApiPath(
  partial: string,
  fixedSpecName?: string,
  singleSpecName?: string,
  hasTags?: boolean
): ApiPathInfo {
  const endsWithDot = partial.endsWith(".");
  // Filter out empty parts caused by trailing dot
  const rawParts = parseDotSeparatedPath(partial);
  const parts = rawParts.filter((p) => p !== "");
  const dotCount = (partial.match(/\./g) || []).length;

  if (fixedSpecName) {
    // Proxy mode: path starts from tag
    // dotCount: 0 = completing tag, 1+ = completing api
    if (dotCount === 0) {
      // Input: "" or "doc" -> completing tag
      return {
        specName: fixedSpecName,
        partial: parts[0] || "",
        completing: "tag",
      };
    }

    // dotCount >= 1: completing api
    // Input: "doc." or "doc.read" or "doc.read." -> completing api
    return {
      specName: fixedSpecName,
      tagName: parts[0] || "",
      partial: endsWithDot ? "" : parts[1] || "",
      completing: "api",
    };
  }

  // Single spec mode (only one spec configured)
  if (singleSpecName) {
    if (hasTags) {
      // Has tags: treat input as tag.api format
      if (dotCount === 0) {
        // Input: "" or "pet" -> completing tag
        return {
          specName: singleSpecName,
          partial: parts[0] || "",
          completing: "tag",
        };
      }

      // dotCount >= 1: completing api
      // Input: "pet." or "pet.get" -> completing api
      return {
        specName: singleSpecName,
        tagName: parts[0] || "",
        partial: endsWithDot ? "" : parts[1] || "",
        completing: "api",
      };
    } else {
      // No tags: treat input as api name directly
      // Input: "" or "getPet" -> completing api
      return {
        specName: singleSpecName,
        partial: parts[0] || "",
        completing: "api",
      };
    }
  }

  // Standard mode: path starts from spec
  // dotCount: 0 = completing spec, 1 = completing tag, 2+ = completing api
  if (dotCount === 0) {
    // Input: "" or "pet" -> completing spec
    return {
      partial: parts[0] || "",
      completing: "spec",
    };
  }

  if (dotCount === 1) {
    // Input: "petstore." or "petstore.pet" -> completing tag
    return {
      specName: parts[0] || "",
      partial: endsWithDot ? "" : parts[1] || "",
      completing: "tag",
    };
  }

  // dotCount >= 2: completing api
  // Input: "petstore.pet." or "petstore.pet.get" -> completing api
  return {
    specName: parts[0] || "",
    tagName: parts[1] || "",
    partial: endsWithDot ? "" : parts.slice(2).join("."),
    completing: "api",
  };
}

/**
 * Parse words into options and positional arguments
 */
export function parseWordsToOptionsAndArgs(words: string[]): {
  options: Set<string>;
  args: string[];
} {
  const options = new Set<string>();
  const args: string[] = [];

  let i = 0;
  while (i < words.length) {
    const word = words[i];

    if (word.startsWith("--")) {
      const optName = word.slice(2);
      options.add(optName);

      // Skip value if this option takes one
      if (optionNeedsValue(word) && i + 1 < words.length) {
        i++;
      }
    } else if (word.startsWith("-") && word.length === 2) {
      const optName = word.slice(1);
      options.add(optName);

      // Skip value if this option takes one
      if (optionNeedsValue(word) && i + 1 < words.length) {
        i++;
      }
    } else {
      args.push(word);
    }

    i++;
  }

  return { options, args };
}

/**
 * Parse completion input to determine context
 *
 * @param input Completion input from shell
 * @param options Completion engine options
 * @returns Parsed completion context
 */
export function parseCompletionContext(
  input: CompletionInput,
  options: CompletionOptions = {}
): CompletionContext {
  const { words, wordIndex } = input;

  // words[0] is the command name (pontx or yuque)
  const command = words[1]; // subcommand

  // Completing the subcommand itself
  if (wordIndex === 1) {
    return {
      position: "command",
      input,
      providedOptions: new Set(),
    };
  }

  // No subcommand yet
  if (!command) {
    return {
      position: "command",
      input,
      providedOptions: new Set(),
    };
  }

  // Parse existing options and args (excluding command name and subcommand)
  const { options: parsedOptions, args } = parseWordsToOptionsAndArgs(
    words.slice(2, wordIndex)
  );

  // Current word being completed
  const currentWord = words[wordIndex] || "";

  // Previous word
  const prevWord = words[wordIndex - 1] || "";

  // Check if completing an option name
  if (currentWord.startsWith("-")) {
    return {
      position: "option",
      command,
      input,
      providedOptions: parsedOptions,
    };
  }

  // Check if completing an option value
  if (prevWord.startsWith("-") && optionNeedsValue(prevWord)) {
    return {
      position: "option-value",
      command,
      currentOption: prevWord,
      input,
      providedOptions: parsedOptions,
    };
  }

  // Completing argument (e.g., API path for call/show-api/gen)
  if (API_PATH_COMMANDS.includes(command)) {
    // Check if API path argument already exists
    // Determine minimum dot count based on mode
    const hasCompleteApiPath = args.some((arg) => {
      const dotCount = (arg.match(/\./g) || []).length;

      // Single spec mode
      if (options.singleSpecName) {
        if (options.hasTags) {
          // Has tags: tag.api requires at least 1 dot
          return dotCount >= 1;
        } else {
          // No tags: api only, requires 0 dots (just the api name)
          return dotCount === 0 && arg.length > 0;
        }
      }

      // Fixed spec (proxy) mode: tag.api requires at least 1 dot
      if (options.fixedSpecName) {
        return dotCount >= 1;
      }

      // Multi-spec mode: spec.tag.api requires at least 2 dots
      return dotCount >= 2;
    });

    // If API path is complete and current word is empty or starts with -, complete options
    if (hasCompleteApiPath && (currentWord === "" || currentWord.startsWith("-"))) {
      return {
        position: "option",
        command,
        input,
        providedOptions: parsedOptions,
      };
    }

    const apiPath = parsePartialApiPath(
      currentWord,
      options.fixedSpecName,
      options.singleSpecName,
      options.hasTags
    );
    return {
      position: "argument",
      command,
      apiPath,
      input,
      providedOptions: parsedOptions,
    };
  }

  // Generic argument completion
  return {
    position: "argument",
    command,
    input,
    providedOptions: parsedOptions,
  };
}

/**
 * Create a CompletionInput from shell environment variables
 *
 * @param line COMP_LINE - the full command line
 * @param wordIndex COMP_CWORD - current word index
 * @param cursor COMP_POINT - cursor position (optional)
 * @returns CompletionInput
 */
export function createCompletionInput(
  line: string,
  wordIndex: number,
  cursor?: number
): CompletionInput {
  return {
    line,
    cursor: cursor ?? line.length,
    wordIndex,
    words: line.split(/\s+/).filter(Boolean),
  };
}
