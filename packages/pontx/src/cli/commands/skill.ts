/**
 * @author pontx
 * @description AI SKILL 安装命令
 *
 * 用法:
 * - pontx skill              # 执行 npx skills add 安装 SKILL
 * - pontx skill --print      # 打印 SKILL.md 内容到 stdout
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { createLogger } from "../../logger/logger";

/**
 * Skill 命令选项
 */
export interface SkillCommandOptions {}

/**
 * 获取 pontx 包中 skills 目录的绝对路径
 */
function getPontxSkillsDir(): string {
  // CJS 编译后文件平铺在 cjs/ 目录下: cjs/skill.cjs -> skills/pontx
  // ESM 编译后文件在子目录: lib/commands/skill.js -> skills/pontx
  // 使用 __dirname 向上找到包根目录
  let packageDir = __dirname;

  // 检查是否在 cjs 或 lib 目录下
  const dirName = path.basename(packageDir);
  if (dirName === "cjs" || dirName === "lib") {
    // 平铺结构：cjs/skill.cjs 或 lib/commands/skill.js
    packageDir = path.dirname(packageDir);
  } else if (dirName === "commands") {
    // 嵌套结构：lib/commands/skill.js
    packageDir = path.resolve(packageDir, "..", "..");
  }

  return path.join(packageDir, "skills", "pontx");
}

/**
 * Skill 命令入口
 */
export async function skillCommand(
  options: SkillCommandOptions,
): Promise<void> {
  const logger = createLogger("info", { prefix: "[pontx skill]" });

  const skillsDir = getPontxSkillsDir();
  const skillFilePath = path.join(skillsDir, "SKILL.md");

  // 检查 SKILL.md 文件是否存在
  if (!fs.existsSync(skillFilePath)) {
    logger.error(`SKILL.md not found at: ${skillFilePath}`);
    throw new Error("SKILL.md file not found");
  }

  // 默认行为：执行 npx skills add
  logger.info("Installing pontx skill...");

  try {
    execSync(`npx skills add "${skillsDir}"`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    logger.info("Pontx skill installed successfully!");
  } catch (error) {
    logger.error("Failed to install skill:", error);
    throw error;
  }
}
