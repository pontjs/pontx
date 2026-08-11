/**
 * @author jasonHzq
 * @description Pontx CLI 动态质量评估的 case、adapter 与运行报告类型
 */

import type { PontxQualityReport, QualityFinding } from "@pontx/spec";

/** 动态测试风险等级 */
export enum EvalRisk {
  Normal = "normal",
  High = "high",
}

/** 动态失败归因，不参与评分。 */
export enum EvalAttribution {
  None = "none",
  MetadataOrContract = "metadata_or_contract",
  CliDiscovery = "cli_discovery",
  AgentOrCase = "agent_or_case",
}

/** 期望的结构化 HTTP 请求 */
export interface ExpectedRequest {
  method: string;
  path: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
}

/** 独立于待测 Metadata 的动态评估用例 */
export interface PontxEvalCase {
  id: string;
  task: string;
  locale?: string;
  risk?: EvalRisk;
  expected: {
    /** PontxSpec 中的 tag/apiName 或 apiName */
    api: string;
    request: ExpectedRequest;
    answerContains?: string[];
  };
  fixture: {
    status?: number;
    data: unknown;
    headers?: Record<string, string>;
  };
}

/** Agent 单次执行输入 */
export interface AgentRunInput {
  case: PontxEvalCase;
  specPath: string;
  specName: string;
  timeoutMs: number;
  /** 诊断模式允许 Agent 直接读取原始 PontxSpec。 */
  exposeRawSpec?: boolean;
}

/** Agent 单次执行原始结果 */
export interface AgentRunOutput {
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  finalText: string;
  commandCount: number;
}

/** 可替换的 Agent 执行适配器 */
export interface AgentAdapter {
  name: string;
  run(input: AgentRunInput): Promise<AgentRunOutput>;
}

/** 单个动态 case 的机器评分 */
export interface EvalCaseResult {
  id: string;
  api: string;
  score: number;
  attempts: number;
  variance: number;
  passed: boolean;
  attribution: EvalAttribution;
  findings: QualityFinding[];
  traces: Array<{
    score: number;
    exitCode: number | null;
    timedOut: boolean;
    commandCount: number;
    finalText: string;
  }>;
}

/** 全量动态评估结果 */
export interface DynamicEvaluationReport {
  score: number | null;
  deterministicCoverage: number;
  deterministicFindings: QualityFinding[];
  caseResults: EvalCaseResult[];
  adapter: string;
  runsPerCase: number;
}

/** quality 与 eval 命令最终输出 */
export interface PontxEvaluationReport extends PontxQualityReport {
  dynamic?: DynamicEvaluationReport;
}
