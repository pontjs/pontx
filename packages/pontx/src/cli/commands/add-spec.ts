/**
 * @author pontx
 * @description pontx add-spec 命令实现
 * 将 SDK 包的 spec 添加到项目的 package.json 中
 */

import * as path from "path";
import * as fs from "fs";

export interface AddSpecOptions {
  /** 自定义 spec 名称（可选，默认使用 SDK 的 spec.name） */
  name?: string;
}

/**
 * 解析 SDK 包的 spec 信息
 * @param sdkName - SDK 包名
 * @returns SDK 信息
 */
function resolveSdkSpec(sdkName: string): {
  sdkPackageJson: any;
  specPath: string;
  specName: string;
} {
  try {
    // 1. 定位 SDK package.json
    const sdkPkgPath = require.resolve(`${sdkName}/package.json`, {
      paths: [process.cwd()],
    });
    const sdkDir = path.dirname(sdkPkgPath);
    const sdkPackageJson = JSON.parse(fs.readFileSync(sdkPkgPath, "utf-8"));

    // 2. 读取 pontx.specDir
    const specDir = sdkPackageJson.pontx?.specDir;
    if (!specDir) {
      throw new Error(
        `SDK "${sdkName}" 未配置 pontx.specDir\n\n` +
          `提示：请确保 SDK 已通过 'pontx cli:build' 构建并发布`
      );
    }

    // 3. 定位 spec.json (支持 api-lock.json 别名)
    const specPath = path.join(sdkDir, specDir, "api-lock.json");

    if (!fs.existsSync(specPath)) {
      throw new Error(
        `未找到 spec 文件: ${specPath}\n\n` +
          `提示：请确保 SDK 包含完整的构建产物`
      );
    }

    // 4. 读取 spec.name
    const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
    if (!spec.name) {
      throw new Error(`spec 文件缺少 name 字段: ${specPath}`);
    }

    return { sdkPackageJson, specPath, specName: spec.name };
  } catch (error: any) {
    if (error.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `未找到 SDK 包: ${sdkName}\n\n` +
          `提示：请先安装该包: npm install ${sdkName}`
      );
    }
    throw error;
  }
}

/**
 * 修改项目的 package.json，添加 spec 配置
 * @param projectRoot - 项目根目录
 * @param sdkName - SDK 包名
 * @param customName - 自定义 spec 名称（可选）
 */
function modifyPackageJson(
  projectRoot: string,
  sdkName: string,
  customName?: string
): void {
  const pkgPath = path.join(projectRoot, "package.json");

  // 检查 package.json 是否存在
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      `未找到 package.json: ${pkgPath}\n\n` +
        `提示：请在项目根目录执行此命令`
    );
  }

  // 读取 package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // 初始化 pontx.specs
  pkg.pontx = pkg.pontx || {};
  pkg.pontx.specs = pkg.pontx.specs || [];

  // 检查是否已存在
  const exists = pkg.pontx.specs.some((spec: any) => {
    const sdk = typeof spec === "string" ? spec : spec.sdk;
    return sdk === sdkName;
  });

  if (exists) {
    throw new Error(
      `SDK "${sdkName}" 已存在于 pontx.specs\n\n` +
        `提示：如需更新配置，请先手动删除现有配置`
    );
  }

  // 添加新 spec（字符串或对象）
  const newSpec = customName ? { name: customName, sdk: sdkName } : sdkName;
  pkg.pontx.specs.push(newSpec);

  // 写回 package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

  console.log(`✓ 已添加到 package.json: ${sdkName}`);
}

/**
 * add-spec 命令主函数
 * @param sdkName - SDK 包名
 * @param options - 命令选项
 */
export async function addSpecCommand(
  sdkName: string,
  options: AddSpecOptions
): Promise<void> {
  const projectRoot = process.cwd();

  // 1. 解析 SDK spec
  console.log(`正在解析 SDK: ${sdkName}...`);
  const { specName } = resolveSdkSpec(sdkName);

  // 2. 修改 package.json
  modifyPackageJson(projectRoot, sdkName, options.name);

  // 3. 输出成功信息
  const displayName = options.name || specName;
  console.log(`✓ 成功添加 spec: ${displayName} (来自 ${sdkName})`);
  console.log(
    `\n提示：该 spec 为外置 spec，仅用于查询和调用，不支持代码生成`
  );
}
