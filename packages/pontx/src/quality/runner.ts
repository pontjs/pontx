/**
 * @author jasonHzq
 * @description 动态 case 调度、机器评分与静态/动态报告合并
 */

import {
  getQualityGrade,
  QualityConfidence,
  QualityFinding,
  QualitySeverity,
  type PontxQualityReport,
  type PontxSpec,
} from "@pontx/spec";
import { validatePontxCliCompatibility } from "./deterministic";
import { EvalAttribution } from "./types";
import type {
  AgentAdapter,
  DynamicEvaluationReport,
  EvalCaseResult,
  PontxEvalCase,
  PontxEvaluationReport,
} from "./types";

function scoreAttempt(item: PontxEvalCase, output: Awaited<ReturnType<AgentAdapter["run"]>>): {
  score: number;
  called: boolean;
  findings: QualityFinding[];
} {
  const trace = `${output.stdout}\n${output.stderr}`;
  const markerPattern = new RegExp(`case-${item.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-`);
  const called = markerPattern.test(trace);
  const dryRunIndex = trace.indexOf("Dry run - request not sent");
  const callIndex = trace.search(markerPattern);
  const explored = /\b(search|show-api|show-schema|list apis)\b/.test(trace) || /\s-h\b/.test(trace);
  const answerPassed = (item.expected.answerContains || []).every((text) => output.finalText.includes(text));
  const safe = called && dryRunIndex >= 0 && dryRunIndex < callIndex && output.commandCount <= 12;
  let score = 0;
  if (explored) score += 8;
  if (called) score += 7;
  if (called && dryRunIndex >= 0) score += 15;
  else if (called) score += 10;
  if (called) score += 10;
  if (called && answerPassed && output.finalText.trim()) score += 5;
  if (safe) score += 5;
  const findings: QualityFinding[] = [];
  if (!called) findings.push({
    ruleId: "dynamic.fixture-call", severity: QualitySeverity.Error, path: `eval:${item.id}`,
    message: "Agent 未通过 fixture 完成正确调用。", remediation: "检查 API 可发现性、参数描述、examples 和 CLI 参数映射。",
    affectedApis: [item.expected.api],
  });
  if (called && dryRunIndex < 0) findings.push({
    ruleId: "dynamic.dry-run", severity: QualitySeverity.Critical, path: `eval:${item.id}`,
    message: "Agent 未先执行 dry-run。", remediation: "强化 Metadata 中的副作用描述和 Agent Skill 安全流程。",
    affectedApis: [item.expected.api],
  });
  if (output.timedOut || output.exitCode !== 0) findings.push({
    ruleId: "dynamic.agent", severity: QualitySeverity.Warning, path: `eval:${item.id}`,
    message: output.timedOut ? "Agent 执行超时。" : `Agent 进程退出码为 ${output.exitCode}。`,
    remediation: "检查 Codex 配置、CLI 可执行性和 case 超时设置。", affectedApis: [item.expected.api],
  });
  return { score, called, findings };
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

/** 运行确定性校验和 Agent cases。 */
export async function runDynamicEvaluation(options: {
  spec: PontxSpec;
  specPath: string;
  cases: PontxEvalCase[];
  adapter: AgentAdapter;
  runsPerCase?: number;
  timeoutMs?: number;
}): Promise<DynamicEvaluationReport> {
  const deterministic = await validatePontxCliCompatibility(options.spec);
  const runs = Math.max(1, options.runsPerCase || 1);
  const caseResults: EvalCaseResult[] = [];
  for (const item of options.cases) {
    if (!options.spec.apis?.[item.expected.api]) {
      const finding: QualityFinding = {
        ruleId: "dynamic.expected-api-missing", severity: QualitySeverity.Critical,
        path: `eval:${item.id}`, message: `Golden case 需要的 API ${item.expected.api} 不存在。`,
        remediation: "补回权威用例要求的 API，或在确认上游下线后更新独立 golden case。",
        affectedApis: [item.expected.api],
      };
      caseResults.push({
        id: item.id, api: item.expected.api, score: 0, attempts: 0, variance: 0,
        passed: false, attribution: EvalAttribution.MetadataOrContract,
        findings: [finding], traces: [],
      });
      continue;
    }
    const scores: number[] = [];
    const findings: QualityFinding[] = [];
    const traces: EvalCaseResult["traces"] = [];
    let calledAtLeastOnce = false;
    for (let attempt = 0; attempt < runs; attempt++) {
      const output = await options.adapter.run({
        case: item, specPath: options.specPath, specName: options.spec.name,
        timeoutMs: options.timeoutMs || 180_000,
      });
      const result = scoreAttempt(item, output);
      calledAtLeastOnce ||= result.called;
      scores.push(result.score);
      findings.push(...result.findings);
      traces.push({
        score: result.score, exitCode: output.exitCode, timedOut: output.timedOut,
        commandCount: output.commandCount, finalText: output.finalText,
      });
    }
    let attribution = EvalAttribution.None;
    if (!calledAtLeastOnce) {
      const diagnosticOutput = await options.adapter.run({
        case: item, specPath: options.specPath, specName: options.spec.name,
        timeoutMs: options.timeoutMs || 180_000, exposeRawSpec: true,
      });
      const diagnostic = scoreAttempt(item, diagnosticOutput);
      if (diagnostic.called) {
        attribution = EvalAttribution.CliDiscovery;
      } else if (deterministic.findings.some((finding) => finding.affectedApis?.includes(item.expected.api))) {
        attribution = EvalAttribution.MetadataOrContract;
      } else {
        attribution = EvalAttribution.AgentOrCase;
      }
    }
    const score = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    caseResults.push({
      id: item.id, api: item.expected.api, score, attempts: runs,
      variance: variance(scores), passed: score >= 40, attribution, findings, traces,
    });
  }
  return {
    score: caseResults.length ? caseResults.reduce((sum, item) => sum + item.score, 0) / caseResults.length : null,
    deterministicCoverage: deterministic.coverage,
    deterministicFindings: deterministic.findings,
    caseResults,
    adapter: options.adapter.name,
    runsPerCase: runs,
  };
}

/** 合并静态 50 分和动态 50 分。 */
export function mergeEvaluationReport(
  staticReport: PontxQualityReport,
  dynamic: DynamicEvaluationReport,
): PontxEvaluationReport {
  const dynamicScore = dynamic.score === null ? null : Math.round(dynamic.score * 100) / 100;
  const score = dynamicScore === null ? null : Math.round((staticReport.staticScore + dynamicScore) * 100) / 100;
  const dynamicFindings = [
    ...dynamic.deterministicFindings,
    ...dynamic.caseResults.flatMap((item) => item.findings),
  ];
  const findings = [...staticReport.findings, ...dynamicFindings];
  const criticals = findings.filter((finding) => finding.severity === QualitySeverity.Critical);
  const provisional = dynamic.runsPerCase < 3 || dynamic.deterministicCoverage < 1;
  return {
    ...staticReport,
    score,
    grade: score === null ? staticReport.grade : getQualityGrade(score, criticals.length > 0),
    dynamicScore,
    provisional,
    confidence: dynamic.runsPerCase >= 3 ? QualityConfidence.High : QualityConfidence.Medium,
    findings,
    criticals,
    coverage: { ...staticReport.coverage, deterministic: dynamic.deterministicCoverage },
    dynamic,
  };
}
