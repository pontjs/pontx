import * as path from "path";
import ts from "typescript";
import {
  asyncNoOp,
  findNearestNodeModules,
  isObject,
  noOp,
  normalizePath,
  requireUncached,
} from "./utils";
import colors from "picocolors";
import fsp from "node:fs/promises";
import { createLogger, Logger, LogLevel, LogType } from "./logger";
import type {
  OriginConfig,
  PontxConfig,
  ResolvedConfig,
  ResolvedOriginConfig,
} from "./type";
import { resolvePlugin } from "./plugin";

type PontxConfigFn = () => PontxConfig | Promise<PontxConfig>;

export function defineConfig(config: PontxConfig): PontxConfig;
export function defineConfig(config: PontxConfigFn): PontxConfigFn;
export function defineConfig(config: any): any {
  return config;
}

async function resolveConfigFile(rootDir: string, fileName: string) {
  let nodeModulesDir =
    typeof process.versions.deno === "string"
      ? undefined
      : findNearestNodeModules(path.dirname(fileName));

  const hash = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const configDir = path.dirname(fileName);
  const tempDir = nodeModulesDir
    ? path.resolve(nodeModulesDir, `.pontx-temp/${hash}`)
    : path.resolve(configDir, `.pontx-temp/${hash}`);

  try {
    await fsp.mkdir(tempDir, {
      recursive: true,
    });
  } catch (e) {
    if (e.code === "EACCES") {
      // If there is no access permission, a temporary configuration file is created by default.
      nodeModulesDir = undefined;
    } else {
      throw e;
    }
  }

  // 创建自定义的编译上下文
  const configFileHost: ts.ParseConfigFileHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames || true,
    readDirectory: ts.sys.readDirectory,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    getCurrentDirectory: () => configDir,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      );
    },
  };

  // 创建编译选项
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    {
      compilerOptions: {
        allowJs: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2015,
        experimentalDecorators: true,
        outDir: tempDir,
        rootDir: configDir,
        baseUrl: configDir,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        noEmit: false,
        rootDirs: [configDir],
      },
      include: [fileName],
      exclude: ["node_modules", "**/*.test.ts", "**/*.spec.ts"],
    },
    configFileHost,
    configDir
  );

  const program = ts.createProgram(
    parsedCommandLine.fileNames,
    parsedCommandLine.options
  );

  program.emit();

  const tempConfigFile = path.join(tempDir, path.basename(fileName));
  // remove ext
  const finalFilePath = tempConfigFile.replace(/\.tsx?$/, ".js");

  try {
    const fileUrl = normalizePath(finalFilePath);

    const configExport = await requireUncached(fileUrl);
    await fsp.rm(tempDir, { recursive: true, force: true });
    return configExport;
  } catch (e) {
    // await fsp.rm(tempDir, { recursive: true, force: true });
    throw e;
  }
}

async function loadConfigFromFile(
  rootDir: string,
  configFile: string,
  options?: {
    logLevel?: LogLevel;
    customLogger?: Logger;
  }
) {
  try {
    const configExport = await resolveConfigFile(rootDir, configFile);

    const config: PontxConfig = await (typeof configExport === "function"
      ? configExport()
      : configExport);
    if (!isObject(config)) {
      throw new Error(`config must export or return an object.`);
    }

    return {
      path: normalizePath(configFile),
      config,
    };
  } catch (e) {
    const logger = createLogger(options?.logLevel, {
      customLogger: options?.customLogger,
    });

    logger.error(colors.red(`failed to load config from ${configFile}`), {
      error: e,
    });
    throw e;
  }
}

export async function resolveConfig(
  configFile: string,
  options?: {
    logLevel?: LogLevel;
    customLogger?: Logger;
    rootDir?: string;
  }
): Promise<ResolvedConfig> {
  const { path: configPath, config } = await loadConfigFromFile(
    options?.rootDir || path.dirname(configFile),
    configFile,
    options
  );
  const configDir = path.dirname(configPath);

  const resolvedOrigins = (config.origins || []).map((origin) => {
    let { envs, env, url, name, localPath, ...rest } = origin;

    const result = {
      ...rest,
      name,
      url,
      localPath: localPath ? path.join(configDir, localPath) : undefined,
    } as ResolvedOriginConfig;

    if (url) {
      result.url = url;
    }

    if (envs && env && envs[env]) {
      const envConf = envs[env];

      if (envConf?.url) {
        result.url = envConf.url;
      }

      if (envConf?.localPath) {
        result.localPath = envConf.localPath;
      }
    }

    return result;
  });

  const resolvedConfigContent = {
    rootDir: options?.rootDir || path.dirname(configPath),
    configDir,
    configPath,
    outDir: path.isAbsolute(config.outDir)
      ? config.outDir
      : path.join(configDir, config.outDir),
    origins: resolvedOrigins,
    resolvedPlugin: resolvePlugin(config.plugins ?? []),
    service: config.service,
  } as ResolvedConfig;
  if (config.translateConfig) {
    resolvedConfigContent.translateConfig = {
      ...config.translateConfig,
      // 如果是相对目录，则拼接成绝对目录。
      cachePath: path.isAbsolute(config.translateConfig.cachePath)
        ? config.translateConfig.cachePath
        : path.join(configDir, config.translateConfig.cachePath),
    };
  }

  return resolvedConfigContent;
}
