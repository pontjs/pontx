/**
 * @author pontx
 * @description pontx cli init 命令实现
 */

import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";

export interface CliInitOptions {
  /** CLI 命令名 */
  name: string;
  /** CLI 输出目录，默认 ./dist/bin */
  out?: string;
}

export interface CliInitResult {
  /** package.json 路径 */
  packageJsonPath: string;
  /** bin 字段名 */
  binName: string;
  /** bin 字段值 */
  binPath: string;
  /** 是否是新增（false 表示更新） */
  isNew: boolean;
}

/**
 * 检测 JSON 文件的缩进
 */
function detectIndent(content: string): number {
  const match = content.match(/^(\s+)"/m);
  if (match) {
    return match[1].length;
  }
  return 2;
}

/**
 * 初始化 SDK CLI
 * 更新 package.json 的 bin 字段
 */
export async function cliInitCommand(
  options: CliInitOptions
): Promise<CliInitResult> {
  const { name } = options;

  // 1. 验证 name
  if (!name || typeof name !== "string") {
    throw new Error("CLI 名称不能为空");
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `CLI 名称 "${name}" 不合法，只能包含小写字母、数字和连字符，且必须以字母开头`
    );
  }

  // 2. 查找 package.json
  const pkgPath = path.resolve(process.cwd(), "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`未找到 package.json: ${pkgPath}`);
  }

  // 3. 读取并解析 package.json
  const pkgContent = await fsp.readFile(pkgPath, "utf-8");
  let pkg: Record<string, any>;
  try {
    pkg = JSON.parse(pkgContent);
  } catch (e) {
    throw new Error(`package.json 解析失败: ${(e as Error).message}`);
  }

  // 4. 确定输出目录（优先级：命令行参数 > package.json pontx.specDir > 默认值）
  const out =
    options.out || pkg.pontx?.specDir || "./dist/bin";

  // 5. 计算 bin 路径
  const binPath = `${out}/cli.cjs`;
  const isNew = !pkg.bin || !pkg.bin[name];

  // 6. 更新 bin 字段
  pkg.bin = pkg.bin || {};
  pkg.bin[name] = binPath;

  // 7. 写回 package.json（保持格式）
  const indent = detectIndent(pkgContent);
  await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, indent) + "\n");

  // 8. 返回结果
  return {
    packageJsonPath: pkgPath,
    binName: name,
    binPath,
    isNew,
  };
}

/**
 * 格式化输出结果
 */
export function formatInitResult(result: CliInitResult): string {
  const action = result.isNew ? "添加" : "更新";
  return [
    `已${action} package.json:`,
    `  bin.${result.binName} = "${result.binPath}"`,
  ].join("\n");
}
