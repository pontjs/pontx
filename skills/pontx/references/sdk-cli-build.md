# 构建 SDK CLI 工具

本文档介绍如何使用 Pontx 为团队构建独立的命令行工具。

## 概述

SDK CLI 是一个独立的、可分发的命令行工具，让团队成员无需配置即可调用 API。

### 与 SDK 集成的区别

| 方式 | 使用场景 | 示例 |
|------|----------|------|
| **SDK 集成** | 在代码中调用 API | `import { client } from '@/sdk'` |
| **SDK CLI** | 命令行直接调用 | `my-api-cli call user info` |

### 适用场景

- 运维脚本自动化
- CI/CD 流程中的 API 调用
- 团队共享的 API 调试工具
- 无需安装 Node.js 的独立工具

## 构建流程

### Step 1: 创建项目

```bash
# 创建新目录
mkdir my-api-cli && cd my-api-cli

# 初始化 npm 项目
npm init -y

# 安装 pontx
npm install pontx
```

### Step 2: 初始化 CLI 配置

```bash
pontx cli init --name my-api-cli
```

这会更新 `package.json`，添加 bin 字段：

```json
{
  "name": "my-api-cli",
  "bin": {
    "my-api-cli": "./dist/bin/cli.cjs"
  }
}
```

### Step 3: 创建配置文件

创建 `pontx.cli.ts`：

```typescript
import { runCLI } from "pontx/sdk-cli";

export default runCLI({
  // CLI 名称
  name: "my-api-cli",

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

    // 多环境支持
    environments: {
      dev: {
        baseURL: "https://dev-api.example.com",
      },
      staging: {
        baseURL: "https://staging-api.example.com",
      },
      prod: {
        baseURL: "https://api.example.com",
      },
    },

    // 认证配置
    beforeRequest: async (request) => {
      const token = process.env.MY_API_TOKEN;
      if (token) {
        request.init.headers = {
          ...request.init.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return request;
    },
  },
});
```

### Step 4: 构建 CLI

```bash
pontx cli build
```

构建产物位于 `dist/bin/cli.cjs`。

### Step 5: 本地测试

```bash
# 链接到全局
npm link

# 测试命令
my-api-cli --help
my-api-cli list apis
my-api-cli search user

# 使用 -h 逐层探索
my-api-cli call -h              # 查看可用 Tags
my-api-cli call user -h         # 查看 user 下的 APIs
my-api-cli call user info -h    # 查看 info 的入参详情

# 调用 API（先 dry-run）
my-api-cli call user info --id 123 --dry-run
my-api-cli call user info --id 123
```

### Step 6: 发布

#### 发布到 npm

```bash
# 登录 npm
npm login

# 发布
npm publish
```

团队成员安装：

```bash
npm install -g my-api-cli
```

#### 或：私有 npm registry

```bash
npm publish --registry https://npm.your-company.com
```

## 配置文件详解

### pontx.cli.ts 完整配置

```typescript
import { runCLI } from "pontx/sdk-cli";

export default runCLI({
  // ===== 基本配置 =====

  // CLI 名称（必填）
  name: "my-api-cli",

  // CLI 描述
  description: "My Company API CLI Tool",

  // ===== 数据源配置 =====

  specs: [
    {
      name: "user-service",
      url: "https://api.example.com/user/swagger.json",
    },
    {
      name: "order-service",
      localPath: "./specs/order.json",
    },
  ],

  // ===== API 调用配置 =====

  executeApi: {
    // 默认基础 URL
    baseURL: "https://api.example.com",

    // 超时时间（毫秒）
    timeout: 30000,

    // 默认请求头
    headers: {
      "Content-Type": "application/json",
      "X-Client": "my-api-cli",
    },

    // 多环境配置
    environments: {
      dev: {
        baseURL: "https://dev.api.example.com",
        timeout: 60000, // 开发环境超时更长
      },
      staging: {
        baseURL: "https://staging.api.example.com",
      },
      prod: {
        baseURL: "https://api.example.com",
      },
    },

    // 请求前钩子
    beforeRequest: async (request) => {
      // 从环境变量读取 token
      const token = process.env.MY_API_TOKEN;
      if (token) {
        request.init.headers = {
          ...request.init.headers,
          Authorization: `Bearer ${token}`,
        };
      }

      // 添加请求 ID
      request.init.headers = {
        ...request.init.headers,
        "X-Request-ID": crypto.randomUUID(),
      };

      return request;
    },

    // 响应后钩子
    afterResponse: async (response) => {
      // 统一解包
      if (response.data?.code === 0) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "API Error");
    },

    // 错误处理
    onError: async (error) => {
      if (error.response?.status === 401) {
        console.error("认证失败，请检查 MY_API_TOKEN 环境变量");
      }
    },
  },
});
```

## 使用示例

### 基本使用

```bash
# 查看帮助
my-api-cli --help

# 列出 API
my-api-cli list apis

# 搜索
my-api-cli search user

# 查看 API 详情
my-api-cli show-api user info

# 使用 -h 查看参数详情
my-api-cli call user info -h

# 调用 API
my-api-cli call user info --id 123

# 多 spec 时需加 spec 前缀
my-api-cli user-service show-api user info
my-api-cli user-service call user info --id 123
```

### 多环境使用

```bash
# 开发环境
my-api-cli call user info --id 123 --env dev

# 生产环境
my-api-cli call user info --id 123 --env prod
```

### 认证配置

```bash
# 设置环境变量
export MY_API_TOKEN="your-token-here"

# 调用需要认证的 API
my-api-cli call user profile
```

### 在脚本中使用

```bash
#!/bin/bash
# deploy-check.sh

# 检查用户服务
echo "Checking user service..."
my-api-cli call user health --env prod -q "status"

# 检查订单服务
echo "Checking order service..."
my-api-cli call order health --env prod -q "status"
```

## 高级配置

### 自定义插件

```typescript
import { runCLI } from "pontx/sdk-cli";

export default runCLI({
  name: "my-api-cli",
  specs: [/* ... */],

  plugins: [
    {
      name: "my-plugin",
      // 自定义 API 执行逻辑
      executeApi: async (context) => {
        // 自定义实现
        return null; // 返回 null 使用默认执行器
      },
    },
  ],
});
```

### 内嵌 Spec

```typescript
import { runCLI } from "pontx/sdk-cli";
import userSpec from "./specs/user.json";

export default runCLI({
  name: "my-api-cli",
  specs: [
    {
      name: "user",
      spec: userSpec, // 直接内嵌 spec
    },
  ],
});
```

## 构建选项

```bash
# 基本构建
pontx cli build

# 指定输出目录
pontx cli build --out ./build

# 监听模式（开发用）
pontx cli build --watch
```

## 常见问题

### Q: 如何更新 API 元数据？

重新构建即可：

```bash
pontx cli build
npm publish
```

### Q: 如何支持多用户认证？

使用环境变量或配置文件：

```typescript
beforeRequest: async (request) => {
  // 从配置文件读取
  const config = JSON.parse(
    fs.readFileSync(path.join(os.homedir(), ".my-api-cli.json"), "utf-8")
  );
  request.init.headers = {
    ...request.init.headers,
    Authorization: `Bearer ${config.token}`,
  };
  return request;
};
```

### Q: 如何减小构建产物体积？

1. 只包含需要的 specs
2. 使用 `localPath` 而非 `url`（构建时内嵌）
3. 排除不需要的依赖

## 相关文档

- [项目初始化](./project-init.md)
- [配置文件详解](./pontx-config.md)
- [CLI 命令参考](./cli-commands.md)
