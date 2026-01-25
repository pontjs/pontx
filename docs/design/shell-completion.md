# Pontx Shell Completion 技术设计方案

## 1. 概述

### 1.1 目标

为 pontx CLI 提供 Bash/Zsh/Fish 自动补全能力，并设计可复用的架构，使未来的代理 CLI（如 `yuque call tagName.apiName`）能够零成本复用补全逻辑。

### 1.2 设计原则

1. **核心逻辑集中** - 补全引擎与 shell 脚本生成分离
2. **数据源统一** - 复用现有的 spec 加载和解析逻辑
3. **代理友好** - 通过配置参数支持 specName 固定场景
4. **性能优先** - 支持缓存，避免每次补全都加载完整 spec

---

## 2. 架构设计

### 2.1 模块结构

```
packages/pontx/src/
├── completion/
│   ├── index.ts              # 导出入口
│   ├── engine.ts             # 补全引擎核心
│   ├── context.ts            # 补全上下文（解析当前输入状态）
│   ├── providers/            # 补全数据提供者
│   │   ├── command.ts        # 命令补全
│   │   ├── spec.ts           # specName 补全
│   │   ├── api.ts            # tagName/apiName 补全
│   │   └── param.ts          # 参数名补全
│   ├── shell/                # Shell 脚本生成
│   │   ├── generator.ts      # 脚本生成器
│   │   ├── bash.ts           # Bash 模板
│   │   ├── zsh.ts            # Zsh 模板
│   │   └── fish.ts           # Fish 模板
│   └── cache.ts              # 补全缓存
```

### 2.2 核心类图

```
┌─────────────────────────────────────────────────────────────────┐
│                      CompletionEngine                            │
├─────────────────────────────────────────────────────────────────┤
│ - options: CompletionOptions                                     │
│ - cache: CompletionCache                                         │
│ - providers: CompletionProvider[]                                │
├─────────────────────────────────────────────────────────────────┤
│ + complete(input: CompletionInput): Promise<CompletionResult[]>  │
│ + getCommands(): string[]                                        │
│ + getSpecs(): Promise<string[]>                                  │
│ + getTags(specName: string): Promise<string[]>                   │
│ + getApis(specName: string, tag?: string): Promise<string[]>     │
│ + getParams(specName: string, apiPath: string): Promise<Param[]> │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CompletionProvider                           │
├─────────────────────────────────────────────────────────────────┤
│ + canHandle(context: CompletionContext): boolean                 │
│ + provide(context: CompletionContext): Promise<Suggestion[]>     │
└─────────────────────────────────────────────────────────────────┘
         ▲           ▲              ▲             ▲
         │           │              │             │
    ┌────┴────┐ ┌────┴────┐  ┌─────┴─────┐ ┌─────┴─────┐
    │Command  │ │  Spec   │  │    API    │ │   Param   │
    │Provider │ │Provider │  │  Provider │ │  Provider │
    └─────────┘ └─────────┘  └───────────┘ └───────────┘
```

---

## 3. 接口定义

### 3.1 核心选项

```typescript
/**
 * 补全引擎配置
 */
interface CompletionOptions {
  /**
   * 固定的 specName（代理 CLI 模式）
   * - 设置后，specName 补全会被跳过
   * - API path 补全会自动省略 specName 前缀
   */
  fixedSpecName?: string;

  /**
   * 工作目录（用于加载本地 pontx.config.ts）
   */
  cwd?: string;

  /**
   * 是否包含全局 specs
   * @default true
   */
  includeGlobal?: boolean;

  /**
   * 要暴露的命令列表（用于代理 CLI 裁剪命令）
   * @default 全部命令
   */
  commands?: string[];

  /**
   * 缓存 TTL（毫秒）
   * @default 60000 (1分钟)
   */
  cacheTTL?: number;
}
```

### 3.2 补全输入与输出

```typescript
/**
 * 补全输入（从 shell 传入）
 */
interface CompletionInput {
  /** 当前完整命令行 */
  line: string;

  /** 光标位置（字符索引） */
  cursor: number;

  /** 当前单词索引（COMP_CWORD） */
  wordIndex: number;

  /** 分词后的数组（COMP_WORDS） */
  words: string[];
}

/**
 * 补全建议
 */
interface CompletionSuggestion {
  /** 补全值 */
  value: string;

  /** 显示描述（用于 zsh/fish） */
  description?: string;

  /** 补全类型（用于分组显示） */
  type?: 'command' | 'spec' | 'tag' | 'api' | 'param' | 'value';
}

/**
 * 补全结果
 */
interface CompletionResult {
  /** 补全建议列表 */
  suggestions: CompletionSuggestion[];

  /** 是否需要添加空格后缀 */
  addSpace?: boolean;
}
```

### 3.3 补全上下文

```typescript
/**
 * 补全上下文（解析当前输入状态）
 */
interface CompletionContext {
  /** 当前命令（如 'call', 'search'） */
  command?: string;

  /** 当前正在补全的位置 */
  position: 'command' | 'argument' | 'option' | 'option-value';

  /** 已解析的 API path 部分 */
  apiPath?: {
    specName?: string;
    tagName?: string;
    apiName?: string;
    /** 正在输入的部分 */
    partial: string;
    /** 正在补全哪个部分 */
    completing: 'spec' | 'tag' | 'api';
  };

  /** 当前选项（如 '--env'） */
  currentOption?: string;

  /** 已提供的选项 */
  providedOptions: Set<string>;

  /** 原始输入 */
  input: CompletionInput;
}
```

---

## 4. 补全场景分析

### 4.1 pontx CLI 补全场景

| 输入 | 补全位置 | 补全内容 |
|------|---------|---------|
| `pontx <TAB>` | command | `call`, `search`, `show-api`, ... |
| `pontx call <TAB>` | spec | `petstore`, `yuque`, ... |
| `pontx call pet<TAB>` | spec (partial) | `petstore` |
| `pontx call petstore.<TAB>` | tag | `pet`, `store`, `user` |
| `pontx call petstore.pet.<TAB>` | api | `addPet`, `getPetById`, ... |
| `pontx call petstore.pet.getPetById <TAB>` | param | `--petId`, `--debug`, ... |
| `pontx call petstore.pet.getPetById --<TAB>` | param | `petId`, `debug`, ... |
| `pontx call api -e <TAB>` | env-value | `dev`, `prod`, `staging` |
| `pontx search <TAB>` | (无建议，等待用户输入关键词) | - |
| `pontx --global <TAB>` | global-spec | 全局已注册的 spec 包名 |

### 4.2 代理 CLI 补全场景（以 yuque 为例）

假设 `fixedSpecName: 'yuque'`：

| 输入 | 补全位置 | 补全内容 |
|------|---------|---------|
| `yuque <TAB>` | command | `call`, `search`, `show-api` |
| `yuque call <TAB>` | tag | `doc`, `repo`, `user` |
| `yuque call doc.<TAB>` | api | `read`, `list`, `create` |
| `yuque call doc.read <TAB>` | param | `--id`, `--slug`, ... |

**关键区别**：
- 跳过 specName 补全
- API path 从 tag 开始

---

## 5. 补全引擎实现

### 5.1 上下文解析

```typescript
// completion/context.ts

export function parseCompletionContext(
  input: CompletionInput,
  options: CompletionOptions
): CompletionContext {
  const { words, wordIndex } = input;

  // words[0] 是命令名（pontx 或 yuque）
  const command = words[1]; // 子命令

  // 判断当前补全位置
  if (wordIndex === 1) {
    return { position: 'command', input, providedOptions: new Set() };
  }

  // 解析选项和参数
  const { options: parsedOptions, args } = parseWordsToOptionsAndArgs(words.slice(2));

  // 当前单词
  const currentWord = words[wordIndex] || '';

  // 判断是否在补全选项
  if (currentWord.startsWith('-')) {
    return {
      position: 'option',
      command,
      input,
      providedOptions: parsedOptions,
    };
  }

  // 判断是否在补全选项值
  const prevWord = words[wordIndex - 1];
  if (prevWord?.startsWith('-') && needsValue(prevWord)) {
    return {
      position: 'option-value',
      command,
      currentOption: prevWord,
      input,
      providedOptions: parsedOptions,
    };
  }

  // 补全参数（如 API path）
  if (command === 'call' || command === 'show-api' || command === 'gen') {
    const apiPath = parsePartialApiPath(currentWord, options.fixedSpecName);
    return {
      position: 'argument',
      command,
      apiPath,
      input,
      providedOptions: parsedOptions,
    };
  }

  return {
    position: 'argument',
    command,
    input,
    providedOptions: parsedOptions,
  };
}

/**
 * 解析部分输入的 API path
 */
function parsePartialApiPath(
  partial: string,
  fixedSpecName?: string
): CompletionContext['apiPath'] {
  const parts = parseDotSeparatedPath(partial);

  if (fixedSpecName) {
    // 代理模式：path 从 tag 开始
    // 输入: "doc.re" => { tag: "doc", partial: "re", completing: "api" }
    // 输入: "doc." => { tag: "doc", partial: "", completing: "api" }
    // 输入: "do" => { partial: "do", completing: "tag" }

    if (partial.includes('.')) {
      const lastDotIndex = partial.lastIndexOf('.');
      const beforeDot = partial.slice(0, lastDotIndex);
      const afterDot = partial.slice(lastDotIndex + 1);

      return {
        specName: fixedSpecName,
        tagName: beforeDot,
        partial: afterDot,
        completing: 'api',
      };
    }

    return {
      specName: fixedSpecName,
      partial,
      completing: 'tag',
    };
  }

  // 标准模式：path 从 spec 开始
  // 输入: "petstore.pet.get" => { spec: "petstore", tag: "pet", partial: "get", completing: "api" }
  // 输入: "petstore.pet." => { spec: "petstore", tag: "pet", partial: "", completing: "api" }
  // 输入: "petstore." => { spec: "petstore", partial: "", completing: "tag" }
  // 输入: "pet" => { partial: "pet", completing: "spec" }

  if (parts.length >= 2 && partial.endsWith('.')) {
    // 输入以 . 结尾，补全下一级
    if (parts.length === 2) {
      return {
        specName: parts[0],
        tagName: parts[1],
        partial: '',
        completing: 'api',
      };
    }
    return {
      specName: parts[0],
      partial: '',
      completing: 'tag',
    };
  }

  if (parts.length === 3) {
    return {
      specName: parts[0],
      tagName: parts[1],
      partial: parts[2],
      completing: 'api',
    };
  }

  if (parts.length === 2) {
    return {
      specName: parts[0],
      partial: parts[1],
      completing: 'tag',
    };
  }

  return {
    partial: parts[0] || '',
    completing: 'spec',
  };
}
```

### 5.2 补全引擎

```typescript
// completion/engine.ts

export class CompletionEngine {
  private options: CompletionOptions;
  private cache: CompletionCache;
  private providers: CompletionProvider[];

  constructor(options: CompletionOptions = {}) {
    this.options = {
      includeGlobal: true,
      cacheTTL: 60000,
      ...options,
    };

    this.cache = new CompletionCache(this.options.cacheTTL);
    this.providers = this.initProviders();
  }

  private initProviders(): CompletionProvider[] {
    return [
      new CommandProvider(this.options),
      new SpecProvider(this.options),
      new ApiProvider(this.options),
      new ParamProvider(this.options),
    ];
  }

  /**
   * 主入口：根据输入生成补全建议
   */
  async complete(input: CompletionInput): Promise<CompletionResult> {
    const context = parseCompletionContext(input, this.options);

    for (const provider of this.providers) {
      if (provider.canHandle(context)) {
        const suggestions = await provider.provide(context, this.cache);
        return { suggestions, addSpace: true };
      }
    }

    return { suggestions: [] };
  }

  /**
   * 获取可用命令列表
   */
  getCommands(): string[] {
    const allCommands = [
      'call', 'search', 'show-api', 'show-schema', 'gen',
      'list-templates', 'check', 'ls', 'generate', 'mocks',
      'service', 'global',
    ];

    if (this.options.commands) {
      return allCommands.filter(cmd => this.options.commands!.includes(cmd));
    }

    return allCommands;
  }

  /**
   * 获取可用 specs（考虑 fixedSpecName）
   */
  async getSpecs(): Promise<string[]> {
    if (this.options.fixedSpecName) {
      return []; // 代理模式不需要 spec 补全
    }

    return this.cache.getOrLoad('specs', async () => {
      const specs: string[] = [];

      // 本地 specs
      const localManager = await this.tryGetLocalManager();
      if (localManager) {
        specs.push(...localManager.resolvedConfig.origins.map(o => o.name));
      }

      // 全局 specs
      if (this.options.includeGlobal) {
        const globalSpecs = await listGlobalSpecs();
        specs.push(...globalSpecs.map(s => s.entry.specName));
      }

      return [...new Set(specs)]; // 去重
    });
  }

  /**
   * 获取 spec 下的 tags
   */
  async getTags(specName: string): Promise<string[]> {
    const cacheKey = `tags:${specName}`;

    return this.cache.getOrLoad(cacheKey, async () => {
      const spec = await this.loadSpec(specName);
      if (!spec) return [];

      // 从 apis 中提取 tags
      const tags = new Set<string>();
      for (const apiKey of Object.keys(spec.apis)) {
        if (apiKey.includes('/')) {
          tags.add(apiKey.split('/')[0]);
        }
      }

      return [...tags].sort();
    });
  }

  /**
   * 获取 tag 下的 APIs
   */
  async getApis(specName: string, tagName?: string): Promise<string[]> {
    const cacheKey = `apis:${specName}:${tagName || '*'}`;

    return this.cache.getOrLoad(cacheKey, async () => {
      const spec = await this.loadSpec(specName);
      if (!spec) return [];

      const apis: string[] = [];
      for (const [apiKey, api] of Object.entries(spec.apis)) {
        if (tagName) {
          if (apiKey.startsWith(`${tagName}/`)) {
            apis.push(apiKey.split('/')[1]);
          }
        } else {
          apis.push(apiKey);
        }
      }

      return apis.sort();
    });
  }

  /**
   * 获取 API 的参数列表
   */
  async getParams(specName: string, tagName: string, apiName: string): Promise<ParamInfo[]> {
    const cacheKey = `params:${specName}:${tagName}:${apiName}`;

    return this.cache.getOrLoad(cacheKey, async () => {
      const spec = await this.loadSpec(specName);
      if (!spec) return [];

      const apiKey = tagName ? `${tagName}/${apiName}` : apiName;
      const api = spec.apis[apiKey];
      if (!api?.parameters) return [];

      return api.parameters.map(p => ({
        name: p.name,
        required: p.required || false,
        type: p.schema?.type || 'string',
        description: p.description || p.schema?.description,
      }));
    });
  }

  /**
   * 加载 spec（带缓存）
   */
  private async loadSpec(specName: string): Promise<PontxSpec | null> {
    const targetSpecName = this.options.fixedSpecName || specName;
    const cacheKey = `spec:${targetSpecName}`;

    return this.cache.getOrLoad(cacheKey, async () => {
      // 优先本地
      const localManager = await this.tryGetLocalManager();
      if (localManager) {
        const origin = localManager.resolvedConfig.origins.find(
          o => o.name === targetSpecName
        );
        if (origin?.spec) {
          return origin.spec;
        }
      }

      // 全局
      const globalSpec = await findGlobalSpecByName(targetSpecName);
      if (globalSpec) {
        const manager = await createManagerFromGlobalSpec(globalSpec.packageName);
        return manager.resolvedConfig.origins[0]?.spec || null;
      }

      return null;
    });
  }

  private async tryGetLocalManager(): Promise<PontxManager | null> {
    try {
      const cwd = this.options.cwd || process.cwd();
      return await PontxManager.constructorFromRootDir(cwd);
    } catch {
      return null;
    }
  }
}
```

### 5.3 补全提供者示例

```typescript
// completion/providers/api.ts

export class ApiProvider implements CompletionProvider {
  constructor(private options: CompletionOptions) {}

  canHandle(context: CompletionContext): boolean {
    const apiCommands = ['call', 'show-api', 'gen'];
    return (
      context.position === 'argument' &&
      apiCommands.includes(context.command || '') &&
      context.apiPath !== undefined
    );
  }

  async provide(
    context: CompletionContext,
    cache: CompletionCache
  ): Promise<CompletionSuggestion[]> {
    const { apiPath } = context;
    if (!apiPath) return [];

    const engine = new CompletionEngine(this.options);
    const { completing, partial, specName, tagName } = apiPath;

    let candidates: string[] = [];
    let prefix = '';

    switch (completing) {
      case 'spec':
        candidates = await engine.getSpecs();
        break;

      case 'tag':
        if (specName) {
          candidates = await engine.getTags(specName);
          prefix = this.options.fixedSpecName ? '' : `${specName}.`;
        }
        break;

      case 'api':
        if (specName && tagName) {
          candidates = await engine.getApis(specName, tagName);
          prefix = this.options.fixedSpecName
            ? `${tagName}.`
            : `${specName}.${tagName}.`;
        }
        break;
    }

    // 过滤并添加前缀
    return candidates
      .filter(c => c.toLowerCase().startsWith(partial.toLowerCase()))
      .map(c => ({
        value: prefix + c,
        type: completing as CompletionSuggestion['type'],
      }));
  }
}
```

---

## 6. Shell 脚本生成

### 6.1 生成器接口

```typescript
// completion/shell/generator.ts

interface ShellScriptOptions {
  /** 命令名（pontx / yuque） */
  binName: string;

  /** 固定的 specName（代理模式） */
  fixedSpecName?: string;

  /** 支持的命令 */
  commands?: string[];
}

export class ShellCompletionGenerator {
  /**
   * 生成 Bash 补全脚本
   */
  generateBash(options: ShellScriptOptions): string {
    return bashTemplate(options);
  }

  /**
   * 生成 Zsh 补全脚本
   */
  generateZsh(options: ShellScriptOptions): string {
    return zshTemplate(options);
  }

  /**
   * 生成 Fish 补全脚本
   */
  generateFish(options: ShellScriptOptions): string {
    return fishTemplate(options);
  }

  /**
   * 生成安装说明
   */
  getInstallInstructions(shell: 'bash' | 'zsh' | 'fish', binName: string): string {
    // ...
  }
}
```

### 6.2 Bash 模板

```typescript
// completion/shell/bash.ts

export function bashTemplate(options: ShellScriptOptions): string {
  const { binName } = options;

  return `
# ${binName} completion script for Bash
# Generated by pontx completion:generate

_${binName}_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local line="\${COMP_LINE}"
  local point="\${COMP_POINT}"

  # 调用 CLI 获取补全建议
  local completions
  completions=$("${binName}" --get-completions "\$line" "\$COMP_CWORD" 2>/dev/null)

  if [[ $? -eq 0 ]]; then
    COMPREPLY=($(compgen -W "\$completions" -- "\$cur"))
  fi
}

complete -F _${binName}_completions ${binName}
`.trim();
}
```

### 6.3 Zsh 模板

```typescript
// completion/shell/zsh.ts

export function zshTemplate(options: ShellScriptOptions): string {
  const { binName } = options;

  return `
#compdef ${binName}
# ${binName} completion script for Zsh
# Generated by pontx completion:generate

_${binName}() {
  local line="\${words[*]}"
  local cursor="\${CURRENT}"

  # 调用 CLI 获取补全建议（带描述）
  local completions
  completions=("\${(@f)$("${binName}" --get-completions "\$line" "\$cursor" --format=zsh 2>/dev/null)}")

  if [[ \${#completions[@]} -gt 0 ]]; then
    _describe '${binName} completions' completions
  fi
}

compdef _${binName} ${binName}
`.trim();
}
```

---

## 7. CLI 集成

### 7.1 新增命令

```typescript
// cli.ts 新增

program
  .option('--get-completions <line> <index>', '(internal) Get shell completions')
  .option('--format <format>', 'Output format for completions', 'plain');

// 在 parseAsync 之前处理补全
if (process.argv.includes('--get-completions')) {
  handleCompletionRequest().then(() => process.exit(0));
} else {
  program.parseAsync(process.argv);
}

async function handleCompletionRequest() {
  const args = process.argv;
  const lineIndex = args.indexOf('--get-completions');
  const line = args[lineIndex + 1];
  const wordIndex = parseInt(args[lineIndex + 2], 10);
  const format = args.includes('--format')
    ? args[args.indexOf('--format') + 1]
    : 'plain';

  const engine = new CompletionEngine({ cwd: process.cwd() });
  const input: CompletionInput = {
    line,
    cursor: line.length,
    wordIndex,
    words: line.split(/\s+/),
  };

  const result = await engine.complete(input);

  if (format === 'zsh') {
    // Zsh 格式: "value:description"
    for (const s of result.suggestions) {
      console.log(s.description ? `${s.value}:${s.description}` : s.value);
    }
  } else {
    // Plain 格式
    for (const s of result.suggestions) {
      console.log(s.value);
    }
  }
}
```

### 7.2 补全管理命令

```typescript
// cli.ts

program
  .command('completion')
  .description('管理 shell 自动补全')
  .argument('[action]', 'install | generate | uninstall', 'install')
  .option('--shell <shell>', 'Shell 类型: bash | zsh | fish')
  .option('--output <path>', '输出脚本到文件')
  .action(async (action, options) => {
    const { completionCommand } = await import('./commands/completion');
    await completionCommand(action, options);
  });
```

---

## 8. 代理 CLI 复用

### 8.1 代理 CLI 集成方式

```typescript
// @pontx/cli-proxy (未来新增)

export interface ProxyCliOptions {
  binName: string;
  specName: string;
  packageRoot: string;
  commands?: string[];
}

export function createProxyCli(options: ProxyCliOptions): Command {
  const program = new Command(options.binName);

  // 配置补全引擎
  const completionOptions: CompletionOptions = {
    fixedSpecName: options.specName,
    cwd: options.packageRoot,
    commands: options.commands,
    includeGlobal: false, // 代理模式不需要全局查找
  };

  // 添加 --get-completions 支持
  program.option('--get-completions <line> <index>');

  // 处理补全请求
  program.hook('preAction', async (thisCommand) => {
    if (process.argv.includes('--get-completions')) {
      await handleProxyCompletion(completionOptions);
      process.exit(0);
    }
  });

  // 添加 completion 命令
  program
    .command('completion')
    .description('管理 shell 自动补全')
    .argument('[action]', 'install | generate', 'install')
    .option('--shell <shell>', 'bash | zsh | fish')
    .action(async (action, opts) => {
      const generator = new ShellCompletionGenerator();
      const script = generator.generateBash({
        binName: options.binName,
        fixedSpecName: options.specName,
        commands: options.commands,
      });
      // ... 安装或输出脚本
    });

  // 代理其他命令到 pontx 核心逻辑
  // ...

  return program;
}
```

### 8.2 使用示例

```javascript
// yuque/bin/yuque.cjs
const { createProxyCli } = require('@pontx/cli-proxy');
const path = require('path');

createProxyCli({
  binName: 'yuque',
  specName: 'yuque',
  packageRoot: path.resolve(__dirname, '..'),
  commands: ['call', 'search', 'show-api'],
}).parseAsync();
```

用户安装补全：
```bash
yuque completion install --shell=zsh
```

补全效果：
```bash
yuque call <TAB>       # 显示: doc, repo, user (tags)
yuque call doc.<TAB>   # 显示: read, list, create (apis)
```

---

## 9. 缓存策略

### 9.1 缓存结构

```typescript
// completion/cache.ts

interface CacheEntry<T> {
  value: T;
  expireAt: number;
}

export class CompletionCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ttl: number;

  constructor(ttl: number = 60000) {
    this.ttl = ttl;
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);

    if (entry && entry.expireAt > Date.now()) {
      return entry.value;
    }

    const value = await loader();
    this.cache.set(key, {
      value,
      expireAt: Date.now() + this.ttl,
    });

    return value;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 9.2 缓存 Key 设计

| Key 模式 | 示例 | 说明 |
|---------|------|------|
| `specs` | `specs` | 所有可用 spec 名称 |
| `spec:{name}` | `spec:petstore` | spec 完整数据 |
| `tags:{spec}` | `tags:petstore` | spec 下的所有 tags |
| `apis:{spec}:{tag}` | `apis:petstore:pet` | tag 下的所有 APIs |
| `params:{spec}:{tag}:{api}` | `params:petstore:pet:getPetById` | API 参数 |

---

## 10. 性能优化

### 10.1 延迟加载

- spec 数据按需加载，不预加载所有 specs
- 使用 `tryGetLocalManager()` 静默处理本地配置不存在的情况

### 10.2 并行加载

当需要同时补全多个来源时（如本地 + 全局 specs），使用 `Promise.all` 并行加载。

### 10.3 响应时间目标

| 场景 | 目标响应时间 |
|------|------------|
| 命令补全 | < 10ms |
| spec 名称补全（有缓存） | < 50ms |
| spec 名称补全（无缓存） | < 200ms |
| API path 补全（有缓存） | < 50ms |
| API path 补全（无缓存） | < 300ms |

---

## 11. 复用性总结

| 组件 | pontx CLI | 代理 CLI (如 yuque) | 复用方式 |
|------|-----------|-------------------|---------|
| `CompletionEngine` | ✅ 直接使用 | ✅ 传入 `fixedSpecName` | 100% 复用 |
| `CompletionCache` | ✅ | ✅ | 100% 复用 |
| `CompletionProvider` | ✅ | ✅ | 100% 复用 |
| `parseCompletionContext` | ✅ | ✅ 自动处理 specName 省略 | 100% 复用 |
| Shell 脚本模板 | ✅ | ✅ 只需改 `binName` | 95% 复用 |
| `--get-completions` 处理 | ✅ | ✅ 由 proxy 自动注入 | 100% 复用 |
| `completion` 命令 | ✅ | ✅ 由 proxy 自动提供 | 100% 复用 |

**核心复用点**：
1. `fixedSpecName` 参数统一处理 spec 固定场景
2. `commands` 参数支持命令裁剪
3. Shell 脚本通过模板生成，只需替换 `binName`
4. `--get-completions` 协议统一，代理 CLI 无需额外实现

---

## 12. 实施计划

### Phase 1: 核心补全引擎
- [ ] 实现 `CompletionEngine` 核心类
- [ ] 实现 `CompletionContext` 解析
- [ ] 实现各类 `CompletionProvider`
- [ ] 实现 `CompletionCache`

### Phase 2: CLI 集成
- [ ] 添加 `--get-completions` 支持
- [ ] 添加 `pontx completion` 命令
- [ ] 实现 Bash/Zsh/Fish 脚本生成

### Phase 3: 测试与优化
- [ ] 单元测试覆盖核心逻辑
- [ ] 性能测试与优化
- [ ] 真实 shell 环境测试

### Phase 4: 代理 CLI 支持（未来）
- [ ] 实现 `@pontx/cli-proxy` 包
- [ ] 验证补全复用
- [ ] 文档和示例
