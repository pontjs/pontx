/**
 * @author jasonHzq
 * @description quality/eval 全局 CLI 命令注册与报告输出
 */

import * as path from "node:path";
import type { Command } from "commander";
import { evaluatePontxQuality } from "@pontx/spec";
import { CodexAgentAdapter } from "./codex-adapter";
import { formatQualityReport, loadEvalCases, loadQualityInput } from "./io";
import { mergeEvaluationReport, runDynamicEvaluation } from "./runner";
import { EvalRisk } from "./types";
import type { PontxEvalCase } from "./types";

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${option} must be a positive integer`);
  return parsed;
}

function isHighRiskCase(item: PontxEvalCase): boolean {
  const method = item.expected.request.method.toUpperCase();
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const auth = Object.keys(item.expected.request.headers || {}).some((name) => /authorization|api[-_]?key/i.test(name));
  const body = item.expected.request.body;
  const complexBody = !!body && typeof body === "object";
  return item.risk === EvalRisk.High || mutation || auth || complexBody;
}

/** 注册不依赖本地 pontx.config.ts 的 Metadata 质量命令。 */
export function registerQualityCommands(program: Command): void {
  program
    .command("quality")
    .description("评估 PontxSpec 静态 Metadata 质量（50 分，投影为 100 分）")
    .requiredOption("--spec <file>", "PontxSpec JSON 文件")
    .option("--locales <directory>", "locale PontxSpec 文件目录")
    .option("--json", "输出机器可读 JSON")
    .action(async (options) => {
      const input = await loadQualityInput(options.spec, options.locales);
      const report = evaluatePontxQuality(input);
      console.log(options.json ? JSON.stringify(report, null, 2) : formatQualityReport(report));
    });

  program
    .command("eval")
    .description("使用 Pontx CLI fixture 和 Agent 动态评估 Metadata")
    .requiredOption("--spec <file>", "PontxSpec JSON 文件")
    .requiredOption("--cases <path>", "eval case JSON 文件或目录")
    .option("--locales <directory>", "locale PontxSpec 文件目录")
    .option("--agent <name>", "Agent adapter", "codex")
    .option("--model <name>", "Codex model", "gpt-5.6-terra")
    .option("--reasoning <level>", "Codex reasoning effort", "medium")
    .option("--codex-bin <file>", "Codex 可执行文件；也可使用 CODEX_BIN")
    .option("--runs <count>", "每个 case 独立运行次数", "1")
    .option("--timeout <milliseconds>", "单次 Agent 超时", "180000")
    .option("--changed <api>", "仅运行变更 API，同时保留 high-risk cases", collect, [])
    .option("--json", "输出机器可读 JSON")
    .action(async (options) => {
      if (options.agent !== "codex") throw new Error(`Unsupported agent adapter: ${options.agent}`);
      const specPath = path.resolve(options.spec);
      const input = await loadQualityInput(specPath, options.locales);
      const staticReport = evaluatePontxQuality(input);
      let cases = await loadEvalCases(options.cases);
      const changed = new Set<string>(options.changed || []);
      if (changed.size) {
        cases = cases.filter((item) => changed.has(item.expected.api) || isHighRiskCase(item));
      }
      const dynamic = await runDynamicEvaluation({
        spec: input.spec,
        specPath,
        cases,
        adapter: new CodexAgentAdapter({
          binary: options.codexBin,
          model: options.model,
          reasoning: options.reasoning,
        }),
        runsPerCase: positiveInteger(options.runs, "--runs"),
        timeoutMs: positiveInteger(options.timeout, "--timeout"),
      });
      const report = mergeEvaluationReport(staticReport, dynamic);
      console.log(options.json ? JSON.stringify(report, null, 2) : formatQualityReport(report));
    });
}
