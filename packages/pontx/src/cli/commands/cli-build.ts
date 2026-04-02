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
 * 从 pontx.config.ts 读取所有 specs
 * @param rootDir - 项目根目录
 * @returns 包含 name 和 spec 的数组
 */
async function getSpecsFromPontxConfig(
  rootDir: string
): Promise<Array<{ name: string; spec: PontxSpec }>> {
  const logger = createLogger("info", { prefix: "[cli build]" });

  // 1. 从项目根目录加载 PontxManager
  logger.debug(`加载 pontx.config.ts from ${rootDir}`);
  const manager = await PontxManager.constructorFromRootDir(rootDir, logger);

  // 2. 验证至少有一个 origin
  const origins = manager.resolvedConfig.origins;
  if (origins.length === 0) {
    throw new Error(
      `错误：未找到 origin 配置\n` +
        `提示：请在 pontx.config.ts 中配置 origins`
    );
  }

  // 3. 多 origin 时校验 name 不重复
  if (origins.length > 1) {
    const names = origins.map((o) => o.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      throw new Error(
        `错误：存在重复的 origin name: ${[...new Set(duplicates)].join(", ")}\n` +
          `提示：请确保每个 origin 的 name 唯一`
      );
    }
  }

  // 4. 获取所有 specs
  const results: Array<{ name: string; spec: PontxSpec }> = [];
  for (const origin of origins) {
    if (!origin.spec) {
      throw new Error(
        `错误：origin "${origin.name}" 尚未生成本地 spec\n\n` +
          `提示：请先运行 'pontx generate' 生成 API 规范文件`
      );
    }
    logger.debug(`从 origin "${origin.name}" 读取 spec`);
    results.push({ name: origin.name, spec: origin.spec });
  }

  return results;
}

/**
 * 将 specs 序列化为 JSON 并写入文件
 * 单 origin：写 api-lock.json（向后兼容）
 * 多 origin：每个 spec 写 {name}.api-lock.json
 */
async function writeSpecsToFile(
  specs: Array<{ name: string; spec: PontxSpec }>,
  outDir: string
): Promise<void> {
  /* 确保目录存在 */
  await fsp.mkdir(outDir, { recursive: true });

  if (specs.length === 1) {
    /* 单 origin：保持原格式，清理多 origin 残留 */
    const targetPath = path.join(outDir, "api-lock.json");
    await fsp.writeFile(targetPath, JSON.stringify(specs[0].spec, null, 2), "utf-8");
    console.log(`✓ 已生成 api-lock.json`);
    await cleanupSpecFiles(outDir, "multi");
  } else {
    /* 多 origin：每个 spec 一个文件，清理单 origin 残留 */
    for (const { name, spec } of specs) {
      const targetPath = path.join(outDir, `${name}.api-lock.json`);
      await fsp.writeFile(targetPath, JSON.stringify(spec, null, 2), "utf-8");
      console.log(`✓ 已生成 ${name}.api-lock.json`);
    }
    await cleanupSpecFiles(outDir, "single");
  }
}

/**
 * 清理旧格式的 spec 文件
 * @param outDir 输出目录
 * @param cleanType "single" 清理 api-lock.json，"multi" 清理 *.api-lock.json
 */
async function cleanupSpecFiles(
  outDir: string,
  cleanType: "single" | "multi"
): Promise<void> {
  try {
    if (cleanType === "single") {
      const singlePath = path.join(outDir, "api-lock.json");
      if (fs.existsSync(singlePath)) {
        await fsp.unlink(singlePath);
      }
    } else {
      const files = await fsp.readdir(outDir);
      for (const file of files) {
        if (file.endsWith(".api-lock.json")) {
          await fsp.unlink(path.join(outDir, file));
        }
      }
    }
  } catch {
    /* 清理失败不影响构建 */
  }
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

  // 3. 从 pontx.config.ts 读取 specs 并写入到构建目录
  const specs = await getSpecsFromPontxConfig(configDir);
  await writeSpecsToFile(specs, outDir);

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
