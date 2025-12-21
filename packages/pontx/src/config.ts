import * as path from "path";
import { pathToFileURL } from "node:url";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
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
import { createLogger } from "./logger/logger";
import type { Logger, LogLevel } from "./logger/types";
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

/**
 * 使用 tsx register 加载 TypeScript 配置
 * 支持 VSCode 断点调试
 */
async function loadTypeScriptConfigWithTsx(configFile: string) {
  try {
    const { register } = (await import("tsx/esm/api")) as {
      register: () => () => void;
    };

    const unregister = register();

    try {
      const fileUrl = pathToFileURL(configFile).href + "?t=" + Date.now();
      const module = await import(fileUrl);
      return module.default || module;
    } finally {
      unregister();
    }
  } catch (error: any) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        `Cannot find module in config file.\n` +
          `Make sure all imports in ${path.basename(configFile)} are correct.\n` +
          `Original error: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * 获取包的版本hash（用于依赖缓存）
 */
function getPackageVersionHash(packageName: string, configDir: string): string {
  try {
    const pkgJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [configDir],
    });
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    const version = pkgJson.version || "0.0.0";
    return crypto.createHash("sha256").update(version).digest("hex").slice(0, 8);
  } catch (e) {
    return "unknown";
  }
}

/**
 * 使用 esbuild 编译加载 TypeScript 配置（持久化缓存 + 依赖分离）
 */
async function loadTypeScriptConfigWithEsbuild(configFile: string) {
  const esbuild = await import("esbuild");

  // 1. 计算内容 hash（用于缓存）
  const configContent = await fsp.readFile(configFile, "utf-8");
  const contentHash = crypto
    .createHash("sha256")
    .update(configContent)
    .digest("hex")
    .slice(0, 8);

  // 2. 使用持久化缓存目录
  const configDir = path.dirname(configFile);
  const nodeModulesDir = findNearestNodeModules(configDir);
  const cacheDir = nodeModulesDir
    ? path.join(nodeModulesDir, ".pontx-cache")
    : path.join(configDir, "node_modules/.pontx-cache");

  const configName = path.basename(configFile, path.extname(configFile));
  const outFile = path.join(cacheDir, `${configName}-${contentHash}.mjs`);
  const sourceMapFile = `${outFile}.map`;

  // 3. 检查缓存
  if (fs.existsSync(outFile)) {
    try {
      const fileUrl = pathToFileURL(outFile).href + "?t=" + Date.now();
      const module = await import(fileUrl);
      return module.default || module;
    } catch (e) {
      // 缓存损坏，删除后重新编译
      await fsp.rm(outFile, { force: true });
      if (fs.existsSync(sourceMapFile)) {
        await fsp.rm(sourceMapFile, { force: true });
      }
    }
  }

  // 4. 编译（缓存未命中）
  try {
    await fsp.mkdir(cacheDir, { recursive: true });

    // bundle: true 可以正确处理相对路径导入
    // 通过 packages: "external" 排除 node_modules 中的包
    await esbuild.build({
      entryPoints: [configFile],
      bundle: true, // 打包以正确解析相对路径
      platform: "node",
      format: "esm",
      outfile: outFile,
      sourcemap: true,
      target: "node18",
      logLevel: "silent",
      // 排除 node_modules 中的所有包
      packages: "external",
    });

    // 调试模式提示
    if (process.env.PONTX_DEBUG === "true") {
      console.log(colors.dim(`\n[pontx] 编译产物已保存:\n${outFile}`));
      console.log(colors.dim(`Source map: ${sourceMapFile}\n`));
    }

    // 5. 加载编译后的文件（不删除）
    const fileUrl = pathToFileURL(outFile).href + "?t=" + Date.now();
    const module = await import(fileUrl);
    return module.default || module;
  } catch (error: any) {
    throw new Error(
      `Failed to compile config with esbuild:\n${error.message}\n\n` +
        `Tip: Run 'npx tsx ${configFile}' to see detailed errors.`
    );
  }
}

/**
 * 加载 TypeScript 配置文件
 * - 调试模式：使用 tsx register，支持断点调试
 * - 普通模式：使用 esbuild 编译，速度更快
 */
async function loadTypeScriptConfig(configFile: string) {
  // 检查是否在调试模式
  const isDebugMode = process.execArgv.some((arg) => arg.includes("inspect"));

  if (isDebugMode) {
    // 调试模式：使用 tsx register，支持断点调试
    return await loadTypeScriptConfigWithTsx(configFile);
  } else {
    // 普通模式：使用 esbuild 编译，更快
    return await loadTypeScriptConfigWithEsbuild(configFile);
  }
}

/**
 * 加载配置文件（支持 .js/.mjs/.cjs/.ts）
 */
async function resolveConfigFile(rootDir: string, fileName: string) {
  const ext = path.extname(fileName);

  try {
    // JavaScript 文件直接加载
    if ([".js", ".mjs", ".cjs"].includes(ext)) {
      const fileUrl = pathToFileURL(fileName).href;
      const module = await import(fileUrl);
      return module.default || module;
    }

    // TypeScript 文件需要编译
    if (ext === ".ts") {
      return await loadTypeScriptConfig(fileName);
    }

    throw new Error(`Unsupported config file extension: ${ext}`);
  } catch (error: any) {
    console.error(colors.red(`Failed to load ${path.basename(fileName)}:`));
    console.error(colors.red(error.message));

    if (ext === ".ts") {
      console.error(colors.yellow("\n💡 Debugging tips:"));
      console.error("  1. Check syntax errors in your config file");
      console.error("  2. Use VSCode debugger (press F5)");
      console.error("  3. Run: npx tsx " + fileName);
    }

    throw error;
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

  // 优先使用 specs，兼容旧版 origins
  const originConfigs = config.specs || config.origins || [];
  const resolvedOrigins = originConfigs.map((origin) => {
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
