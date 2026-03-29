/**
 * @author pontx
 * @description pontx init 命令实现 - 初始化生成 pontx.config.ts 配置文件
 */

import * as fs from "fs";
import * as path from "path";
import * as fsp from "fs/promises";
import { execSync } from "child_process";
import type { Logger } from "../../logger/types";

/** 运行时类型 */
export type RuntimeType = "nodejs" | "browser";

export interface InitOptions {
  /** 远程数据源 URL */
  url?: string;
  /** 数据源名称 */
  name?: string;
  /** 本地数据源路径 */
  localPath?: string;
  /** 输出目录，默认 src/apis */
  outDir?: string;
  /** 运行时环境，默认 nodejs */
  runtime?: RuntimeType;
  /** 跳过安装 SDK 依赖 */
  skipInstall?: boolean;
}

/** SDK 配置信息 */
interface SdkInfo {
  /** SDK 包名 */
  package: string;
  /** 是否有代码生成插件 */
  hasPlugin: boolean;
  /** 插件导入语句 */
  pluginImport?: string;
  /** 插件配置语句 */
  pluginConfig?: string;
  /** 客户端导入语句 */
  clientImport: string;
  /** 客户端工厂函数名 */
  clientFactory: string;
}

/** 不同运行时对应的 SDK 配置 */
const SDK_INFO: Record<RuntimeType, SdkInfo> = {
  nodejs: {
    package: "@pontx/nodejs-sdk",
    hasPlugin: true,
    pluginImport: `import { gracefulCodegenPlugin } from "@pontx/nodejs-sdk/plugin";`,
    pluginConfig: `gracefulCodegenPlugin()`,
    clientImport: `import { createGracefulClient } from "@pontx/nodejs-sdk";`,
    clientFactory: "createGracefulClient",
  },
  browser: {
    package: "@pontx/sdk-browser-client",
    hasPlugin: false,
    clientImport: `import { createClient } from "@pontx/sdk-browser-client";`,
    clientFactory: "createClient",
  },
};

/**
 * 检测包管理器类型
 */
function detectPackageManager(rootDir: string): "npm" | "pnpm" | "yarn" {
  if (fs.existsSync(path.join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(rootDir, "yarn.lock"))) return "yarn";
  return "npm";
}

/**
 * 安装 SDK 依赖
 */
async function installDependencies(
  rootDir: string,
  runtime: RuntimeType,
  logger: Logger,
): Promise<void> {
  const sdkInfo = SDK_INFO[runtime];
  const packageManager = detectPackageManager(rootDir);

  const installCmd = {
    npm: `npm install ${sdkInfo.package}`,
    pnpm: `pnpm add ${sdkInfo.package}`,
    yarn: `yarn add ${sdkInfo.package}`,
  }[packageManager];

  logger.info(`正在安装 SDK 依赖: ${sdkInfo.package}`);
  logger.debug(`使用包管理器: ${packageManager}`);
  logger.debug(`执行命令: ${installCmd}`);

  try {
    execSync(installCmd, {
      cwd: rootDir,
      stdio: "inherit",
    });
    logger.info(`SDK 依赖安装完成`);
  } catch (error) {
    logger.warn(`SDK 依赖安装失败，请手动执行: ${installCmd}`);
  }
}

/**
 * 生成 pontx.config.ts 文件内容
 */
function generateConfigContent(options: InitOptions): string {
  const { url, name, localPath, outDir = "src/apis", runtime = "nodejs" } = options;
  const sdkInfo = SDK_INFO[runtime];

  const lines: string[] = [`import { defineConfig } from "pontx";`];

  // 添加插件导入
  if (sdkInfo.hasPlugin && sdkInfo.pluginImport) {
    lines.push(sdkInfo.pluginImport);
  }

  lines.push(``);
  lines.push(`export default defineConfig({`);
  lines.push(`  outDir: "${outDir}",`);

  // 添加 plugins 配置
  if (sdkInfo.hasPlugin && sdkInfo.pluginConfig) {
    lines.push(`  plugins: [${sdkInfo.pluginConfig}],`);
  }

  // 如果有数据源配置，添加 specs 配置
  if (url || name || localPath) {
    lines.push(`  specs: [`);
    lines.push(`    {`);

    if (name) {
      lines.push(`      name: "${name}",`);
    } else {
      lines.push(`      name: "api",`);
    }

    if (url) {
      lines.push(`      url: "${url}",`);
    }

    if (localPath) {
      lines.push(`      localPath: "${localPath}",`);
    }

    lines.push(`    },`);
    lines.push(`  ],`);
  }

  lines.push(`});`);
  lines.push(``);

  return lines.join("\n");
}

/**
 * 生成 SDK 入口文件内容 (src/api.ts)
 */
function generateApiEntryContent(options: InitOptions): string {
  const { name = "api", outDir = "src/apis", runtime = "nodejs" } = options;
  const sdkInfo = SDK_INFO[runtime];

  const lines: string[] = [sdkInfo.clientImport];

  // 计算相对路径
  const apisRelativePath = `./${outDir.replace(/^src\//, "")}/${name}`;
  lines.push(`import { specMeta } from "${apisRelativePath}/apiMeta";`);
  lines.push(`import type { APIs } from "${apisRelativePath}/apis";`);
  lines.push(``);

  if (runtime === "browser") {
    // 浏览器环境需要 customFetch
    lines.push(`const customFetch: typeof fetch = async (url, init) => {`);
    lines.push(`  const response = await fetch(url, init);`);
    lines.push(`  if (!response.ok) {`);
    lines.push(`    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);`);
    lines.push(`  }`);
    lines.push(`  return response.json();`);
    lines.push(`};`);
    lines.push(``);
    lines.push(`export const apiClient = ${sdkInfo.clientFactory}<APIs>({`);
    lines.push(`  fetchFn: customFetch,`);
    lines.push(`  pontxSpecMeta: specMeta,`);
    lines.push(`});`);
  } else {
    // Node.js 环境
    lines.push(`export const apiClient = ${sdkInfo.clientFactory}<APIs>({`);
    lines.push(`  pontxSpecMeta: specMeta,`);
    lines.push(`  // validation: { enabled: true },`);
    lines.push(`  // retry: { maxAttempts: 3 },`);
    lines.push(`});`);
  }

  lines.push(``);
  return lines.join("\n");
}

/**
 * 执行 init 命令
 */
export async function initCommand(
  rootDir: string,
  options: InitOptions,
  logger: Logger,
): Promise<void> {
  const configFileName = "pontx.config.ts";
  const configPath = path.join(rootDir, configFileName);
  const runtime = options.runtime || "nodejs";
  const sdkInfo = SDK_INFO[runtime];

  // 检查配置文件是否已存在
  if (fs.existsSync(configPath)) {
    logger.warn(`配置文件 ${configFileName} 已存在，跳过创建`);
    logger.info(`如需重新生成，请先删除现有的 ${configFileName} 文件`);
    return;
  }

  // 生成配置文件内容
  const content = generateConfigContent(options);

  // 写入配置文件
  await fsp.writeFile(configPath, content, "utf-8");
  logger.info(`已创建配置文件: ${configFileName}`);

  // 生成 SDK 入口文件 src/api.ts
  const srcDir = path.join(rootDir, "src");
  const apiEntryPath = path.join(srcDir, "api.ts");

  // 确保 src 目录存在
  if (!fs.existsSync(srcDir)) {
    await fsp.mkdir(srcDir, { recursive: true });
  }

  // 写入 SDK 入口文件
  const apiEntryContent = generateApiEntryContent(options);
  await fsp.writeFile(apiEntryPath, apiEntryContent, "utf-8");
  logger.info(`已创建 SDK 入口文件: src/api.ts`);

  // 输出配置信息
  logger.info(`运行时环境: ${runtime}`);
  if (options.name || options.url || options.localPath) {
    logger.info(`数据源配置:`);
    if (options.name) {
      logger.info(`  名称: ${options.name}`);
    }
    if (options.url) {
      logger.info(`  URL: ${options.url}`);
    }
    if (options.localPath) {
      logger.info(`  本地路径: ${options.localPath}`);
    }
  }
  logger.info(`输出目录: ${options.outDir || "src/apis"}`);

  // 安装 SDK 依赖
  if (!options.skipInstall) {
    await installDependencies(rootDir, runtime, logger);
  } else {
    logger.info(`跳过安装 SDK 依赖，请手动安装: ${sdkInfo.package}`);
  }

  logger.info(`\n下一步:`);
  logger.info(`  1. 运行 pontx generate 生成代码`);
  logger.info(`  2. 在代码中导入 apiClient 使用 API`);
}
