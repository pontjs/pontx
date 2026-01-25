# Logger 开发规范

## 导入规范

```typescript
// ✅ 正确：从子模块导入
import { createLogger } from "./logger/logger";
import type { Logger, LogLevel } from "./logger/types";

// ❌ 错误：从旧版兼容层导入（仅用于向后兼容）
import { createLogger, Logger } from "./logger";
```

## 日志级别使用

| 级别 | 使用场景 |
|------|----------|
| `trace` | 非常详细的追踪信息，函数调用、参数等 |
| `debug` | 调试信息，配置加载、状态变更等 |
| `info` | 关键操作，服务启动、代码生成完成等 |
| `warn` | 警告，配置废弃、非致命错误等 |
| `error` | 错误，操作失败但程序继续 |
| `fatal` | 致命错误，程序即将崩溃 |

## 错误处理规范

### 模式 1: 捕获、记录、继续
```typescript
try {
  await syncRemoteSpec(origin);
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.warn('同步失败，将在下次重试', err);
  // 不抛出，继续执行
}
```

### 模式 2: 捕获、记录、重新抛出
```typescript
try {
  return await loadConfig(path);
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('配置加载失败', err, { path });
  throw err;  // 重新抛出
}
```

### 模式 3: 不捕获，顶层统一处理
```typescript
// 命令层不捕获
export async function genCommand(ctx: CliContext) {
  const code = await generateCode();
  console.log(code);
}

// CLI 顶层统一处理
program.action(async () => {
  try {
    await genCommand(ctx);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('命令执行失败', err);
    process.exit(1);
  }
});
```

## Console vs Logger

### 使用 console.log 的场景
```typescript
// ✅ 输出程序数据到 stdout（供管道使用）
console.log(JSON.stringify(result));
console.log(generatedCode);
```

### 使用 logger 的场景
```typescript
// ✅ 日志信息到 stderr
logger.info('操作完成');
logger.debug('详细信息', { key: 'value' });
logger.error('操作失败', error);
```

## 颜色使用

### 日志级别颜色
- **ERROR/FATAL**: 红色加粗
- **WARN**: 黄色
- **INFO**: 青色
- **DEBUG/TRACE**: 灰色

### 辅助信息
- **错误堆栈**: 灰色（`colors.gray`，保持可读性）
- **元数据**: 灰色
- **时间戳**: 暗淡（`colors.dim`）

### 注意事项
- ❌ 不要对错误堆栈使用 `colors.dim()`（太暗）
- ✅ 使用 `colors.gray()` 保持可读性

## 环境变量控制

```bash
# 显式指定日志级别
export PONTX_LOG_LEVEL=debug

# 使用 DEBUG 变量
export DEBUG=pontx

# 通过 NODE_ENV
export NODE_ENV=development  # 自动 debug 级别
```

## CLI 参数支持

```bash
pontx generate --debug
pontx service --debug
```

## 实现示例

### CLI 入口
```typescript
// src/cli.ts
const hasDebugFlag = process.argv.includes('--debug');
const envLevel = getLogLevelFromEnv();
const logLevel: LogLevel = hasDebugFlag ? 'debug' : envLevel;

const logger = createLogger(logLevel, { prefix: '[pontx cli]' });
```

### Manager 类
```typescript
// src/manager.ts
static async constructorFromRootDir(
  rootDir: string,
  logger = createLogger('info', { prefix: '[pontx manager]' })
) {
  logger.debug(`查找配置文件: ${rootDir}`);
  const configPath = await lookForFiles(rootDir, 'pontx.config.ts');

  if (!configPath) {
    const error = new Error('未找到配置文件');
    logger.error('配置文件查找失败', error, { rootDir });
    throw error;
  }

  logger.debug(`找到配置文件: ${configPath}`);
  return await this.constructorFromPontxConfigPath(configPath, rootDir, logger);
}
```

### Service 类
```typescript
// src/service/service.ts
export class PontxService {
  private logger: Logger;

  constructor(rootDir: string, config?: ServiceConfig, logger?: Logger) {
    // 优先使用传入的 logger（依赖注入），其次根据 config 创建
    this.logger = logger || createLogger(
      config?.logLevel || 'info',
      { prefix: '[pontx service]' }
    );
  }

  async start(): Promise<void> {
    this.logger.info('正在启动 Service...');
    this.logger.debug('配置详情', { port: this.config.port });

    try {
      await this.initialize();
      this.logger.info('Service 启动成功');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Service 启动失败', err);
      throw err;
    }
  }
}
```

**Logger 注入示例**：
```typescript
// CLI 中传递 logger（支持 --debug 参数）
const serviceLogger = serviceConfig.logLevel
  ? createLogger(serviceConfig.logLevel as LogLevel, { prefix: '[pontx service]' })
  : logger; // 继承 CLI 的 logger

const service = new PontxService(rootDir, serviceConfig, serviceLogger);
```

这样实现了：
- ✅ `pontx --debug service` → Service 使用 debug 级别
- ✅ `pontx --debug service -l info` → Service 覆盖为 info 级别
- ✅ `new PontxService(dir, config)` → 向后兼容，自动创建 logger
- ✅ `new PontxService(dir, config, customLogger)` → 支持依赖注入

## 测试

### 手动测试
```bash
# 测试 logger 功能
npx tsx src/logger/test-logger.ts

# 测试实际使用
pontx generate --debug
```

### 单元测试

Logger 包含完整的单元测试覆盖：

```bash
# 运行 logger 测试
npx vitest run tests/logger

# 监听模式
npx vitest tests/logger
```

**测试文件：**
- `tests/logger/utils.test.ts` - 纯函数单元测试（41 个测试用例）
  - formatJson - JSON 序列化
  - isValidLogLevel - 日志级别校验
  - shouldLog - 日志级别比较
  - truncate - 文本截断
  - formatErrorStack - 错误堆栈格式化
  - extractErrorInfo - 错误信息提取
  - formatTime - 时间格式化
  - getLogLevelFromEnv - 环境变量解析

- `tests/logger/logger.test.ts` - Logger 集成测试（41 个测试用例）
  - 日志级别控制
  - 6 级日志方法（trace/debug/info/warn/error/fatal）
  - 错误处理和追踪
  - 元数据处理
  - warnOnce 去重
  - hasWarned 标志
  - JSON 格式输出
  - 前缀和时间戳配置
  - 边界情况处理

**测试覆盖：**
- ✅ 82 个测试用例全部通过
- ✅ 纯函数 100% 覆盖
- ✅ 核心功能完整覆盖
