# @pontx/nodejs-sdk 文档

欢迎使用 Pontx Node.js SDK！这是一个为 Node.js >= 18 环境设计的类型安全 API 客户端 SDK。

## 📚 文档导航

### 入门文档

- **[使用指南](./usage-guide.md)** - 完整的使用文档
  - 快速开始
  - 核心概念
  - API 参考
  - 功能特性（Validation、Mock、Retry、Logger、Error Handling）
  - 高级用法
  - 最佳实践
  - 故障排除

### 设计文档

- **[API Key 设计说明](./api-key-design.md)** - 理解 API key 的设计
  - 当前设计原理
  - 同一路径不同 method 的处理方式
  - 使用示例
  - 最佳实践

### 常见问题

- **[FAQ](./FAQ.md)** - 常见问题解答
  - Mock 和 Validation 配置
  - 类型安全
  - 配置管理
  - 错误处理
  - 性能优化
  - 调试技巧
  - 测试方法

## 🚀 快速开始

### 安装

```bash
npm install @pontx/nodejs-sdk
```

### 最简示例

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import pontxMeta from './api-meta.json';

const client = createClient({
  pontxSpecMeta: pontxMeta,
});

const user = await client.users.getUser.request({ userId: '123' });
```

### 完整功能示例

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import { z } from 'zod';

const client = createClient({
  pontxSpecMeta,

  validation: {
    enabled: true,
    schemas: {
      'users/getUser': z.object({ userId: z.string().uuid() })
    }
  },

  mock: {
    enabled: process.env.NODE_ENV === 'test',
    data: {
      'users/getUser': { id: '123', name: 'Mock User' }
    }
  },

  retry: {
    maxAttempts: 3,
    backoff: 'exponential'
  },

  logger: {
    enabled: process.env.NODE_ENV === 'development'
  }
});
```

## ✨ 功能特性

### 类型安全
- ✅ 完整的 TypeScript 类型推断
- ✅ 编译时类型检查
- ✅ IDE 智能提示

### 参数校验（Validation）
- ✅ 运行时参数校验（使用 Zod）
- ✅ 清晰的错误信息
- ✅ 支持复杂的嵌套对象校验

### Mock 测试
- ✅ 静态 Mock 数据
- ✅ 可配置延迟模拟网络
- ✅ 严格模式确保测试覆盖

### 自动重试（Retry）
- ✅ 智能重试（仅重试 5xx 和网络错误）
- ✅ 指数退避策略
- ✅ 可自定义重试条件

### 请求日志（Logger）
- ✅ 自动记录请求/响应/错误
- ✅ 敏感数据自动脱敏
- ✅ 性能监控（请求耗时）
- ✅ 支持自定义 logger

### 错误处理
- ✅ 统一的错误类型（PontxError）
- ✅ 清晰的错误码
- ✅ 完整的错误上下文
- ✅ 超时支持（AbortController）

### 其他特性
- ✅ 零依赖（使用 Node.js >= 18 原生 fetch）
- ✅ 支持自定义 HTTP 客户端（axios 等）
- ✅ React Query / SWR 集成
- ✅ CommonJS + ESM 双格式支持

## 📖 核心概念

### API Key 结构

API key 格式：`controller/methodName`

```typescript
{
  'users/list': { ... },      // GET /users
  'users/create': { ... },    // POST /users
  'users/getUser': { ... },   // GET /users/{id}
  'users/updateUser': { ... }, // PUT /users/{id}
  'users/deleteUser': { ... }  // DELETE /users/{id}
}
```

**关键点：**
- 每个 key 对应一个唯一的 API 端点
- 方法名区分不同的操作（list, create, update, delete）
- 即使路径相同，不同方法名也能配置不同的 Mock 数据和 Schema

### 客户端代理系统

SDK 使用 Proxy 模式实现动态 API 访问：

```typescript
client.controller.method.request(params, options)
//     ↑         ↑       ↑
//  控制器    方法名   请求方法
```

每个 API 方法提供三个标准方法：
- **request** - 执行 API 请求
- **getFetchKey** - 获取缓存键
- **queryOptions** - 获取数据获取库配置

### 功能模块组合

SDK 采用装饰器模式，功能模块按配置自动组合：

```
请求流程：
用户调用 → 校验 → Mock → 重试 → 日志 → 原生 fetch
```

## 💡 使用场景

### 开发环境
```typescript
const client = createClient({
  pontxSpecMeta,
  logger: { enabled: true },        // 启用日志
  validation: { enabled: true },     // 启用校验
});
```

### 测试环境
```typescript
const client = createClient({
  pontxSpecMeta,
  mock: {                            // 启用 Mock
    enabled: true,
    data: mockData,
    strict: true                     // 严格模式
  },
});
```

### 生产环境
```typescript
const client = createClient({
  pontxSpecMeta,
  retry: {                           // 启用重试
    maxAttempts: 5,
    backoff: 'exponential'
  },
  logger: { enabled: false },        // 禁用日志
  validation: { enabled: false },    // 禁用校验
});
```

## 🔧 集成示例

### React Query

```typescript
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { data, isLoading } = useQuery(
    client.users.getUser.queryOptions({ userId })
  );

  if (isLoading) return <div>加载中...</div>;
  return <div>{data.name}</div>;
}
```

### SWR

```typescript
import useSWR from 'swr';

function UserProfile({ userId }) {
  const key = client.users.getUser.getFetchKey({ userId });
  const { data } = useSWR(
    key,
    () => client.users.getUser.request({ userId })
  );

  return <div>{data?.name}</div>;
}
```

### 自定义 HTTP 客户端（axios）

```typescript
import axios from 'axios';

const client = createClient({
  pontxSpecMeta,
  fetchFn: async (url, init) => {
    const res = await axios({
      url,
      method: init.method,
      data: init.body,
      headers: init.headers
    });

    return new Response(JSON.stringify(res.data), {
      status: res.status,
      headers: res.headers
    });
  }
});
```

## 📦 环境要求

- **Node.js**: >= 18.0.0（使用原生 fetch 和 FormData）
- **TypeScript**: >= 4.5（可选，但强烈推荐）

### 可选依赖

- **zod**: >= 3.20.0（仅在使用 validation 功能时需要）

```bash
npm install zod
```

## 📄 更多资源

- [GitHub 仓库](https://github.com/pontjs/pontx-pro)
- [更新日志](../CHANGELOG.md)
- [贡献指南](../CONTRIBUTING.md)
- [问题反馈](https://github.com/pontjs/pontx-pro/issues)

## 📝 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件

---

## 快速链接

- [使用指南](./usage-guide.md) - 完整的使用文档
- [API Key 设计](./api-key-design.md) - 理解 API key 设计
- [常见问题 FAQ](./FAQ.md) - 常见问题解答

如有任何问题，欢迎查阅文档或提交 Issue！
