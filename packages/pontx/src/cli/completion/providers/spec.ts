/**
 * Spec Provider
 *
 * Provides completion suggestions for spec names.
 * In hierarchical format, specs are completed at wordIndex === 1
 * alongside commands.
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

export interface SpecDataSource {
  /** Get available spec names */
  getSpecs(): Promise<string[]>;

  /** Get available spec names with descriptions (optional method) */
  getSpecsWithDesc?(): Promise<Array<{ name: string; description?: string }>>;
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

    // Skip if single spec mode (no need to complete spec names)
    if (this.options.singleSpecName) {
      return false;
    }

    // Provide spec suggestions at position "command" when wordIndex === 1 and specOffset === 0
    // This allows both spec names and command names to be suggested simultaneously
    return (
      context.position === "command" &&
      context.input.wordIndex === 1 &&
      context.specOffset === 0
    );
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const partial = context.input.words[context.input.wordIndex] || "";

    // Prefer method with descriptions if available
    if (this.dataSource.getSpecsWithDesc) {
      const specs = await this.dataSource.getSpecsWithDesc();
      return specs
        .filter((s) =>
          s.name.toLowerCase().startsWith(partial.toLowerCase())
        )
        .map((s) => ({
          value: s.name,
          description: s.description || `Spec: ${s.name}`,
          type: "spec" as const,
        }));
    }

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
