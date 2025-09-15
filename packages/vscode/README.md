# Pontx VSCode Extension

![Pontx Logo](resources/pontx.png)

> 基于 Pontx 协议的 API 生命周期管理扩展，提供 API 搜索、文档查阅、代码生成等强大功能。

## 🚀 功能特性

### 📊 API 资源管理器

- **分层结构展示**：按 Spec → Tag → API 的层次结构展示所有 API 资源
- **Schema 管理**：统一管理和查看 API 数据模型定义
- **实时刷新**：支持配置变更后的实时数据更新
- **可视化图标**：为不同类型的节点提供直观的图标标识

### 🔍 智能搜索

- **快速查找**：通过 `Cmd+Ctrl+F` 快速搜索 API 和 Schema
- **模糊匹配**：支持名称、描述、详情的模糊匹配搜索
- **多维度过滤**：按 Spec、Tag、API 类型进行精确过滤

### 📖 文档查看

- **内置文档**：在 WebView 中查看 API 详细文档
- **Schema 可视化**：直观展示数据结构和类型定义
- **状态管理**：自动保存和恢复文档查看状态
- **多标签支持**：同时打开多个 API 文档进行对比

### 💻 代码生成

- **多语言支持**：根据配置生成不同语言的示例代码
- **智能插入**：直接将生成的代码插入到当前编辑器
- **模板定制**：支持自定义代码生成模板

### 🔄 数据同步

- **远程拉取**：一键从远程数据源拉取最新 API 元数据
- **本地生成**：根据最新数据重新生成本地代码
- **配置管理**：快速访问和编辑 Pontx 配置文件

## 📦 安装要求

- **VS Code 版本**：>= 1.101.0
- **工作区要求**：包含 `pontx.config.ts` 配置文件的项目
- **Node.js**：>= 16.0.0（用于运行 Pontx 核心功能）

## 🛠️ 使用指南

### 激活扩展

扩展会在以下情况自动激活：

- 工作区包含 `pontx.config.ts` 配置文件
- 打开 Pontx WebView 面板时

### 主要操作

#### 1. API 资源浏览

1. 打开侧边栏的 **Pontx** 面板
2. 在 **API Explorer** 中浏览所有 API 资源
3. 点击 API 或 Schema 节点查看详细文档

#### 2. 快速搜索 API

1. 使用快捷键 `Cmd+Ctrl+F`（macOS）
2. 在搜索框中输入关键词
3. 选择目标 API 后选择操作：
   - **查看文档**：在 WebView 中打开 API 文档
   - **插入代码**：将示例代码插入到当前编辑器

#### 3. 数据管理

- **拉取远程数据**：点击 ![Cloud Download](<$(cloud-download)>) 按钮
- **重新生成代码**：点击 ![Debug Start](<$(debug-start)>) 按钮
- **刷新资源**：点击刷新按钮更新 API 列表
- **配置管理**：点击 ![Settings](<$(settings-gear)>) 打开配置文件

#### 4. 元数据定位

- 在 API 节点上右键选择 **查看元数据**
- 自动打开对应的元数据文件并定位到具体位置

## ⚙️ 配置说明

扩展依赖项目根目录的 `pontx.config.ts` 配置文件，主要配置项包括：

```typescript
export default {
  // 输出目录
  outDir: "./src/services",

  // API 数据源配置
  origins: [
    {
      name: "petstore",
      url: "https://petstore.swagger.io/v2/swagger.json",
    },
  ],

  // 插件配置
  plugins: [
    // 代码生成插件
  ],
};
```

## 🎯 命令列表

| 命令                | 快捷键       | 描述             |
| ------------------- | ------------ | ---------------- |
| `pontx.findMeta`    | `Cmd+Ctrl+F` | 搜索 API 元数据  |
| `pontx.fetchRemote` | -            | 拉取远程数据源   |
| `pontx.regenerate`  | -            | 重新生成本地代码 |
| `pontx.config`      | -            | 打开配置文件     |
| `pontx.openDoc`     | -            | 查看 API 文档    |
| `pontx.revealMeta`  | -            | 定位元数据文件   |
| `pontx.refreshTree` | -            | 刷新 API 资源树  |

## 🏗️ 技术架构

### 核心组件

- **PontxService**：Pontx 核心服务管理器
- **PontxTreeDataProvider**：API 资源树数据提供者
- **WebViewManager**：文档查看器管理
- **Commands**：命令处理模块

### 数据流

```
配置文件 → PontxManager → TreeDataProvider → VSCode TreeView
                     ↓
              WebViewManager → 文档展示
                     ↓
              CodeGenerator → 代码插入
```

## 🔧 开发指南

### 本地开发

```bash
# 安装依赖
pnpm install

# 编译扩展
pnpm run compile

# 编译 WebView
pnpm run compile:webview

# 监听模式
pnpm run watch
```

### 调试扩展

1. 在 VS Code 中打开项目
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中测试扩展功能

### 打包发布

```bash
# 打包扩展
pnpm run package

# 生成 .vsix 文件
vsce package
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../../LICENSE) 文件了解详情。

## 🐛 问题反馈

如果您遇到任何问题或有功能建议，请在 [GitHub Issues](https://github.com/your-repo/pontx/issues) 中提交。

## 🔗 相关链接

- [Pontx 核心库](../pontx)
- [Pontx Spec 协议](../spec)
- [使用示例](../../examples)
- [插件开发指南](../pontx/src/plugin.md)

---

**享受使用 Pontx VSCode Extension！** 🎉
