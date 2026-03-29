/**
 * Param Provider
 *
 * Provides completion suggestions for API parameters.
 * Adapted for hierarchical subcommand format where tag and api
 * are independent positional arguments.
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
  "env", "e",
  "header", "H",
  "output", "o",
  "query", "q",
  "debug",
  "dry-run",
  "use-remote",
  "global",
  "help", "h",
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
    if (context.position !== "option") {
      return false;
    }

    return true;
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";
    const partial = currentWord.replace(/^-+/, "");

    // Try to extract API path from context
    const apiPathInfo = this.extractApiPath(context);
    if (!apiPathInfo) {
      // Can't determine API, just provide common options
      return this.getCommonOptions(partial, context.providedOptions);
    }

    const { specName, tagName, apiName } = apiPathInfo;

    // Get API parameters
    const params = await this.dataSource.getParams(specName, tagName, apiName);

    // 1. Group: required params vs optional params
    const requiredParams: ParamInfo[] = [];
    const optionalParams: ParamInfo[] = [];

    for (const param of params) {
      if (param.required) {
        requiredParams.push(param);
      } else {
        optionalParams.push(param);
      }
    }

    // 2. Merge: required first, then optional
    const sortedParams = [...requiredParams, ...optionalParams];

    // 3. Generate API param completion suggestions
    const apiSuggestions: CompletionSuggestion[] = [];

    for (const param of sortedParams) {
      // Filter already provided params
      if (context.providedOptions.has(param.name)) {
        continue;
      }

      // Filter params that don't match current input
      if (param.name.toLowerCase().startsWith(partial.toLowerCase())) {
        apiSuggestions.push({
          value: `--${param.name}`,
          description: this.formatParamDescription(param),
          type: "param" as const,
          group: "API Parameters",
        });
      }
    }

    // 4. Get CLI options
    const cliOptions = this.getCommonOptions(partial, context.providedOptions);

    // 5. Merge: API params first, CLI options after
    return [...apiSuggestions, ...cliOptions];
  }

  /**
   * Format parameter description with full info
   */
  private formatParamDescription(param: ParamInfo): string {
    const parts: string[] = [];

    if (param.in) {
      parts.push(`[${param.in}]`);
    }

    const typeInfo = param.required
      ? `${param.type}, required`
      : `${param.type} (optional)`;
    parts.push(typeInfo);

    if (param.description) {
      parts.push(`- ${param.description}`);
    }

    if (param.enum && param.enum.length > 0) {
      const enumValues = param.enum.join("|");
      parts.push(`(${enumValues})`);
    }

    return parts.join(" ");
  }

  /**
   * Extract API path from context using hierarchical positional args
   *
   * In hierarchical format:
   *   pontx [specName] call [tag] [api] [options]
   * tag and api are at fixed positions relative to command.
   */
  private extractApiPath(
    context: CompletionContext
  ): { specName: string; tagName: string; apiName: string } | null {
    const words = context.input.words;
    const specOffset = context.specOffset;
    const cmdBaseIndex = 1 + specOffset;

    // Determine hasTags
    const specName = context.specName || context.apiPath?.specName || "";
    const hasTags = context.specName
      ? (this.options.specHasTags?.[context.specName] ?? true)
      : (this.options.hasTags ?? true);

    const tagPosition = cmdBaseIndex + 1;
    const apiPosition = hasTags ? cmdBaseIndex + 2 : cmdBaseIndex + 1;

    const tagName = hasTags ? (words[tagPosition] || "") : "";
    const apiName = words[apiPosition] || "";

    if (!apiName) {
      return null;
    }

    return {
      specName: specName || this.options.singleSpecName || "",
      tagName,
      apiName,
    };
  }

  /**
   * Get common CLI options as suggestions
   */
  private getCommonOptions(
    partial: string,
    providedOptions: Set<string>
  ): CompletionSuggestion[] {
    const options: Array<{ name: string; description: string }> = [
      { name: "env", description: "[CLI] Specify environment/baseUrl" },
      { name: "debug", description: "[CLI] Show detailed request/response" },
      { name: "dry-run", description: "[CLI] Show request without executing" },
      { name: "output", description: "[CLI] Output result to file" },
      { name: "query", description: "[CLI] JMESPath query expression" },
      { name: "header", description: "[CLI] Add request header" },
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
        group: "Options",
      }));
  }
}
