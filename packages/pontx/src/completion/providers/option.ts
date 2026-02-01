/**
 * Option Provider
 *
 * Provides completion suggestions for command options (flags).
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

/** Option definitions for each command/subcommand */
const COMMAND_OPTIONS: Record<string, Array<{ name: string; description: string; hasValue: boolean }>> = {
  // list/ls command options by subcommand
  "list:specs": [
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  "list:tags": [
    { name: "--spec", description: "Specify spec name", hasValue: true },
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  "list:apis": [
    { name: "--spec", description: "Specify spec name", hasValue: true },
    { name: "--tag", description: "Specify tag name", hasValue: true },
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  "list:schemas": [
    { name: "--spec", description: "Specify spec name", hasValue: true },
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  // ls is alias of list, use the same options
  "ls:specs": [
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  "ls:tags": [
    { name: "--spec", description: "Specify spec name", hasValue: true },
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  "ls:apis": [
    { name: "--spec", description: "Specify spec name", hasValue: true },
    { name: "--tag", description: "Specify tag name", hasValue: true },
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
  "ls:schemas": [
    { name: "--spec", description: "Specify spec name", hasValue: true },
    { name: "--use-remote", description: "Use remote metadata", hasValue: false },
    { name: "--json", description: "Output in JSON format", hasValue: false },
  ],
};

export class OptionProvider implements CompletionProvider {
  private options: CompletionOptions;

  constructor(options: CompletionOptions = {}) {
    this.options = options;
  }

  canHandle(context: CompletionContext): boolean {
    // Only handle when completing options
    if (context.position !== "option") {
      return false;
    }

    // Check if this is a command we support
    if (!context.command || !context.subcommand) {
      return false;
    }

    const key = `${context.command}:${context.subcommand}`;
    return key in COMMAND_OPTIONS;
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";
    const key = `${context.command}:${context.subcommand}`;
    const availableOptions = COMMAND_OPTIONS[key] || [];

    // Filter out already provided options
    const suggestions = availableOptions
      .filter((opt) => !context.providedOptions.has(opt.name.replace(/^--/, "")))
      .filter((opt) => opt.name.toLowerCase().startsWith(currentWord.toLowerCase()))
      .map((opt) => ({
        value: opt.name,
        description: opt.description,
        type: "option" as const,
      }));

    return suggestions;
  }
}
