import { PontxSpec } from "@pontx/spec";
import { getBuiltinPlugin } from "./builtin";
import type {
  Lifecycle,
  Plugin,
  ResolvedConfig,
  ResolvedOriginConfig,
} from "./type";
import _ from "lodash";

export function resolvePlugin(plugins: Plugin[]): Plugin {
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
  } as Plugin;
}
