/**
 * Spec Provider
 *
 * Provides completion suggestions for spec names.
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

/** Commands that accept API path starting with specName */
const API_PATH_COMMANDS = ["call", "show-api", "gen"];

export interface SpecDataSource {
  /** Get available spec names */
  getSpecs(): Promise<string[]>;
}

export class SpecProvider implements CompletionProvider {
  private options: CompletionOptions;
  private dataSource: SpecDataSource;

  constructor(options: CompletionOptions = {}, dataSource: SpecDataSource) {
    this.options = options;
    this.dataSource = dataSource;
  }

  canHandle(context: CompletionContext): boolean {
    // Skip if fixedSpecName is set (proxy mode)
    if (this.options.fixedSpecName) {
      return false;
    }

    // Only handle API path commands
    if (!API_PATH_COMMANDS.includes(context.command || "")) {
      return false;
    }

    // Only handle when completing spec
    return (
      context.position === "argument" &&
      context.apiPath?.completing === "spec"
    );
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const partial = context.apiPath?.partial || "";
    const specs = await this.dataSource.getSpecs();

    return specs
      .filter((spec) => spec.toLowerCase().startsWith(partial.toLowerCase()))
      .map((spec) => ({
        value: spec,
        description: `Spec: ${spec}`,
        type: "spec" as const,
      }));
  }
}
