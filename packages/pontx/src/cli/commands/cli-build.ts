/**
 * @author pontx
 * @description pontx cli build 命令实现
 */

import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { PontxManager } from "../../manager";
import { createLogger } from "../../logger/logger";
import type { PontxSpec } from "@pontx/spec";

export interface CliBuildOptions {
  /** 配置文件路径，默认 ./pontx.cli.ts */
  config?: string;
  /** 输出目录，默认 ./dist/bin */
  out?: string;
}

/**
 * 解析构建选项
 */
export function resolveBuildOptions(options: CliBuildOptions): {
  configPath: string;
  configDir: string;
  outDir: string;
  outFile: string;
} {
  const configPath = path.resolve(options.config || "./pontx.cli.ts");
  const configDir = path.dirname(configPath);
  const outDir = path.resolve(options.out || "./dist/bin");
  const outFile = path.join(outDir, "cli.cjs");
  return { configPath, configDir, outDir, outFile };
}

/* loadCLIConfig 已移除 - spec 现在从 pontx.config.ts 中读取 */

/**
 * 从 pontx.config.ts 读取 spec
 * @param rootDir - 项目根目录
 * @returns PontxSpec 对象
 */
async function getSpecFromPontxConfig(rootDir: string): Promise<PontxSpec> {
  const logger = createLogger("info", { prefix: "[cli build]" });

  // 1. 从项目根目录加载 PontxManager
  logger.debug(`加载 pontx.config.ts from ${rootDir}`);
  const manager = await PontxManager.constructorFromRootDir(rootDir, logger);

  // 2. 验证只有一个 origin
  const origins = manager.resolvedConfig.origins;
  if (origins.length === 0) {
    throw new Error(
      `错误：未找到 origin 配置\n` +
        `提示：请在 pontx.config.ts 中配置 origins`
    );
  }
  if (origins.length > 1) {
    throw new Error(
      `错误：SDK CLI 目前只支持单 origin 项目\n` +
        `  当前配置了 ${origins.length} 个 origins: ${origins.map(o => o.name).join(", ")}\n\n` +
        `提示：多 origin 项目暂不支持 SDK CLI 功能`
    );
  }

  // 3. 获取 spec
  const origin = origins[0];
  if (!origin.spec) {
    throw new Error(
      `错误：origin "${origin.name}" 尚未生成本地 spec\n\n` +
        `提示：请先运行 'pontx generate' 生成 API 规范文件`
    );
  }

  logger.debug(`从 origin "${origin.name}" 读取 spec`);
  return origin.spec;
}

/**
 * 将 spec 序列化为 JSON 并写入文件
 * @param spec - PontxSpec 对象
 * @param outDir - 输出目录
 */
async function writeSpecToFile(
  spec: PontxSpec,
  outDir: string
): Promise<void> {
  const targetSpecPath = path.join(outDir, "api-lock.json");

  // 序列化 spec 为格式化的 JSON
  const specJson = JSON.stringify(spec, null, 2);

  // 确保目录存在
  await fsp.mkdir(path.dirname(targetSpecPath), { recursive: true });

  // 写入文件
  await fsp.writeFile(targetSpecPath, specJson, "utf-8");

  console.log(`✓ 已生成 api-lock.json`);
}

/**
 * 更新 SDK 的 package.json，添加 pontx.specDir 字段
 * @param configDir - 配置文件所在目录（SDK 根目录）
 * @param outDir - 输出目录（spec 所在目录）
 */
async function updateSdkPackageJson(
  configDir: string,
  outDir: string
): Promise<void> {
  const pkgPath = path.join(configDir, "package.json");

  // 检查 package.json 是否存在
  if (!fs.existsSync(pkgPath)) {
    console.warn(`⚠ 警告: 未找到 package.json: ${pkgPath}`);
    return;
  }

  // 读取 package.json
  const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));

  // 计算相对路径
  const relativeSpecDir = path.relative(configDir, outDir);

  // 更新 pontx.specDir
  pkg.pontx = {
    ...pkg.pontx,
    specDir: relativeSpecDir || "./dist/bin",
  };

  // 写回 package.json
  await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

  console.log(`✓ 已更新 package.json: pontx.specDir = "${relativeSpecDir}"`);
}

/**
 * 生成 esbuild 配置
 */
export function generateEsbuildConfig(
  configPath: string,
  outFile: string
): import("esbuild").BuildOptions {
  /* 生成 shebang 和注入 __CLI_DIR__ */
  const banner = [
    "#!/usr/bin/env node",
    "/* 注入 CLI 目录用于定位 api-lock.json */",
    "globalThis.__CLI_DIR__ = __dirname;",
  ].join("\n");

  return {
    entryPoints: [configPath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: outFile,
    external: ["pontx"],
    banner: { js: banner },
    minify: false,
    sourcemap: false,
    target: "node18",
    logLevel: "warning",
  };
}

/**
 * 构建 SDK CLI
 * 将 pontx.cli.ts 编译为可执行的 cli.cjs
 */
export async function cliBuildCommand(options: CliBuildOptions): Promise<void> {
  const { configPath, configDir, outDir, outFile } =
    resolveBuildOptions(options);

  // 1. 检查配置文件是否存在
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }

  // 2. 创建输出目录
  await fsp.mkdir(outDir, { recursive: true });

  // 3. 从 pontx.config.ts 读取 spec 并写入到构建目录
  const spec = await getSpecFromPontxConfig(configDir);
  await writeSpecToFile(spec, outDir);

  // 4. 更新 package.json，添加 pontx.specDir 字段
  await updateSdkPackageJson(configDir, outDir);

  // 5. 动态导入 esbuild（避免在不需要时加载）
  const esbuild = await import("esbuild");

  // 6. 编译 pontx.cli.ts → cli.cjs
  const esbuildConfig = generateEsbuildConfig(configPath, outFile);
  await esbuild.build(esbuildConfig);

  // 7. 设置可执行权限（Unix 系统）
  if (process.platform !== "win32") {
    await fsp.chmod(outFile, 0o755);
  }

  // 8. 输出结果
  console.log(`✓ CLI 构建完成: ${outFile}`);
}
