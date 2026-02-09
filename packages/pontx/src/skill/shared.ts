/**
 * @author pontx
 * @description SKILL 共享工具函数，供 pontx skill 和 sdk-cli skill 复用
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 写入 SKILL 文件（确保目录存在）
 */
export async function writeSkillFile(outputPath: string, content: string): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(outputPath, content, 'utf-8');
}
