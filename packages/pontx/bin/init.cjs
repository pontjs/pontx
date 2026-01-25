#!/usr/bin/env node

"use strict";

// 检查 Node.js 版本
const nodeVersion = process.versions.node;
const major = parseInt(nodeVersion.split('.')[0], 10);

if (major < 18) {
  console.error(
    '\x1b[31m错误: Pontx 需要 Node.js >= 18.0.0\x1b[0m\n' +
    `当前版本: v${nodeVersion}\n\n` +
    '请升级 Node.js:\n' +
    '  - 使用 nvm: nvm install 18\n' +
    '  - 使用 fnm: fnm install 18\n' +
    '  - 官方下载: https://nodejs.org/\n'
  );
  process.exit(1);
}

require("../cjs/cli.cjs");
