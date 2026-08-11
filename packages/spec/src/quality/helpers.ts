/**
 * @author jasonHzq
 * @description PontxSpec 质量评分、约束、示例与国际化比较辅助函数
 */

import type { PontxJsonSchema } from "../schema.js";
import { QualityGrade } from "./types.js";

const PROSE_KEYS = new Set(["title", "summary", "description", "$comment"]);

export function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isExampleValid(schema: PontxJsonSchema, value: unknown): boolean {
  if (schema.enum?.length && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) return false;
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) return false;
  if (schema.type === "string") {
    if (typeof value !== "string") return false;
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern) {
      try { if (!new RegExp(schema.pattern).test(value)) return false; } catch { return false; }
    }
  }
  if (schema.type === "boolean" && typeof value !== "boolean") return false;
  if (schema.type === "integer" && !Number.isInteger(value)) return false;
  if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) return false;
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) return false;
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) return false;
  }
  return true;
}

export function constraintsAreConsistent(schema: PontxJsonSchema): boolean {
  if (schema.minimum !== undefined && schema.maximum !== undefined && schema.minimum > schema.maximum) return false;
  if (schema.exclusiveMinimum !== undefined && schema.exclusiveMaximum !== undefined
    && schema.exclusiveMinimum >= schema.exclusiveMaximum) return false;
  if (schema.minLength !== undefined && schema.maxLength !== undefined && schema.minLength > schema.maxLength) return false;
  if (schema.minItems !== undefined && schema.maxItems !== undefined && schema.minItems > schema.maxItems) return false;
  if (schema.enum && new Set(schema.enum.map((value) => JSON.stringify(value))).size !== schema.enum.length) return false;
  if (schema.required?.some((name) => !schema.properties?.[name])) return false;
  return true;
}

/** 计算 100 分制等级；Critical 存在时最高为 D。 */
export function getQualityGrade(score: number, hasCritical = false): QualityGrade {
  let grade = score >= 90 ? QualityGrade.A
    : score >= 80 ? QualityGrade.B
      : score >= 70 ? QualityGrade.C
        : score >= 60 ? QualityGrade.D
          : QualityGrade.E;
  if (hasCritical && [QualityGrade.A, QualityGrade.B, QualityGrade.C].includes(grade)) {
    grade = QualityGrade.D;
  }
  return grade;
}

export function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stableValue(record[key])]));
}

export function stripProse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProse);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (PROSE_KEYS.has(key)) continue;
    if (key === "enumValueTitles") {
      result[key] = Object.keys((record[key] || {}) as Record<string, unknown>).sort();
    } else {
      result[key] = stripProse(record[key]);
    }
  }
  return result;
}

export function collectProse(value: unknown, dataPath = "$"): Map<string, string> {
  const result = new Map<string, string>();
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      for (const [key, text] of collectProse(item, `${dataPath}[${index}]`)) result.set(key, text);
    });
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${dataPath}.${key}`;
    if (PROSE_KEYS.has(key) && isText(child)) result.set(childPath, child);
    if (key === "enumValueTitles" && child && typeof child === "object") {
      for (const [enumKey, title] of Object.entries(child as Record<string, unknown>)) {
        if (isText(title)) result.set(`${childPath}.${enumKey}`, title);
      }
    } else if (!PROSE_KEYS.has(key)) {
      for (const [nestedPath, text] of collectProse(child, childPath)) result.set(nestedPath, text);
    }
  }
  return result;
}
