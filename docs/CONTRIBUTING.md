# 贡献指南

欢迎为 PONTX 项目做出贡献！本文档将指导您如何参与项目开发和版本发布。

## 项目概述

PONTX 是一个 API 生命周期管理工具，围绕 pontx-spec 的 API 协议，提供 API 的编辑、管理、文档生产、代码生成等能力。

## 开发环境设置

### 1. 环境要求

- Node.js >= 18
- pnpm >= 8

### 2. 安装依赖

```bash
# 安装所有依赖
pnpm install
```

### 3. 开发命令

```bash
# 运行测试
pnpm test

# 构建项目
pnpm build
```

## 版本发布流程

本项目使用 `@changesets/cli` 来管理版本发布。以下是完整的使用流程：

### 1. 日常开发流程

#### 1.1 创建变更集（Changeset）

当您对代码进行修改后，需要创建变更集来记录这些变更：

```bash
# 使用 npm script
npm run changeset

# 或直接使用 pnpm
pnpm changeset
```

**交互式流程：**

1. 选择要发布变更的包（多选）
2. 选择版本类型：
   - `patch`：补丁版本（bug 修复）
   - `minor`：次要版本（新功能，向后兼容）
   - `major`：主要版本（破坏性变更）
3. 输入变更描述（支持 Markdown）

#### 1.2 查看变更集

```bash
# 查看所有变更集
pnpm changeset status
```

#### 1.3 预览版本计划

```bash
# 预览将要发布的版本
pnpm changeset version --dry-run
```

### 2. 发布流程

#### 2.1 版本更新

```bash
# 使用 npm script
npm run changeset:version

# 或直接使用
pnpm changeset version
```

这个命令会：

- 根据变更集更新包的版本号
- 更新 `CHANGELOG.md` 文件
- 删除已处理的变更集文件

#### 2.2 发布到 npm

```bash
# 使用 npm script
npm run changeset:publish

# 或直接使用
pnpm changeset publish --registry=https://registry.npmjs.org
```

### 3. 高级功能

#### 3.1 预发布版本

```bash
# 创建预发布版本
pnpm changeset version --snapshot
```

#### 3.2 手动添加变更集

您也可以手动创建 `.changeset/` 目录下的 `.md` 文件：

```markdown
---
"@pontx/spec": patch
"@pontx/pontx": minor
---

修复了 API 解析的 bug，并添加了新的代码生成功能。
```

### 4. 常用命令总结

```bash
# 创建变更集
pnpm changeset

# 查看变更状态
pnpm changeset status

# 预览版本计划
pnpm changeset version --dry-run

# 更新版本和 CHANGELOG
pnpm changeset version

# 发布到 npm
pnpm changeset publish

# 预发布版本
pnpm changeset version --snapshot
```

## 项目结构

```
pontx/
├── packages/           # 核心包
│   ├── pontx/         # PONTX 协议下的同构方法
│   ├── spec/          # PONTX 协议定义
│   ├── mcp/           # MCP Server
│   └── vscode/        # VSCode 扩展
├── examples/           # 示例项目
├── plugins/            # 插件
├── sdk/               # SDK
└── docs/              # 文档
```

## 提交规范

请使用清晰的提交信息，建议使用以下格式：

```
type(scope): description

[optional body]

[optional footer]
```

类型说明：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 问题反馈

如果您发现 bug 或有功能建议，请通过以下方式反馈：

1. 在 GitHub 上创建 Issue
2. 提供详细的复现步骤
3. 包含环境信息和错误日志

## 贡献者

感谢所有为 PONTX 项目做出贡献的开发者！

---

如有任何问题，请随时联系项目维护者。
