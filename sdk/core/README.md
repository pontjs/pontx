# @pontx/sdk

<div align="center">

**Pontx SDK 的核心工具库 - 为浏览器和 Node.js 提供统一的 API 客户端基础设施**

[![npm version](https://img.shields.io/npm/v/@pontx/sdk.svg)](https://www.npmjs.com/package/@pontx/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](#) | [中文文档](#)

</div>

---

## 📦 概述

`@pontx/sdk` 是 Pontx SDK 的核心基础库。它基于 [Pontx-Spec 协议](../spec)（兼容 OAS2/OAS3），提供类型安全、功能完备的 API 客户端能力。

### ✨ 核心特性

| 特性                   | 描述                                                        |
| ---------------------- | ----------------------------------------------------------- |
| 🎯 **双客户端模式**    | 标准客户端和 Fetch 风格客户端，满足不同使用场景             |
| 🔗 **URL 构建**        | 智能路径参数替换、查询字符串序列化，支持复杂数据类型        |
| 📝 **请求体序列化**    | 支持 JSON、FormData、URLSearchParams、text/plain 等多种格式 |
| 🎨 **TypeScript 优先** | 完整的类型定义，提供极致的开发体验                          |
| 🔌 **功能模块化**      | Mock、Retry 等功能模块,可按需组合使用                       |
| ⚡ **高性能**          | 零运行时依赖、按需加载，打包体积小                          |
| 🛡️ **类型安全**        | 基于 API 元数据自动生成类型，编译时检查参数                 |

---

## 🚀 快速开始

### 安装

```bash
# 使用 pnpm（推荐）
pnpm add @pontx/sdk

# 使用 npm
npm install @pontx/sdk

# 使用 yarn
yarn add @pontx/sdk
```

### 基础使用

```typescript
import { createClient } from "@pontx/sdk";
import type { APIs } from "./generated/apis"; // 由 pontx 插件生成
import { apiMeta } from "./generated/apiMeta"; // 由 pontx 插件生成

// 创建客户端
const client = createClient<APIs>({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
});

// 调用 API
const user = await client.user.getById("123");
console.log(user);
```

---

## 📖 使用指南

### 目录

- [标准 Client（推荐）](#标准-client推荐)
- [Fetch Client](#fetch-client)
- [功能模块](#功能模块)
  - [Mock 功能](#mock-功能)
  - [Retry 功能](#retry-功能)
- [自定义配置](#自定义配置)
- [类型定义](#类型定义)

---

## 标准 Client（推荐）

标准 Client 是推荐的客户端模式，提供更优雅、更符合直觉的 API 调用方式。

### 设计理念

标准 Client 的核心设计理念是**让 API 调用更接近自然语言**：

- ✅ **减少嵌套**：不需要将所有参数包装在对象中
- ✅ **参数分离**：路径参数、查询参数、请求体参数可以独立传递
- ✅ **自动识别**：根据 API 元数据自动识别参数类型和位置
- ✅ **类型安全**：完整的 TypeScript 类型支持，IDE 自动提示

### 创建客户端

```typescript
import { createClient } from "@pontx/sdk";
import type { APIs } from "./generated/apis";
import { apiMeta } from "./generated/apiMeta";

const client = createClient<APIs>({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
  headers: {
    Authorization: "Bearer token",
    "X-Custom-Header": "value",
  },
  // 可选：自定义 fetch 实现
  fetch: customFetch,
});
```

### 使用场景和示例

#### 场景 1：只有 Path 参数

```typescript
// API: GET /pet/{petId}
const pet = await client.pet.getPetById(123);
```

#### 场景 2：只有 Query 参数

```typescript
// API: GET /pet/findByStatus?status=available
const pets = await client.pet.findByStatus({
  status: ["available", "pending"],
});
```

#### 场景 3：只有 Body 参数

```typescript
// API: POST /pet
const newPet = await client.pet.addPet({
  name: "doggie",
  status: "available",
  photoUrls: ["https://example.com/photo.jpg"],
});
```

#### 场景 4：Path + Query 参数

```typescript
// API: GET /user/{userId}?expand=profile,posts
const user = await client.user.getById(
  "123",
  { expand: "profile,posts" } // Query 参数
);
```

#### 场景 5：Path + Body 参数

```typescript
// API: PUT /pet/{petId}
const updatedPet = await client.pet.updatePet(
  123, // Path 参数
  {
    // Body 参数
    name: "Updated Name",
    status: "sold",
  }
);
```

#### 场景 6：Query + Body 合并（智能合并）

当 API 同时有 Query 和 Body 参数，且 Body 是 JSON 对象时，可以合并传递：

```typescript
// API: POST /user/search?page=1&limit=10
// Body: { keyword: string, filters: object }

// 方式 1：合并传递（推荐）
const users = await client.user.search({
  page: 1,              // Query 参数
  limit: 10,            // Query 参数
  keyword: 'john',      // Body 参数
  filters: {            // Body 参数
    age: { min: 18, max: 65 }
  }
});

// 方式 2：分离传递
const users = await client.user.search(
  { page: 1, limit: 10 },                    // Query 参数
  { keyword: 'john', filters: { ... } }      // Body 参数
);
```

#### 场景 7：文件上传（FormData）

对于 `multipart/form-data` 类型的 API，直接传递 FormData 或对象：

```typescript
// API: POST /pet/{petId}/uploadImage

// 方式 1：传递对象（自动转换为 FormData）
await client.pet.uploadFile(123, {
  file: fileObject, // File 对象
  additionalMetadata: "Avatar image",
});

// 方式 2：传递 FormData
const formData = new FormData();
formData.append("file", fileObject);
formData.append("additionalMetadata", "Avatar image");

await client.pet.uploadFile(123, formData);
```

#### 场景 8：参数名冲突处理

当 Query 和 Body 中有同名参数时，使用前缀区分：

```typescript
// API: POST /user/search?name=xxx
// Body: { name: string, email: string }

await client.user.search({
  query_name: "search term", // Query 中的 name
  body_name: "John Doe", // Body 中的 name
  email: "john@example.com", // Body 中的 email
});
```

#### 场景 9：自定义请求配置

所有 API 调用都支持传入 `RequestInit` 参数：

```typescript
await client.user.getById("123", {
  headers: {
    "X-Request-ID": uuid(),
    "X-Custom-Header": "value",
  },
  signal: abortController.signal,
  credentials: "include",
  cache: "no-cache",
});
```

### 参数顺序规则

标准 Client 的参数顺序遵循以下规则，使 API 调用更符合直觉：

```typescript
methodName(
  pathParam1,          // 1️⃣ Path 参数（按路径中出现顺序）
  pathParam2,          //
  params,              // 2️⃣ Query + Body 合并参数（可选）
  body,                // 3️⃣ 独立 Body 参数（可选）
  requestInit?         // 4️⃣ RequestInit（可选，始终最后）
)
```

**示例说明：**

```typescript
// GET /user/{userId}/post/{postId}?expand=comments
client.user.getPost(
  'user123',           // Path: userId
  456,                 // Path: postId
  { expand: 'comments' }, // Query 参数
  { headers: { ... } } // RequestInit
);
```

### 🔥 最佳实践

#### 1. 始终使用 TypeScript

TypeScript 可以提供完整的类型推导和 IDE 智能提示：

```typescript
// ✅ 推荐：完整的类型安全
const client = createClient<APIs>({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
});

// ❌ 不推荐：丢失类型信息
const client = createClient({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
});
```

#### 2. 参数传递的选择

**推荐：参数分离传递**（当参数类型不同时）

```typescript
// ✅ 推荐：清晰明确，参数类型一目了然
await client.user.getById("123", { expand: "profile" });
```

**可选：参数合并传递**（当 API 支持时）

```typescript
// ✅ 也可以：更简洁，但需要记住哪些是 query、哪些是 body
await client.user.update({
  id: "123",
  name: "John",
  email: "john@example.com",
});
```

#### 3. 错误处理

```typescript
try {
  const user = await client.user.getById("123");
  console.log("User:", user);
} catch (error) {
  if (error instanceof Response) {
    // HTTP 错误
    const statusCode = error.status;
    const errorBody = await error.json();
    console.error(`HTTP ${statusCode}:`, errorBody);
  } else {
    // 网络错误或其他错误
    console.error("Request failed:", error);
  }
}
```

#### 4. 请求取消

使用 `AbortController` 取消请求：

```typescript
const controller = new AbortController();

// 5 秒后自动取消请求
setTimeout(() => controller.abort(), 5000);

try {
  const result = await client.user.getById("123", {
    signal: controller.signal,
  });
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request was cancelled");
  }
}
```

#### 5. 全局配置 vs 局部配置

```typescript
// 全局配置（所有请求共享）
const client = createClient<APIs>({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
});

// 局部配置（单次请求覆盖）
await client.user.getById(
  "123"
  {
    headers: {
      "X-Request-ID": uuid(), // 局部 header（会与全局 headers 合并）
    },
  }
);
```

---

## Fetch Client

Fetch Client 是调用方式和标准 Fetch API 基本相同的客户端模式，参数结构更明确。

### 创建 Fetch 客户端

```typescript
import { createFetchClient } from "@pontx/sdk";
import type { APIs } from "./generated/apis";
import { specMeta } from "./generated/apiMeta";

const client = createFetchClient<APIs>({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
  headers: {
    Authorization: "Bearer token",
  },
});
```

### 使用示例

```typescript
// Fetch Client 的调用方式
const user = await client.user.getById({
  params: { id: "123" },
  query: { expand: "profile" },
  requestInit: {
    headers: { "X-Custom-Header": "value" },
  },
});
```

### 标准 Client vs Fetch Client

| 特性     | 标准 Client        | Fetch Client           |
| -------- | ------------------ | ---------------------- |
| 参数传递 | 扁平化、自动分离   | 结构化、显式指定       |
| 类型安全 | ✅ 完整            | ✅ 完整                |
| 学习曲线 | 低                 | 中等                   |
| 代码简洁 | 高                 | 中等                   |
| 适用场景 | 日常开发、快速迭代 | 复杂场景、需要明确结构 |

**推荐**：优先使用 **标准 Client**，除非有特殊需求。

---

## 功能模块

### 自定义 Headers 构建

```typescript
import { createClient } from "@pontx/sdk";

const client = createClient({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
  // 自定义 beforeRequest 钩子
  beforeRequest: (url, init) => {
    // 动态添加 headers
    init.headers = {
      ...init.headers,
      "X-Request-ID": uuid(),
      "X-Timestamp": Date.now().toString(),
      Authorization: `Bearer ${getToken()}`,
    };

    return init;
  },
});
```

### 自定义 Fetch 实现

```typescript
import { createClient } from "@pontx/sdk";

// 示例 1：添加请求/响应日志
const loggingFetch: typeof fetch = async (url, init) => {
  console.log("[Request]", url, init);
  const start = Date.now();

  const response = await fetch(url, init);

  console.log("[Response]", url, {
    status: response.status,
    duration: Date.now() - start,
  });

  return response;
};

// 示例 2：添加请求拦截器
const interceptorFetch: typeof fetch = async (url, init) => {
  // 请求前拦截
  if (typeof url === "string" && url.includes("/auth/")) {
    init = {
      ...init,
      credentials: "include",
    };
  }

  const response = await fetch(url, init);

  // 响应后拦截
  if (response.status === 401) {
    // 刷新 token 或跳转登录
    await refreshToken();
    return fetch(url, init); // 重试请求
  }

  return response;
};

const client = createClient({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",
  baseRequestFn: loggingFetch, // 或 interceptorFetch
});
```

### 请求生命周期钩子

```typescript
import { createClient } from "@pontx/sdk";

const client = createClient({
  pontxSpecMeta: specMeta,
  baseUrl: "https://api.example.com",

  // 请求前钩子
  beforeRequest: (url, init) => {
    console.log("Before request:", url);

    // 修改 init
    init.headers = {
      ...init.headers,
      "X-Request-Time": new Date().toISOString(),
    };

    return init;
  },

  // 响应后钩子（通过自定义 fetch 实现）
  baseRequestFn: async (url, init) => {
    const response = await fetch(url, init);

    console.log("After response:", {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    });

    return response;
  },
});
```

---

## 类型定义

### 使用示例

```typescript
import type { BaseRequesterConfig, BodySerializers } from "@pontx/sdk";

// 自定义配置类型
interface MyClientConfig extends BaseRequesterConfig {
  apiKey: string;
  customSerializers?: BodySerializers;
}

// 使用自定义配置
function createMyClient(config: MyClientConfig) {
  return createClient({
    ...config,
    headers: {
      "X-API-Key": config.apiKey,
      ...config.headers,
    },
    bodySerializers: config.customSerializers,
  });
}
```

---

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时使用）
pnpm test --watch

# 生成覆盖率报告
pnpm test:coverage

# 类型检查
pnpm typecheck
```

---

## 🔗 相关资源

### 相关包

- [`@pontx/spec`](../spec) - Pontx 协议规范（基于 OAS2/OAS3）
- [`pontx`](../../packages/pontx) - Pontx 管理工具、CLI 工具和代码生成器

---

## 📄 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件

---

<div align="center">

**Made with ❤️ by Pontx Team**

[⬆ 回到顶部](#pontxsdk)

</div>
