# @pontx/nodejs-sdk 使用指南

> 为 Node.js >= 18 环境提供的类型安全 API 客户端 SDK

## 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API 参考](#api-参考)
- [功能特性](#功能特性)
- [高级用法](#高级用法)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 快速开始

### 安装

```bash
npm install @pontx/nodejs-sdk
# 或
pnpm add @pontx/nodejs-sdk
# 或
yarn add @pontx/nodejs-sdk
```

### 最小化配置示例

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import pontxMeta from './api-meta.json';

// 使用默认配置创建客户端（使用 Node.js 原生 fetch）
const client = createClient({
  pontxSpecMeta: pontxMeta,
});

// 调用 API
const user = await client.users.getUser.request({ userId: '123' });
console.log(user);
```

### 完整配置示例

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import { z } from 'zod';
import pontxMeta from './api-meta.json';

const client = createClient({
  pontxSpecMeta: pontxMeta,

  // 参数校验
  validation: {
    enabled: true,
    schemas: {
      'users/getUser': z.object({
        userId: z.string().uuid(),
      }),
    },
  },

  // Mock 测试
  mock: {
    enabled: process.env.NODE_ENV === 'test',
    data: {
      'users/getUser': { id: '123', name: 'Mock User' },
    },
    delay: 100,
  },

  // 自动重试
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },

  // 日志记录
  logger: {
    enabled: process.env.NODE_ENV === 'development',
  },
});
```

---

## 核心概念

### 1. API 元数据（PontxSpecMeta）

SDK 基于 API 元数据动态生成类型安全的客户端。元数据描述了所有可用的 API 端点：

```typescript
interface PontxSpecMeta {
  name: string;
  hasTags: boolean;
  apis: Record<string, PontxAPI>;
}

// 示例元数据
{
  "name": "My API",
  "hasTags": true,
  "apis": {
    "users/getUser": {
      "path": "/users/{userId}",
      "method": "GET",
      "parameters": [
        { "name": "userId", "in": "path", "required": true }
      ]
    }
  }
}
```

### 2. 客户端代理系统

SDK 使用 Proxy 模式实现动态 API 访问：

```typescript
// 两层 Proxy 结构
client.controller.method.request()
//     ↑         ↑       ↑
//  控制器    方法名   请求方法
```

每个 API 方法提供三个标准方法：

- **request(params, options)** - 执行 API 请求
- **getFetchKey(params)** - 获取缓存键
- **queryOptions(params, options)** - 获取数据获取库配置

### 3. 功能模块组合

SDK 采用装饰器模式，通过配置启用功能：

```
请求流程：
用户调用 → 校验 → Mock → 重试 → 日志 → 原生 fetch
```

所有功能模块都是可选的，未配置的功能不会被启用。

---

## API 参考

### createClient(config)

创建 SDK 客户端实例。

**参数：**

```typescript
interface CreateClientConfig {
  // 必需：API 元数据
  pontxSpecMeta: PontxSpecMeta;

  // 可选：自定义请求函数（默认：Node.js 原生 fetch）
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;

  // 可选：路径参数占位符（默认：'{}'）
  pathMark?: string;

  // 可选：自定义 URL 构建函数
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  // 可选：自定义使用方法构建器
  makeCustomUsages?: (usages: SdkUsage, apiMeta?: PontxAPI) => Record<string, unknown>;

  // 功能配置
  validation?: ValidationConfig;
  mock?: MockConfig;
  retry?: RetryConfig;
  logger?: LoggerConfig;
}
```

**返回值：**

类型安全的客户端实例 `Client<T>`

### API 方法对象

每个 API 方法提供以下方法：

#### request(params, options?)

执行 API 请求。

```typescript
// GET 请求
const user = await client.users.getUser.request({ userId: '123' });

// POST 请求（带请求体）
const newUser = await client.users.createUser.request(
  {},
  {
    body: { name: 'John', email: 'john@example.com' },
    headers: { 'Authorization': 'Bearer token' },
  }
);
```

**参数：**
- `params` - 路径和查询参数
- `options` - 请求选项（body, headers, timeout）

**返回值：**
`Promise<Response>` - API 响应数据

#### getFetchKey(params)

生成唯一的缓存键。

```typescript
const key = client.users.getUser.getFetchKey({ userId: '123' });
// 返回: "users/getUser?userId=123"
```

参数按字母顺序排序，确保相同参数生成相同的键。

#### queryOptions(params, options?)

获取数据获取库的查询配置。

```typescript
const options = client.users.getUser.queryOptions({ userId: '123' });
// 返回: { queryKey: ['users/getUser?userId=123'], queryFn: () => Promise<User> }
```

兼容 React Query、SWR 等数据获取库。

---

## 功能特性

### 1. 参数校验（Validation）

使用 Zod 进行运行时参数校验。

**安装 Zod：**

```bash
npm install zod
```

**API Key 说明：**

Validation 配置使用 `controller/method` 作为 key，每个 key 对应一个唯一的 API 端点：

```typescript
{
  'users/list': z.object({ ... }),      // GET /users
  'users/create': z.object({ ... }),    // POST /users
  'users/getUser': z.object({ ... }),   // GET /users/{id}
  'users/updateUser': z.object({ ... }), // PUT /users/{id}
}
```

**配置：**

```typescript
import { z } from 'zod';

const client = createClient({
  pontxSpecMeta,
  validation: {
    enabled: true,
    schemas: {
      // GET /users/{id}
      'users/getUser': z.object({
        userId: z.string().uuid(),
      }),

      // POST /users
      'users/create': z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),

      // PUT /users/{id}
      'users/updateUser': z.object({
        userId: z.string().uuid(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
      }),

      // GET /users (查询参数)
      'users/list': z.object({
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
      }),
    },
  },
});
```

**错误处理：**

```typescript
try {
  await client.users.getUser.request({ userId: 'invalid' });
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.error('参数校验失败:', error.zodError);
  }
}
```

**功能说明：**
- ✅ 请求前自动校验参数
- ✅ 清晰的错误信息
- ✅ 支持嵌套对象校验
- ✅ Zod 作为可选依赖（不使用时无需安装）

### 2. Mock 测试（Mock）

提供静态 Mock 数据，无需真实 API。

**API Key 说明：**

Mock 配置使用 `controller/method` 作为 key，每个 key 对应一个唯一的 API 端点：

```typescript
{
  'users/list': { ... },      // GET /users
  'users/create': { ... },    // POST /users
  'users/getUser': { ... },   // GET /users/{id}
  'users/updateUser': { ... }, // PUT /users/{id}
  'users/deleteUser': { ... }  // DELETE /users/{id}
}
```

> 💡 **提示**：即使多个 API 使用相同的路径（如 `/users`），只要方法名不同（如 `list` vs `create`），就可以配置不同的 Mock 数据。

**配置：**

```typescript
const client = createClient({
  pontxSpecMeta,
  mock: {
    enabled: true,
    data: {
      // GET /users/{id}
      'users/getUser': { id: '123', name: 'Mock User', email: 'mock@example.com' },

      // GET /users
      'users/list': [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ],

      // POST /users
      'users/create': { id: '3', name: 'New User' },

      // PUT /users/{id}
      'users/updateUser': { id: '123', name: 'Updated User' },

      // DELETE /users/{id}
      'users/deleteUser': { success: true }
    },
    delay: 100,  // 模拟网络延迟（毫秒）
    strict: false,  // false: 未配置 Mock 的 API 回退到真实请求
  },
});
```

**严格模式：**

```typescript
const client = createClient({
  pontxSpecMeta,
  mock: {
    enabled: true,
    data: { /* ... */ },
    strict: true,  // true: 要求所有 API 都配置 Mock 数据
  },
});

// 未配置 Mock 的 API 会抛出错误
try {
  await client.posts.getPosts.request({});
} catch (error) {
  console.error(error.code); // 'MOCK_NOT_FOUND'
}
```

**检测 Mock 响应：**

```typescript
import { isMockResponse } from '@pontx/nodejs-sdk';

const response = await client.users.getUser.request({ userId: '123' });

if (isMockResponse(response)) {
  console.log('这是 Mock 数据');
}
```

**功能说明：**
- ✅ 静态 Mock 数据
- ✅ 可配置延迟
- ✅ 严格模式确保测试覆盖
- ✅ 不发送真实网络请求

### 3. 自动重试（Retry）

自动重试失败的请求，支持指数退避和线性退避。

**配置：**

```typescript
const client = createClient({
  pontxSpecMeta,
  retry: {
    maxAttempts: 3,  // 最大重试次数（默认：3）
    backoff: 'exponential',  // 'exponential' 或 'linear'（默认：exponential）
    retryableErrors: [500, 502, 503, 'ECONNREFUSED'],  // 可选：自定义可重试错误
  },
});
```

**退避策略：**

**指数退避（推荐）：**
```
重试 1: 1 秒
重试 2: 2 秒
重试 3: 4 秒
重试 4: 8 秒
重试 5: 10 秒（上限）
```

**线性退避：**
```
重试 1: 1 秒
重试 2: 2 秒
重试 3: 3 秒
重试 4: 4 秒
```

**默认重试规则：**
- ✅ **重试**：5xx 状态码、网络错误（ECONNREFUSED、ETIMEDOUT 等）
- ❌ **不重试**：4xx 状态码（400、401、403、404 等）

**错误处理：**

```typescript
try {
  await client.users.getUser.request({ userId: '123' });
} catch (error) {
  if (error.code === 'RETRY_EXHAUSTED') {
    console.error(`重试 ${error.attempts} 次后失败`);
    console.error('最后一次错误:', error.lastError);
  }
}
```

**自定义可重试错误：**

```typescript
const client = createClient({
  pontxSpecMeta,
  retry: {
    maxAttempts: 5,
    retryableErrors: [429, 503, 'RATE_LIMITED'],  // 仅重试这些错误
  },
});
```

### 4. 请求日志（Logger）

自动记录请求、响应和错误信息，支持敏感数据脱敏。

**自动启用（开发模式）：**

```typescript
const client = createClient({
  pontxSpecMeta,
  logger: {},  // 空配置时，开发模式自动启用
});
```

**显式配置：**

```typescript
const client = createClient({
  pontxSpecMeta,
  logger: {
    enabled: true,  // 显式启用
    instance: customLogger,  // 可选：自定义日志实例
  },
});
```

**自定义日志实例：**

```typescript
import winston from 'winston';

const customLogger = winston.createLogger({
  transports: [new winston.transports.File({ filename: 'app.log' })],
});

const client = createClient({
  pontxSpecMeta,
  logger: {
    enabled: true,
    instance: customLogger,
  },
});
```

**日志格式：**

```
Request: GET users/getUser {
  apiKey: 'users/getUser',
  url: 'http://api.example.com/users/123',
  method: 'GET',
  params: { userId: '123', password: '***' }  // 敏感数据自动脱敏
}

Response: GET users/getUser {
  apiKey: 'users/getUser',
  status: 200,
  duration: 234  // 毫秒
}

Error: GET users/profile {
  apiKey: 'users/profile',
  error: 'Unauthorized',
  status: 401,
  duration: 123
}
```

**敏感数据脱敏：**

```typescript
import { maskSensitiveData } from '@pontx/nodejs-sdk';

const data = {
  username: 'john',
  password: 'secret123',
  apiKey: 'sk-123456',
};

const masked = maskSensitiveData(data);
// { username: 'john', password: '***', apiKey: '***' }

// 自定义敏感字段
const masked = maskSensitiveData(data, ['customSecret']);
```

**默认敏感字段：**
- password, passwd, pwd
- secret, token, apiKey, api_key
- apiToken, api_token
- accessToken, access_token
- refreshToken, refresh_token
- authorization, auth
- key, privateKey, private_key

**功能说明：**
- ✅ 自动记录请求/响应/错误
- ✅ 性能监控（请求耗时）
- ✅ 敏感数据自动脱敏
- ✅ 深度递归脱敏（嵌套对象/数组）
- ✅ 日志错误不影响请求

### 5. 错误处理（Error Handling）

统一的错误处理，清晰的错误码和上下文信息。

**错误类：**

```typescript
import { PontxError, ERROR_CODES } from '@pontx/nodejs-sdk';

try {
  await client.users.getUser.request({ userId: '123' });
} catch (error) {
  if (error instanceof PontxError) {
    console.error('错误码:', error.code);
    console.error('错误信息:', error.message);
    console.error('上下文:', error.context);
    console.error('原始错误:', error.cause);
  }
}
```

**错误码常量：**

```typescript
ERROR_CODES.VALIDATION_ERROR   // 参数校验失败
ERROR_CODES.MOCK_NOT_FOUND     // Mock 数据未配置
ERROR_CODES.REQUEST_FAILED     // 网络请求失败
ERROR_CODES.RETRY_EXHAUSTED    // 重试次数耗尽
ERROR_CODES.TIMEOUT_ERROR      // 请求超时
ERROR_CODES.CLIENT_ERROR       // 4xx 客户端错误
ERROR_CODES.SERVER_ERROR       // 5xx 服务器错误
```

**错误包装：**

```typescript
import { wrapError } from '@pontx/nodejs-sdk';

try {
  // 某些操作
} catch (error) {
  const wrapped = wrapError(error, {
    apiKey: 'users/getUser',
    url: 'http://api.example.com/users/123',
    params: { userId: '123' },
  });

  console.error(wrapped);
}
```

**超时处理：**

```typescript
import { withTimeout } from '@pontx/nodejs-sdk';

// 包装请求函数添加超时
const fetchWithTimeout = withTimeout(fetch, 5000); // 5 秒超时

try {
  const response = await fetchWithTimeout('http://api.example.com/slow', {});
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('请求超时');
  }
}
```

**单次请求超时：**

```typescript
const user = await client.users.getUser.request(
  { userId: '123' },
  { timeout: 3000 }  // 此次请求 3 秒超时
);
```

---

## 高级用法

### 1. 自定义请求函数

使用 axios 或其他 HTTP 客户端：

```typescript
import axios from 'axios';

const client = createClient({
  pontxSpecMeta,
  fetchFn: async (url, init) => {
    const res = await axios({
      url,
      method: init.method,
      data: init.body,
      headers: init.headers,
    });

    return new Response(JSON.stringify(res.data), {
      status: res.status,
      headers: res.headers,
    });
  },
});
```

### 2. React Query 集成

```typescript
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery(
    client.users.getUser.queryOptions({ userId })
  );

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return <div>{data.name}</div>;
}
```

### 3. SWR 集成

```typescript
import useSWR from 'swr';

function UserProfile({ userId }: { userId: string }) {
  const key = client.users.getUser.getFetchKey({ userId });
  const { data, error } = useSWR(
    key,
    () => client.users.getUser.request({ userId })
  );

  if (error) return <div>错误: {error.message}</div>;
  if (!data) return <div>加载中...</div>;

  return <div>{data.name}</div>;
}
```

### 4. 自定义使用方法

```typescript
const client = createClient({
  pontxSpecMeta,
  makeCustomUsages: (usages, apiMeta) => ({
    ...usages,
    // 添加自定义方法
    getPath: () => apiMeta.path,
    getMethod: () => apiMeta.method,
    getUrl: (params) => {
      return `https://api.example.com${apiMeta.path}`;
    },
  }),
});

// 使用自定义方法
const path = client.users.getUser.getPath();
const method = client.users.getUser.getMethod();
```

### 5. 自定义 URL 构建

```typescript
const client = createClient({
  pontxSpecMeta,
  getFetchUrl: (path, params) => {
    const baseUrl = process.env.API_BASE_URL || 'https://api.example.com';
    return `${baseUrl}${path}`;
  },
});
```

### 6. 请求拦截器

```typescript
const client = createClient({
  pontxSpecMeta,
  fetchFn: async (url, init) => {
    // 请求前拦截
    const token = getAuthToken();
    init.headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`,
    };

    // 执行请求
    const response = await fetch(url, init);

    // 响应后拦截
    if (response.status === 401) {
      await refreshToken();
      return fetch(url, init);
    }

    return response;
  },
});
```

### 7. 全局请求头

```typescript
const client = createClient({
  pontxSpecMeta,
  fetchFn: async (url, init) => {
    init.headers = {
      ...init.headers,
      'X-API-Version': '1.0',
      'X-Client-Id': 'my-app',
    };

    return fetch(url, init);
  },
});
```

---

## 最佳实践

### 1. 环境配置

```typescript
const client = createClient({
  pontxSpecMeta,

  // 根据环境启用功能
  validation: {
    enabled: process.env.NODE_ENV !== 'production',
  },

  mock: {
    enabled: process.env.NODE_ENV === 'test',
    data: mockData,
  },

  retry: {
    maxAttempts: process.env.NODE_ENV === 'production' ? 5 : 1,
  },

  logger: {
    enabled: process.env.NODE_ENV === 'development',
  },
});
```

### 2. 错误处理策略

```typescript
try {
  const user = await client.users.getUser.request({ userId });
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // 参数错误 - 修复参数
    console.error('参数错误:', error.zodError);
  } else if (error.code === 'TIMEOUT_ERROR') {
    // 超时 - 提示用户稍后重试
    console.error('请求超时，请稍后重试');
  } else if (error.code === 'CLIENT_ERROR') {
    // 4xx - 检查请求
    console.error('客户端错误:', error.context.status);
  } else if (error.code === 'SERVER_ERROR') {
    // 5xx - 服务器问题
    console.error('服务器错误，请联系支持');
  } else if (error.code === 'RETRY_EXHAUSTED') {
    // 重试耗尽 - 记录并报告
    console.error('多次重试失败:', error.lastError);
  } else {
    // 未知错误
    console.error('未知错误:', error);
  }
}
```

### 3. 类型安全

```typescript
// 定义 API 类型
interface User {
  id: string;
  name: string;
  email: string;
}

interface GetUserParams {
  userId: string;
}

// 使用类型断言
const user = await client.users.getUser.request({
  userId: '123'
}) as User;

// 或使用 TypeScript 泛型（如果 SDK 支持）
const user = await client.users.getUser.request<User, GetUserParams>({
  userId: '123'
});
```

### 4. 测试

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import { describe, it, expect } from 'vitest';

describe('User API', () => {
  const client = createClient({
    pontxSpecMeta,
    mock: {
      enabled: true,
      data: {
        'users/getUser': { id: '123', name: 'Test User' },
      },
    },
  });

  it('should get user', async () => {
    const user = await client.users.getUser.request({ userId: '123' });
    expect(user).toEqual({ id: '123', name: 'Test User' });
  });
});
```

### 5. 单例模式

```typescript
// api-client.ts
import { createClient } from '@pontx/nodejs-sdk';
import pontxMeta from './api-meta.json';

export const apiClient = createClient({
  pontxSpecMeta: pontxMeta,
  // 配置...
});

// 在其他文件中使用
import { apiClient } from './api-client';

const user = await apiClient.users.getUser.request({ userId: '123' });
```

---

## 故障排除

### 常见问题

#### 1. "Invalid pontxSpecMeta: missing or invalid 'name' property"

**原因：** API 元数据格式错误。

**解决方案：**
```typescript
// 确保元数据包含 name 和 apis 字段
const meta = {
  name: 'My API',
  hasTags: true,
  apis: { /* ... */ },
};
```

#### 2. "API 'xxx' not found in client"

**原因：** 访问了不存在的 API。

**解决方案：**
```typescript
// 检查 API 键是否正确
console.log(Object.keys(pontxMeta.apis)); // 查看所有可用 API

// 正确的访问方式
const user = await client.users.getUser.request({ userId: '123' });
```

#### 3. Zod 校验错误

**原因：** 未安装 Zod 或参数不符合 schema。

**解决方案：**
```bash
# 安装 Zod
npm install zod
```

```typescript
// 检查参数是否符合 schema
const schema = z.object({
  userId: z.string().uuid(),
});

// 验证参数
const result = schema.safeParse({ userId: '123' });
if (!result.success) {
  console.error(result.error);
}
```

#### 4. Mock 数据未生效

**原因：** Mock 配置未启用或 API 键错误。

**解决方案：**
```typescript
const client = createClient({
  pontxSpecMeta,
  mock: {
    enabled: true,  // 确保启用
    data: {
      'users/getUser': { /* ... */ },  // 确保 API 键正确
    },
  },
});
```

#### 5. 请求超时

**原因：** 网络慢或服务器响应慢。

**解决方案：**
```typescript
// 增加超时时间
const user = await client.users.getUser.request(
  { userId: '123' },
  { timeout: 10000 }  // 10 秒
);

// 或配置重试
const client = createClient({
  pontxSpecMeta,
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
  },
});
```

### 调试技巧

#### 1. 启用日志

```typescript
const client = createClient({
  pontxSpecMeta,
  logger: {
    enabled: true,  // 查看详细日志
  },
});
```

#### 2. 检查错误详情

```typescript
try {
  await client.users.getUser.request({ userId: '123' });
} catch (error) {
  console.error('错误详情:', {
    code: error.code,
    message: error.message,
    context: error.context,
    cause: error.cause,
    stack: error.stack,
  });
}
```

#### 3. 验证元数据

```typescript
console.log('可用的 API:', Object.keys(pontxMeta.apis));
console.log('API 详情:', pontxMeta.apis['users/getUser']);
```

---

## 更多资源

- [GitHub 仓库](https://github.com/pontjs/pontx-pro)
- [示例项目](#)
- [API 参考文档](#)
- [更新日志](../CHANGELOG.md)

---

## 许可证

MIT
