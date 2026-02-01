/**
 * @author jasonHzq
 * @description SDK CLI SKILL 文件模板定义
 */

/**
 * SKILL.md 模板
 * 用于生成 Claude Code SKILL 文件，教会 AI 如何使用 SDK CLI
 */
export const SKILL_MD_TEMPLATE = `---
name: {{SDK_NAME}}
description: 使用 {{SDK_NAME}} CLI 搜索、查看和调用 API。包含 {{API_COUNT}} 个 API 接口。
argument-hint: [command] [args...]
---

# {{SDK_NAME}} CLI

{{DESCRIPTION}}

版本: {{VERSION}}

## 快速开始

\`\`\`bash
# 安装 SDK
npm install {{SDK_NAME}}

# 生成 SKILL 到项目
npx {{SDK_NAME}} init-skill

# 搜索 API
npx {{SDK_NAME}} search <keyword>
\`\`\`

## 核心命令

### search - 搜索 API

搜索包含关键词的 API。

\`\`\`bash
{{SDK_NAME}} search <keyword> [options]

Options:
  -m, --max <count>    最大结果数 (默认: 6)
  --remote             搜索远程元数据
\`\`\`

**示例**:
\`\`\`bash
# 搜索包含 "user" 的 API
{{SDK_NAME}} search user

# 限制返回 3 条结果
{{SDK_NAME}} search user -m 3
\`\`\`

### show-api - 查看 API 详情

显示指定 API 的详细信息，包括参数、请求体、响应等。

\`\`\`bash
{{SDK_NAME}} show-api <api-path> [options]

Options:
  --remote             显示远程元数据
\`\`\`

**示例**:
\`\`\`bash
# 查看 API 详情
{{SDK_NAME}} show-api {{API_PATH_EXAMPLE}}
\`\`\`

### show-schema - 查看 Schema 定义

查看数据结构的 Schema 定义。

\`\`\`bash
{{SDK_NAME}} show-schema <schema-path> [options]

Options:
  --use-remote         使用远程元数据
\`\`\`

**示例**:
\`\`\`bash
# 查看 Schema
{{SDK_NAME}} show-schema User
\`\`\`

### gen - 生成代码

为指定 API 生成调用代码。

\`\`\`bash
{{SDK_NAME}} gen <api-path> [options]

Options:
  --case <case>        代码模板名称 (默认: request)
                       常见值: request (基础请求), reactHooks (React Hooks)
  --params <json>      请求参数，JSON 格式字符串
  --body <json>        请求体参数，JSON 格式
  --use-remote         使用远程元数据
\`\`\`

**示例**:
\`\`\`bash
# 生成基础请求代码
{{SDK_NAME}} gen {{API_PATH_EXAMPLE}}

# 生成 React Hooks 代码
{{SDK_NAME}} gen {{API_PATH_EXAMPLE}} --case reactHooks

# 带参数生成代码
{{SDK_NAME}} gen {{API_PATH_EXAMPLE}} --params '{"id": 123}'
\`\`\`

### call - 调用 API

直接调用 API 并返回结果。

\`\`\`bash
{{SDK_NAME}} call <api-path> [args...] [options]

Options:
  -e, --env <env>      环境名称
  -H, --header <header...>  额外的 HTTP 头
  -o, --output <file>  输出到文件
  --debug              调试模式
  --dry-run            仅显示请求信息，不发送请求
  --use-remote         使用远程元数据
  -q, --query <jmespath>  使用 JMESPath 查询响应
\`\`\`

**参数格式**:
- 命名参数: \`--param-name value\`
- 请求体: \`--body '{"key": "value"}'\`

**示例**:
\`\`\`bash
# 调用 API
{{SDK_NAME}} call {{API_PATH_EXAMPLE}} --id 123

# 使用 JMESPath 查询结果
{{SDK_NAME}} call {{API_PATH_EXAMPLE}} --id 123 -q "data.name"

# 保存结果到文件
{{SDK_NAME}} call {{API_PATH_EXAMPLE}} --id 123 -o result.json
\`\`\`

### list-templates - 列出代码模板

列出所有可用的代码生成模板。

\`\`\`bash
{{SDK_NAME}} list-templates
\`\`\`

### completion - 管理 Shell 自动补全

安装或管理 shell 自动补全功能。

\`\`\`bash
{{SDK_NAME}} completion [action] [options]

Actions:
  install              安装自动补全 (默认)
  uninstall            卸载自动补全
  generate             生成补全脚本

Options:
  --shell <shell>      Shell 类型: bash | zsh | fish
  --output <path>      输出脚本到文件
\`\`\`

## API Path 格式

{{API_PATH_FORMAT}}

## 工作流示例

### 场景 1: 搜索 API → 查看详情 → 生成代码

\`\`\`bash
# 1. 搜索包含 "user" 的 API
{{SDK_NAME}} search user

# 2. 查看 API 详情
{{SDK_NAME}} show-api {{API_PATH_EXAMPLE}}

# 3. 生成 React Hooks 代码
{{SDK_NAME}} gen {{API_PATH_EXAMPLE}} --case reactHooks
\`\`\`

### 场景 2: 调用 API 并解析响应

\`\`\`bash
# 调用 API 并使用 JMESPath 提取数据
{{SDK_NAME}} call {{API_PATH_EXAMPLE}} --id 123 -q "data[*].{id: id, name: name}"
\`\`\`

### 场景 3: 集成 SDK 到项目

\`\`\`bash
# 1. 生成代码
{{SDK_NAME}} gen {{API_PATH_EXAMPLE}} --case request

# 2. 将生成的代码复制到项目中使用
# 生成的代码可以直接在项目中调用
\`\`\`

## SDK 集成说明

生成的代码可以直接在项目中使用:

\`\`\`typescript
// 使用 gen 命令生成的代码
import { request } from './generated/api';

// 调用 API
const result = await request.{{API_METHOD_EXAMPLE}}({ id: 123 });
\`\`\`

## 常见问题

### 如何查看所有可用的代码模板？

\`\`\`bash
{{SDK_NAME}} list-templates
\`\`\`

### 如何配置环境？

使用 \`-e\` 或 \`--env\` 选项指定环境:

\`\`\`bash
{{SDK_NAME}} call {{API_PATH_EXAMPLE}} --id 123 -e production
\`\`\`

### 如何查看 Schema 定义？

\`\`\`bash
{{SDK_NAME}} show-schema <schema-name>
\`\`\`

## 相关资源

- NPM: https://www.npmjs.com/package/{{SDK_NAME}}
{{REPOSITORY_LINK}}
{{HOMEPAGE_LINK}}
`;

/**
 * 获取 API 路径示例
 * @param hasTags 是否有 tags
 * @returns API 路径示例字符串
 */
export function getApiPathExample(hasTags: boolean): string {
  return hasTags ? "user/getUserInfo" : "getUserInfo";
}

/**
 * 获取 API 方法示例
 * @param hasTags 是否有 tags
 * @returns API 方法示例字符串
 */
export function getApiMethodExample(hasTags: boolean): string {
  return hasTags ? "getUserInfo" : "getUserInfo";
}

/**
 * 获取 API 路径格式说明
 * @param hasTags 是否有 tags
 * @returns API 路径格式说明文本
 */
export function getApiPathFormatHelp(hasTags: boolean): string {
  if (hasTags) {
    return `API 路径格式: \`tag/apiName\` 或 \`tag.apiName\`
示例: \`pet/getPetById\` 或 \`pet.getPetById\``;
  } else {
    return `API 路径格式: \`apiName\`
示例: \`getUserInfo\``;
  }
}
