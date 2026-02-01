/**
 * Completion Command
 *
 * Manages shell auto-completion for pontx CLI.
 *
 * 使用持久化 manifest 缓存提升性能：
 * - 缓存 API 完整信息（name, title, description, params）
 * - 基于 mtime 做增量更新
 * - 并行读取多个 spec 文件
 * - 读取真实 config 获取 outDir（支持自定义配置）
 */

import * as fs from "fs";
import * as path from "path";
import {
  ShellCompletionGenerator,
  ShellType,
  CompletionEngine,
  CompletionDataSource,
  createCompletionInput,
  ParamInfo,
} from "../completion";
import { loadManifest, SpecEntry } from "../completion/manifest";

/**
 * 创建基于 manifest 的数据源
 * 直接从缓存的 manifest 中读取数据，避免文件 I/O
 */
function createManifestDataSource(specs: SpecEntry[]): CompletionDataSource {
  // 构建 specName -> SpecEntry 的映射
  const specMap = new Map<string, SpecEntry>();
  for (const spec of specs) {
    specMap.set(spec.name, spec);
  }

  return {
    async getSpecs(): Promise<string[]> {
      return specs.map((s) => s.name).filter(Boolean);
    },

    async getSpecsWithDesc(): Promise<
      Array<{ name: string; description?: string }>
    > {
      return specs
        .filter((s) => s.name)
        .map((s) => ({
          name: s.name,
          description: s.description,
        }));
    },

    async getTags(specName: string): Promise<string[]> {
      const spec = specMap.get(specName);
      if (!spec) return [];

      // 优先使用缓存的 tags
      if (spec.tags && spec.tags.length > 0) {
        return spec.tags.map((t) => t.name);
      }

      // fallback: 从 APIs 中提取
      const tags = new Set<string>();
      for (const api of spec.apis) {
        if (api.name.includes("/")) {
          tags.add(api.name.split("/")[0]);
        }
      }

      return [...tags].sort();
    },

    async getTagsWithDesc(
      specName: string
    ): Promise<Array<{ name: string; description?: string }>> {
      const spec = specMap.get(specName);
      if (!spec) return [];

      // 优先使用缓存的 tags（包含描述）
      if (spec.tags && spec.tags.length > 0) {
        return spec.tags;
      }

      // fallback: 从 APIs 中提取（无描述）
      const tags = new Set<string>();
      for (const api of spec.apis) {
        if (api.name.includes("/")) {
          tags.add(api.name.split("/")[0]);
        }
      }

      return [...tags].sort().map((name) => ({ name }));
    },

    async getApis(
      specName: string,
      tagName?: string
    ): Promise<Array<{ name: string; description?: string }>> {
      const spec = specMap.get(specName);
      if (!spec) return [];

      const apis: Array<{ name: string; description?: string }> = [];

      for (const api of spec.apis) {
        if (tagName) {
          if (api.name.startsWith(`${tagName}/`)) {
            const name = api.name.split("/")[1];
            apis.push({
              name,
              description: api.title,
            });
          }
        } else {
          apis.push({
            name: api.name,
            description: api.title,
          });
        }
      }

      return apis.sort((a, b) => a.name.localeCompare(b.name));
    },

    async getParams(
      specName: string,
      tagName: string,
      apiName: string
    ): Promise<ParamInfo[]> {
      const spec = specMap.get(specName);
      if (!spec) return [];

      const apiKey = tagName ? `${tagName}/${apiName}` : apiName;
      const api = spec.apis.find((a) => a.name === apiKey);
      if (!api) return [];

      return api.params.map((p) => ({
        name: p.name,
        required: p.required,
        type: p.type,
        description: p.description,
        enum: p.enum,
        in: p.in,
      }));
    },
  };
}

/**
 * Handle --get-completions request
 *
 * 使用 manifest 缓存加速补全：
 * 1. 加载 manifest（自动读取 config 获取 outDir，或 fallback 扫描）
 * 2. 使用缓存的 API 数据创建数据源
 */
export async function handleCompletionRequest(
  line: string,
  wordIndex: number,
  format: string = "plain"
): Promise<void> {
  const cwd = process.cwd();

  // 加载 manifest（包含自动读取 config 和 fallback 逻辑）
  const manifestResult = await loadManifest(cwd);
  const dataSource = createManifestDataSource(manifestResult.specs);

  // 构建 completion 选项
  const completionOptions: any = { cwd };

  // 确定 single spec mode
  if (manifestResult.specs.length === 1) {
    const spec = manifestResult.specs[0];
    completionOptions.singleSpecName = spec.name;
    // 检查是否有 tags
    completionOptions.hasTags = spec.apis.some((api) =>
      api.name.includes("/")
    );
  }

  const engine = new CompletionEngine(completionOptions, dataSource);

  const input = createCompletionInput(line, wordIndex);
  const result = await engine.complete(input);

  if (format === "zsh") {
    // Zsh format: "value:description"
    for (const s of result.suggestions) {
      if (!s.value?.trim()) continue; // Skip empty values
      const desc = s.description?.replace(/\n/g, ' ').trim() || '';
      console.log(desc ? `${s.value}:${desc}` : s.value);
    }
  } else if (format === "fish") {
    // Fish format: "value\tdescription"
    for (const s of result.suggestions) {
      if (!s.value?.trim()) continue; // Skip empty values
      const desc = s.description?.replace(/\n/g, ' ').trim() || '';
      console.log(desc ? `${s.value}\t${desc}` : s.value);
    }
  } else {
    // Plain format
    for (const s of result.suggestions) {
      if (!s.value?.trim()) continue; // Skip empty values
      console.log(s.value);
    }
  }
}

/**
 * Completion command action
 */
export async function completionCommand(
  action: string,
  options: { shell?: string; output?: string; binName?: string }
): Promise<void> {
  const generator = new ShellCompletionGenerator();
  const shell = (options.shell ||
    ShellCompletionGenerator.detectShell() ||
    "bash") as ShellType;

  const binName = options.binName || "pontx";
  const scriptOptions = {
    binName,
  };

  switch (action) {
    case "generate": {
      const script = generator.generate(shell, scriptOptions);

      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, script, "utf-8");
        console.log(`Completion script written to: ${outputPath}`);
      } else {
        console.log(script);
      }
      break;
    }

    case "install": {
      const instructions = generator.getInstallInstructions(shell, binName);
      console.log(`\n${shell.toUpperCase()} Completion Installation:\n`);
      console.log(instructions);
      break;
    }

    case "uninstall": {
      console.log(`\nTo uninstall ${shell} completion:\n`);
      console.log(
        `Remove the ${binName} completion line from your shell configuration file.`
      );
      break;
    }

    default:
      console.error(`Unknown action: ${action}`);
      console.log("Available actions: install, generate, uninstall");
      process.exit(1);
  }
}
