import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(testDir, "../scripts/quality-loop-state.mjs");

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function report(score, options = {}) {
  return {
    score: score * 2,
    staticScore: score,
    dynamicScore: null,
    dimensions: [
      { id: "contract", score: options.contract ?? 8 },
      { id: "examples", score: options.examples ?? 5 },
    ],
    criticals: Array.from({ length: options.criticals || 0 }, () => ({})),
    findings: Array.from({ length: options.findings || 0 }, () => ({})),
  };
}

function dynamicReport(score, caseResults) {
  const cases = caseResults.map((item) => ({
    attempts: 3,
    traces: [{}, {}, {}],
    ...item,
  }));
  return {
    ...report(45),
    score,
    dynamicScore: score - 45,
    provisional: false,
    coverage: { deterministic: 1 },
    dynamic: {
      runsPerCase: 3,
      evidence: {
        valid: true,
        executed: true,
        adapter: "codex",
        benchmarkHash: "bench-1",
        caseCount: cases.length,
      },
      caseResults: cases,
    },
  };
}

function run(cwd, ...args) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
  }));
}

function initialize(directory, baselineScore = 40) {
  const baseline = path.join(directory, "baseline.json");
  const state = path.join(directory, "state.json");
  writeJson(baseline, report(baselineScore));
  run(directory, "init", "--state", state, "--baseline", baseline,
    "--metadata-commit", "base", "--evaluator-commit", "eval-1",
    "--benchmark-hash", "bench-1", "--runtime-hash", "node-22");
  return state;
}

function assess(directory, state, candidateReport, commit = "candidate") {
  const candidate = path.join(directory, `${commit}.json`);
  const gates = path.join(directory, `${commit}-gates.json`);
  writeJson(candidate, candidateReport);
  writeJson(gates, { passed: true, checks: [{ name: "metadata", passed: true, exitCode: 0 }] });
  return run(directory, "assess", "--state", state, "--candidate", candidate, "--gates", gates,
    "--candidate-commit", commit, "--candidate-branch", `quality/${commit}`,
    "--evaluator-commit", "eval-1", "--benchmark-hash", "bench-1",
    "--runtime-hash", "node-22");
}

test("accepts a strict score improvement and updates baseline only after merge", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  const decision = assess(directory, statePath, report(40.5));
  assert.equal(decision.decision, "accept");
  assert.equal(run(directory, "status", "--state", statePath).acceptedMetadataCommit, "base");
  const finalized = run(directory, "finalize", "--state", statePath, "--outcome", "merged");
  assert.equal(finalized.acceptedMetadataCommit, "candidate");
  assert.equal(finalized.baseline.score, 40.5);
  assert.equal(finalized.consecutiveRejections, 0);
});

test("rejects equal scores and stops after three comparable discards", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    const decision = assess(directory, statePath, report(40), `candidate-${cycle}`);
    assert.equal(decision.decision, "reject");
    run(directory, "finalize", "--state", statePath, "--outcome", "discarded");
  }
  const state = run(directory, "status", "--state", statePath);
  assert.equal(state.consecutiveRejections, 3);
  assert.equal(state.status, "stopped");
});

test("blocks a dimension regression even when total score rises", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  const decision = assess(directory, statePath, report(41, { contract: 7.9 }));
  assert.equal(decision.decision, "reject");
  assert.ok(decision.reasons.includes("dimension-regression:contract"));
});

test("rejects a score improvement when a required quality gate fails", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  const candidate = path.join(directory, "candidate.json");
  const gates = path.join(directory, "gates.json");
  writeJson(candidate, report(41));
  writeJson(gates, { passed: false, checks: [{ name: "locale-lint", passed: false, exitCode: 1 }] });
  const decision = run(directory, "assess", "--state", statePath, "--candidate", candidate,
    "--gates", gates, "--candidate-commit", "candidate", "--candidate-branch", "quality/candidate",
    "--evaluator-commit", "eval-1", "--benchmark-hash", "bench-1", "--runtime-hash", "node-22");
  assert.equal(decision.decision, "reject");
  assert.ok(decision.reasons.includes("quality-gates-failed-or-missing"));
});

test("marks a changed evaluator fingerprint incomparable without stagnation", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  const candidate = path.join(directory, "candidate.json");
  const gates = path.join(directory, "candidate-gates.json");
  writeJson(candidate, report(41));
  writeJson(gates, { passed: true, checks: [{ name: "metadata", passed: true, exitCode: 0 }] });
  const decision = run(directory, "assess", "--state", statePath, "--candidate", candidate, "--gates", gates,
    "--candidate-commit", "candidate", "--candidate-branch", "quality/candidate",
    "--evaluator-commit", "eval-2", "--benchmark-hash", "bench-1",
    "--runtime-hash", "node-22");
  assert.equal(decision.decision, "incomparable");
  const state = run(directory, "finalize", "--state", statePath, "--outcome", "discarded");
  assert.equal(state.consecutiveRejections, 0);
});

test("starts a new epoch with a new evaluator and clears stagnation", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  assess(directory, statePath, report(40));
  run(directory, "finalize", "--state", statePath, "--outcome", "discarded");
  const rebaseline = path.join(directory, "rebaseline.json");
  writeJson(rebaseline, report(39.8));
  const state = run(directory, "new-epoch", "--state", statePath, "--baseline", rebaseline,
    "--evaluator-commit", "eval-2", "--benchmark-hash", "bench-1",
    "--runtime-hash", "node-22");
  assert.equal(state.epoch, 2);
  assert.equal(state.consecutiveRejections, 0);
  assert.equal(state.fingerprints.evaluatorCommit, "eval-2");
});

test("stops immediately when the baseline already has the maximum score", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory, 50);
  const state = run(directory, "status", "--state", statePath);
  assert.equal(state.status, "stopped");
  assert.equal(state.stopReason, "max-score");
});

test("rejects a dynamic score gain that regresses a previously passing case", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const baseline = path.join(directory, "baseline.json");
  const statePath = path.join(directory, "state.json");
  writeJson(baseline, dynamicReport(80, [{ id: "safe-read", passed: true }]));
  run(directory, "init", "--state", statePath, "--baseline", baseline,
    "--metadata-commit", "base", "--evaluator-commit", "eval-1",
    "--benchmark-hash", "bench-1", "--runtime-hash", "node-22");
  const decision = assess(directory, statePath,
    dynamicReport(81, [{ id: "safe-read", passed: false }]));
  assert.equal(decision.decision, "reject");
  assert.ok(decision.reasons.includes("dynamic-case-regression:safe-read"));
});

test("refuses a dynamic score that only claims a benchmark fingerprint", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const baseline = path.join(directory, "baseline.json");
  const statePath = path.join(directory, "state.json");
  writeJson(baseline, {
    ...report(45),
    score: 90,
    dynamicScore: 45,
    dynamic: { caseResults: [] },
  });
  assert.throws(() => execFileSync(process.execPath,
    [script, "init", "--state", statePath, "--baseline", baseline,
      "--metadata-commit", "base", "--evaluator-commit", "eval-1",
      "--benchmark-hash", "bench-1", "--runtime-hash", "node-22"],
    { cwd: directory, encoding: "utf8", stdio: "pipe" }),
  );
});

test("accepts an explicit missing-API preflight failure without fabricated traces", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const baseline = path.join(directory, "baseline.json");
  const statePath = path.join(directory, "state.json");
  const value = dynamicReport(45, [{
    id: "missing-api",
    passed: false,
    attempts: 0,
    traces: [],
    attribution: "metadata_or_contract",
    findings: [{ ruleId: "dynamic.expected-api-missing" }],
  }]);
  writeJson(baseline, value);
  const state = run(directory, "init", "--state", statePath, "--baseline", baseline,
    "--metadata-commit", "base", "--evaluator-commit", "eval-1",
    "--benchmark-hash", "bench-1", "--runtime-hash", "node-22");
  assert.equal(state.baseline.mode, "dynamic");
  assert.equal(state.baseline.passingCases["missing-api"], false);
});

test("rejects evaluator concerns without a concrete minimal reproduction", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pontx-quality-loop-"));
  const statePath = initialize(directory);
  const concern = path.join(directory, "concern.json");
  writeJson(concern, {
    id: "empty-repro",
    ruleId: "examples.leaf",
    type: "false-positive",
    minimalReproduction: {},
  });
  assert.throws(() => execFileSync(process.execPath,
    [script, "concern", "--state", statePath, "--input", concern],
    { cwd: directory, encoding: "utf8", stdio: "pipe" }),
  );
});
