# API Key 设计说明

## 问题背景

在使用 Mock 和 Validation 功能时，需要为不同的 API 配置不同的数据和 schema。当前实现使用 `controller/method` 作为 API key，例如：

```typescript
{
  'users/getUser': { /* mock data */ },
  'users/createUser': { /* mock data */ }
}
```

## 当前设计

### API Key 结构

API key 格式：`controller/methodName`

示例：
```typescript
{
  'users/getUser': {
    path: '/users/{userId}',
    method: 'GET'
  },
  'users/createUser': {
    path: '/users',
    method: 'POST'
  },
  'users/updateUser': {
    path: '/users/{userId}',
    method: 'PUT'
  }
}
```

### 优点

1. **语义清晰**：方法名直接表达了操作意图（getUser, createUser, updateUser）
2. **天然区分**：不同的 method name 自动区分了不同的 HTTP method
3. **类型安全**：`client.users.getUser` 提供完整的 TypeScript 类型推断

## 常见场景处理

### 场景 1：同一路径，不同 HTTP method

**RESTful 设计示例：**

```typescript
// API 元数据
{
  'users/list': {      // GET /users
    path: '/users',
    method: 'GET'
  },
  'users/create': {    // POST /users
    path: '/users',
    method: 'POST'
  },
  'users/update': {    // PUT /users/{id}
    path: '/users/{id}',
    method: 'PUT'
  },
  'users/delete': {    // DELETE /users/{id}
    path: '/users/{id}',
    method: 'DELETE'
  }
}

// Mock 配置
{
  mock: {
    data: {
      'users/list': [{ id: 1, name: 'User 1' }],
      'users/create': { id: 2, name: 'New User' },
      'users/update': { id: 1, name: 'Updated User' },
      'users/delete': { success: true }
    }
  }
}

// Validation 配置
{
  validation: {
    schemas: {
      'users/list': z.object({
        page: z.number().optional(),
        limit: z.number().optional()
      }),
      'users/create': z.object({
        name: z.string(),
        email: z.string().email()
      }),
      'users/update': z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional()
      }),
      'users/delete': z.object({
        id: z.string()
      })
    }
  }
}
```

### 场景 2：相同路径和 method，但不同参数

如果确实需要区分相同路径和 method 的不同变体，建议使用不同的 method name：

```typescript
// 不推荐：使用相同的路径和 method
{
  'users/search': {
    path: '/users',
    method: 'GET'  // 按名称搜索
  },
  'users/searchByEmail': {
    path: '/users',
    method: 'GET'  // 按邮箱搜索
  }
}

// 推荐：使用不同的方法名或路径
{
  'users/searchByName': {
    path: '/users/search',
    method: 'GET'
  },
  'users/searchByEmail': {
    path: '/users/search-by-email',
    method: 'GET'
  }
}
```

## 使用示例

### Mock 配置示例

```typescript
const client = createClient({
  pontxSpecMeta,
  mock: {
    enabled: true,
    data: {
      // GET /users
      'users/list': [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' }
      ],

      // POST /users
      'users/create': {
        id: 3,
        name: 'New User',
        email: 'new@example.com'
      },

      // GET /users/{id}
      'users/getUser': {
        id: 1,
        name: 'User 1',
        email: 'user1@example.com'
      },

      // PUT /users/{id}
      'users/updateUser': {
        id: 1,
        name: 'Updated User',
        email: 'updated@example.com'
      },

      // DELETE /users/{id}
      'users/deleteUser': {
        success: true,
        message: 'User deleted'
      }
    }
  }
});

// 使用
await client.users.list.request({});              // GET /users
await client.users.create.request({}, { body: {} }); // POST /users
await client.users.getUser.request({ id: '1' });    // GET /users/1
await client.users.updateUser.request({ id: '1' }, { body: {} }); // PUT /users/1
await client.users.deleteUser.request({ id: '1' }); // DELETE /users/1
```

### Validation 配置示例

```typescript
import { z } from 'zod';

const client = createClient({
  pontxSpecMeta,
  validation: {
    enabled: true,
    schemas: {
      // GET /users - 查询参数校验
      'users/list': z.object({
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
        sort: z.enum(['asc', 'desc']).optional()
      }),

      // POST /users - 创建用户校验
      'users/create': z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        age: z.number().min(0).max(150).optional()
      }),

      // GET /users/{id} - ID 校验
      'users/getUser': z.object({
        id: z.string().uuid()
      }),

      // PUT /users/{id} - 更新用户校验
      'users/updateUser': z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        age: z.number().min(0).max(150).optional()
      }),

      // DELETE /users/{id} - ID 校验
      'users/deleteUser': z.object({
        id: z.string().uuid()
      })
    }
  }
});
```

## 高级用法

### 动态配置（运行时）

如果需要根据条件动态配置不同的 mock 数据或 schema：

```typescript
// 根据环境配置不同的 mock
const mockData = process.env.NODE_ENV === 'test'
  ? {
      'users/getUser': { id: 1, name: 'Test User' }
    }
  : {
      'users/getUser': { id: 1, name: 'Dev User' }
    };

const client = createClient({
  pontxSpecMeta,
  mock: {
    enabled: true,
    data: mockData
  }
});
```

### 共享 Schema

对于复杂的 schema，可以提取为独立模块：

```typescript
// schemas/user.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional()
});

export const CreateUserSchema = UserSchema.omit({ id: true });
export const UpdateUserSchema = UserSchema.partial().required({ id: true });

// api-client.ts
import { CreateUserSchema, UpdateUserSchema, UserSchema } from './schemas/user';

const client = createClient({
  pontxSpecMeta,
  validation: {
    enabled: true,
    schemas: {
      'users/create': CreateUserSchema,
      'users/update': UpdateUserSchema,
      'users/getUser': z.object({
        id: UserSchema.shape.id
      })
    }
  }
});
```

## 最佳实践

### 1. 命名约定

使用清晰的方法命名，遵循 RESTful 约定：

```typescript
// 推荐
'users/list'         // GET /users
'users/get'          // GET /users/{id}
'users/create'       // POST /users
'users/update'       // PUT /users/{id}
'users/delete'       // DELETE /users/{id}

// 或更明确的命名
'users/getAll'       // GET /users
'users/getById'      // GET /users/{id}
'users/createOne'    // POST /users
'users/updateOne'    // PUT /users/{id}
'users/deleteOne'    // DELETE /users/{id}
```

### 2. 组织配置

对于大型项目，将配置分离到独立文件：

```typescript
// config/mock-data.ts
export const mockData = {
  'users/list': [...],
  'users/create': {...},
  // ...
};

// config/schemas.ts
export const validationSchemas = {
  'users/list': z.object({...}),
  'users/create': z.object({...}),
  // ...
};

// api-client.ts
import { mockData } from './config/mock-data';
import { validationSchemas } from './config/schemas';

const client = createClient({
  pontxSpecMeta,
  mock: { enabled: true, data: mockData },
  validation: { enabled: true, schemas: validationSchemas }
});
```

### 3. 类型安全

利用 TypeScript 确保配置正确：

```typescript
import { z } from 'zod';
import type { MockConfig, ValidationConfig } from '@pontx/nodejs-sdk';

// 定义类型安全的配置
const mockConfig: MockConfig = {
  enabled: true,
  data: {
    'users/getUser': { id: 1, name: 'User' }
  }
};

const validationConfig: ValidationConfig = {
  enabled: true,
  schemas: {
    'users/getUser': z.object({
      id: z.string().uuid()
    })
  }
};
```

## 总结

当前的 API key 设计（`controller/method`）已经能够很好地处理不同 HTTP method 的场景：

1. **语义化命名**：通过方法名区分不同操作（list, create, update, delete）
2. **类型安全**：完整的 TypeScript 类型推断
3. **配置清晰**：每个 API key 对应唯一的 mock 数据和 validation schema
4. **扩展性好**：可以轻松添加新的 API 而不会冲突

对于同一路径不同 HTTP method 的场景，只需使用不同的方法名即可自然区分。
