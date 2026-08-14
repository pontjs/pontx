/**
 * Completion Context Parser
 *
 * Parses command line input to determine the current completion context.
 * Supports hierarchical subcommand format:
 *   pontx <specName> <command> <tag> <api> [options]
 *   pontx <command> <tag> <api> [options]  (single spec mode)
 */

import {
  CompletionInput,
  CompletionContext,
  CompletionOptions,
} from "./types";

/** Commands that accept API path as positional arguments (tag + api) */
const API_PATH_COMMANDS = new Set(["call", "show-api", "gen"]);

/** Commands that have subcommands */
const COMMANDS_WITH_SUBCOMMANDS = new Set(["list", "ls"]);

/** All known global commands */
const GLOBAL_COMMANDS = new Set([
  "init", "check", "generate", "mocks", "service", "skill",
  "cache:clean", "add-spec", "cli", "completion", "list", "ls",
  /* spec-scoped commands also appear at root level in single spec mode */
  "call", "show-api", "gen", "show-schema", "search", "list-cases",
]);

/** Options that require a value */
const OPTIONS_WITH_VALUES = new Set([
  "env", "e",
  "header", "H",
  "output", "o",
  "query", "q",
  "confirm",
  "case",
  "params",
  "body",
  "max",
  "global",
  "port", "p",
  "interval", "i",
  "log-level", "l",
  "spec",
  "tag",
]);

/** Boolean options (no value) */
const BOOLEAN_OPTIONS = new Set([
  "debug",
  "curl",
  "dry-run",
  "use-remote",
  "help", "h",
  "version", "V",
  "no-watch",
  "no-sync",
  "no-web",
  "force", "f",
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
 * State machine for hierarchical command format:
 *
 * words[0]: program name (pontx)
 * words[1]: spec name OR global command
 *   - is global command -> position: "command"
 *   - is known spec name -> record specName, enter spec subcommand layer
 *   - typing -> complete both spec names and command names
 *
 * words[2] (with spec prefix): spec-scoped command
 *   -> complete call / show-api / gen / search / list / show-schema / list-cases
 *
 * words[3] (with spec + API command like call/show-api/gen):
 *   - hasTags -> complete tag name (position: "tag")
 *   - !hasTags -> complete api name (position: "api")
 *
 * words[4] (with spec + API command + tag): complete api name (position: "api")
 *
 * Subsequent positions: complete options (--debug, --petId, etc.)
 */
export function parseCompletionContext(
  input: CompletionInput,
  options: CompletionOptions = {}
): CompletionContext {
  const { words, wordIndex } = input;

  // words[0] is the program name (pontx)
  const firstArg = words[1]; // first argument

  // wordIndex === 1: typing the first argument
  if (wordIndex === 1) {
    return {
      position: "command",
      specOffset: 0,
      input,
      providedOptions: new Set(),
    };
  }

  // No first argument yet
  if (!firstArg) {
    return {
      position: "command",
      specOffset: 0,
      input,
      providedOptions: new Set(),
    };
  }

  // Determine if firstArg is a known global command
  const isGlobalCommand = GLOBAL_COMMANDS.has(firstArg);

  if (isGlobalCommand) {
    // Process as existing logic, specOffset = 0
    // For call/show-api/gen and other API commands, need to complete tag and api (independent positional args)
    return parseCommandContext(input, options, firstArg, 0);
  }

  // firstArg is not a known command -> treat as spec name, specOffset = 1
  const specName = firstArg;
  const command = words[2]; // command under spec

  if (wordIndex === 2) {
    // Typing spec-scoped command
    return {
      position: "command",
      specName,
      specOffset: 1,
      input,
      providedOptions: new Set(),
    };
  }

  if (!command) {
    return {
      position: "command",
      specName,
      specOffset: 1,
      input,
      providedOptions: new Set(),
    };
  }

  return parseCommandContext(input, options, command, 1, specName);
}

/**
 * Parse command context (shared logic, differentiated by specOffset)
 */
function parseCommandContext(
  input: CompletionInput,
  options: CompletionOptions,
  command: string,
  specOffset: number,
  specName?: string
): CompletionContext {
  const { words, wordIndex } = input;

  const cmdBaseIndex = 1 + specOffset; // command position in words

  // list/ls subcommands
  if (COMMANDS_WITH_SUBCOMMANDS.has(command)) {
    const subcommand = words[cmdBaseIndex + 1];
    if (wordIndex === cmdBaseIndex + 1) {
      return {
        position: "subcommand",
        command,
        specName,
        specOffset,
        input,
        providedOptions: new Set(),
      };
    }
    // Options after subcommand
    const startIndex = subcommand ? cmdBaseIndex + 2 : cmdBaseIndex + 1;
    const { options: parsedOptions } = parseWordsToOptionsAndArgs(
      words.slice(startIndex, wordIndex)
    );
    const prevWord = words[wordIndex - 1] || "";

    if (prevWord.startsWith("-") && optionNeedsValue(prevWord)) {
      return {
        position: "option-value",
        command,
        subcommand,
        specName,
        specOffset,
        currentOption: prevWord,
        input,
        providedOptions: parsedOptions,
      };
    }
    return {
      position: "option",
      command,
      subcommand,
      specName,
      specOffset,
      input,
      providedOptions: parsedOptions,
    };
  }

  // API path commands (call, show-api, gen)
  if (API_PATH_COMMANDS.has(command)) {
    const effectiveSpecName = specName || options.singleSpecName;
    const hasTags = specName
      ? (options.specHasTags?.[specName] ?? true)
      : (options.hasTags ?? true);

    // Calculate tag and api positions
    const tagPosition = cmdBaseIndex + 1;
    const apiPosition = hasTags ? cmdBaseIndex + 2 : cmdBaseIndex + 1;

    if (hasTags && wordIndex === tagPosition) {
      return {
        position: "tag",
        command,
        specName: effectiveSpecName,
        specOffset,
        input,
        providedOptions: new Set(),
      };
    }

    if (wordIndex === apiPosition) {
      const tagName = hasTags ? words[tagPosition] : undefined;
      return {
        position: "api",
        command,
        specName: effectiveSpecName,
        specOffset,
        apiPath: {
          specName: effectiveSpecName || "",
          tagName: tagName || "",
          partial: words[wordIndex] || "",
          completing: "api",
        },
        input,
        providedOptions: new Set(),
      };
    }

    // Positions after tag/api -> options
    const optStartIndex = hasTags ? cmdBaseIndex + 3 : cmdBaseIndex + 2;
    if (wordIndex >= optStartIndex) {
      const { options: parsedOptions } = parseWordsToOptionsAndArgs(
        words.slice(optStartIndex, wordIndex)
      );
      const prevWord = words[wordIndex - 1] || "";

      if (prevWord.startsWith("-") && optionNeedsValue(prevWord)) {
        return {
          position: "option-value",
          command,
          specName: effectiveSpecName,
          specOffset,
          currentOption: prevWord,
          input,
          providedOptions: parsedOptions,
        };
      }

      // call command allows unknown options as API parameters
      if (command === "call") {
        const tagName = hasTags ? words[tagPosition] : "";
        const apiName = words[apiPosition] || "";
        return {
          position: "option",
          command,
          specName: effectiveSpecName,
          specOffset,
          apiPath: {
            specName: effectiveSpecName || "",
            tagName: tagName || "",
            partial: "",
            completing: "api",
          },
          input,
          providedOptions: parsedOptions,
        };
      }

      return {
        position: "option",
        command,
        specName: effectiveSpecName,
        specOffset,
        input,
        providedOptions: parsedOptions,
      };
    }
  }

  // show-schema <schema>, search <keyword>, etc.
  // Argument position
  const argPosition = cmdBaseIndex + 1;
  if (wordIndex === argPosition) {
    return {
      position: "argument",
      command,
      specName: specName || options.singleSpecName,
      specOffset,
      input,
      providedOptions: new Set(),
    };
  }

  // Subsequent options
  const startIndex = cmdBaseIndex + 2;
  const { options: parsedOptions } = parseWordsToOptionsAndArgs(
    words.slice(startIndex, wordIndex)
  );
  const prevWord = words[wordIndex - 1] || "";
  if (prevWord.startsWith("-") && optionNeedsValue(prevWord)) {
    return {
      position: "option-value",
      command,
      specName,
      specOffset,
      currentOption: prevWord,
      input,
      providedOptions: parsedOptions,
    };
  }
  return {
    position: "option",
    command,
    specName,
    specOffset,
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
