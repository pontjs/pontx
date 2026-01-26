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

    // 1. 分组：必填参数 vs 可选参数
    const requiredParams: ParamInfo[] = [];
    const optionalParams: ParamInfo[] = [];

    for (const param of params) {
      if (param.required) {
        requiredParams.push(param);
      } else {
        optionalParams.push(param);
      }
    }

    // 2. 合并参数：必填优先，其他按原顺序
    const sortedParams = [...requiredParams, ...optionalParams];

    // 3. 生成 API 参数补全建议
    const apiSuggestions: CompletionSuggestion[] = [];

    for (const param of sortedParams) {
      // 过滤已提供的参数
      if (context.providedOptions.has(param.name)) {
        continue;
      }

      // 过滤不匹配当前输入的参数
      if (param.name.toLowerCase().startsWith(partial.toLowerCase())) {
        apiSuggestions.push({
          value: `--${param.name}`,
          description: this.formatParamDescription(param),
          type: "param" as const,
        });
      }
    }

    // 4. 获取 CLI options
    const cliOptions = this.getCommonOptions(partial, context.providedOptions);

    // 5. 合并：API 参数在前，CLI options 在后
    return [...apiSuggestions, ...cliOptions];
  }

  /**
   * 格式化参数描述，显示完整信息
   *
   * 格式：[位置] [type] [required?] description [enum values?]
   *
   * 示例：
   * - [path] number, required - ID of pet to update
   * - [query] string (optional) - Additional metadata
   * - [body] string, required - Status (available|pending|sold)
   */
  private formatParamDescription(param: ParamInfo): string {
    const parts: string[] = [];

    // 1. 参数位置标记（如果有）
    if (param.in) {
      parts.push(`[${param.in}]`);
    }

    // 2. 类型 + 必填标记
    const typeInfo = param.required
      ? `${param.type}, required`
      : `${param.type} (optional)`;
    parts.push(typeInfo);

    // 3. 描述（如果有）
    if (param.description) {
      parts.push(`- ${param.description}`);
    }

    // 4. 枚举值（如果有）
    if (param.enum && param.enum.length > 0) {
      const enumValues = param.enum.join("|");
      parts.push(`(${enumValues})`);
    }

    return parts.join(" ");
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
      }));
  }
}
