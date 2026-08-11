/**
 * @author jasonHzq
 * @description 质量评估 JSON 输入加载与人类可读报告输出
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PontxQualityInput, PontxQualityReport, PontxSpec } from "@pontx/spec";
import type { PontxEvalCase } from "./types";

async function readJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** 加载 PontxSpec 和 locale 版本。 */
export async function loadQualityInput(
  specFile: string,
  localesDir?: string,
): Promise<PontxQualityInput> {
  const absoluteSpec = path.resolve(specFile);
  const spec = await readJson<PontxSpec>(absoluteSpec);
  const locales: Record<string, PontxSpec> = {};
  if (localesDir) {
    const absoluteLocales = path.resolve(localesDir);
    for (const entry of await fs.readdir(absoluteLocales, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        locales[path.basename(entry.name, ".json")] = await readJson<PontxSpec>(path.join(absoluteLocales, entry.name));
      } else if (entry.isDirectory()) {
        const sameName = path.join(absoluteLocales, entry.name, path.basename(absoluteSpec));
        try {
          locales[entry.name] = await readJson<PontxSpec>(sameName);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
        }
      }
    }
  }
  return { spec, defaultLocale: "zh-CN", locales };
}

/** 加载单个 JSON、JSON 数组或目录内的动态 cases。 */
export async function loadEvalCases(casesPath: string): Promise<PontxEvalCase[]> {
  const absolutePath = path.resolve(casesPath);
  const stat = await fs.stat(absolutePath);
  const files = stat.isDirectory()
    ? (await fs.readdir(absolutePath)).filter((name) => name.endsWith(".json")).sort().map((name) => path.join(absolutePath, name))
    : [absolutePath];
  const cases: PontxEvalCase[] = [];
  for (const file of files) {
    const value = await readJson<PontxEvalCase | PontxEvalCase[]>(file);
    cases.push(...(Array.isArray(value) ? value : [value]));
  }
  const ids = new Set<string>();
  for (const item of cases) {
    if (!item?.id || !item?.task || !item?.expected?.api || !item?.expected?.request || !item?.fixture) {
      throw new Error(`Invalid eval case: ${JSON.stringify(item)}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate eval case id: ${item.id}`);
    ids.add(item.id);
  }
  return cases;
}

/** 输出紧凑的人类可读质量摘要。 */
export function formatQualityReport(report: PontxQualityReport): string {
  const lines = [
    `Pontx Metadata Quality: ${report.score ?? "Invalid"} (${report.grade})${report.provisional ? " [provisional]" : ""}`,
    `Static: ${report.staticScore}/50  Dynamic: ${report.dynamicScore ?? "not run"}/50`,
    `APIs: ${report.metadata.apiCount}  Schemas: ${report.metadata.schemaCount}  Criticals: ${report.criticals.length}`,
    "",
  ];
  for (const dimension of report.dimensions) {
    lines.push(`${dimension.title}: ${dimension.score}/${dimension.weight} (${dimension.passed}/${dimension.checked || 0})`);
  }
  if (report.findings.length) {
    lines.push("", `Findings (${report.findings.length}):`);
    for (const finding of report.findings.slice(0, 30)) {
      lines.push(`- [${finding.severity}] ${finding.ruleId} ${finding.path}: ${finding.message}`);
    }
    if (report.findings.length > 30) lines.push(`- ... ${report.findings.length - 30} more`);
  }
  return lines.join("\n");
}
