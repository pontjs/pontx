import * as path from "path";
import { PontSpec, Interface } from "pont-spec";
import { PontManager } from "./manager";
import { PontLogger } from "./logger";

class PublicOriginConfig {
  url: string;
  name: string;
  env: string;
  envs: any;
}

type SimplePluginConfig = {
  use: string;
  options: any;
};
type PurePluginConfig =
  | string
  | {
      use: string;
      options: any;
    };
export type PluginConfig = PurePluginConfig | { [key: string]: PurePluginConfig };

export class PontPlugin {
  logger: PontLogger;

  apply(...args: any[]): any {}
}

export class PontFetchPlugin extends PontPlugin {
  async apply(originConf: InnerOriginConfig, options?: any): Promise<string> {
    return "";
  }
}

export class PontParserPlugin extends PontPlugin {
  async apply(metaStr: string, options?: any): Promise<PontSpec> {
    return null;
  }
}

export class PontTransformPlugin extends PontPlugin {
  async apply(spec: PontSpec, options?: any): Promise<PontSpec> {
    return null;
  }
}

export class Snippet {
  code = "";
  name = "";
  description? = "";
}

export class PontGeneratorPlugin extends PontPlugin {
  apply(manager: PontManager, options?: any): void {}

  providerSnippets(api: Interface, modName: string, originName: string, options?: any): Snippet[] {
    return [];
  }
}

export class PontMocksPlugin extends PontPlugin {
  apply(manager: PontManager, options?: any): void {}
}

export class PontReportPlugin extends PontPlugin {
  apply(manager: PontManager, options?: any): void {}
}

type PluginItem<T extends PontPlugin> = { instance: Promise<T>; options: any };

export class PontPlugins {
  fetch: PluginItem<PontFetchPlugin>;
  transform: PluginItem<PontTransformPlugin>;
  parser: PluginItem<PontParserPlugin>;
  mocks: PluginItem<PontMocksPlugin>;
  generate: PluginItem<PontGeneratorPlugin>;
  report: PluginItem<PontReportPlugin>;

  static getDefaultPlugins() {
    return {
      fetch: { use: "pont-meta-fetch-plugin", options: {} },
      parser: { use: "pont-oas2-parser-plugin", options: {} },
      generate: { use: "pont-react-hooks-generate-plugin", options: {} },
    };
  }
}

export class PontPublicManagerConfig {
  origins? = [] as PublicOriginConfig[];
  origin?: PublicOriginConfig = new PublicOriginConfig();
  url: string;
  outDir: string;
  plugins: {
    fetch: PluginConfig;
    transform: PluginConfig;
    parser: PluginConfig;
    mocks: PluginConfig;
    generate: PluginConfig;
    report: PluginConfig;
  };
}

export class InnerOriginConfig {
  url: string;
  name: string;
  plugins: PontPlugins;
}

export class PontInnerManagerConfig {
  origins = [] as InnerOriginConfig[];
  outDir: string;
  configDir: string;
  plugins: PontPlugins;

  static parsePurePlugin(plugin: PurePluginConfig, originName?: string): SimplePluginConfig {
    if (typeof plugin === "string") {
      return { use: plugin, options: {} };
    } else if (plugin?.use) {
      return { use: plugin?.use, options: plugin?.options || {} };
    } else if (originName && plugin?.[originName]) {
      return PontInnerManagerConfig.parsePurePlugin(plugin?.[originName]);
    }
  }

  static loadPlugin(pluginConfig: SimplePluginConfig, configDir: string) {
    const requirePath =
      pluginConfig.use.startsWith("./") || pluginConfig.use.startsWith("../")
        ? path.join(configDir, pluginConfig.use)
        : pluginConfig.use;
    try {
      // const pluginInstance = require(requirePath).then((LoadedPlugin) => {
      //   return new LoadedPlugin.default();
      // });
      const LoadedPlugin = require(requirePath);

      return {
        instance: LoadedPlugin.default,
        options: pluginConfig.options,
      };
    } catch (e) {}
  }

  static loadPlugins(config: PontPublicManagerConfig, originName: string, configDir: string, logger: PontLogger) {
    const configPlugins = {
      ...PontPlugins.getDefaultPlugins(),
      ...(config.plugins || {}),
    };

    const pluginTypes = Object.keys(configPlugins);

    return pluginTypes
      .map((pluginType) => {
        const plugin = configPlugins[pluginType];

        return (
          PontInnerManagerConfig.parsePurePlugin(plugin, originName) || PontPlugins.getDefaultPlugins()[pluginType]
        );
      })
      .map((plugin, pluginIndex) => {
        const requirePath =
          plugin.use.startsWith("./") || plugin.use.startsWith("../") ? path.join(configDir, plugin.use) : plugin.use;
        try {
          const LoadedPlugin = require(requirePath).default;
          const instance = new LoadedPlugin() as PontPlugin;
          if (instance) {
            instance.logger = logger;
          } else {
            logger.error(pluginTypes[pluginIndex] + " plugin not found");
          }

          return {
            instance,
            options: plugin.options,
          };
        } catch (e) {
          console.log(e.stack);
          logger.error(e.message);
        }
      })
      .reduce((result, plugin, pluginIndex) => {
        return { ...result, [pluginTypes[pluginIndex]]: plugin };
      }, {});
  }

  static loadGlobalPlugins(config: PontPublicManagerConfig, configDir: string): PontPlugins {
    const configPlugins = {
      ...PontPlugins.getDefaultPlugins(),
      ...(config.plugins || {}),
    };
    return Object.keys(configPlugins || {}).reduce((result, pluginType) => {
      const plugin = configPlugins[pluginType];

      return {
        ...result,
        [pluginType]: PontInnerManagerConfig.loadPlugin(
          PontInnerManagerConfig.parsePurePlugin(plugin) || PontPlugins.getDefaultPlugins()[pluginType],
          configDir,
        ),
      };
    }, {} as PontPlugins);
  }

  // todo, 解析 envs、plugins
  static constructorFromPublicConfig(
    config: PontPublicManagerConfig,
    logger: PontLogger,
    configDir: string,
  ): PontInnerManagerConfig {
    let origins = config.origins;
    if (!origins?.length) {
      if (typeof config.url === "string" && config.url) {
        origins = [{ url: config.url } as PublicOriginConfig];
      } else {
        origins = [config.origin];
      }
    }

    if (!origins?.length) {
      logger.error("pont 配置文件错误！未配置数据源信息");
    }

    return {
      outDir: config.outDir,
      configDir,
      plugins: PontInnerManagerConfig.loadGlobalPlugins(config, configDir),
      origins: origins
        .map((origin) => {
          if (origin.envs && origin.env) {
            const envConfig = origin.envs[origin.env];
            if (typeof envConfig === "string") {
              return {
                ...origin,
                url: envConfig,
              };
            }
            return envConfig;
          }

          if (typeof origin === "string") {
            return { url: origin };
          }
          return origin;
        })
        .map((origin) => {
          return {
            ...origin,
            plugins: PontInnerManagerConfig.loadPlugins(config, origin.name, configDir, logger),
          };
        }),
    };
  }
}
