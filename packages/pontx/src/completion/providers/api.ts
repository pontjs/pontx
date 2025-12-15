/**
 * API Provider
 *
 * Provides completion suggestions for tag and API names.
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

/** Commands that accept API path */
const API_PATH_COMMANDS = ["call", "show-api", "gen"];

export interface ApiDataSource {
  /** Get tags for a spec */
  getTags(specName: string): Promise<string[]>;

  /** Get APIs for a spec/tag */
  getApis(specName: string, tagName?: string): Promise<Array<{ name: string; description?: string }>>;
}

export class ApiProvider implements CompletionProvider {
  private options: CompletionOptions;
  private dataSource: ApiDataSource;

  constructor(options: CompletionOptions = {}, dataSource: ApiDataSource) {
    this.options = options;
    this.dataSource = dataSource;
  }

  canHandle(context: CompletionContext): boolean {
    // Only handle API path commands
    if (!API_PATH_COMMANDS.includes(context.command || "")) {
      return false;
    }

    // Only handle when completing tag or api
    if (context.position !== "argument" || !context.apiPath) {
      return false;
    }

    const { completing } = context.apiPath;
    return completing === "tag" || completing === "api";
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const apiPath = context.apiPath!;
    const { completing, partial, specName, tagName } = apiPath;

    if (completing === "tag") {
      return this.provideTagSuggestions(specName!, partial);
    }

    if (completing === "api") {
      return this.provideApiSuggestions(specName!, tagName!, partial);
    }

    return [];
  }

  private async provideTagSuggestions(
    specName: string,
    partial: string
  ): Promise<CompletionSuggestion[]> {
    const tags = await this.dataSource.getTags(specName);

    // Build prefix based on mode
    const prefix = this.options.fixedSpecName ? "" : `${specName}.`;

    return tags
      .filter((tag) => tag.toLowerCase().startsWith(partial.toLowerCase()))
      .map((tag) => ({
        value: prefix + tag,
        // Tags don't have descriptions, leave undefined
        type: "tag" as const,
      }));
  }

  private async provideApiSuggestions(
    specName: string,
    tagName: string,
    partial: string
  ): Promise<CompletionSuggestion[]> {
    const apis = await this.dataSource.getApis(specName, tagName);

    // Build prefix based on mode
    const prefix = this.options.fixedSpecName
      ? `${tagName}.`
      : `${specName}.${tagName}.`;

    return apis
      .filter((api) => api.name.toLowerCase().startsWith(partial.toLowerCase()))
      .map((api) => ({
        value: prefix + api.name,
        // Only include description if it exists and is meaningful
        description: api.description || undefined,
        type: "api" as const,
      }));
  }
}
