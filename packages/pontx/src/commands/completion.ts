/**
 * Completion Command
 *
 * Manages shell auto-completion for pontx CLI.
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
import { LOCK_FILENAME } from "../const";

/** Cached spec data for performance */
const specCache = new Map<string, any>();

/** Cached local config info */
let localConfigCache: {
  outDir: string;
  specNames: string[];
  singleSpecName?: string;
  hasTags?: boolean;
} | null = null;

/**
 * Try to find pontx.config.ts and extract outDir and spec names
 * This is a lightweight alternative to loading full PontxManager
 */
function tryLoadLocalConfig(cwd: string): {
  outDir: string;
  specNames: string[];
  singleSpecName?: string;
  hasTags?: boolean;
} | null {
  if (localConfigCache) {
    return localConfigCache;
  }

  // Look for pontx.config.ts
  const configPath = path.join(cwd, "pontx.config.ts");
  if (!fs.existsSync(configPath)) {
    return null;
  }

  // Try to find api-lock.json files in common output directories
  const possibleOutDirs = [
    path.join(cwd, "src", "services"),
    path.join(cwd, "src", "apis"),
    path.join(cwd, "src", "api"),
    path.join(cwd, "services"),
    path.join(cwd, "apis"),
    path.join(cwd, "api"),
    path.join(cwd, ".pontx"),
  ];

  for (const outDir of possibleOutDirs) {
    if (!fs.existsSync(outDir)) continue;

    try {
      const entries = fs.readdirSync(outDir, { withFileTypes: true });
      const specNames: string[] = [];

      // Check for spec subdirectories with api-lock.json
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const lockPath = path.join(outDir, entry.name, LOCK_FILENAME);
          if (fs.existsSync(lockPath)) {
            specNames.push(entry.name);
          }
        }
      }

      // Also check for api-lock.json directly in outDir (single spec)
      const directLockPath = path.join(outDir, LOCK_FILENAME);
      if (fs.existsSync(directLockPath) && specNames.length === 0) {
        specNames.push(""); // Empty name means single spec mode
      }

      if (specNames.length > 0) {
        // Determine if single spec mode and check hasTags
        let singleSpecName: string | undefined;
        let hasTags: boolean | undefined;

        if (specNames.length === 1) {
          singleSpecName = specNames[0];
          // Load spec to check if it has tags
          const spec = loadLocalSpec(outDir, singleSpecName);
          if (spec?.apis) {
            hasTags = Object.keys(spec.apis).some((key) => key.includes("/"));
          }
        }

        localConfigCache = { outDir, specNames, singleSpecName, hasTags };
        return localConfigCache;
      }
    } catch {
      // Ignore errors, continue trying other directories
    }
  }

  return null;
}

/**
 * Load spec from local api-lock.json file
 */
function loadLocalSpec(outDir: string, specName: string): any {
  const cacheKey = `local:${specName}`;
  if (specCache.has(cacheKey)) {
    return specCache.get(cacheKey);
  }

  const lockPath = specName
    ? path.join(outDir, specName, LOCK_FILENAME)
    : path.join(outDir, LOCK_FILENAME);

  try {
    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, "utf-8");
      const spec = JSON.parse(content);
      specCache.set(cacheKey, spec);
      return spec;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Create lightweight data source for completion
 * Reads spec files directly without loading PontxManager
 */
function createLightweightDataSource(cwd: string): CompletionDataSource {
  const localConfig = tryLoadLocalConfig(cwd);

  return {
    async getSpecs(): Promise<string[]> {
      const specs: string[] = [];

      // Local specs only
      if (localConfig) {
        specs.push(...localConfig.specNames.filter(Boolean));
      }

      return [...new Set(specs)];
    },

    async getTags(specName: string): Promise<string[]> {
      const spec = await loadSpec(specName);
      if (!spec?.apis) return [];

      const tags = new Set<string>();
      for (const apiKey of Object.keys(spec.apis)) {
        if (apiKey.includes("/")) {
          tags.add(apiKey.split("/")[0]);
        }
      }

      return [...tags].sort();
    },

    async getApis(
      specName: string,
      tagName?: string
    ): Promise<Array<{ name: string; description?: string }>> {
      const spec = await loadSpec(specName);
      if (!spec?.apis) return [];

      const apis: Array<{ name: string; description?: string }> = [];
      for (const [apiKey, api] of Object.entries(spec.apis)) {
        if (tagName) {
          if (apiKey.startsWith(`${tagName}/`)) {
            const name = apiKey.split("/")[1];
            apis.push({
              name,
              description: (api as any).summary || (api as any).description,
            });
          }
        } else {
          apis.push({
            name: apiKey,
            description: (api as any).summary || (api as any).description,
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
      const spec = await loadSpec(specName);
      if (!spec?.apis) return [];

      const apiKey = `${tagName}/${apiName}`;
      const api = spec.apis[apiKey] as any;
      if (!api?.parameters) return [];

      return api.parameters.map((p: any) => ({
        name: p.name,
        required: p.required || false,
        type: p.schema?.type || "string",
        description: p.description || p.schema?.description,
      }));
    },
  };

  async function loadSpec(specName: string): Promise<any> {
    // Try local only
    if (localConfig) {
      return loadLocalSpec(localConfig.outDir, specName);
    }

    return null;
  }
}

/**
 * Handle --get-completions request
 */
export async function handleCompletionRequest(
  line: string,
  wordIndex: number,
  format: string = "plain"
): Promise<void> {
  const cwd = process.cwd();
  const localConfig = tryLoadLocalConfig(cwd);
  const dataSource = createLightweightDataSource(cwd);

  // Build completion options with single spec mode support
  const completionOptions: any = { cwd };
  if (localConfig?.singleSpecName) {
    completionOptions.singleSpecName = localConfig.singleSpecName;
    completionOptions.hasTags = localConfig.hasTags;
  }

  const engine = new CompletionEngine(completionOptions, dataSource);

  const input = createCompletionInput(line, wordIndex);
  const result = await engine.complete(input);

  if (format === "zsh") {
    // Zsh format: "value:description"
    for (const s of result.suggestions) {
      console.log(s.description ? `${s.value}:${s.description}` : s.value);
    }
  } else if (format === "fish") {
    // Fish format: "value\tdescription"
    for (const s of result.suggestions) {
      console.log(s.description ? `${s.value}\t${s.description}` : s.value);
    }
  } else {
    // Plain format
    for (const s of result.suggestions) {
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
