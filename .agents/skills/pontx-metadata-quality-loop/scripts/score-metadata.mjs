#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ALLOWED_ARGS = new Set([
  "metadata-repo", "spec-module", "pontx-module", "dynamic-benchmark",
  "dynamic-adapter", "runs-per-case", "timeout-ms", "agent-binary",
  "agent-model", "agent-reasoning", "output",
]);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const name = key.slice(2);
    if (!ALLOWED_ARGS.has(name)) throw new Error(`Unknown argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`);
    result[name] = value;
    index += 1;
  }
  return result;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function grade(score, hasCritical) {
  let value = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "E";
  if (hasCritical && ["A", "B", "C"].includes(value)) value = "D";
  return value;
}

function positiveInteger(value, name, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

function hasRunEvidence(item) {
  if (item.attempts >= 3 && item.traces?.length >= 3) return true;
  return item.attempts === 0 && item.traces?.length === 0
    && item.attribution === "metadata_or_contract"
    && item.findings?.some((finding) => finding.ruleId === "dynamic.expected-api-missing");
}

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function discoverSpecModule(metadataRepo) {
  const candidates = [
    process.env.PONTX_SPEC_MODULE,
    path.resolve(metadataRepo, "../pontx/packages/spec/lib/index.js"),
    path.resolve(metadataRepo, "../../../pontx/packages/spec/lib/index.js"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  throw new Error("Cannot find built @pontx/spec. Pass --spec-module after running its build.");
}

async function loadLocales(collectionDir, parseOAS3, slug) {
  const localesDir = path.join(collectionDir, "locales");
  const locales = {};
  let entries = [];
  try {
    entries = await fs.readdir(localesDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(localesDir, entry.name, "openapi.json");
    if (!await isFile(filePath)) continue;
    locales[entry.name] = parseOAS3(JSON.parse(await fs.readFile(filePath, "utf8")), slug);
  }
  return locales;
}

async function scoreCollections(metadataRepo, specModule) {
  const { evaluatePontxQuality, parseOAS3 } = await import(pathToFileURL(specModule).href);
  if (typeof evaluatePontxQuality !== "function" || typeof parseOAS3 !== "function") {
    throw new Error("The spec module must export evaluatePontxQuality and parseOAS3");
  }
  const specsDir = path.join(metadataRepo, "specs");
  const entries = (await fs.readdir(specsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const collections = [];
  for (const entry of entries) {
    const sourcePath = path.join(specsDir, entry.name, "openapi.json");
    if (!await isFile(sourcePath)) continue;
    const source = parseOAS3(JSON.parse(await fs.readFile(sourcePath, "utf8")), entry.name);
    const locales = await loadLocales(path.dirname(sourcePath), parseOAS3, entry.name);
    const report = evaluatePontxQuality({ spec: source, defaultLocale: "zh-CN", locales });
    collections.push({ slug: entry.name, sourcePath, source, report });
  }
  return collections;
}

async function loadBenchmark(filePath, collectionSlugs) {
  const absolutePath = path.resolve(filePath);
  const contents = await fs.readFile(absolutePath);
  const benchmark = JSON.parse(contents.toString("utf8"));
  if (benchmark?.version !== 1 || !Array.isArray(benchmark.cases) || benchmark.cases.length === 0) {
    throw new Error("Dynamic benchmark must have version 1 and a non-empty cases array");
  }
  const ids = new Set();
  const cases = benchmark.cases.map((item, index) => {
    const { collection, ...evalCase } = item || {};
    if (!collectionSlugs.has(collection)) throw new Error(`Benchmark case ${index} references unknown collection: ${collection}`);
    if (!evalCase.id || ids.has(evalCase.id)) throw new Error(`Benchmark case ids must be non-empty and unique: ${evalCase.id}`);
    if (!evalCase.task || !evalCase.expected?.api || !evalCase.expected?.request?.method
      || !evalCase.expected?.request?.path || !evalCase.fixture
      || !Object.prototype.hasOwnProperty.call(evalCase.fixture, "data")) {
      throw new Error(`Benchmark case ${evalCase.id || index} is not a complete PontxEvalCase fixture`);
    }
    ids.add(evalCase.id);
    return { collection, evalCase };
  });
  return {
    path: absolutePath,
    hash: crypto.createHash("sha256").update(contents).digest("hex"),
    cases,
  };
}

async function runDynamic(collections, args) {
  if (!args["dynamic-benchmark"]) return null;
  if (!args["pontx-module"] || !args["dynamic-adapter"]) {
    throw new Error("Dynamic scoring requires --pontx-module and explicit --dynamic-adapter codex");
  }
  if (args["dynamic-adapter"] !== "codex") {
    throw new Error("Only the Pontx CodexAgentAdapter is accepted as dynamic score evidence");
  }
  const runsPerCase = positiveInteger(args["runs-per-case"], "runs-per-case", 3);
  if (runsPerCase < 3) throw new Error("Dynamic score evidence requires at least 3 runs per case");
  const timeoutMs = positiveInteger(args["timeout-ms"], "timeout-ms", 180_000);
  const pontxModulePath = path.resolve(args["pontx-module"]);
  const runtime = await import(pathToFileURL(pontxModulePath).href);
  if (typeof runtime.runDynamicEvaluation !== "function"
    || typeof runtime.mergeEvaluationReport !== "function"
    || typeof runtime.CodexAgentAdapter !== "function") {
    throw new Error("The Pontx module must export runDynamicEvaluation, mergeEvaluationReport, and CodexAgentAdapter");
  }
  const benchmark = await loadBenchmark(args["dynamic-benchmark"], new Set(collections.map((item) => item.slug)));
  const adapter = new runtime.CodexAgentAdapter({
    binary: args["agent-binary"],
    model: args["agent-model"],
    reasoning: args["agent-reasoning"],
  });
  if (adapter?.name !== "codex" || typeof adapter.run !== "function") {
    throw new Error("Pontx CodexAgentAdapter did not create a valid codex adapter");
  }
  const collectionResults = [];
  for (const collection of collections) {
    const cases = benchmark.cases
      .filter((item) => item.collection === collection.slug)
      .map((item) => item.evalCase);
    const dynamic = await runtime.runDynamicEvaluation({
      spec: collection.source,
      specPath: collection.sourcePath,
      cases,
      adapter,
      runsPerCase,
      timeoutMs,
    });
    const merged = runtime.mergeEvaluationReport(collection.report, dynamic);
    collectionResults.push({ slug: collection.slug, apiCount: collection.report.metadata.apiCount, dynamic, merged });
  }
  const caseResults = collectionResults.flatMap((item) => item.dynamic.caseResults
    .map((result) => ({ collection: item.slug, ...result })));
  const expectedIds = new Set(benchmark.cases.map((item) => item.evalCase.id));
  if (caseResults.length !== benchmark.cases.length
    || caseResults.some((item) => !expectedIds.has(item.id) || !hasRunEvidence(item))) {
    throw new Error("Dynamic evaluator returned incomplete or untraceable benchmark case results");
  }
  const apiCount = collectionResults.reduce((sum, item) => sum + item.apiCount, 0);
  const deterministicCoverage = apiCount
    ? collectionResults.reduce((sum, item) => sum + item.dynamic.deterministicCoverage * item.apiCount, 0) / apiCount
    : 0;
  return {
    score: round(caseResults.reduce((sum, item) => sum + item.score, 0) / caseResults.length),
    deterministicCoverage,
    deterministicFindings: collectionResults.flatMap((item) => item.dynamic.deterministicFindings
      .map((finding) => ({ collection: item.slug, ...finding }))),
    caseResults,
    adapter: adapter.name,
    runsPerCase,
    collectionResults,
    evidence: {
      valid: true,
      executed: true,
      adapter: "codex",
      benchmarkPath: benchmark.path,
      benchmarkHash: benchmark.hash,
      pontxModule: pontxModulePath,
      caseCount: benchmark.cases.length,
    },
  };
}

function aggregate(collections, dynamic) {
  const apiCount = collections.reduce((sum, item) => sum + item.report.metadata.apiCount, 0);
  if (!apiCount) throw new Error("No APIs found in metadata repository");
  const dimensions = new Map();
  const findings = [];
  const criticals = [];
  for (const { slug, report } of collections) {
    const weight = report.metadata.apiCount;
    for (const dimension of report.dimensions) {
      const current = dimensions.get(dimension.id) || {
        id: dimension.id, title: dimension.title, weight: dimension.weight,
        weightedScore: 0, checked: 0, passed: 0,
      };
      current.weightedScore += dimension.score * weight;
      current.checked += dimension.checked;
      current.passed += dimension.passed;
      dimensions.set(dimension.id, current);
    }
    for (const finding of report.findings) findings.push({ collection: slug, ...finding });
    for (const finding of report.criticals) criticals.push({ collection: slug, ...finding });
  }
  if (dynamic) {
    findings.push(...dynamic.deterministicFindings);
    for (const item of dynamic.caseResults) findings.push(...item.findings.map((finding) => ({ collection: item.collection, ...finding })));
    criticals.length = 0;
    criticals.push(...findings.filter((finding) => finding.severity === "critical"));
  }
  const dimensionReports = Array.from(dimensions.values()).map((dimension) => {
    const score = round(dimension.weightedScore / apiCount);
    return {
      id: dimension.id, title: dimension.title, weight: dimension.weight, score,
      coverage: dimension.weight ? round(score / dimension.weight) : 1,
      checked: dimension.checked, passed: dimension.passed,
    };
  });
  const staticScore = round(dimensionReports.reduce((sum, item) => sum + item.score, 0));
  const dynamicScore = dynamic?.score ?? null;
  const score = dynamicScore === null ? round(staticScore * 2) : round(staticScore + dynamicScore);
  const provisional = dynamic === null || dynamic.deterministicCoverage < 1
    || dynamic.collectionResults.some((item) => item.merged.provisional);
  return {
    score,
    grade: grade(score, criticals.length > 0),
    staticScore,
    dynamicScore,
    provisional,
    dimensions: dimensionReports,
    criticals,
    findings,
    coverage: dynamic ? { deterministic: dynamic.deterministicCoverage } : {},
    dynamic: dynamic ? {
      score: dynamic.score,
      deterministicCoverage: dynamic.deterministicCoverage,
      deterministicFindings: dynamic.deterministicFindings,
      caseResults: dynamic.caseResults,
      adapter: dynamic.adapter,
      runsPerCase: dynamic.runsPerCase,
      evidence: dynamic.evidence,
      collections: dynamic.collectionResults.map((item) => ({
        slug: item.slug,
        score: item.dynamic.score,
        deterministicCoverage: item.dynamic.deterministicCoverage,
        caseCount: item.dynamic.caseResults.length,
        provisional: item.merged.provisional,
      })),
    } : undefined,
    metadata: {
      collectionCount: collections.length, apiCount,
      schemaCount: collections.reduce((sum, item) => sum + item.report.metadata.schemaCount, 0),
      generatedAt: new Date().toISOString(),
    },
    collections: collections.map(({ slug, report }) => {
      const dynamicCollection = dynamic?.collectionResults.find((item) => item.slug === slug);
      return {
        slug, staticScore: report.staticScore, projectedScore: report.score,
        dynamicScore: dynamicCollection?.dynamic.score ?? null,
        score: dynamicCollection?.merged.score ?? report.score,
        grade: dynamicCollection?.merged.grade ?? report.grade,
        apiCount: report.metadata.apiCount,
        findingCount: dynamicCollection?.merged.findings?.length ?? report.findings.length,
        criticalCount: dynamicCollection?.merged.criticals?.length ?? report.criticals.length,
        dimensions: report.dimensions,
      };
    }),
  };
}

export async function scoreMetadata(args) {
  const metadataRepo = path.resolve(args["metadata-repo"] || process.cwd());
  const specModule = path.resolve(args["spec-module"] || await discoverSpecModule(metadataRepo));
  const collections = await scoreCollections(metadataRepo, specModule);
  return aggregate(collections, await runDynamic(collections, args));
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const report = await scoreMetadata(args);
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.output) await fs.writeFile(path.resolve(args.output), output);
  process.stdout.write(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
