# 常见问题 FAQ

## Mock 和 Validation 配置

### Q: 如何为同一路径的不同 HTTP method 配置不同的 Mock 数据或 Schema？

**A:** 使用不同的方法名作为 API key 即可区分。

**示例场景：** `/users` 路径支持 GET（获取列表）和 POST（创建用户）

```typescript
// API 元数据定义
{
  "apis": {
    "users/list": {           // GET /users
      "path": "/users",
      "method": "GET"
    },
    "users/create": {         // POST /users
      "path": "/users",
      "method": "POST"
    }
  }
}

// Mock 配置
const client = createClient({
  pontxSpecMeta,
  mock: {
    enabled: true,
    data: {
      'users/list': [         // GET /users 的 Mock 数据
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' }
      ],
      'users/create': {       // POST /users 的 Mock 数据
        id: 3,
        name: 'New User'
      }
    }
  },

  // Validation 配置
  validation: {
    enabled: true,
    schemas: {
      'users/list': z.object({     // GET /users 的参数校验
        page: z.number().optional(),
        limit: z.number().optional()
      }),
      'users/create': z.object({   // POST /users 的参数校验
        name: z.string(),
        email: z.string().email()
      })
    }
  }
});

// 使用
await client.users.list.request({ page: 1, limit: 10 });  // GET /users
await client.users.create.request({}, { body: { ... } }); // POST /users
```

**关键点：**
- API key 格式：`controller/methodName`
- 方法名（如 `list` vs `create`）天然区分了不同的操作
- 每个方法名对应唯一的 HTTP method 和路径组合

### Q: 如果真的有相同路径和 method 怎么办？

**A:** RESTful 设计中，相同路径和 method 应该是同一个 API。如果需要不同的行为，建议：

1. **使用不同的路径**（推荐）：
```typescript
{
  'users/searchByName': {
    path: '/users/search',      // 不同路径
    method: 'GET'
  },
  'users/searchByEmail': {
    path: '/users/search-by-email',  // 不同路径
    method: 'GET'
  }
}
```

2. **使用查询参数区分**：
```typescript
// 同一个 API，不同参数
'users/search': {
  path: '/users/search',
  method: 'GET'
}

// 通过参数区分行为
await client.users.search.request({ type: 'name', query: 'John' });
await client.users.search.request({ type: 'email', query: 'john@example.com' });
```

## 类型安全

### Q: 如何获得完整的 TypeScript 类型提示？

**A:** 确保 API 元数据格式正确，SDK 会自动推断类型。

```typescript
// 1. 导入元数据（带类型）
import pontxMeta from './api-meta.json';

// 2. 创建客户端时 TypeScript 会推断类型
const client = createClient({
  pontxSpecMeta: pontxMeta
});

// 3. 使用时获得完整类型提示
const user = await client.users.getUser.request({
  userId: '123'  // TypeScript 知道这里需要什么参数
});
```

## 配置管理

### Q: 如何在不同环境使用不同配置？

**A:** 使用环境变量和条件配置：

```typescript
const client = createClient({
  pontxSpecMeta,

  // 测试环境启用 Mock
  mock: {
    enabled: process.env.NODE_ENV === 'test',
    data: mockData
  },

  // 开发环境启用日志
  logger: {
    enabled: process.env.NODE_ENV === 'development'
  },

  // 生产环境启用重试
  retry: {
    maxAttempts: process.env.NODE_ENV === 'production' ? 5 : 1,
    backoff: 'exponential'
  },

  // 非生产环境启用参数校验
  validation: {
    enabled: process.env.NODE_ENV !== 'production',
    schemas: validationSchemas
  }
});
```

### Q: 如何组织大型项目的配置？

**A:** 将配置拆分到独立文件：

```
src/
  api/
    config/
      mock-data.ts        // Mock 数据
      schemas.ts          // Validation schemas
      client-config.ts    // 主配置
    api-client.ts         // 导出客户端实例
```

```typescript
// config/mock-data.ts
export const mockData = {
  'users/list': [...],
  'users/create': {...},
};

// config/schemas.ts
export const schemas = {
  'users/list': z.object({...}),
  'users/create': z.object({...}),
};

// api-client.ts
import { mockData } from './config/mock-data';
import { schemas } from './config/schemas';

export const apiClient = createClient({
  pontxSpecMeta,
  mock: { enabled: true, data: mockData },
  validation: { enabled: true, schemas }
});
```

## 错误处理

### Q: 如何处理不同类型的错误？

**A:** 使用错误码进行分类处理：

```typescript
import { ERROR_CODES } from '@pontx/nodejs-sdk';

try {
  await client.users.getUser.request({ userId: '123' });
} catch (error) {
  switch (error.code) {
    case ERROR_CODES.VALIDATION_ERROR:
      // 参数错误 - 修复参数
      console.error('参数错误:', error.zodError);
      break;

    case ERROR_CODES.TIMEOUT_ERROR:
      // 超时 - 提示用户稍后重试
      showNotification('请求超时，请稍后重试');
      break;

    case ERROR_CODES.CLIENT_ERROR:
      // 4xx - 检查请求
      if (error.context.status === 401) {
        redirectToLogin();
      } else if (error.context.status === 404) {
        showNotFound();
      }
      break;

    case ERROR_CODES.SERVER_ERROR:
      // 5xx - 服务器问题
      showErrorPage('服务器错误，请联系支持');
      break;

    case ERROR_CODES.RETRY_EXHAUSTED:
      // 重试耗尽
      logError('多次重试失败', error.lastError);
      break;

    default:
      // 未知错误
      console.error('未知错误:', error);
  }
}
```

## 性能优化

### Q: 如何提高请求性能？

**A:** 几个优化建议：

1. **使用缓存**（React Query / SWR）：
```typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery(
  client.users.getUser.queryOptions({ userId })
);
```

2. **并发请求**：
```typescript
const [users, posts] = await Promise.all([
  client.users.list.request({}),
  client.posts.list.request({})
]);
```

3. **条件启用功能**：
```typescript
// 生产环境禁用日志和校验
const client = createClient({
  pontxSpecMeta,
  logger: {
    enabled: process.env.NODE_ENV !== 'production'
  },
  validation: {
    enabled: process.env.NODE_ENV !== 'production'
  }
});
```

## 调试

### Q: 如何调试 API 请求？

**A:** 启用日志功能：

```typescript
const client = createClient({
  pontxSpecMeta,
  logger: {
    enabled: true  // 查看详细的请求/响应日志
  }
});

// 日志输出示例：
// Request: GET users/getUser { apiKey: 'users/getUser', url: '...', params: {...} }
// Response: GET users/getUser { status: 200, duration: 123 }
```

或使用浏览器/Node.js 调试器：

```typescript
const client = createClient({
  pontxSpecMeta,
  fetchFn: async (url, init) => {
    console.log('发送请求:', url, init);
    const response = await fetch(url, init);
    console.log('收到响应:', response.status);
    return response;
  }
});
```

## 测试

### Q: 如何编写单元测试？

**A:** 使用 Mock 模式：

```typescript
import { createClient } from '@pontx/nodejs-sdk';
import { describe, it, expect } from 'vitest';

describe('User API', () => {
  const client = createClient({
    pontxSpecMeta,
    mock: {
      enabled: true,
      data: {
        'users/getUser': { id: '123', name: 'Test User' }
      }
    }
  });

  it('should get user by id', async () => {
    const user = await client.users.getUser.request({ userId: '123' });
    expect(user).toEqual({ id: '123', name: 'Test User' });
  });
});
```

### Q: 如何测试错误场景？

**A:** Mock 可以抛出错误：

```typescript
const client = createClient({
  pontxSpecMeta,
  fetchFn: async () => {
    throw new Error('Network error');
  },
  retry: {
    maxAttempts: 1  // 禁用重试以快速测试
  }
});

it('should handle network error', async () => {
  await expect(
    client.users.getUser.request({ userId: '123' })
  ).rejects.toThrow('Network error');
});
```

## 更多帮助

如果还有其他问题，请：
- 查看 [使用指南](./usage-guide.md)
- 查看 [API Key 设计说明](./api-key-design.md)
- 提交 [GitHub Issue](https://github.com/pontjs/pontx-pro/issues)
