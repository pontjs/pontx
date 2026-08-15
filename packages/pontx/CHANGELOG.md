# pontx

## 1.0.0-beta.13

### Patch Changes

- 9a29cbc: Make PontxSpec the canonical protocol boundary with explicit style-aware validation, locale structural checks, and lossless OAS2/OAS3 import. RESTFul specs require HTTP method/path while RPC and GraphQL specs remain loadable and indexable without an HTTP executor.
- Updated dependencies [9a29cbc]
  - @pontx/spec@1.0.0-beta.5

## 1.0.0-beta.12

### Patch Changes

- 9294ed5: Keep OpenAPI Endpoints without explicit operation tags at the generated client root. Do not synthesize `common` or `default` Controllers, including for mixed tagged and untagged APIs.
- Updated dependencies [9294ed5]
  - @pontx/spec@1.0.0-beta.4

## 1.0.0-beta.11

### Minor Changes

- d6c3619: Add PontxSpec static metadata quality scoring and Pontx CLI dynamic Agent evaluation with isolated request fixtures, machine-readable reports, and report-only CI semantics. Normalize OAS 3 examples, nullable unions, exclusive bounds, enum descriptions, response references, composition schemas, operation IDs, and coherent request examples so quality results reflect the consumable PontxSpec contract. Reserve four static points for Endpoint-level request examples and validate required inputs, unresolved sources, success responses, approved servers, and credential safety.

  Reject generic placeholder leaf examples such as `example`, `string`, and `test` while preserving meaningful URL/email examples and values explicitly admitted by `enum` or `const`.

### Patch Changes

- 0d853d7: Preserve every declared OAS 3 request media type, tolerate non-string tag descriptions from unresolved external documentation references, generate `Blob` types for binary schemas, let fetch runtimes supply multipart boundaries, and decode binary HTTP responses without corrupting PDF or ZIP payloads through text or JSON parsing. Protect CLI mutations with short-lived request-bound confirmations, redact credentials from request previews, and require binary output to be written as bytes to a file. Prevent invalid generic leaf examples from receiving a quality-score presence reward over safely omitted examples.
- 71474ae: Align public package metadata, repository links, and Agent Skill discovery terms with the canonical Pontx API site at pontx.dev.
- Updated dependencies [0d853d7]
- Updated dependencies [d6c3619]
- Updated dependencies [71474ae]
  - @pontx/spec@1.0.0-beta.3

## 1.0.0-beta.8

### Patch Changes

- Support successful non-200 2xx response schemas and add cURL output for API calls.
- Updated dependencies
  - @pontx/spec@1.0.0-beta.2

## 1.0.0-beta.4

### Patch Changes

- fix: remove unused registerSpecListCommands import in sdk-cli

## 1.0.0-beta.3

### Minor Changes

- # SDK CLI 多 origin 支持

  ## 主要改动

  ### 1. 支持多 origin 项目

  SDK CLI 现在支持多 origin（多 spec）项目：

  - 单 origin：保持向后兼容，命令在根级别注册
  - 多 origin：每个 spec 作为子命令注册，如 `cli currency call tag api`

  ### 2. 构建产物格式

  - 单 origin：生成 `api-lock.json`（向后兼容）
  - 多 origin：每个 spec 生成 `{name}.api-lock.json`

  ### 3. context-adapter 优化

  - `createSdkCliContext` 直接接受 PontxSpec 对象，避免重复读取文件

  ### 4. ExecuteApiConfig 支持自定义 fetchFn

  - 允许 SDK CLI 复用时传入自定义的 fetch 函数

## 1.0.0-beta.2

### Patch Changes

- Add README documentation for pontx package

## 1.0.0-beta.1

### Minor Changes

- # OpenCLI 规范引入与 CLI 架构重构

  ## 主要改动

  ### 1. CLI 架构重构为层级子命令结构

  引入 OpenCLI 规范定义命令元数据，CLI 从扁平结构重构为层级子命令结构，支持 `-h` 逐层查看帮助。

  ### 2. 新增命令

  - `pontx skill` - 生成 AI SKILL 文件
  - `pontx init` - 项目初始化
  - `pontx list-commands` - 列出所有可用命令
  - `pontx list-specs` - 列出所有 API 规范
  - `pontx <spec>` 子命令系列：
    - `call` - 调用 API
    - `gen` - 代码生成
    - `search` - 搜索 API
    - `show-api` / `show-schema` - 查看 API 详情和 Schema
    - `list-apis` / `list-tags` / `list-schemas` / `list-cases` - 列出元数据

  ### 3. 补全系统重写

  全新的 Shell 补全系统，支持 bash/zsh/fish，基于 manifest 缓存实现高性能补全。

  - zsh 补全显示优化，支持多行描述和原生 padding 对齐
  - 子命令和选项值的智能补全

  ### 4. SDK CLI 增强

  - 新增 `init-skill` 命令
  - 修复 SDK CLI skill 命令的三个问题
  - 统一 CLI 参数格式为点分隔风格（show-schema）

### Patch Changes

- Updated dependencies
  - @pontx/spec@1.0.0-beta.1

## 1.0.0-beta.0

### Major Changes

- 2ff5d1d: # 配置加载机制优化

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
        "outFiles": ["${workspaceFolder}/node_modules/.pontx-cache/**/*.js"],
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

  | 场景     | 旧方案（TypeScript） | 新方案（esbuild） |
  | -------- | -------------------- | ----------------- |
  | 首次编译 | 200-500ms            | 50-100ms          |
  | 后续运行 | 200-500ms            | 5-10ms            |
  | 依赖大小 | 23.6 MB              | 0.9 MB            |
  | 调试支持 | ⚠️ 复杂              | ✅ 完美           |

### Patch Changes

- Updated dependencies
  - @pontx/spec@1.0.0-beta.0

## 0.1.14

### Patch Changes

- feat(search): add --spec option to search by spec name
  - Support searching APIs in a specific spec (local or global) using `--spec <specName>`
  - Auto-resolve spec from local project or global registry
  - Deprecate `--global <package>` in favor of `--spec <specName>` for better UX
- Updated dependencies
  - @pontx/spec@0.1.15

## 0.1.13

### Patch Changes

- support pontx call command
- Updated dependencies
  - @pontx/spec@0.1.15

## 0.1.12

### Patch Changes

- support pontx check
- Updated dependencies
  - @pontx/spec@0.1.14

## 0.1.11

### Patch Changes

- fix build dir
- Updated dependencies
  - @pontx/spec@0.1.13

## 0.1.10

### Patch Changes

- fix: fix oas parser
- Updated dependencies
  - @pontx/spec@0.1.12

## 0.1.8

### Patch Changes

- fix config types

## 0.1.7

### Patch Changes

- upgrade spec
- Updated dependencies
  - @pontx/spec@0.1.10

## 0.1.6

### Patch Changes

- upgrade spec
- Updated dependencies
  - @pontx/spec@0.1.9

## 0.1.5

### Patch Changes

- fix spec parse with tags not defined in root but defined in api
- Updated dependencies
  - @pontx/spec@0.1.3

## 0.1.4

### Patch Changes

- FIX ts import in pontx

## 0.1.3

### Patch Changes

- fix comment generate
- Updated dependencies
  - @pontx/spec@0.1.2

## 0.1.2

### Patch Changes

- update deps version

## 0.1.1

### Patch Changes

- init
- Updated dependencies
  - @pontx/spec@0.1.1
