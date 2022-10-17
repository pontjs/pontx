import * as path from "path";
import * as fs from "fs-extra";
import { PontSpec, PontAPI } from "pontx-spec";
import { PontManager } from "./manager";
import { PontLogger } from "./logger";
import { requireTsFile } from "./utils";

const findRealPath = (configDir: string, pluginPath: string) => {
  if (configDir === "/") {
    return pluginPath;
  }
  let retPath = path.join(configDir, "node_modules", pluginPath);

  if (fs.existsSync(retPath)) {
    return retPath;
  }

  return findRealPath(path.join(configDir, ".."), pluginPath);
};

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
  innerConfig: PontInnerManagerConfig;

  apply(...args: any[]): any {}
}

export class PontFetchPlugin extends PontPlugin {
  async apply(originConf: InnerOriginConfig, options?: any): Promise<string> {
    return "";
  }
}

export class PontParserPlugin extends PontPlugin {
  async apply(metaStr: string, specName: string, options?: any): Promise<PontSpec> {
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

  providerSnippets(api: PontAPI, modName: string, originName: string, options?: any): Snippet[] {
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
      fetch: { use: "pontx-meta-fetch-plugin", options: {} },
      parser: { use: "pontx-oas2-parser-plugin", options: {} },
      generate: { use: "pontx-react-hooks-generate-plugin", options: {} },
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
      return require(requirePath + ".js");
    }
    if (fs.existsSync(requirePath + ".ts")) {
      const fileName = path.basename(requirePath);
      return requireTsFile(rootDir, {
        fileName,
        filePath: requirePath + ".ts",
      });
    }
    return require(requirePath);
  } else if (path.extname(requirePath) === ".ts") {
    const fileName = path.basename(requirePath, ".ts");
    return requireTsFile(rootDir, {
      fileName,
      filePath: requirePath,
    });
  } else {
    return require(requirePath);
  }
}

export class PontPublicManagerConfig {
  rootDir: string;
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
  rootDir: string;
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

  static loadPlugin(pluginConfig: SimplePluginConfig, configDir: string, rootDir: string) {
    const requiredModule = requireModule(pluginConfig.use, configDir, rootDir);

    try {
      const LoadedPlugin = requiredModule.default;
      const instance = new LoadedPlugin() as PontPlugin;

      return {
        instance,
        options: pluginConfig.options,
      };
    } catch (e) {}
  }

  static loadPlugins(
    config: PontPublicManagerConfig,
    originName: string,
    configDir: string,
    logger: PontLogger,
    innerConfig: PontInnerManagerConfig,
  ) {
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
        try {
          const requiredModule = requireModule(plugin.use, configDir, config.rootDir);
          const LoadedPlugin = requiredModule.default;
          const instance = new LoadedPlugin() as PontPlugin;
          if (instance) {
            instance.logger = logger;
            instance.innerConfig = innerConfig;
          } else {
            logger.error(pluginTypes[pluginIndex] + " plugin not found");
          }

          return {
            instance,
            options: plugin.options,
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
  ): PontPlugins {
    const configPlugins = {
      ...PontPlugins.getDefaultPlugins(),
      ...(config.plugins || {}),
    };
    return Object.keys(configPlugins || {}).reduce((result, pluginType) => {
      const plugin = configPlugins[pluginType];
      const loadedPlugin = PontInnerManagerConfig.loadPlugin(
        PontInnerManagerConfig.parsePurePlugin(plugin) || PontPlugins.getDefaultPlugins()[pluginType],
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

    const innerConfig = {
      outDir: config.outDir,
      rootDir: config.rootDir,
      configDir,
    } as PontInnerManagerConfig;

    (innerConfig.plugins = PontInnerManagerConfig.loadGlobalPlugins(config, configDir, logger, innerConfig)),
      (innerConfig.origins = origins
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
          return {
            ...origin,
            plugins: PontInnerManagerConfig.loadPlugins(config, origin.name, configDir, logger, innerConfig),
          };
        }));

    return innerConfig;
  }
}
