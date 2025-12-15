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
  { name: "generate", description: "Generate SDK code" },
  { name: "mocks", description: "Generate mock data" },
  { name: "service", description: "Start Pontx service" },
  { name: "global", description: "Manage global specs" },
  { name: "completion", description: "Manage shell completion" },
];

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
    return context.position === "command";
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";

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
