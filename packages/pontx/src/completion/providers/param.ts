/**
 * Param Provider
 *
 * Provides completion suggestions for API parameters.
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
  ParamInfo,
} from "../types";

/** Commands that accept API parameters */
const PARAM_COMMANDS = ["call"];

/** CLI options that should not be suggested as API params */
const CLI_OPTIONS = new Set([
  "env",
  "e",
  "header",
  "H",
  "output",
  "o",
  "query",
  "q",
  "debug",
  "dry-run",
  "use-remote",
  "global",
  "help",
  "h",
]);

export interface ParamDataSource {
  /** Get parameters for an API */
  getParams(
    specName: string,
    tagName: string,
    apiName: string
  ): Promise<ParamInfo[]>;
}

export class ParamProvider implements CompletionProvider {
  private options: CompletionOptions;
  private dataSource: ParamDataSource;

  constructor(options: CompletionOptions = {}, dataSource: ParamDataSource) {
    this.options = options;
    this.dataSource = dataSource;
  }

  canHandle(context: CompletionContext): boolean {
    // Only handle call command
    if (!PARAM_COMMANDS.includes(context.command || "")) {
      return false;
    }

    // Handle when completing options (after API path is specified)
    // We need apiPath to be fully specified (specName.tagName.apiName)
    if (context.position !== "option") {
      return false;
    }

    return true;
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";
    const partial = currentWord.replace(/^-+/, "");

    // Try to extract API path from previous words
    const apiPathInfo = this.extractApiPath(context);
    if (!apiPathInfo) {
      // Can't determine API, just provide common options
      return this.getCommonOptions(partial, context.providedOptions);
    }

    const { specName, tagName, apiName } = apiPathInfo;

    // Get API parameters
    const params = await this.dataSource.getParams(specName, tagName, apiName);

    // Filter already provided options
    const suggestions: CompletionSuggestion[] = [];

    // Add API parameters
    for (const param of params) {
      if (context.providedOptions.has(param.name)) {
        continue;
      }

      if (param.name.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          value: `--${param.name}`,
          description: param.description || `${param.type}${param.required ? " (required)" : ""}`,
          type: "param" as const,
        });
      }
    }

    // Add common CLI options
    const commonOptions = this.getCommonOptions(partial, context.providedOptions);
    suggestions.push(...commonOptions);

    return suggestions;
  }

  /**
   * Extract API path from context
   * Returns null if API path is not fully specified
   */
  private extractApiPath(
    context: CompletionContext
  ): { specName: string; tagName: string; apiName: string } | null {
    // Find the API path argument in previous words
    const words = context.input.words;

    for (let i = 2; i < context.input.wordIndex; i++) {
      const word = words[i];
      if (!word.startsWith("-")) {
        // This should be the API path
        const parts = word.split(".");

        if (this.options.fixedSpecName) {
          // Proxy mode: tagName.apiName
          if (parts.length >= 2) {
            return {
              specName: this.options.fixedSpecName,
              tagName: parts[0],
              apiName: parts[1],
            };
          }
        } else if (this.options.singleSpecName) {
          // Single spec mode
          if (this.options.hasTags) {
            // Has tags: tagName.apiName
            if (parts.length >= 2) {
              return {
                specName: this.options.singleSpecName,
                tagName: parts[0],
                apiName: parts[1],
              };
            }
          } else {
            // No tags: apiName only
            if (parts.length >= 1 && parts[0]) {
              return {
                specName: this.options.singleSpecName,
                tagName: "", // No tag in this mode
                apiName: parts[0],
              };
            }
          }
        } else {
          // Standard mode: specName.tagName.apiName
          if (parts.length >= 3) {
            return {
              specName: parts[0],
              tagName: parts[1],
              apiName: parts[2],
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Get common CLI options as suggestions
   */
  private getCommonOptions(
    partial: string,
    providedOptions: Set<string>
  ): CompletionSuggestion[] {
    const options: Array<{ name: string; description: string }> = [
      { name: "env", description: "Specify environment/baseUrl" },
      { name: "debug", description: "Show detailed request/response" },
      { name: "dry-run", description: "Show request without executing" },
      { name: "output", description: "Output result to file" },
      { name: "query", description: "JMESPath query expression" },
      { name: "header", description: "Add request header" },
    ];

    return options
      .filter(
        (opt) =>
          !providedOptions.has(opt.name) &&
          opt.name.toLowerCase().startsWith(partial.toLowerCase())
      )
      .map((opt) => ({
        value: `--${opt.name}`,
        description: opt.description,
        type: "param" as const,
      }));
  }
}
