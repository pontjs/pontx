#!/usr/bin/env node

/**
 * @author jasonHzq
 * @description CLI Setup - 简化第三方包接入 pontx CLI
 *
 * 使用方式：
 * ```javascript
 * // bin/your-cli.js
 * #!/usr/bin/env node
 * require('pontx/setup-cli')('your-cli-name');
 * ```
 *
 * 可选配置：
 * ```javascript
 * require('pontx/setup-cli')('your-cli-name', {
 *   rootDir: '/custom/path'  // 可选，默认自动检测
 * });
 * ```
 */

const path = require('path');
const fs = require('fs');

/**
 * 自动检测包的根目录（包含 pontx.config.ts 的目录）
 */
function detectRootDir(startDir) {
  let dir = startDir;
  const configFiles = [
    'pontx.config.ts',
    'pontx.config.js',
    'pontx.config.mjs',
    'pontx.config.cjs'
  ];

  // 向上查找，最多 5 层
  for (let i = 0; i < 5; i++) {
    const hasConfig = configFiles.some(file =>
      fs.existsSync(path.join(dir, file))
    );

    if (hasConfig) {
      return dir;
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) break; // 到达根目录
    dir = parentDir;
  }

  return startDir; // 找不到就返回起始目录
}

/**
 * 创建 CLI setup
 * @param {string} binName - CLI 命令名称
 * @param {object} options - 可选配置
 * @param {string} options.rootDir - 根目录，默认自动检测
 */
function setupCli(binName, options = {}) {
  if (!binName || typeof binName !== 'string') {
    console.error('[setup-cli] 错误: 必须提供命令名称');
    console.error('使用示例: require("pontx/setup-cli")("your-cli-name")');
    process.exit(1);
  }

  // 确定 rootDir
  let rootDir = options.rootDir;

  if (!rootDir) {
    if (require.main) {
      // 从入口文件向上查找
      const entryFile = require.main.filename;
      const entryDir = path.dirname(entryFile);
      rootDir = detectRootDir(entryDir);
    } else {
      // 从当前目录查找
      rootDir = detectRootDir(process.cwd());
    }
  }

  // 加载 CLI factory
  const { createCli, runCli } = require('./cjs/cli-factory.cjs');

  const program = createCli({
    rootDir,
    binName,
  });

  runCli(program).catch((e) => {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error(`[${binName}] 命令执行失败:`, error.message);
    if (process.argv.includes('--debug')) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

// 导出函数
module.exports = setupCli;
