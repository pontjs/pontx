---
"pontx": major
---

# 配置加载机制优化

## 主要改动

### 1. 使用 esbuild 替代 TypeScript Compiler API

- **依赖变化**：移除 `typescript` (23.6 MB)，新增 `tsx` (0.76 MB) + `esbuild` (0.14 MB)
- **体积减少**：~23 MB
- **性能提升**：
  - 首次编译：200-500ms → 50-100ms（提升 2-5x）
  - 后续加载：200-500ms → 5-10ms（缓存命中，提升 20-100x）

### 2. 持久化缓存机制

- 编译产物保存在 `node_modules/.pontx-cache/`
- 使用内容 hash 作为缓存键，配置文件未变化时直接使用缓存
- 支持调试：保留 source map，可在 VSCode 中断点调试

### 3. 调试支持

**普通模式**（默认）：
- 使用 esbuild 编译，快速且有缓存
- 生成外部 source map，支持事后调试

**调试模式**（自动检测）：
- 检测到 `--inspect` 参数时自动启用
- 使用 tsx register，完美支持 VSCode 断点调试
- 直接运行 `.ts` 文件，无需预编译

### 4. 新增命令

```bash
# 清理编译缓存
pontx cache:clean
```

### 5. Node.js 版本要求

- **新要求**：Node.js >= 18.0.0
- **原因**：tsx 和 esbuild 的依赖要求
- **影响**：Node.js 14/16 已 EOL，现代工具链都要求 18+

## 使用说明

### 调试配置文件

1. 创建 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "调试 Pontx",
      "program": "${workspaceFolder}/node_modules/.bin/pontx",
      "args": ["build"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": [
        "${workspaceFolder}/node_modules/.pontx-cache/**/*.js"
      ],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

2. 在 `pontx.config.ts` 中设置断点
3. 按 F5 开始调试

### 缓存管理

```bash
# 清理缓存
pontx cache:clean

# 查看缓存（如果需要可以实现）
# pontx cache:info
```

## Breaking Changes

⚠️ **Node.js 版本要求提升到 18.0.0**

如果项目使用 Node.js 14/16，需要升级：
```bash
# 使用 nvm
nvm install 18

# 使用 fnm
fnm install 18
```

## 技术细节

### 配置文件支持

- `pontx.config.ts` - TypeScript（推荐）
- `pontx.config.js` - JavaScript
- `pontx.config.mjs` - ES Module
- `pontx.config.cjs` - CommonJS

### 缓存策略

- 基于配置文件内容的 SHA-256 hash（取前 8 位）
- 缓存文件命名：`pontx.config-{hash}.mjs`
- 外部 source map：`pontx.config-{hash}.mjs.map`

### 性能对比

| 场景 | 旧方案（TypeScript） | 新方案（esbuild） |
|------|---------------------|------------------|
| 首次编译 | 200-500ms | 50-100ms |
| 后续运行 | 200-500ms | 5-10ms |
| 依赖大小 | 23.6 MB | 0.9 MB |
| 调试支持 | ⚠️ 复杂 | ✅ 完美 |
