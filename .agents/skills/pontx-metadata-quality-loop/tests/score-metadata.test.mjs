import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(testDir, "../scripts/score-metadata.mjs");

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function fixtureWorkspace() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-dynamic-score-"));
  const metadata = path.join(directory, "metadata");
  write(path.join(metadata, "specs/alpha/openapi.json"), "{}\n");
  const report = {
    score: 90,
    grade: "A",
    staticScore: 45,
    dynamicScore: null,
    provisional: true,
    confidence: "medium",
    dimensions: [{ id: "contract", title: "Contract", weight: 50, score: 45, checked: 1, passed: 1 }],
    findings: [],
    criticals: [],
    coverage: {},
    metadata: { apiCount: 1, schemaCount: 0 },
  };
  const specModule = path.join(directory, "spec.mjs");
  write(specModule, `
export const parseOAS3 = (_value, slug) => ({ name: slug, apis: { "common/get": {} } });
export const evaluatePontxQuality = () => (${JSON.stringify(report)});
`);
  const pontxModule = path.join(directory, "pontx.mjs");
  write(pontxModule, `
export class CodexAgentAdapter {
  name = "codex";
  async run() { throw new Error("the runner stub owns test execution"); }
}
export async function runDynamicEvaluation(options) {
  const caseResults = options.cases.map((item) => ({
    id: item.id, api: item.expected.api, score: 50, attempts: options.runsPerCase,
    variance: 0, passed: true, attribution: "none", findings: [],
    traces: Array.from({ length: options.runsPerCase }, () => ({ score: 50 }))
  }));
  return {
    score: caseResults.length ? 50 : null,
    deterministicCoverage: 1,
    deterministicFindings: [],
    caseResults,
    adapter: options.adapter.name,
    runsPerCase: options.runsPerCase
  };
}
export function mergeEvaluationReport(report, dynamic) {
  return {
    ...report,
    score: dynamic.score === null ? null : report.staticScore + dynamic.score,
    dynamicScore: dynamic.score,
    provisional: dynamic.deterministicCoverage < 1 || dynamic.runsPerCase < 3,
    dynamic
  };
}
`);
  const benchmark = path.join(directory, "benchmark.json");
  write(benchmark, `${JSON.stringify({
    version: 1,
    cases: [{
      collection: "alpha",
      id: "alpha-get",
      task: "read alpha",
      expected: { api: "common/get", request: { method: "GET", path: "/alpha" } },
      fixture: { status: 200, data: { ok: true } },
    }],
  }, null, 2)}\n`);
  return { directory, metadata, specModule, pontxModule, benchmark };
}

function candidateRegistry(options = {}) {
  const revision = "a".repeat(40);
  const product = {
    slug: "example-cloud",
    name: { zh: "示例云 API", en: "Example Cloud API" },
    provider: "Example Cloud",
    category: "Cloud",
    priority: { group: "eligible-review", rank: 1, score: 80 },
    boundary: {
      zh: "示例云公开管理 API 的完整产品边界，不包含独立计费产品。",
      en: "The complete public administration API boundary, excluding the separately defined billing product.",
    },
    stage: "audit-required",
    admissionDecision: "not-approved",
    gateStatus: {
      authority: "passed",
      redistribution: "passed",
      contract: "passed",
      transport: "passed",
      risk: "pending",
      sdkCli: "pending",
    },
    contractSource: {
      kind: "openapi",
      url: `https://raw.githubusercontent.com/example/api/${revision}/openapi.json`,
      revision,
      observedAt: "2026-08-01",
      license: "Apache-2.0",
      observedOperations: 12,
    },
    evidence: [
      { kind: "docs", url: "https://docs.example.com/api/reference" },
      { kind: "spec", url: `https://raw.githubusercontent.com/example/api/${revision}/openapi.json` },
      { kind: "license", url: `https://github.com/example/api/blob/${revision}/LICENSE` },
    ],
    blockers: [
      {
        gate: "risk",
        zh: "仍需完成高影响写接口的执行风险分级。",
        en: "Execution-risk classification is still required for high-impact mutations.",
      },
      {
        gate: "sdkCli",
        zh: "仍需构建、测试并发布声明版本的 SDK 与 CLI。",
        en: "The declared SDK and CLI versions still need to be built, tested, and published.",
      },
    ],
    nextAction: {
      zh: "完成写接口风险审查，并发布经过验证的 SDK 与 CLI。",
      en: "Complete mutation risk review and publish the verified SDK and CLI.",
    },
    verifiedAt: "2026-08-01",
    ...options.product,
  };
  return {
    version: 1,
    snapshotDate: "2026-08-14",
    sourceRoadmap: "catalog/api-collection-growth-priority.md",
    admissionPolicy: {
      zh: "候选记录只有在全部准入门槛通过后才可进入正式目录。",
      en: "Candidate records enter the formal catalog only after every admission gate passes.",
    },
    products: [product],
    ...options.registry,
  };
}

function writeCandidateRegistry(fixture, registry = candidateRegistry(), sourceSlugs = []) {
  write(path.join(fixture.metadata, "catalog/api-collection-candidates.json"),
    `${JSON.stringify(registry, null, 2)}\n`);
  write(path.join(fixture.metadata, "catalog/api-collection-growth-priority.md"), "# Growth roadmap\n");
  write(path.join(fixture.metadata, "catalog/source.json"),
    `${JSON.stringify({ apis: sourceSlugs.map((slug) => ({ slug })) }, null, 2)}\n`);
}

function resolveSchema(spec, schema) {
  if (!schema?.$ref?.startsWith("#/")) return schema;
  return schema.$ref.slice(2).split("/").reduce((value, segment) => value?.[segment], spec);
}

function assertSchemaValue(spec, unresolvedSchema, value, pointer) {
  const schema = resolveSchema(spec, unresolvedSchema);
  assert.ok(schema, `Unresolved response schema at ${pointer}`);
  if (schema.type === "array") assert.ok(Array.isArray(value), `${pointer} must be an array`);
  if (schema.type === "object") assert.ok(value && typeof value === "object" && !Array.isArray(value), `${pointer} must be an object`);
  if (schema.type === "string") assert.equal(typeof value, "string", `${pointer} must be a string`);
  if (schema.type === "number") assert.equal(typeof value, "number", `${pointer} must be a number`);
  if (schema.type === "integer") assert.ok(Number.isInteger(value), `${pointer} must be an integer`);
  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${pointer} must be a boolean`);
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => assertSchemaValue(spec, schema.items, item, `${pointer}/${index}`));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      assert.ok(Object.prototype.hasOwnProperty.call(value, required), `${pointer}/${required} is required`);
    }
    for (const [name, propertySchema] of Object.entries(schema.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, name)) {
        assertSchemaValue(spec, propertySchema, value[name], `${pointer}/${name}`);
      }
    }
  }
}

test("runs an explicit independent benchmark and reports executed dynamic evidence", () => {
  const fixture = fixtureWorkspace();
  const output = execFileSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--spec-module", fixture.specModule,
    "--pontx-module", fixture.pontxModule,
    "--dynamic-benchmark", fixture.benchmark,
    "--dynamic-adapter", "codex",
  ], { encoding: "utf8" });
  const report = JSON.parse(output);
  assert.equal(report.staticScore, 45);
  assert.equal(report.dynamicScore, 50);
  assert.equal(report.score, 95);
  assert.equal(report.provisional, false);
  assert.equal(report.dynamic.runsPerCase, 3);
  assert.equal(report.dynamic.caseResults[0].attempts, 3);
  assert.equal(report.dynamic.caseResults[0].traces.length, 3);
  assert.equal(report.coverage.deterministic, 1);
  assert.match(report.dynamic.evidence.benchmarkHash, /^[a-f0-9]{64}$/);
  assert.equal(report.dynamic.evidence.executed, true);
});

test("checked-in golden fixtures conform to their independent response schemas", () => {
  const benchmark = JSON.parse(fs.readFileSync(path.resolve(testDir, "../benchmarks/smoke.json"), "utf8"));
  for (const item of benchmark.cases) {
    assert.ok(item.expected.responseSchema, `No independent response schema for ${item.id}`);
    assertSchemaValue({}, item.expected.responseSchema, item.fixture.data, `benchmark:${item.id}#/fixture/data`);
  }
});

test("does not accept a benchmark hash as a substitute for execution", () => {
  const fixture = fixtureWorkspace();
  const result = spawnSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--spec-module", fixture.specModule,
    "--benchmark-hash", "claimed-only",
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown argument: --benchmark-hash/);
});

test("requires at least three runs and an explicit supported adapter", () => {
  const fixture = fixtureWorkspace();
  const result = spawnSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--spec-module", fixture.specModule,
    "--pontx-module", fixture.pontxModule,
    "--dynamic-benchmark", fixture.benchmark,
    "--dynamic-adapter", "fixture",
    "--runs-per-case", "1",
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Only the Pontx CodexAgentAdapter/);

  const tooFewRuns = spawnSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--spec-module", fixture.specModule,
    "--pontx-module", fixture.pontxModule,
    "--dynamic-benchmark", fixture.benchmark,
    "--dynamic-adapter", "codex",
    "--runs-per-case", "1",
  ], { encoding: "utf8" });
  assert.notEqual(tooFewRuns.status, 0);
  assert.match(tooFewRuns.stderr, /at least 3 runs per case/);
});

test("reports a high-quality candidate registry independently without changing formal OAS scoring", () => {
  const fixture = fixtureWorkspace();
  writeCandidateRegistry(fixture);
  const formal = JSON.parse(execFileSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--spec-module", fixture.specModule,
  ], { encoding: "utf8" }));
  assert.equal(formal.scoreMode, "static");
  assert.equal(formal.staticScore, 45);
  assert.equal(formal.score, 90);
  assert.equal(formal.findings.length, 0);
  assert.equal(formal.candidateRegistry.present, true);
  assert.equal(formal.candidateRegistry.candidateScore, 50);
  assert.equal(formal.candidateRegistry.findings.length, 0);

  const candidate = JSON.parse(execFileSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--candidate-registry-only",
  ], { encoding: "utf8" }));
  assert.equal(candidate.scoreMode, "candidate-registry");
  assert.equal(candidate.score, 50);
  assert.equal(candidate.candidateScore, 50);
  assert.equal(candidate.maxScore, 50);
  assert.equal(candidate.dimensions.reduce((sum, item) => sum + item.weight, 0), 50);
  assert.equal(candidate.findings.length, 0);
});

test("candidate registry findings expose reproducibility, consistency, localization, freshness, and isolation defects", () => {
  const fixture = fixtureWorkspace();
  const registry = candidateRegistry({
    product: {
      boundary: { zh: "API", en: "" },
      stage: "audit-required",
      admissionDecision: "approved",
      gateStatus: {
        authority: "passed",
        redistribution: "passed",
        contract: "passed",
        transport: "blocked",
        risk: "pending",
        sdkCli: "pending",
      },
      contractSource: {
        kind: "openapi",
        url: "https://api.example.com/openapi.json",
        mutableSource: true,
        observedAt: "2025-01-01",
        license: "review-required",
        observedOperations: 0,
      },
      evidence: [
        { kind: "docs", url: "https://explinks.com/example" },
        { kind: "docs", url: "https://explinks.com/example" },
      ],
      blockers: [],
      nextAction: { zh: "待定", en: "TBD" },
      verifiedAt: "2025-01-01",
    },
  });
  writeCandidateRegistry(fixture, registry, ["example-cloud"]);
  const report = JSON.parse(execFileSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--candidate-registry-only",
  ], { encoding: "utf8" }));
  const ruleIds = new Set(report.findings.map((finding) => finding.ruleId));
  assert.ok(report.candidateScore < 50);
  assert.ok(ruleIds.has("candidate.boundary.localized"));
  assert.ok(ruleIds.has("candidate.action.localized"));
  assert.ok(ruleIds.has("candidate.evidence.authoritative"));
  assert.ok(ruleIds.has("candidate.evidence.diversity"));
  assert.ok(ruleIds.has("candidate.contract.immutable"));
  assert.ok(ruleIds.has("candidate.gate.stage"));
  assert.ok(ruleIds.has("candidate.gate.blocker"));
  assert.ok(ruleIds.has("candidate.freshness.verified"));
  assert.ok(ruleIds.has("candidate.admission.decision"));
  assert.ok(ruleIds.has("candidate.admission.overlap"));
  assert.ok(report.criticals.some((finding) => finding.ruleId === "candidate.admission.overlap"));
});

test("metadata repositories without a candidate registry remain valid historical formal-score inputs", () => {
  const fixture = fixtureWorkspace();
  const formal = JSON.parse(execFileSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--spec-module", fixture.specModule,
  ], { encoding: "utf8" }));
  assert.equal(formal.scoreMode, "static");
  assert.equal(formal.staticScore, 45);
  assert.equal(formal.score, 90);
  assert.deepEqual(formal.candidateRegistry, {
    present: false,
    path: path.join(fixture.metadata, "catalog/api-collection-candidates.json"),
  });

  const candidate = JSON.parse(execFileSync(process.execPath, [script,
    "--metadata-repo", fixture.metadata,
    "--candidate-registry-only",
  ], { encoding: "utf8" }));
  assert.equal(candidate.scoreMode, "candidate-registry");
  assert.equal(candidate.candidateScore, 0);
  assert.equal(candidate.dimensions.reduce((sum, item) => sum + item.weight, 0), 50);
  assert.ok(candidate.criticals.some((item) => item.ruleId === "candidate.registry.missing"));
});
