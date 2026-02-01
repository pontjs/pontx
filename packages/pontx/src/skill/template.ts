/**
 * @author pontx
 * @description AI SKILL 模板内容，用于生成符合 Claude Code Agent Skills 标准的 SKILL.md 文件
 */

export function getSkillTemplate(): string {
  return `---
name: pontx
description: API lifecycle management - search, explore, and call APIs with type-safe code generation
version: {{pontxVersion}}
author: pontx
tags:
  - api
  - openapi
  - sdk
  - code-generation
---

# Pontx AI Skill

Pontx 是一个 API 生命周期管理工具，提供 API 搜索、探索、文档生成、SDK 代码生成和直接调用等能力。

**Current project specs**: {{projectSpecs}}

## Quick Start

\`\`\`bash
# 1. 初始化配置
pontx init

# 2. 列出所有 API
pontx list apis

# 3. 搜索 API
pontx search user

# 4. 查看 API 详情
pontx show-api user/info

# 5. 生成 SDK 代码
pontx gen user/info
\`\`\`

## Core Workflows

### 1. Configure pontx.config.ts

在项目根目录创建 \`pontx.config.ts\` 配置文件：

\`\`\`typescript
import { defineConfig } from 'pontx';

export default defineConfig({
  // SDK 代码输出目录
  outDir: './src/services',

  // API 数据源配置（推荐使用 specs，也支持 origins）
  specs: [
    {
      name: 'my-api',
      url: 'https://api.example.com/swagger.json',  // OpenAPI spec URL
    },
    // 或使用本地文件
    // {
    //   name: 'local-api',
    //   localPath: './openapi.json',
    // }
  ],

  // 插件配置（可选）
  // plugins: [createGracefulClientPlugin()],
});
\`\`\`

**详细配置文档**: 查看项目 README 和 \`pontx init --help\`

### 2. SDK Integration Workflow（在项目代码中集成 API）

**目标**: 在 TypeScript/JavaScript 项目中生成类型安全的 SDK 代码

**流程**:
\`\`\`bash
# Step 1: 列出所有 API
pontx list apis

# Step 2: 搜索特定 API
pontx search user      # 搜索包含 "user" 的 API

# Step 3: 查看 API 详细信息
pontx show-api user/info    # 查看参数、响应类型等

# Step 4: 生成 SDK 代码
pontx gen user/info         # 生成单个 API
pontx gen                   # 生成所有 API
\`\`\`

**产物**: TypeScript/JavaScript SDK 代码文件

**使用方式**:
\`\`\`typescript
// 在项目代码中导入和使用
import { userApi } from '@/sdk';

// 类型安全的 API 调用
const userInfo = await userApi.info({ id: 123 });
\`\`\`

**辅助命令**:
- \`pontx list specs\`: 列出所有数据源
- \`pontx list tags\`: 列出所有 API 标签
- \`pontx list schemas\`: 列出所有数据模型

### 3. CLI Call Workflow（通过命令行直接调用 API）

**目标**: 直接通过 CLI 调用 API，无需生成代码

⚠️ **安全警告**:
- 实际调用会产生**真实的副作用**（创建、更新、删除数据）
- **必须**先使用 \`--dry-run\` 预览请求
- 检查 \`--env\` 环境配置
- 确认参数格式正确

**完整流程示例**:

\`\`\`bash
# Step 1: 列出可用 API
pontx list specs        # 列出所有数据源
pontx list apis         # 列出所有 API
pontx list tags         # 按标签浏览

# Step 2: 搜索目标 API
pontx search user       # 搜索包含 "user" 关键词的 API
pontx search "create"   # 搜索创建类 API

# Step 3: 查看 API 详细信息
pontx show-api user/info
# 输出包含:
# - API 路径和方法
# - 参数列表（名称、类型、是否必需、描述）
# - 响应类型
# - 示例请求

# Step 4a: 预览请求（干运行，不实际调用）
pontx call user/info --dry-run --params '{"id": 123}'
# 输出:
# - 完整的 HTTP 请求（URL、方法、headers、body）
# - 不会发送实际请求

# Step 4b: 实际调用 API
pontx call user/info --params '{"id": 123}'

# Step 4c: 切换环境
pontx call user/info --env prod --params '{"id": 123}'

# Step 4d: 使用文件传递参数（复杂参数）
echo '{"id": 123, "name": "test"}' > params.json
pontx call user/create --params @params.json

# Step 4e: POST 请求示例
pontx call user/create --dry-run --params '{"name": "John", "email": "john@example.com"}'
pontx call user/create --params '{"name": "John", "email": "john@example.com"}'
\`\`\`

**重要参数**:
- \`--dry-run\`: 仅预览，不实际发送请求（**强烈推荐先使用**）
- \`--env <name>\`: 指定环境（dev/prod，默认为配置中的默认环境）
- \`--params <json>\`: 传递 API 参数（JSON 格式）
- \`--params @<file>\`: 从文件读取参数

**安全最佳实践**:
1. ✅ 总是先用 \`--dry-run\` 预览请求
2. ✅ 检查 \`--env\` 确认目标环境
3. ✅ 使用 \`show-api\` 确认参数格式
4. ⚠️ 小心 DELETE/PUT 等修改类操作
5. ⚠️ 生产环境调用需二次确认

### 4. CLI Commands Reference

核心命令列表（使用 \`pontx --help\` 查看完整帮助）：

| 命令 | 说明 |
|------|------|
| \`pontx init\` | 初始化项目配置 |
| \`pontx list <type>\` | 列出资源（specs/apis/tags/schemas） |
| \`pontx search <keyword>\` | 搜索 API |
| \`pontx show-api <path>\` | 查看 API 详细信息 |
| \`pontx gen [path]\` | 生成 SDK 代码 |
| \`pontx call <path>\` | 调用 API（⚠️ 有副作用） |
| \`pontx cli init\` | 初始化 SDK CLI 项目 |
| \`pontx cli build\` | 构建 SDK CLI |
| \`pontx completion install\` | 安装 Shell 补全 |
| \`pontx skill\` | 生成此 SKILL 文件 |

**常用选项**:
- \`--help\`: 查看命令帮助
- \`--version\`: 查看版本
- \`--debug\`: 启用调试日志

### 5. Build CLI Tool Workflow（构建独立的命令行工具）

**目标**: 为团队构建一个独立的、可执行的 CLI 工具来调用 API

**与 SDK 集成的区别**:
- SDK 集成: 在代码中 \`import { api } from '@/sdk'\`
- CLI 工具: 独立可执行程序 \`my-api-cli call user/info\`

**流程**:

\`\`\`bash
# Step 1: 初始化 CLI 项目
pontx cli init my-api-cli
cd my-api-cli

# Step 2: 配置 pontx.cli.ts
# 配置 CLI 名称、API 执行配置等

# Step 3: 构建 CLI
pontx cli build

# Step 4: 测试 CLI
./dist/cli.cjs --help
./dist/cli.cjs call user/info --id 123

# Step 5: 发布 CLI（npm 或二进制）
npm publish
\`\`\`

**产物**: 独立的命令行工具

**使用方式**:
\`\`\`bash
# 团队成员安装
npm install -g my-api-cli

# 使用
my-api-cli call user/info --id 123
my-api-cli search user
\`\`\`

**配置文件 \`pontx.cli.ts\` 示例**:
\`\`\`typescript
import { runCLI } from 'pontx/sdk-cli';

export default runCLI({
  name: 'my-api-cli',
  executeApi: {
    baseURL: 'https://api.example.com',
  },
});
\`\`\`

### 6. Shell Completion

安装 Shell 自动补全，提升命令行使用体验：

\`\`\`bash
# 安装补全（自动检测 shell 类型）
pontx completion install

# 手动指定 shell
pontx completion install --shell zsh
pontx completion install --shell bash

# 重新加载 shell
source ~/.zshrc   # zsh
source ~/.bashrc  # bash
\`\`\`

**支持的 Shell**:
- Zsh（推荐）
- Bash
- Fish（计划支持）

**补全功能**:
- 命令自动补全
- 参数自动补全
- API 路径补全（基于项目配置）

## Safety & Best Practices

### API 调用安全
- ✅ **总是先用 \`--dry-run\`**: 预览请求内容，避免误操作
- ✅ **检查环境**: 使用 \`--env\` 确认目标环境（dev/prod）
- ✅ **验证参数**: 使用 \`show-api\` 查看参数要求
- ⚠️ **小心副作用**: DELETE/PUT/POST 操作会修改数据
- ⚠️ **保护凭证**: 使用环境变量存储 token，不要硬编码

### 配置管理
- 使用 \`pontx.config.ts\` 统一管理配置
- 敏感信息使用环境变量（\`process.env.API_TOKEN\`）
- 不同环境使用不同配置（dev/staging/prod）

### 代码生成
- 定期更新生成的代码（API spec 变化时）
- 不要手动修改生成的代码（会被覆盖）
- 使用版本控制追踪生成代码的变化

### 调试技巧
- 使用 \`--debug\` 查看详细日志
- 使用 \`PONTX_LOG_LEVEL=debug\` 环境变量
- 查看 \`~/.pontx/logs\` 日志文件

## Learn More

### 官方文档
- **完整文档**: 查看项目根目录的 \`README.md\`
- **配置指南**: 查看 \`CLAUDE.md\` 中的配置说明
- **API 参考**: 运行 \`pontx --help\` 查看所有命令

### MCP Integration
- **MCP Server**: 查看 \`packages/mcp/README.md\`
- 支持通过 Claude Desktop 等 MCP 客户端使用 Pontx
- 提供 API 搜索、代码生成等能力

### 示例项目
- **Examples**: 查看 \`examples/\` 目录中的示例项目
- 包含各种框架集成示例（React、Vue、Node.js 等）

### 社区支持
- **Issues**: 报告 bug 或请求功能
- **Discussions**: 讨论最佳实践和使用技巧

---

*Generated by \`pontx skill\` v{{pontxVersion}}*

*This SKILL file helps AI assistants (Claude Code, Gemini CLI, etc.) understand and use Pontx CLI effectively.*
`;
}
