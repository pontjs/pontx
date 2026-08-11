/**
 * @author jasonHzq
 * @description PontxSpec 质量评估的公共输入、报告与诊断类型
 */

import type { PontxDirectoryNode } from "../dir.js";
import type { PontxSpec } from "../spec.js";

/** 质量问题严重级别 */
export enum QualitySeverity {
  Info = "info",
  Warning = "warning",
  Error = "error",
  Critical = "critical",
}

/** 质量等级 */
export enum QualityGrade {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  Invalid = "Invalid",
}

/** 评估置信度 */
export enum QualityConfidence {
  Low = "low",
  Medium = "medium",
  High = "high",
}

/** 单条可定位的质量问题 */
export interface QualityFinding {
  ruleId: string;
  severity: QualitySeverity;
  path: string;
  message: string;
  remediation: string;
  locale?: string;
  affectedApis?: string[];
}

/** PontxSpec 质量评估输入 */
export interface PontxQualityInput {
  /** 默认语言 PontxSpec */
  spec: PontxSpec;
  /** 默认语言，默认 zh-CN */
  defaultLocale?: string;
  /** 其他语言的同构 PontxSpec */
  locales?: Record<string, PontxSpec>;
  /** 可选自定义目录；缺省时从 PontxSpec 派生 */
  directory?: PontxDirectoryNode[];
}

/** 单个评分维度 */
export interface QualityDimensionScore {
  id: string;
  title: string;
  weight: number;
  score: number;
  coverage: number;
  checked: number;
  passed: number;
}

/** 静态与动态评估共用报告 */
export interface PontxQualityReport {
  score: number | null;
  grade: QualityGrade;
  staticScore: number;
  dynamicScore: number | null;
  provisional: boolean;
  coverage: Record<string, number>;
  confidence: QualityConfidence;
  dimensions: QualityDimensionScore[];
  criticals: QualityFinding[];
  findings: QualityFinding[];
  metadata: {
    specName?: string;
    apiCount: number;
    schemaCount: number;
    locales: string[];
    generatedAt: string;
  };
}
