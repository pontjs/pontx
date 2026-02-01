/**
 * List Provider
 *
 * Provides completion suggestions for list command options (--spec, --tag).
 */

import {
  CompletionContext,
  CompletionOptions,
  CompletionProvider,
  CompletionSuggestion,
} from "../types";

export interface ListDataSource {
  /** Get available spec names */
  getSpecs(): Promise<string[]>;

  /** Get available spec names with descriptions (optional) */
  getSpecsWithDesc?(): Promise<Array<{ name: string; description?: string }>>;

  /** Get tags for a spec */
  getTags(specName: string): Promise<string[]>;

  /** Get tags for a spec with descriptions (optional) */
  getTagsWithDesc?(
    specName: string
  ): Promise<Array<{ name: string; description?: string }>>;
}

export class ListProvider implements CompletionProvider {
  private options: CompletionOptions;
  private dataSource: ListDataSource;

  constructor(options: CompletionOptions = {}, dataSource: ListDataSource) {
    this.options = options;
    this.dataSource = dataSource;
  }

  canHandle(context: CompletionContext): boolean {
    return (
      (context.command === "list" || context.command === "ls") &&
      context.position === "option-value" &&
      (context.currentOption === "--spec" || context.currentOption === "--tag")
    );
  }

  async provide(context: CompletionContext): Promise<CompletionSuggestion[]> {
    if (context.currentOption === "--spec") {
      return this.provideSpecSuggestions(context);
    }

    if (context.currentOption === "--tag") {
      return this.provideTagSuggestions(context);
    }

    return [];
  }

  private async provideSpecSuggestions(
    context: CompletionContext
  ): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";

    // 优先使用带描述的方法
    const specs: Array<{ name: string; description?: string }> =
      this.dataSource.getSpecsWithDesc
        ? await this.dataSource.getSpecsWithDesc()
        : (await this.dataSource.getSpecs()).map((name) => ({ name }));

    return specs
      .filter((s) =>
        s.name.toLowerCase().startsWith(currentWord.toLowerCase())
      )
      .map((s) => ({
        value: s.name,
        description: s.description,
        type: "spec" as const,
      }));
  }

  private async provideTagSuggestions(
    context: CompletionContext
  ): Promise<CompletionSuggestion[]> {
    const currentWord = context.input.words[context.input.wordIndex] || "";

    // 从已提供的选项中提取 specName
    let specName = this.extractSpecName(context);

    // SDK CLI fallback: 使用默认 spec
    if (!specName && this.options.singleSpecName) {
      specName = this.options.singleSpecName;
    }

    if (!specName) {
      return [];
    }

    // 优先使用带描述的方法
    const tags: Array<{ name: string; description?: string }> =
      this.dataSource.getTagsWithDesc
        ? await this.dataSource.getTagsWithDesc(specName)
        : (await this.dataSource.getTags(specName)).map((name) => ({ name }));

    return tags
      .filter((t) =>
        t.name.toLowerCase().startsWith(currentWord.toLowerCase())
      )
      .map((t) => ({
        value: t.name,
        description: t.description,
        type: "tag" as const,
      }));
  }

  /**
   * 从上下文中提取 specName（从 --spec 选项值）
   */
  private extractSpecName(context: CompletionContext): string | null {
    const words = context.input.words;
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === "--spec") {
        return words[i + 1] || null;
      }
    }
    return null;
  }
}
