import * as path from "path";
import * as fs from "fs-extra";
import { PontSpec, PontAPI } from "pontx-spec";
import { PontManager } from "./manager";
import { PontLogger } from "./logger";
import { findRealPath, loadPresetPluginPath, requireTsFile, requireUncached } from "./utils";

class PublicOriginConfig {
  url: string;
  name: string;
  env: string;
  envs: any;
  plugins?: PontxPlugins;
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

export class PontxPlugin {
  logger: PontLogger;
  innerConfig: PontInnerManagerConfig;

  apply(...args: any[]): any {}
}

export class PontxFetchPlugin extends PontxPlugin {
  async apply(originConf: InnerOriginConfig, options?: any): Promise<string> {
    return "";
  }
}

export class PontxParserPlugin extends PontxPlugin {
  async apply(metaStr: string, specName: string, options?: any): Promise<PontSpec> {
    return null;
  }
}

export class PontxTransformPlugin extends PontxPlugin {
  async apply(spec: PontSpec, options?: any): Promise<PontSpec> {
    return null;
  }
}

export class Snippet {
  code = "";
  name = "";
  description? = "";
}

export class PontxGeneratorPlugin extends PontxPlugin {
  apply(manager: PontManager, options?: any): void {}

  providerSnippets(api: PontAPI, modName: string, originName: string, options?: any): Snippet[] {
    return [];
  }
}

export class PontxMocksPlugin extends PontxPlugin {
  apply(manager: PontManager, options?: any): void {}
}

export class PontxReportPlugin extends PontxPlugin {
  apply(manager: PontManager, options?: any): void {}
}

export class PontxConfigPlugin extends PontxPlugin {
  apply(...args: any[]) {}
  async getSchema(): Promise<string> {
    return "";
  }
  async getOrigins(keyword?: string): Promise<Array<{ label: string; config: any; value: string }>> {
    return [];
  }
}

type PluginItem<T extends PontxPlugin> = { instance: Promise<T>; options: any };

export class PontxPlugins {
  fetch: PluginItem<PontxFetchPlugin>;
  transform: PluginItem<PontxTransformPlugin>;
  parser: PluginItem<PontxParserPlugin>;
  config: PluginItem<PontxConfigPlugin>;
  mocks: PluginItem<PontxMocksPlugin>;
  generate: PluginItem<PontxGeneratorPlugin>;
  report: PluginItem<PontxReportPlugin>;

  static getDefaultPlugins(plugin?: PurePluginConfig) {
    let options = {};
    if (typeof plugin !== "string") {
      options = plugin?.options || {};
    }

    return {
      fetch: { use: "pontx-meta-fetch-plugin", options },
      parser: { use: "pontx-oas2-parser-plugin", options },
      generate: { use: "pontx-react-hooks-generate-plugin", options },
    };
  }
}

export function requireModule(pluginPath: string, configDir: string, rootDir: string) {
  let requirePath =
    pluginPath.startsWith("./") || pluginPath.startsWith("../")
      ? path.join(configDir, pluginPath)
      : findRealPath(configDir, pluginPath);

  if (
    ["pontx-meta-fetch-plugin", "pontx-react-hooks-generate-plugin", "pontx-oas2-parser-plugin"].includes(pluginPath)
  ) {
    requirePath = pluginPath;
  }

  if (!path.extname(requirePath)) {
    if (fs.existsSync(requirePath + ".js")) {
      return requireUncached(requirePath + ".js");
    }
    if (fs.existsSync(requirePath + ".ts")) {
      const fileName = path.basename(requirePath);
      return requireTsFile(rootDir, {
        fileName,
        filePath: requirePath + ".ts",
      });
    }
    return requireUncached(requirePath);
  } else if (path.extname(requirePath) === ".ts") {
    const fileName = path.basename(requirePath, ".ts");
    return requireTsFile(rootDir, {
      fileName,
      filePath: requirePath,
    });
  } else {
    return requireUncached(requirePath);
  }
}

export class PontPublicManagerConfig {
  rootDir: string;
  origins? = [] as PublicOriginConfig[];
  origin?: PublicOriginConfig = new PublicOriginConfig();
  url: string;
  outDir: string;
  preset: string;
  plugins: {
    fetch: PluginConfig;
    transform: PluginConfig;
    parser: PluginConfig;
    mocks: PluginConfig;
    generate: PluginConfig;
    report: PluginConfig;
    config: PluginConfig;
  };
}

export class InnerOriginConfig {
  url: string;
  name: string;
  plugins: PontxPlugins;
}

export class PontInnerManagerConfig {
  rootDir: string;
  origins = [] as InnerOriginConfig[];
  outDir: string;
  configDir: string;
  plugins: PontxPlugins;

  static parsePurePlugin(plugin: PurePluginConfig, originName?: string): SimplePluginConfig {
    if (typeof plugin === "string") {
      return { use: plugin, options: {} };
    } else if (plugin?.use) {
      return { use: plugin?.use, options: plugin?.options || {} };
    } else if (originName && plugin?.[originName]) {
      return PontInnerManagerConfig.parsePurePlugin(plugin?.[originName]);
    }
  }

  static loadPlugin(pluginConfig: SimplePluginConfig, configDir: string, rootDir: string) {
    const requiredModule = requireModule(pluginConfig.use, configDir, rootDir);

    try {
      const LoadedPlugin = requiredModule.default;
      const instance = new LoadedPlugin() as PontxPlugin;

      return {
        instance,
        options: pluginConfig?.options,
      };
    } catch (e) {}
  }

  static loadPlugins(
    plugins: PontPublicManagerConfig["plugins"],
    originName: string,
    configDir: string,
    logger: PontLogger,
    innerConfig: PontInnerManagerConfig,
    rootDir: string,
  ) {
    const configPlugins = {
      ...PontxPlugins.getDefaultPlugins(),
      ...(plugins || {}),
    };

    const pluginTypes = Object.keys(configPlugins);

    return pluginTypes
      .map((pluginType) => {
        const plugin = configPlugins[pluginType];

        return (
          PontInnerManagerConfig.parsePurePlugin(plugin, originName) ||
          PontxPlugins.getDefaultPlugins(plugin)[pluginType]
        );
      })
      .map((plugin, pluginIndex) => {
        try {
          const requiredModule = requireModule(plugin.use, configDir, rootDir);
          const LoadedPlugin = requiredModule.default;
          const instance = new LoadedPlugin() as PontxPlugin;
          if (instance) {
            instance.logger = logger;
            instance.innerConfig = innerConfig;
          } else {
            logger.error(pluginTypes[pluginIndex] + " plugin not found");
          }

          return {
            instance,
            options: plugin?.options,
          };
        } catch (e) {
          logger.error(e.message, e.stack);
        }
      })
      .reduce((result, plugin, pluginIndex) => {
        return { ...result, [pluginTypes[pluginIndex]]: plugin };
      }, {});
  }

  static loadGlobalPlugins(
    config: PontPublicManagerConfig,
    configDir: string,
    logger: PontLogger,
    innerConfig: PontInnerManagerConfig,
  ): PontxPlugins {
    const configPlugins = {
      ...PontxPlugins.getDefaultPlugins(),
      ...(config.plugins || {}),
    };
    return Object.keys(configPlugins || {}).reduce((result, pluginType) => {
      const plugin = configPlugins[pluginType];
      const loadedPlugin = PontInnerManagerConfig.loadPlugin(
        PontInnerManagerConfig.parsePurePlugin(plugin) || PontxPlugins.getDefaultPlugins(plugin)[pluginType],
        configDir,
        config.rootDir,
      );
      if (loadedPlugin && loadedPlugin.instance) {
        loadedPlugin.instance.logger = logger;
        loadedPlugin.instance.innerConfig = innerConfig;
      }

      return {
        ...result,
        [pluginType]: loadedPlugin,
      };
    }, {} as PontxPlugins);
  }

  // todo, 解析 envs、plugins
  static constructorFromPublicConfig(
    config: PontPublicManagerConfig,
    logger: PontLogger,
    configDir: string,
  ): PontInnerManagerConfig {
    let { origin, origins, outDir, plugins, preset, rootDir, url, ...rest } = config;

    if (!config.plugins) {
      config.plugins = {} as any;
    }

    if (!origins?.length) {
      if (typeof config.url === "string" && config.url) {
        origins = [{ url: config.url } as PublicOriginConfig];
      } else if (config.origin) {
        origins = [config.origin];
      } else {
        origins = [];
      }
    }

    if (!origins?.length) {
      logger.error("pont 配置文件错误！未配置数据源信息");
    }

    if (config.preset) {
      const presetPath = findRealPath(configDir, config.preset);
      const presetResult = requireUncached(presetPath);
      const plugins = presetResult?.default || presetResult || {};

      Object.keys(plugins).forEach((pluginType) => {
        if (!config.plugins?.[pluginType] && plugins[pluginType]) {
          config.plugins[pluginType] = loadPresetPluginPath(presetPath, plugins[pluginType]);
        }
      });
    }

    if (outDir.startsWith("./") || outDir.startsWith("../")) {
      outDir = path.join(configDir, config.outDir);
    }

    const innerConfig = {
      ...rest,
      outDir,
      rootDir: config.rootDir,
      configDir,
    } as PontInnerManagerConfig;

    innerConfig.plugins = PontInnerManagerConfig.loadGlobalPlugins(config, configDir, logger, innerConfig);
    innerConfig.origins = origins
      .map((origin) => {
        if (origin.envs && origin.env) {
          const { envs, env, ...rest } = origin;
          const envConfig = origin.envs[origin.env];
          if (typeof envConfig === "string") {
            return {
              ...rest,
              url: envConfig,
            };
          }
          return { ...rest, ...envConfig };
        }

        if (typeof origin === "string") {
          return { url: origin };
        }
        return origin;
      })
      .map((origin) => {
        let originPlugins = config.plugins || ({} as any);
        if (origin.plugins) {
          originPlugins = { ...originPlugins, ...origin.plugins };
        }
        return {
          ...origin,
          plugins: PontInnerManagerConfig.loadPlugins(
            originPlugins,
            origin.name,
            configDir,
            logger,
            innerConfig,
            config.rootDir,
          ),
        };
      });

    return innerConfig;
  }
}
