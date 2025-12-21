import { PontxSpec } from "@pontx/spec";
import { getBuiltinPlugin } from "./builtin";
import type {
  Lifecycle,
  Plugin,
  ResolvedConfig,
  ResolvedOriginConfig,
  CheckResult,
  ApiExecutorContext,
} from "./type";
import type {
  ApiExecutionContext,
  ApiResponse,
  ExecuteApiConfig,
} from "./types";
import _ from "lodash";
import { createLogger } from "./logger/logger";

export function resolvePlugin(plugins: Plugin[], executeApiConfig?: ExecuteApiConfig): Plugin {
  const orderedPlugins = [...plugins, getBuiltinPlugin()];

  return {
    name: "resolved-pontx-plugin",
    configResolved: (resolvedConfig: ResolvedConfig) => {
      for (const plugin of orderedPlugins) {
        if (plugin.configResolved) {
          plugin.configResolved(resolvedConfig);
        }
      }
    },
    fetch: async (url: string, options) => {
      for (const plugin of orderedPlugins) {
        if (plugin.fetch) {
          const result = await plugin.fetch(url, options);
          if (result) {
            return result;
          }
        }
      }
    },
    transformMeta: async (metaString: string, options) => {
      let result = metaString;
      for (const plugin of orderedPlugins) {
        if (plugin.transformMeta) {
          result = await plugin.transformMeta(result, options);
        }
      }

      return result;
    },
    parseMeta: async (metaString: string, options) => {
      for (const plugin of orderedPlugins) {
        if (plugin.parseMeta) {
          const result = await plugin.parseMeta(metaString, options);
          if (result) {
            return result;
          }
        }
      }
    },
    transform: async (spec: PontxSpec, options) => {
      let result = spec;
      for (const plugin of orderedPlugins) {
        if (plugin.transform) {
          result = await plugin.transform(result, options);
        }
      }

      return result;
    },
    generate: async (spec: PontxSpec, options) => {
      for (const plugin of orderedPlugins) {
        if (plugin.generate) {
          const result = await plugin.generate(spec, options);
          if (result) {
            return result;
          }
        }
      }

      return null;
    },
    generateEntry: async (options) => {
      for (const plugin of orderedPlugins) {
        if (plugin.generateEntry) {
          const result = await plugin.generateEntry(options);
          if (result) {
            return result;
          }
        }
      }

      return null;
    },
    mocks: async (options) => {
      for (const plugin of orderedPlugins) {
        if (plugin.mocks) {
          await plugin.mocks(options);
        }
      }
    },
    generateSamples: async (options) => {
      const samples = [];

      for (const plugin of orderedPlugins) {
        if (plugin.generateSamples) {
          const pluginSamples = await plugin.generateSamples(options);
          if (pluginSamples) {
            samples.push(...pluginSamples);
          }
        }
      }

      return _.unionBy(samples, "case");
    },
    /**
     * Check hook: collect all check results from plugins with error handling
     */
    check: async (localSpec, remoteSpec, options) => {
      const allResults: CheckResult[] = [];
      const logger = createLogger(
        options?.resolvedConfig?.service?.logLevel || "info"
      );

      for (const plugin of orderedPlugins) {
        if (plugin.check) {
          try {
            const results = await plugin.check(localSpec, remoteSpec, options);

            // Validate results: must be an array or undefined/null
            if (results === undefined || results === null) {
              logger.warn(
                `Plugin "${plugin.name}" check method returned ${results}, expected an array. Skipping.`
              );
              continue;
            }

            if (!Array.isArray(results)) {
              logger.warn(
                `Plugin "${
                  plugin.name
                }" check method returned invalid type (expected array, got ${typeof results}). Skipping.`
              );
              continue;
            }

            // Validate each result item
            const validResults = results.filter((result) => {
              if (!result || typeof result !== "object") {
                logger.warn(
                  `Plugin "${plugin.name}" returned invalid check result item. Skipping.`
                );
                return false;
              }

              if (!result.level || !result.type || !result.message) {
                logger.warn(
                  `Plugin "${plugin.name}" returned incomplete check result (missing level, type, or message). Skipping.`
                );
                return false;
              }

              return true;
            });

            allResults.push(...validResults);
          } catch (error) {
            // Catch errors from user-defined check methods to prevent crashes
            logger.error(
              `Plugin "${plugin.name}" check method threw an error: ${
                error instanceof Error ? error.message : String(error)
              }`
            );

            // Add an error result to inform users
            allResults.push({
              level: "error",
              type: "plugin-error",
              message: `Plugin "${plugin.name}" check failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            });
          }
        }
      }

      return allResults;
    },
    /**
     * executeApi hook: supports new ApiExecutionContext
     */
    executeApi: async (context: ApiExecutionContext) => {
      for (const plugin of orderedPlugins) {
        if (plugin.executeApi) {
          const result = await plugin.executeApi(context);
          if (result !== null) {
            return result;
          }
        }
      }
      // 如果所有插件都返回 null，应该不会到这里，因为 builtin plugin 会处理
      return null;
    },
    /**
     * @deprecated apiExecutor hook: legacy support
     */
    apiExecutor: async (context: ApiExecutorContext) => {
      for (const plugin of orderedPlugins) {
        // 优先使用新的 executeApi
        if (plugin.executeApi) {
          // 转换旧的 context 到新的 context
          const newContext: ApiExecutionContext = {
            api: context.apiSelector,
            meta: context.apiMeta,
            params: context.toolParams,
            env: context.baseUrl ? { baseURL: context.baseUrl } : undefined,
            executeApiConfig: executeApiConfig,
            resolvedConfig: context.options?.resolvedConfig!,
            logger: createLogger('info'),
          };
          const result = await plugin.executeApi(newContext);
          if (result !== null) {
            return result.data;
          }
        } else if (plugin.apiExecutor) {
          // 使用旧的 apiExecutor
          return await plugin.apiExecutor(context);
        }
      }
    },
  } as Plugin;
}
