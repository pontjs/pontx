# ExecuteApi 配置指南

## 概述

Pontx 提供了两种方式来配置 API 执行行为：

1. **配置式**（推荐）：通过 `executeApi` 字段进行声明式配置，适合 90% 的常见场景
2. **插件式**（高级）：通过自定义插件实现完全控制，适合复杂的定制需求

## 一、配置式使用

### 1.1 基础配置

最简单的配置，只需指定 `baseURL`：

```typescript
// pontx.config.ts
export default defineConfig({
  outDir: "./src/api",
  specs: [{ name: "my-api", url: "https://api.example.com/swagger.json" }],

  executeApi: {
    baseURL: "https://api.example.com",
  },
});
```

**使用**：

```bash
pontx call my-api.user.getUser --userId 123
```

### 1.2 多环境配置

配置多个环境，方便切换：

```typescript
executeApi: {
  // 默认环境
  baseURL: 'https://api.example.com',

  // 环境配置
  environments: {
    dev: {
      baseURL: 'https://dev-api.example.com',
      headers: { 'X-Env': 'dev' }
    },
    test: {
      baseURL: 'https://test-api.example.com',
      headers: { 'X-Env': 'test' }
    },
    prod: {
      baseURL: 'https://api.example.com',
      headers: { 'X-Env': 'prod' }
    }
  }
}
```

**使用**：

```bash
# 使用默认环境
pontx call my-api.user.getUser --userId 123

# 使用指定环境
pontx call my-api.user.getUser --userId 123 --env dev
pontx call my-api.user.getUser --userId 123 --env test

# 临时使用自定义 URL
pontx call my-api.user.getUser --userId 123 --env https://custom.api.com
```

### 1.3 认证配置

通过 `beforeRequest` 钩子添加认证：

```typescript
executeApi: {
  baseURL: 'https://api.example.com',

  beforeRequest: async (request) => {
    // 方式1：从环境变量获取 token
    const token = process.env.API_TOKEN;

    // 方式2：从文件读取
    // const token = fs.readFileSync('.token', 'utf-8').trim();

    // 方式3：动态获取（例如刷新 token）
    // const token = await refreshToken();

    request.init.headers = {
      ...request.init.headers,
      'Authorization': `Bearer ${token}`
    };

    return request;
  }
}
```

### 1.4 响应处理

统一处理响应数据：

```typescript
executeApi: {
  baseURL: 'https://api.example.com',

  // 统一解包响应
  afterResponse: (response) => {
    const data = response.data as any;

    // 假设 API 返回格式为 { code: 0, data: {...}, message: '' }
    if (data.code === 0) {
      return data.data;  // 返回实际数据
    }

    // 业务错误
    throw new Error(data.message || '请求失败');
  },

  // 错误处理
  onError: async (error) => {
    if (error.type === 'http') {
      if (error.response?.status === 401) {
        console.error('认证失败，请重新登录');
      } else if (error.response?.status === 403) {
        console.error('权限不足');
      }
    } else if (error.type === 'timeout') {
      console.error('请求超时');
    } else if (error.type === 'network') {
      console.error('网络错误');
    }
  }
}
```

### 1.5 完整配置示例

```typescript
executeApi: {
  // 基础配置
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'pontx'
  },

  // 多环境
  environments: {
    dev: {
      baseURL: 'https://dev-api.example.com',
      timeout: 15000
    },
    prod: {
      baseURL: 'https://api.example.com'
    }
  },

  // 请求前处理
  beforeRequest: async (request) => {
    // 添加认证
    const token = await getAuthToken();
    request.init.headers = {
      ...request.init.headers,
      'Authorization': `Bearer ${token}`
    };

    // 添加日志
    console.log(`[Request] ${request.meta.method} ${request.url}`);

    return request;
  },

  // 响应后处理
  afterResponse: (response) => {
    console.log(`[Response] Status: ${response.status}`);
    const data = response.data as any;
    return data.code === 0 ? data.data : Promise.reject(data.message);
  },

  // 错误处理
  onError: async (error) => {
    console.error(`[Error] ${error.type}:`, error.message);
  }
}
```

## 二、插件式使用

### 2.1 自定义执行器插件

适用于需要完全控制 API 调用流程的场景：

```typescript
import type { Plugin, ApiExecutionContext } from 'pontx';

const myExecutorPlugin: Plugin = {
  name: 'my-executor',

  executeApi: async (context: ApiExecutionContext) => {
    const { api, meta, params, env, logger } = context;

    logger.info(`Executing: ${api.specName}.${api.apiName}`);

    // 你的自定义逻辑
    // 可以使用任何 HTTP 客户端：axios, node-fetch, got 等

    const response = await fetch(
      `${env?.baseURL}${meta.path}`,
      {
        method: meta.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );

    const data = await response.json();

    return {
      data,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    };
  }
};

export default defineConfig({
  outDir: './src/api',
  specs: [...],
  plugins: [myExecutorPlugin]
});
```

### 2.2 组合使用配置式和插件式

你可以同时使用配置式和插件式：

```typescript
export default defineConfig({
  outDir: './src/api',
  specs: [...],

  // 配置式：作为默认配置
  executeApi: {
    baseURL: 'https://api.example.com',
    timeout: 10000
  },

  // 插件式：高优先级，会覆盖配置式
  plugins: [
    {
      name: 'special-api-handler',
      executeApi: async (context) => {
        // 只处理特定的 API
        if (context.api.specName === 'special-api') {
          // 自定义处理逻辑
          return customHandle(context);
        }

        // 返回 null，让其他插件或默认执行器处理
        return null;
      }
    }
  ]
});
```

## 三、配置优先级

### 3.1 baseURL 优先级

```
CLI --env 参数 > executeApi.environments[env] > executeApi.baseURL > spec.servers[0].url
```

示例：

```typescript
executeApi: {
  baseURL: 'https://api.example.com',  // 优先级 3
  environments: {
    dev: {
      baseURL: 'https://dev-api.example.com'  // 优先级 2
    }
  }
}

// CLI 使用
pontx call api --env https://custom.com  // 优先级 1（最高）
```

### 3.2 Headers 优先级

Headers 会进行合并，优先级高的会覆盖优先级低的：

```
CLI --header 参数 > executeApi.environments[env].headers > executeApi.headers
```

### 3.3 Timeout 优先级

```
executeApi.environments[env].timeout > executeApi.timeout > 默认 30000ms
```

## 四、实际应用场景

### 场景 1：微服务项目

```typescript
executeApi: {
  environments: {
    dev: { baseURL: 'http://localhost:3000' },
    test: { baseURL: 'https://test.company.com' },
    staging: { baseURL: 'https://staging.company.com' },
    prod: { baseURL: 'https://api.company.com' }
  },

  beforeRequest: async (request) => {
    // 从 K8s Secret 或配置中心获取 token
    const token = await getServiceToken();
    request.init.headers = {
      ...request.init.headers,
      'Authorization': `Bearer ${token}`,
      'X-Service-Name': 'my-service'
    };
    return request;
  }
}
```

### 场景 2：需要签名的 API

```typescript
executeApi: {
  baseURL: 'https://api.example.com',

  beforeRequest: async (request) => {
    const timestamp = Date.now();
    const signature = await generateSignature({
      url: request.url,
      method: request.meta.method,
      body: request.init.body,
      timestamp
    });

    request.init.headers = {
      ...request.init.headers,
      'X-Timestamp': timestamp.toString(),
      'X-Signature': signature
    };

    return request;
  }
}
```

### 场景 3：GraphQL API

```typescript
const graphqlExecutor: Plugin = {
  name: "graphql-executor",

  executeApi: async (context) => {
    // 将 REST 风格的调用转换为 GraphQL
    const query = buildGraphQLQuery(context.api, context.params);

    const response = await fetch(`${context.env?.baseURL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    return {
      data: result.data,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
  },
};
```

## 五、调试技巧

### 5.1 使用 --debug 查看详细信息

```bash
pontx call my-api.user.getUser --userId 123 --debug
```

输出：

```
============================================================
API: my-api/user/getUser
Method: GET
Path: /users/{userId}
Base URL: https://api.example.com
Environment: dev
------------------------------------------------------------
Parameters:
  userId: 123
------------------------------------------------------------
Request completed successfully (status: 200)
============================================================
```

### 5.2 使用 --dry-run 预览请求

```bash
pontx call my-api.user.getUser --userId 123 --dry-run
```

只显示请求信息，不实际发送。

### 5.3 日志输出

在钩子中添加日志：

```typescript
executeApi: {
  beforeRequest: (request) => {
    console.error(`[Request] ${request.meta.method} ${request.url}`);
    console.error('[Headers]', request.init.headers);
    console.error('[Body]', request.init.body);
    return request;
  },

  afterResponse: (response) => {
    console.error(`[Response] Status: ${response.status}`);
    console.error('[Data]', JSON.stringify(response.data, null, 2));
    return response.data;
  }
}
```

## 六、最佳实践

1. **优先使用配置式**：对于大多数场景，配置式已经足够
2. **环境隔离**：使用 `environments` 配置不同环境
3. **Token 管理**：敏感信息（如 token）放在环境变量或密钥管理系统中
4. **错误处理**：在 `onError` 中统一处理错误，避免在每个 API 调用中重复
5. **日志规范**：使用 `console.error` 输出调试信息（不影响 stdout 管道）
6. **类型安全**：充分利用 TypeScript 类型检查

## 七、迁移指南

### 从旧的 apiExecutor 迁移

旧版本：

```typescript
plugins: [
  {
    name: "my-plugin",
    apiExecutor: async (context) => {
      // 旧的 context 结构
      const { apiSelector, apiMeta, toolParams, baseUrl } = context;
      // ...
    },
  },
];
```

新版本（推荐使用配置式）：

```typescript
executeApi: {
  baseURL: 'https://api.example.com',
  beforeRequest: async (request) => {
    // 新的钩子方式
    return request;
  }
}
```

新版本（仍使用插件式）：

```typescript
plugins: [
  {
    name: "my-plugin",
    executeApi: async (context) => {
      // 新的 context 结构
      const { api, meta, params, env } = context;
      // ...
      return {
        data: result,
        status: 200,
        headers: {},
      };
    },
  },
];
```

## 八、常见问题

### Q1: executeApi 配置不生效？

确保：

1. 配置文件正确导出：`export default defineConfig({...})`
2. 没有插件覆盖（插件的优先级更高）
3. 使用 `--debug` 查看实际使用的配置

### Q2: 如何在 beforeRequest 中修改请求体？

```typescript
beforeRequest: async (request) => {
  // 解析现有的 body
  const body = request.init.body ? JSON.parse(request.init.body as string) : {};

  // 添加额外字段
  body.timestamp = Date.now();

  // 重新序列化
  request.init.body = JSON.stringify(body);

  return request;
};
```

### Q3: 如何处理文件上传？

插件式更适合处理特殊场景：

```typescript
executeApi: async (context) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(context.params)) {
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  return {
    data: await response.json(),
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };
};
```

---

更多信息请参考：

- [Pontx 文档](https://github.com/alibaba/pont)
