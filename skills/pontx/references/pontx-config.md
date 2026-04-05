# pontx.config.ts 配置详解

本文档详细介绍 `pontx.config.ts` 配置文件的所有选项。

## 配置文件格式

Pontx 支持以下配置文件格式（按优先级排序）：

- `pontx.config.ts` - TypeScript（推荐，支持类型提示和调试）
- `pontx.config.js` - JavaScript
- `pontx.config.mjs` - ES Module
- `pontx.config.cjs` - CommonJS

## 基本结构

```typescript
import { defineConfig } from "pontx";

export default defineConfig({
  // 必填：SDK 代码输出目录
  outDir: "src/apis",

  // API 数据源配置
  specs: [
    {
      name: "my-api",
      url: "https://api.example.com/swagger.json",
    },
  ],

  // 可选配置
  plugins: [],
  executeApi: {},
  service: {},
  translateConfig: {},
});
```

## 核心配置

### outDir (必填)

SDK 代码输出目录，相对于配置文件所在目录。

```typescript
{
  outDir: "src/apis", // 生成到 ./src/apis/
}
```

### specs / origins

API 数据源配置数组。`specs` 是推荐的写法，`origins` 是兼容旧版的别名。

```typescript
{
  specs: [
    // 远程数据源
    {
      name: "petstore",
      url: "https://petstore.swagger.io/v2/swagger.json",
    },

    // 本地数据源
    {
      name: "local-api",
      localPath: "./specs/openapi.json",
    },

    // 带环境配置的数据源
    {
      name: "user-service",
      url: "https://api.prod.com/swagger.json",
      env: "dev", // 当前使用的环境
      envs: {
        dev: { url: "https://api.dev.com/swagger.json" },
        staging: { url: "https://api.staging.com/swagger.json" },
        prod: { url: "https://api.prod.com/swagger.json" },
      },
    },
  ];
}
```

#### Spec 配置选项

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 数据源名称，用于 API 路径前缀 |
| `url` | `string` | - | 远程 OpenAPI/Swagger 规范 URL |
| `localPath` | `string` | - | 本地规范文件路径（相对于配置文件） |
| `env` | `string` | - | 当前使用的环境名称 |
| `envs` | `object` | - | 环境配置映射 |
| `includeTags` | `boolean` | - | 是否在 Spec 中包含 Tag，默认 `true` |

> **注意**: `url` 和 `localPath` 至少需要配置一个。

## API 调用配置 (executeApi)

用于 `pontx call` 命令和 API Debugger 调试器的配置。

```typescript
{
  executeApi: {
    // 默认基础 URL
    baseURL: "https://api.example.com",

    // 请求超时（毫秒），默认 30000
    timeout: 30000,

    // 默认请求头
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "value",
    },

    // 自定义 fetch 函数（可选）
    // 提供时，builtinExecuteApi 使用此函数替代原生 fetch
    // 传入的 url 为相对路径（path + query），不包含 baseURL，
    // 因为 SDK 的 fetchFn 通常已内置 baseURL 处理
    fetchFn: async (url, init) => {
      // 典型用法：SDK 项目复用已有的 fetch 函数，避免重复配置 baseURL 和认证
      return myExistingFetch(url, init);
    },

    // 多环境配置
    environments: {
      dev: {
        baseURL: "https://api.dev.example.com",
        headers: { "X-Env": "dev" },
      },
      staging: {
        baseURL: "https://api.staging.example.com",
      },
      prod: {
        baseURL: "https://api.example.com",
        timeout: 60000,
      },
    },

    // 请求前钩子（添加认证等）
    beforeRequest: async (request) => {
      request.init.headers = {
        ...request.init.headers,
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      };
      return request;
    },

    // 响应后钩子（统一解包等）
    afterResponse: async (response) => {
      // 假设 API 响应格式为 { code: 0, data: {...} }
      if (response.data?.code === 0) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "API Error");
    },

    // 错误处理钩子
    onError: async (error) => {
      console.error(`API Error: ${error.message}`);
    },
  },
}
```

### 使用多环境配置

```bash
# 使用默认环境
pontx call mySpec.user.info --id 123

# 指定环境
pontx call mySpec.user.info --id 123 --env dev
pontx call mySpec.user.info --id 123 --env prod
```

## 插件配置 (plugins)

扩展 Pontx 功能的插件数组。

```typescript
import { createGracefulClientPlugin } from "@pontx/plugin-graceful";

export default defineConfig({
  outDir: "src/apis",
  specs: [
    /* ... */
  ],

  plugins: [
    // 使用插件
    createGracefulClientPlugin({
      // 插件配置
    }),

    // 自定义插件
    {
      name: "my-plugin",
      transform: async (spec) => {
        // 转换 API 元数据
        return spec;
      },
      generate: async (spec, options) => {
        // 生成自定义代码
        return {
          "custom-file.ts": "// custom code",
        };
      },
    },
  ],
});
```

### 插件生命周期钩子

| 钩子 | 说明 |
|------|------|
| `configResolved` | 配置解析完成后调用 |
| `fetch` | 自定义元数据拉取逻辑 |
| `transformMeta` | 在解析前转换元数据字符串 |
| `parseMeta` | 解析元数据为 PontxSpec |
| `transform` | 转换 PontxSpec |
| `generate` | 生成代码文件 |
| `generateEntry` | 生成入口文件 |
| `executeApi` | 自定义 API 执行逻辑 |
| `check` | 检查元数据兼容性 |

## 服务配置 (service)

`pontx service` 命令的配置。

```typescript
{
  service: {
    // Web 服务端口，默认 3000
    port: 3000,

    // 定时同步间隔（毫秒），默认 300000（5分钟）
    syncInterval: 300000,

    // 是否启用定时同步，默认 true
    enableAutoSync: true,

    // 是否启用文件监听，默认 true
    enableFileWatch: true,

    // 是否启用 Web 服务，默认 true
    enableWebServer: true,

    // 日志级别
    logLevel: "info", // trace | debug | info | warn | error | fatal

    // 零配置快速启动：直接指定 spec 来源（文件路径或 URL）
    // 提供此选项时无需 pontx.config.ts，文件监听自动跳过
    specSource: "https://petstore.swagger.io/v2/swagger.json",
    // 也支持本地文件：
    // specSource: "./specs/openapi.json",
  },
}
```

### 零配置快速启动

当提供 `specSource` 时，Pontx 可以跳过 `pontx.config.ts` 直接启动服务：

- 支持远程 URL 或本地文件路径
- spec 名称从文件名或 URL 路径自动推导
- 文件监听自动跳过（没有配置文件可监听）
- 输出目录使用系统临时目录

```typescript
{
  service: {
    specSource: "https://api.example.com/swagger.json",
    port: 3001,
  },
}
```

## 翻译配置 (translateConfig)

API 描述文本翻译配置（用于非英文 API 文档）。

```typescript
{
  translateConfig: {
    // 翻译缓存路径
    cachePath: "./.pontx-translate-cache",

    // 翻译引擎配置
    engine: "google", // 或 'deepl', 'azure' 等

    // 目标语言
    targetLang: "en",
  },
}
```

## 完整配置示例

```typescript
import { defineConfig } from "pontx";

export default defineConfig({
  // SDK 输出目录
  outDir: "src/services/api",

  // API 数据源
  specs: [
    {
      name: "user",
      url: "https://api.example.com/user/swagger.json",
    },
    {
      name: "order",
      url: "https://api.example.com/order/swagger.json",
    },
  ],

  // API 调用配置
  executeApi: {
    baseURL: "https://api.example.com",
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
    environments: {
      dev: { baseURL: "https://dev-api.example.com" },
      prod: { baseURL: "https://api.example.com" },
    },
    beforeRequest: async (request) => {
      const token = process.env.API_TOKEN;
      if (token) {
        request.init.headers = {
          ...request.init.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return request;
    },
  },

  // 服务配置
  service: {
    port: 3001,
    syncInterval: 60000,
  },

  // 插件
  plugins: [],
});
```

## 调试配置文件

### 使用 VSCode 调试

1. 在 `pontx.config.ts` 中设置断点
2. 创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "调试 Pontx",
      "program": "${workspaceFolder}/node_modules/.bin/pontx",
      "args": ["generate"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

3. 按 F5 开始调试

### 清理缓存

配置文件编译缓存位于 `node_modules/.pontx-cache/`：

```bash
pontx cache:clean
```

## 相关文档

- [项目初始化指南](./project-init.md)
- 运行 `pontx --help` 查看所有命令
