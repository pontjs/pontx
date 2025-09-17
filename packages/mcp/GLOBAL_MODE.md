# PontX MCP 全局模式与项目模式

## 概述

PontX MCP 支持两种配置模式：
1. **项目模式（Project Mode）** - 为特定项目配置 MCP
2. **全局模式（Global Mode）** - 全局配置 MCP，可用于多个项目

## 项目模式（Project Mode）

在项目模式下，MCP 绑定到特定项目路径，`projectPath` 参数是可选的。

### 配置方式

#### 方式1：直接指定项目路径
```json
{
  "mcpServers": {
    "pontx": {
      "command": "node",
      "args": ["/path/to/@pontx/mcp/dist/index.js", "/path/to/your/project"]
    }
  }
}
```

#### 方式2：使用环境变量
```json
{
  "mcpServers": {
    "pontx": {
      "command": "node",
      "args": ["/path/to/@pontx/mcp/dist/index.js"],
      "env": {
        "PONTX_PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

#### 方式3：在项目目录下运行（使用 cwd）
```json
{
  "mcpServers": {
    "pontx": {
      "command": "node",
      "args": ["/path/to/@pontx/mcp/dist/index.js"]
    }
  }
}
```

### Tool 调用
在项目模式下，`projectPath` 是可选参数：
```javascript
// 使用默认项目路径
{
  "tool": "searchApis",
  "arguments": {
    "query": "user"
  }
}

// 覆盖默认路径（临时切换项目）
{
  "tool": "searchApis",
  "arguments": {
    "query": "user",
    "projectPath": "/another/project"
  }
}
```

## 全局模式（Global Mode）

在全局模式下，MCP 不绑定特定项目，每次调用必须提供 `projectPath`。

### 配置方式

使用特殊标记 `GLOBAL_MCP` 来启用全局模式：
```json
{
  "mcpServers": {
    "pontx": {
      "command": "node",
      "args": ["/path/to/@pontx/mcp/dist/index.js", "GLOBAL_MCP"]
    }
  }
}
```

### Tool 调用
在全局模式下，`projectPath` 是必填参数：
```javascript
// 正确：提供了 projectPath
{
  "tool": "searchApis",
  "arguments": {
    "query": "user",
    "projectPath": "/path/to/project1"  // 必填
  }
}

// 错误：缺少 projectPath
{
  "tool": "searchApis",
  "arguments": {
    "query": "user"
  }
}
// 返回错误：在全局模式下，projectPath 参数是必填的
```

## 模式对比

| 特性 | 项目模式 | 全局模式 |
|-----|---------|---------|
| 配置位置 | 通常在项目 `.mcp.json` | 通常在用户全局配置 |
| projectPath 参数 | 可选 | 必填 |
| 默认项目路径 | 有（命令行参数/环境变量/cwd） | 无 |
| 适用场景 | 单项目开发 | 多项目切换 |
| 错误提示 | 使用默认路径 | 明确要求提供路径 |

## 识别当前模式

启动 MCP 时会在 stderr 输出当前模式信息：

```bash
# 项目模式
[PontX MCP] Running in PROJECT mode - default path: /Users/xxx/project

# 全局模式
[PontX MCP] Running in GLOBAL mode - projectPath is required for all tools
```

## 最佳实践

### 项目开发
如果您主要在一个项目中工作，使用项目模式：
- 将 MCP 配置在项目的 `.mcp.json` 文件中
- 享受自动路径推断的便利

### 多项目管理
如果您需要在多个项目间切换，使用全局模式：
- 在用户级别配置 MCP
- 每次调用时明确指定项目路径
- 避免错误地使用了错误的默认路径

## 缓存机制

无论哪种模式，PontX MCP 都会缓存已加载的项目配置：
- 相同 `projectPath` 的 PontxManager 会被缓存 5 分钟
- 缓存会自动更新以获取最新的 API 元数据
- 不同项目的缓存独立维护

## 示例场景

### 场景1：固定项目开发
```json
// 项目 A 的 .mcp.json
{
  "mcpServers": {
    "pontx": {
      "command": "node",
      "args": ["node_modules/@pontx/mcp/dist/index.js", "./"]
    }
  }
}
```

### 场景2：全局 AI 助手
```json
// 用户全局 MCP 配置
{
  "mcpServers": {
    "pontx": {
      "command": "pontx-server",  // 全局安装的命令
      "args": ["GLOBAL_MCP"]
    }
  }
}
```

AI 助手使用时：
```javascript
// 为项目 A 生成代码
await callTool("makeRequestCode", {
  projectPath: "/Users/xxx/projectA",
  case: "request",
  specName: "api",
  apiName: "getUser"
});

// 为项目 B 搜索 API
await callTool("searchApis", {
  projectPath: "/Users/xxx/projectB",
  query: "product"
});
```