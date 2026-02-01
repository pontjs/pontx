/**
 * Command Provider
 *
 * Provides completion suggestions for subcommands.
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

/** All available pontx commands with descriptions */
const ALL_COMMANDS: Array<{ name: string; description: string }> = [
  { name: "call", description: "Call an API endpoint" },
  { name: "search", description: "Search APIs by keyword" },
  { name: "show-api", description: "Show API metadata" },
  { name: "show-schema", description: "Show schema definition" },
  { name: "gen", description: "Generate API call code" },
  { name: "list-templates", description: "List available templates" },
  { name: "check", description: "Check spec compatibility" },
  { name: "ls", description: "List data sources" },
  { name: "list", description: "List API metadata (specs/tags/apis/schemas)" },
  { name: "generate", description: "Generate SDK code" },
  { name: "mocks", description: "Generate mock data" },
  { name: "service", description: "Start Pontx service" },
  { name: "completion", description: "Manage shell completion" },
];

/** Subcommands for commands that support them */
const SUBCOMMANDS: Record<
  string,
  Array<{ name: string; description: string }>
> = {
  list: [
    { name: "specs", description: "List all specs" },
    { name: "tags", description: "List tags in a spec" },
    { name: "apis", description: "List APIs in a spec" },
    { name: "schemas", description: "List schemas in a spec" },
  ],
  ls: [
    { name: "specs", description: "List all specs" },
    { name: "tags", description: "List tags in a spec" },
    { name: "apis", description: "List APIs in a spec" },
    { name: "schemas", description: "List schemas in a spec" },
  ],
};

export class CommandProvider implements CompletionProvider {
  private options: CompletionOptions;
  private availableCommands: Set<string>;

  constructor(options: CompletionOptions = {}) {
    this.options = options;

    // Filter commands if specified in options
    if (options.commands && options.commands.length > 0) {
      this.availableCommands = new Set(options.commands);
    } else {
      this.availableCommands = new Set(ALL_COMMANDS.map((c) => c.name));
    }
  }

  canHandle(context: CompletionContext): boolean {
    return (
      context.position === "command" || context.position === "subcommand"
    );
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";

    // Completing subcommand
    if (context.position === "subcommand" && context.command) {
      const subcommands = SUBCOMMANDS[context.command];
      if (!subcommands) return [];

      return subcommands
        .filter((sub) =>
          sub.name.toLowerCase().startsWith(currentWord.toLowerCase())
        )
        .map((sub) => ({
          value: sub.name,
          description: sub.description,
          type: "command" as const,
        }));
    }

    // Completing main command
    return ALL_COMMANDS.filter(
      (cmd) =>
        this.availableCommands.has(cmd.name) &&
        cmd.name.toLowerCase().startsWith(currentWord.toLowerCase())
    ).map((cmd) => ({
      value: cmd.name,
      description: cmd.description,
      type: "command" as const,
    }));
  }

  /**
   * Get list of available command names
   */
  getCommands(): string[] {
    return ALL_COMMANDS.filter((c) => this.availableCommands.has(c.name)).map(
      (c) => c.name
    );
  }
}
