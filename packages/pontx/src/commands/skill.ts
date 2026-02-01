/**
 * @author pontx
 * @description AI SKILL 生成命令（无子命令版本）
 *
 * 用法:
 * - pontx skill              # 生成到项目目录 (.claude/skills/pontx/SKILL.md)
 * - pontx skill --global     # 生成到全局目录 (~/.claude/skills/pontx/SKILL.md)
 * - pontx skill --print      # 打印到 stdout
 * - pontx skill -o <path>    # 自定义输出路径
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateSkillContent } from '../skill/generator';
import { createLogger } from '../logger/logger';

/**
 * Skill 命令选项
 */
export interface SkillCommandOptions {
  /** 自定义输出路径 */
  output?: string;
  /** 输出到全局目录 (~/.claude/skills/pontx/SKILL.md) */
  global?: boolean;
  /** 打印到 stdout，不生成文件 */
  print?: boolean;
}

/**
 * Skill 命令入口
 */
export async function skillCommand(options: SkillCommandOptions): Promise<void> {
  const logger = createLogger('info', { prefix: '[pontx skill]' });

  try {
    // 生成 SKILL 内容
    const content = await generateSkillContent();

    // --print 选项：打印到 stdout
    if (options.print) {
      console.log(content);
      return;
    }

    // 默认行为：生成文件
    const { output, global } = options;
    const outputPath = output || getDefaultOutputPath(global);

    await writeSkillFile(outputPath, content);

    logger.info(`✓ SKILL file generated: ${outputPath}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Open Claude Code or your AI assistant');
    logger.info('  2. The SKILL will be automatically detected');
    logger.info('  3. Try using /pontx or ask AI to help with API tasks');
  } catch (error) {
    logger.error('Failed to generate SKILL file:', error);
    throw error;
  }
}

/**
 * 获取默认输出路径
 */
function getDefaultOutputPath(global?: boolean): string {
  if (global) {
    return getGlobalSkillPath();
  }
  // 项目目录: .claude/skills/pontx/SKILL.md
  return path.join(process.cwd(), '.claude', 'skills', 'pontx', 'SKILL.md');
}

/**
 * 获取全局 SKILL 路径
 */
function getGlobalSkillPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error('Cannot determine home directory');
  }
  return path.join(home, '.claude', 'skills', 'pontx', 'SKILL.md');
}

/**
 * 写入 SKILL 文件
 */
async function writeSkillFile(outputPath: string, content: string): Promise<void> {
  // 确保目录存在
  const dir = path.dirname(outputPath);
  await fs.promises.mkdir(dir, { recursive: true });

  // 写入文件
  await fs.promises.writeFile(outputPath, content, 'utf-8');
}
