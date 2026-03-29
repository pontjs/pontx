# CLI 重构计划

## 背景

pontx CLI 和 SDK CLI 存在大量重复的命令注册代码。本次重构已完成：
1. 用 OpenCLI Spec 定义所有命令（`specs/pontx.json`）
2. 将所有 CLI 相关代码聚合到 `src/cli/` 目录

后续需要实现 spec-driven 的命令注册，彻底消除重复代码。

## 当前状态

### 目录结构

```
src/cli/
├── index.ts              # CLI 入口
├── factory.ts            # 主 CLI 工厂（pontx 命令）
├── context.ts            # CLI 上下文（懒加载 PontxManager）
├── specs/
│   └── pontx.json        # OpenCLI Spec 命令定义（source of truth）
├── commands/             # 命令实现函数
├── sdk/                  # SDK CLI（pontx CLI 的子集封装）
│   ├── run-cli.ts        # SDK CLI 入口
│   ├── context-adapter.ts # api-lock.json → CliContext 适配
│   └── types.ts          # CLIConfig 类型
├── completion/           # Shell 补全引擎
└── plan.md               # 本文件
```

### 遗留的兼容性包装文件

以下文件仅为保持构建输出路径兼容而保留，标记了 `@deprecated`：
- `src/cli.ts` → 转发到 `src/cli/factory`
- `src/cli-factory.ts` → 转发到 `src/cli/factory`
- `src/cli-context.ts` → 转发到 `src/cli/context`
- `src/sdk-cli/index.ts` → 转发到 `src/cli/sdk/`

后续可通过更新 rollup 配置和 package.json exports 来删除这些文件。

### 重复代码现状

`factory.ts` 和 `sdk/run-cli.ts` 中有 **8 个共享命令** 的注册代码几乎完全相同：
- search, show-api, show-schema, gen, list-cases, list(+子命令), call, completion

差异均为实现遗漏（非设计意图），包括：
- `--remote` vs `--use-remote` 选项名不统一
- SDK CLI 每个 action 有 try-catch，主 CLI 没有
- call 命令参数获取方式不同

## 后续实现步骤

### Phase 1: 实现 spec-loader

新建 `src/cli/spec-loader.ts`，从 OpenCLI Spec JSON 自动生成 Commander 命令。

#### 核心接口设计

```typescript
import type { Command } from "commander";

/** OpenCLI Spec Document Object */
interface OpenCLISpec {
  opencli: string;
  info: { title: string; version: string; description?: string };
  options?: OpenCLIOption[];
  commands?: OpenCLICommand[];
}

/** OpenCLI Command Object */
interface OpenCLICommand {
  name: string;
  aliases?: string[];
  description?: string;
  arguments?: OpenCLIArgument[];
  options?: OpenCLIOption[];
  commands?: OpenCLICommand[];  // 子命令
  hidden?: boolean;
  metadata?: Array<{ name: string; value: any }>;
}

/** OpenCLI Option Object */
interface OpenCLIOption {
  name: string;
  aliases?: string[];
  description?: string;
  required?: boolean;
  hidden?: boolean;
  arguments?: OpenCLIArgument[];
}

/** OpenCLI Argument Object */
interface OpenCLIArgument {
  name: string;
  required?: boolean;
  description?: string;
  acceptedValues?: string[];
  arity?: { minimum: number; maximum: number | null };
}

/** 注册选项 */
interface RegisterOptions {
  /** 只注册指定 scope 的命令 */
  scope?: string[];
  /** 错误处理包装器 */
  wrapAction?: (commandName: string, fn: Function) => Function;
}

/** 命令处理函数映射 */
type ActionMap = Record<string, (...args: any[]) => Promise<void>>;

/**
 * 从 OpenCLI Spec 注册命令到 Commander program
 */
export function registerCommandsFromSpec(
  program: Command,
  spec: OpenCLISpec,
  actions: ActionMap,
  options?: RegisterOptions
): void;
```

#### 实现要点

1. **scope 过滤**：读取 command.metadata 中 `name=scope` 的条目，与 options.scope 对比过滤
2. **Commander 映射**：
   - `OpenCLICommand.name` → `program.command(name)`
   - `OpenCLICommand.aliases` → `.alias()`
   - `OpenCLICommand.description` → `.description()`
   - `OpenCLICommand.arguments` → `.argument(name, description)`，required 控制 `<>` 还是 `[]`
   - `OpenCLICommand.options` → `.option(flags, description)`
   - `OpenCLICommand.commands` → 递归注册子命令
   - `metadata[name=allowUnknownOption]` → `.allowUnknownOption(true)`
3. **action 绑定**：从 `metadata[name=handler]` 获取 handler 名称，查找 actions map
4. **wrapAction**：用于 SDK CLI 的统一错误处理包装
5. **option flags 生成**：
   - `--name` + `aliases=["-n"]` → `-n, --name`
   - 有 arguments 时追加 `<ARG_NAME>`
   - option.required → Commander 的 `.requiredOption()`

#### 特殊处理

- **list 命令**：有默认 action（list-specs）+ 子命令（specs/tags/apis/schemas），需要 `.passThroughOptions()`
- **call 命令**：需要 `.allowUnknownOption(true).allowExcessArguments(true)`，参数从 process.argv 提取
- **completion 命令**：argument 有默认值 `install`

### Phase 2: 重构主 CLI factory.ts

```typescript
import pontxSpec from "./specs/pontx.json";
import { registerCommandsFromSpec } from "./spec-loader";

function registerCommands(program, ctx, getManager, logger, binName, rootDir) {
  registerCommandsFromSpec(program, pontxSpec, {
    // shared commands
    "search": (keyword, opts) => searchCommand(ctx, keyword, opts),
    "show-api": (apiPath, opts) => showApiCommand(ctx, apiPath, opts),
    "show-schema": (schemaPath, opts) => showSchemaCommand(ctx, schemaPath, opts),
    "gen": (apiPath, opts) => genCommand(ctx, apiPath, opts),
    "list-cases": async () => { const m = await getManager(); await listCasesCommand(m); },
    "list-specs": (opts) => listSpecsCommand(ctx, opts),
    "list-tags": async (opts) => {
      const spec = await resolveSpecName(ctx, opts.spec);
      await listTagsCommand(ctx, spec, opts);
    },
    "list-apis": async (opts) => {
      const spec = await resolveSpecName(ctx, opts.spec);
      await listApisCommand(ctx, spec, opts.tag, opts);
    },
    "list-schemas": async (opts) => {
      const spec = await resolveSpecName(ctx, opts.spec);
      await listSchemasCommand(ctx, spec, opts);
    },
    "call": (apiPath, opts) => callCommand(ctx, apiPath, rawArgs, opts),
    "completion": (action, opts) => completionCommand(action, { ...opts, binName }),
    // project-only commands
    "init": (opts) => initCommand(rootDir, opts, logger),
    "check": async () => { const m = await getManager(); await checkCommand(m); },
    "generate": async (opts) => { /* ... */ },
    "mocks": async () => {},
    "service": async (opts) => { /* ... */ },
    "skill": (opts) => skillCommand(opts),
    "cache:clean": () => cleanCacheCommand(rootDir, logger),
    "add-spec": (sdkName, opts) => addSpecCommand(sdkName, opts),
    // sdk-management commands
    "cli-init": (opts) => cliInitCommand(opts),
    "cli-build": (opts) => cliBuildCommand(opts),
  }, {
    scope: ["shared", "project", "sdk-management"],
  });
}
```

### Phase 3: 重构 SDK CLI sdk/run-cli.ts

```typescript
import pontxSpec from "../specs/pontx.json";
import { registerCommandsFromSpec } from "../spec-loader";

function registerSdkCommands(program, config, specPath, binName) {
  const logger = createLogger("info", { prefix: "[sdk cli]" });
  const context = createSdkCliContext(config, specPath, logger);

  registerCommandsFromSpec(program, pontxSpec, {
    // 只需提供 shared scope 的命令处理函数
    "search": (keyword, opts) => searchCommand(context, keyword, opts),
    "show-api": (apiPath, opts) => showApiCommand(context, apiPath, opts),
    // ... 同上，但用 context 而非 ctx
  }, {
    scope: ["shared"],
    wrapAction: (name, fn) => async (...args) => {
      try {
        await fn(...args);
      } catch (error) {
        logger.error(`${name} 失败`, error);
        process.exit(1);
      }
    },
  });
}
```

### Phase 4: 清理

1. 删除 `sdk/list-commands.ts`（list 子命令注册已合并到 spec-loader）
2. 删除 `commands/list-commands.ts`（同上）
3. 统一选项名：所有命令使用 `--use-remote`
4. 统一 call 命令参数获取方式
5. 更新 rollup 配置，入口改为 `src/cli/index.ts` 等新路径
6. 更新 `package.json` exports 路径
7. 更新 `bin/init.cjs` 引用路径
8. 删除兼容性包装文件（`src/cli.ts`, `src/cli-factory.ts`, `src/cli-context.ts`, `src/sdk-cli/`）

### Phase 5: 扩展（可选）

1. **从 spec 生成补全数据**：CompletionEngine 可直接读取 `pontx.json` 的命令定义
2. **从 spec 生成 MCP tools**：`@pontx/mcp` 可从 spec 自动注册 CLI 命令为 MCP tool
3. **从 spec 生成文档**：自动生成 CLI 帮助文档
4. **spec 校验**：CI 中校验 `pontx.json` 与实际注册命令的一致性

## 预期收益

- **消除 ~250 行重复代码**（factory.ts + sdk/run-cli.ts 的共享命令注册）
- **消除 ~110 行重复代码**（list-commands.ts + sdk/list-commands.ts）
- **单一 source of truth**：`pontx.json` 定义所有命令，任何新增/修改只需改一处
- **SDK CLI 与主 CLI 保持一致**：不再因实现遗漏产生差异
