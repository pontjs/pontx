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
  PackageJsonPontxConfig,
  PontxConfig,
  ResolvedConfig,
  ResolvedOriginConfig,
} from "./type";
import { resolvePlugin } from "./plugin";
import type { PontxSpec } from "@pontx/spec";

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

    // 在 ESM 环境中注入 __dirname 和 __filename 兼容定义
    const banner = {
      js: `
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
`.trim(),
    };

    // bundle: true 可以正确处理相对路径导入
    // 通过 packages: "external" 排除 node_modules 中的包
    await esbuild.build({
      entryPoints: [configFile],
      bundle: true, // 打包以正确解析相对路径
      platform: "node",
      format: "esm",
      outfile: outFile,
      banner, // 注入 __dirname 和 __filename
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
 * @param rootDir 根目录（用于日志显示）
 * @param fileName 配置文件路径
 * @returns 配置文件导出的内容
 */
export async function resolveConfigFile(rootDir: string, fileName: string) {
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

/**
 * 解析外置 spec 配置的元数据
 * @description 从 package.json 读取外置 spec 配置，并行解析每个 SDK 的 specDir 和 lockPath
 * 这个函数不包含日志输出，是纯粹的解析逻辑，可被多个场景复用
 * @param projectRoot - 项目根目录
 * @returns 外置 spec 的元数据数组，失败的项返回 null
 */
export async function resolveExternalSpecConfigs(
  projectRoot: string
): Promise<
  Array<{
    sdkName: string;
    customName?: string;
    sdkDir: string;
    specDir: string;
    lockPath: string;
  } | null>
> {
  const pkgPath = path.join(projectRoot, "package.json");

  // 检查 package.json 是否存在
  if (!fs.existsSync(pkgPath)) {
    return [];
  }

  // 读取 package.json
  let pkg: { pontx?: PackageJsonPontxConfig };
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch {
    return [];
  }

  // 检查是否有外置 specs 配置
  const externalSpecs = pkg.pontx?.specs;
  if (!externalSpecs || externalSpecs.length === 0) {
    return [];
  }

  // 并行解析每个外置 spec
  return Promise.all(
    externalSpecs.map(async (spec) => {
      try {
        const sdkName = typeof spec === "string" ? spec : spec.sdk;
        const customName = typeof spec === "object" ? spec.name : undefined;

        // 定位 SDK package.json
        const sdkPkgPath = require.resolve(`${sdkName}/package.json`, {
          paths: [projectRoot],
        });
        const sdkDir = path.dirname(sdkPkgPath);
        const sdkPkg: { pontx?: PackageJsonPontxConfig } = JSON.parse(
          fs.readFileSync(sdkPkgPath, "utf-8")
        );

        // 读取 pontx.specDir
        const specDir = sdkPkg.pontx?.specDir;
        if (!specDir) {
          return null;
        }

        // 构造 api-lock.json 路径
        const lockPath = path.join(sdkDir, specDir, "api-lock.json");
        if (!fs.existsSync(lockPath)) {
          return null;
        }

        return {
          sdkName,
          customName,
          sdkDir,
          specDir,
          lockPath,
        };
      } catch {
        return null;
      }
    })
  );
}

/**
 * 从 package.json 加载外置 specs
 * @param projectRoot - 项目根目录
 * @param logger - 日志实例
 * @returns 解析后的外置 OriginConfig 数组
 */
async function resolveExternalSpecs(
  projectRoot: string,
  logger?: Logger
): Promise<ResolvedOriginConfig[]> {
  // 使用核心函数解析外置 spec 配置
  const configs = await resolveExternalSpecConfigs(projectRoot);
  const validConfigs = configs.filter(
    (c): c is NonNullable<typeof c> => c !== null
  );

  if (validConfigs.length === 0) {
    return [];
  }

  logger?.debug(`发现 ${validConfigs.length} 个外置 spec 配置`);

  // 加载完整的 PontxSpec 并创建 ResolvedOriginConfig
  const results: ResolvedOriginConfig[] = [];

  for (const config of validConfigs) {
    try {
      // 加载完整的 PontxSpec
      const loadedSpec: PontxSpec = JSON.parse(
        fs.readFileSync(config.lockPath, "utf-8")
      );

      // 创建 ResolvedOriginConfig
      const resolvedOrigin: ResolvedOriginConfig = {
        name: config.customName || loadedSpec.name,
        spec: loadedSpec,
        external: true, // 标记为外置
        sdk: config.sdkName,
        localPath: config.lockPath,
      };

      results.push(resolvedOrigin);
      logger?.debug(
        `已加载外置 spec: ${resolvedOrigin.name} (来自 ${config.sdkName})`
      );
    } catch (error: any) {
      logger?.warn(
        `加载外置 spec "${config.sdkName}" 失败: ${error.message}`
      );
    }
  }

  return results;
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

  // 加载 package.json 中的外置 specs
  const logger = createLogger(options?.logLevel, {
    customLogger: options?.customLogger,
  });
  const externalSpecs = await resolveExternalSpecs(
    options?.rootDir || configDir,
    logger
  );

  // 合并 pontx.config.ts 和 package.json 的 specs
  const allResolvedOrigins = [...resolvedOrigins, ...externalSpecs];

  const resolvedConfigContent = {
    rootDir: options?.rootDir || path.dirname(configPath),
    configDir,
    configPath,
    outDir: path.isAbsolute(config.outDir)
      ? config.outDir
      : path.join(configDir, config.outDir),
    origins: allResolvedOrigins,
    resolvedPlugin: resolvePlugin(config.plugins ?? [], config.executeApi),
    service: config.service,
    executeApiConfig: config.executeApi,
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
