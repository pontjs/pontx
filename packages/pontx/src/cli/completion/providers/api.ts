/**
 * API Provider
 *
 * Provides completion suggestions for tag and API names.
 * Supports hierarchical subcommand format where tag and api
 * are independent positional arguments.
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

export interface ApiDataSource {
  /** Get tags for a spec */
  getTags(specName: string): Promise<string[]>;

  /** Get tags for a spec with descriptions (optional method) */
  getTagsWithDesc?(
    specName: string
  ): Promise<Array<{ name: string; description?: string }>>;

  /** Get APIs for a spec/tag */
  getApis(
    specName: string,
    tagName?: string
  ): Promise<Array<{ name: string; description?: string }>>;
}

export class ApiProvider implements CompletionProvider {
  private options: CompletionOptions;
  private dataSource: ApiDataSource;

  constructor(options: CompletionOptions = {}, dataSource: ApiDataSource) {
    this.options = options;
    this.dataSource = dataSource;
  }

  canHandle(context: CompletionContext): boolean {
    return context.position === "tag" || context.position === "api";
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const partial = context.input.words[context.input.wordIndex] || "";

    if (context.position === "tag") {
      return this.provideTagSuggestions(context, partial);
    }

    if (context.position === "api") {
      return this.provideApiSuggestions(context, partial);
    }

    return [];
  }

  private async provideTagSuggestions(
    context: CompletionContext,
    partial: string
  ): Promise<CompletionSuggestion[]> {
    const specName = context.specName || "";

    // Prefer method with descriptions if available
    if (this.dataSource.getTagsWithDesc) {
      const tags = await this.dataSource.getTagsWithDesc(specName);
      return tags
        .filter((t) => t.name.toLowerCase().startsWith(partial.toLowerCase()))
        .map((t) => ({
          value: t.name,
          description: t.description,
          type: "tag" as const,
        }));
    }

    const tags = await this.dataSource.getTags(specName);
    return tags
      .filter((tag) => tag.toLowerCase().startsWith(partial.toLowerCase()))
      .map((tag) => ({
        value: tag,
        type: "tag" as const,
      }));
  }

  private async provideApiSuggestions(
    context: CompletionContext,
    partial: string
  ): Promise<CompletionSuggestion[]> {
    const specName = context.apiPath?.specName || context.specName || "";
    const tagName = context.apiPath?.tagName || "";
    const apis = await this.dataSource.getApis(specName, tagName);

    return apis
      .filter((api) => api.name.toLowerCase().startsWith(partial.toLowerCase()))
      .map((api) => ({
        value: api.name,
        description: api.description || undefined,
        type: "api" as const,
      }));
  }
}
