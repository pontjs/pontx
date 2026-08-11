/**
 * @author jasonHzq
 * @description Codex 非交互 Agent adapter 与隔离的 Pontx CLI fixture 工作区
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AgentAdapter, AgentRunInput, AgentRunOutput, PontxEvalCase } from "./types";

/** Codex adapter 配置。 */
export interface CodexAdapterOptions {
  binary?: string;
  model?: string;
  reasoning?: string;
}

function resolveCodexBinary(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  const appBinary = "/Applications/ChatGPT.app/Contents/Resources/codex";
  return fs.existsSync(appBinary) ? appBinary : "codex";
}

function packageRoot(): string {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  return path.basename(directory) === "cjs" ? path.dirname(directory) : path.resolve(directory, "../..");
}

function runtimeFile(relativeWithoutExtension: string): string {
  const root = packageRoot();
  const candidates = [
    path.join(root, "lib", `${relativeWithoutExtension}.js`),
    path.join(root, "src", `${relativeWithoutExtension}.ts`),
  ];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) throw new Error(`Pontx runtime file not found: ${relativeWithoutExtension}`);
  return resolved;
}

function cliInvocation(): string {
  const cjsEntry = path.join(packageRoot(), "cjs", "cli.cjs");
  if (fs.existsSync(cjsEntry)) return `node ${JSON.stringify(cjsEntry)}`;
  const cliEntry = runtimeFile("cli");
  if (!cliEntry.endsWith(".ts")) return `node ${JSON.stringify(cliEntry)}`;
  const tsxLoader = createRequire(import.meta.url).resolve("tsx");
  return `node --import ${JSON.stringify(tsxLoader)} ${JSON.stringify(cliEntry)}`;
}

function fixtureConfig(item: PontxEvalCase, specName: string, marker: string): string {
  const executorPath = runtimeFile("builtin/apiExecutor");
  const expected = JSON.stringify(item.expected.request);
  const fixture = JSON.stringify(item.fixture);
  return `
import { buildApiRequest } from ${JSON.stringify(pathToFileURL(executorPath).href)};

const expected = ${expected};
const fixture = ${fixture};
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
};
const equal = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const entries = (headers) => {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));
};
const parseBody = (body) => {
  if (body === undefined) return undefined;
  if (typeof body !== "string") return body;
  try { return JSON.parse(body); } catch { return body; }
};

export default {
  outDir: "./out",
  origins: [{ name: ${JSON.stringify(specName)}, localPath: "./pontx-spec.json" }],
  executeApi: { baseURL: "https://pontx-eval.invalid" },
  plugins: [{
    name: "pontx-quality-fixture",
    async executeApi(context) {
      const request = await buildApiRequest(context);
      const url = new URL(request.url);
      const actualQuery = Object.fromEntries(url.searchParams.entries());
      const expectedQuery = Object.fromEntries(Object.entries(expected.query || {}).map(([key, value]) => [key, String(value)]));
      const actualHeaders = entries(request.init.headers);
      const errors = [];
      if (String(request.init.method).toUpperCase() !== String(expected.method).toUpperCase()) errors.push("method");
      if (url.pathname !== expected.path) errors.push("path");
      if (!equal(actualQuery, expectedQuery)) errors.push("query");
      for (const [key, value] of Object.entries(expected.headers || {})) {
        const actual = Object.entries(actualHeaders).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
        if (actual !== value) errors.push("header:" + key);
      }
      if (Object.prototype.hasOwnProperty.call(expected, "body") && !equal(parseBody(request.init.body), expected.body)) errors.push("body");
      if (errors.length) throw new Error("PONTX_EVAL_REQUEST_MISMATCH:" + errors.join(","));
      const data = fixture.data && typeof fixture.data === "object" && !Array.isArray(fixture.data)
        ? { ...fixture.data, __pontxEvalMarker: ${JSON.stringify(marker)} }
        : { value: fixture.data, __pontxEvalMarker: ${JSON.stringify(marker)} };
      return { status: fixture.status || 200, data, headers: fixture.headers || {} };
    }
  }]
};
`;
}

async function createEvalWorkspace(input: AgentRunInput, marker: string): Promise<string> {
  const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), "pontx-quality-"));
  await fsp.copyFile(input.specPath, path.join(workspace, "pontx-spec.json"));
  await fsp.writeFile(
    path.join(workspace, "pontx.config.ts"),
    fixtureConfig(input.case, input.specName, marker),
    "utf-8",
  );
  return workspace;
}

function commandCountFromJsonl(stdout: string): number {
  let count = 0;
  for (const line of stdout.split("\n")) {
    try {
      const event = JSON.parse(line);
      const type = event?.item?.type || event?.type;
      if (["command_execution", "command", "tool_call"].includes(type)) count++;
    } catch {}
  }
  return count;
}

function finalTextFromJsonl(stdout: string): string {
  let finalText = "";
  for (const line of stdout.split("\n")) {
    try {
      const event = JSON.parse(line);
      if (event?.type === "item.completed" && event?.item?.type === "agent_message" && typeof event.item.text === "string") {
        finalText = event.item.text;
      }
    } catch {}
  }
  return finalText;
}

function safeAgentEnvironment(): NodeJS.ProcessEnv {
  const allowed = [
    "PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "SHELL", "TERM",
    "OPENAI_API_KEY", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "SSL_CERT_FILE",
  ];
  return Object.fromEntries(allowed.flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]])) as NodeJS.ProcessEnv;
}

/** 使用 Codex exec 执行仅依赖 Pontx CLI 的动态任务。 */
export class CodexAgentAdapter implements AgentAdapter {
  readonly name = "codex";
  private readonly options: Required<Omit<CodexAdapterOptions, "binary">> & { binary: string };

  constructor(options: CodexAdapterOptions = {}) {
    this.options = {
      binary: resolveCodexBinary(options.binary),
      model: options.model || "gpt-5.6-terra",
      reasoning: options.reasoning || "medium",
    };
  }

  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    const marker = `case-${input.case.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const workspace = await createEvalWorkspace(input, marker);
    const cli = cliInvocation();
    const prompt = [
      input.exposeRawSpec
        ? "这是失败归因诊断。完成 API 调用任务；你可以直接读取 pontx-spec.json，也可以使用 Pontx CLI。"
        : "完成下面的 API 调用任务。你只能通过 Pontx CLI 发现和调用 API，不要读取工作区文件。",
      `CLI 命令前缀：${cli}`,
      "必须先查看帮助或 Metadata，再执行 --dry-run，确认后执行 fixture 调用。不要访问真实网络。",
      `任务：${input.case.task}`,
      "最后用简洁自然语言回答任务结果。",
    ].join("\n");
    const args = [
      "exec", "--model", this.options.model,
      "-c", `model_reasoning_effort=${JSON.stringify(this.options.reasoning)}`,
      "--sandbox", "read-only", "--ephemeral", "--ignore-user-config", "--ignore-rules",
      "--json", "-C", workspace, prompt,
    ];
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let exitCode: number | null = null;
    try {
      exitCode = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(this.options.binary, args, { cwd: workspace, env: safeAgentEnvironment() });
        child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
        child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
        child.on("error", reject);
        child.on("close", resolve);
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, input.timeoutMs);
        child.on("close", () => clearTimeout(timer));
      });
    } catch (error) {
      stderr += `Codex adapter failed: ${error instanceof Error ? error.message : String(error)}\n`;
    } finally {
      await fsp.rm(workspace, { recursive: true, force: true });
    }
    return {
      exitCode, timedOut, stdout, stderr,
      finalText: finalTextFromJsonl(stdout),
      commandCount: commandCountFromJsonl(stdout),
    };
  }
}
