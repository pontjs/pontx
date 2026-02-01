/**
 * Completion Engine
 *
 * The main entry point for shell completion. Coordinates providers
 * and manages caching.
 */

import {
  CompletionInput,
  CompletionOptions,
  CompletionProvider,
  CompletionResult,
  CompletionSuggestion,
  ParamInfo,
} from "./types";
import { parseCompletionContext } from "./context";
import { CompletionCache } from "./cache";
import {
  CommandProvider,
  SpecProvider,
  ApiProvider,
  ParamProvider,
  ListProvider,
  OptionProvider,
  SpecDataSource,
  ApiDataSource,
  ParamDataSource,
  ListDataSource,
} from "./providers";

/**
 * Data source interface for the completion engine
 * Abstracts access to spec data
 */
export interface CompletionDataSource
  extends SpecDataSource,
    ApiDataSource,
    ParamDataSource,
    ListDataSource {}

/**
 * Completion Engine
 *
 * Coordinates providers and manages completion requests.
 */
export class CompletionEngine {
  private options: CompletionOptions;
  private cache: CompletionCache;
  private providers: CompletionProvider[];
  private dataSource: CompletionDataSource;

  constructor(options: CompletionOptions, dataSource: CompletionDataSource) {
    this.options = {
      cacheTTL: 60000,
      ...options,
    };

    this.cache = new CompletionCache(this.options.cacheTTL);
    this.dataSource = this.wrapDataSourceWithCache(dataSource);
    this.providers = this.initProviders();
  }

  /**
   * Wrap data source methods with caching
   */
  private wrapDataSourceWithCache(
    dataSource: CompletionDataSource
  ): CompletionDataSource {
    return {
      getSpecs: async () => {
        return this.cache.getOrLoad("specs", () => dataSource.getSpecs());
      },

      getSpecsWithDesc: dataSource.getSpecsWithDesc
        ? async () => {
            return this.cache.getOrLoad("specs:desc", () =>
              dataSource.getSpecsWithDesc!()
            );
          }
        : undefined,

      getTags: async (specName: string) => {
        const cacheKey = `tags:${specName}`;
        return this.cache.getOrLoad(cacheKey, () =>
          dataSource.getTags(specName)
        );
      },

      getTagsWithDesc: dataSource.getTagsWithDesc
        ? async (specName: string) => {
            const cacheKey = `tags:desc:${specName}`;
            return this.cache.getOrLoad(cacheKey, () =>
              dataSource.getTagsWithDesc!(specName)
            );
          }
        : undefined,

      getApis: async (specName: string, tagName?: string) => {
        const cacheKey = `apis:${specName}:${tagName || "*"}`;
        return this.cache.getOrLoad(cacheKey, () =>
          dataSource.getApis(specName, tagName)
        );
      },

      getParams: async (
        specName: string,
        tagName: string,
        apiName: string
      ) => {
        const cacheKey = `params:${specName}:${tagName}:${apiName}`;
        return this.cache.getOrLoad(cacheKey, () =>
          dataSource.getParams(specName, tagName, apiName)
        );
      },
    };
  }

  /**
   * Initialize providers
   */
  private initProviders(): CompletionProvider[] {
    return [
      new CommandProvider(this.options),
      new SpecProvider(this.options, this.dataSource),
      new ApiProvider(this.options, this.dataSource),
      new OptionProvider(this.options),
      new ListProvider(this.options, this.dataSource),
      new ParamProvider(this.options, this.dataSource),
    ];
  }

  /**
   * Main entry: generate completion suggestions for input
   */
  async complete(input: CompletionInput): Promise<CompletionResult> {
    const context = parseCompletionContext(input, this.options);

    for (const provider of this.providers) {
      if (provider.canHandle(context)) {
        try {
          const suggestions = await provider.provide(context);
          return { suggestions, addSpace: true };
        } catch (error) {
          // Provider failed, continue to next
          console.error(`Provider failed: ${error}`);
        }
      }
    }

    return { suggestions: [] };
  }

  /**
   * Get available commands
   */
  getCommands(): string[] {
    const commandProvider = this.providers.find(
      (p) => p instanceof CommandProvider
    ) as CommandProvider | undefined;
    return commandProvider?.getCommands() || [];
  }

  /**
   * Get available specs (with cache)
   */
  async getSpecs(): Promise<string[]> {
    if (this.options.fixedSpecName) {
      return []; // Proxy mode doesn't need spec completion
    }
    return this.dataSource.getSpecs();
  }

  /**
   * Get tags for a spec (with cache)
   */
  async getTags(specName: string): Promise<string[]> {
    return this.dataSource.getTags(specName);
  }

  /**
   * Get APIs for a spec/tag (with cache)
   */
  async getApis(
    specName: string,
    tagName?: string
  ): Promise<Array<{ name: string; description?: string }>> {
    return this.dataSource.getApis(specName, tagName);
  }

  /**
   * Get parameters for an API (with cache)
   */
  async getParams(
    specName: string,
    tagName: string,
    apiName: string
  ): Promise<ParamInfo[]> {
    return this.dataSource.getParams(specName, tagName, apiName);
  }

  /**
   * Invalidate cache
   */
  invalidateCache(pattern?: string): void {
    this.cache.invalidate(pattern);
  }
}

/**
 * Create a mock data source for testing
 */
export function createMockDataSource(data: {
  specs?: string[];
  tags?: Record<string, string[]>;
  apis?: Record<string, Array<{ name: string; description?: string }>>;
  params?: Record<string, ParamInfo[]>;
}): CompletionDataSource {
  return {
    async getSpecs() {
      return data.specs || [];
    },

    async getTags(specName: string) {
      return data.tags?.[specName] || [];
    },

    async getApis(specName: string, tagName?: string) {
      const key = tagName ? `${specName}:${tagName}` : specName;
      return data.apis?.[key] || [];
    },

    async getParams(specName: string, tagName: string, apiName: string) {
      const key = `${specName}:${tagName}:${apiName}`;
      return data.params?.[key] || [];
    },
  };
}
