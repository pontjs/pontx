/**
 * @author pontx-generator
 * @description 文件树写入工具
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FileTree } from './types';

/**
 * 递归创建目录
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 将文件树写入磁盘
 */
export function writeFileTree(tree: FileTree, basePath: string): void {
  ensureDir(basePath);

  Object.entries(tree).forEach(([key, value]) => {
    const fullPath = path.join(basePath, key);

    if (typeof value === 'string') {
      // 文件内容
      fs.writeFileSync(fullPath, value, 'utf-8');
    } else {
      // 目录
      ensureDir(fullPath);
      writeFileTree(value, fullPath);
    }
  });
}
