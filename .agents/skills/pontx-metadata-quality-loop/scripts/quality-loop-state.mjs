#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const STATE_VERSION = 1;
const CONCERN_TYPES = new Set([
  "false-positive", "false-negative", "parse-loss", "nondeterminism",
  "weight-distortion", "unactionable-rule",
]);

function parseArgs(argv) {
  const command = argv[0];
  if (!command || command.startsWith("--")) throw new Error("A command is required");
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`);
    options[key.slice(2)] = value;
    index += 1;
  }
  return { command, options };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
}

async function writeJson(filePath, value) {
  const absolute = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, absolute);
}

function required(options, key) {
  if (!options[key]) throw new Error(`--${key} is required`);
  return options[key];
}

function snapshot(report, benchmarkHash) {
  const dynamic = typeof report.dynamicScore === "number";
  if (dynamic) {
    const evidence = report.dynamic?.evidence;
    const cases = report.dynamic?.caseResults;
    const hasRunEvidence = (item) => (item.attempts >= 3 && item.traces?.length >= 3)
      || (item.attempts === 0 && item.traces?.length === 0
        && item.attribution === "metadata_or_contract"
        && item.findings?.some((finding) => finding.ruleId === "dynamic.expected-api-missing"));
    if (report.provisional === true || evidence?.valid !== true || evidence?.executed !== true
      || evidence?.adapter !== "codex" || evidence?.benchmarkHash !== benchmarkHash
      || report.dynamic?.runsPerCase < 3 || !Array.isArray(cases) || cases.length === 0
      || evidence?.caseCount !== cases.length || new Set(cases.map((item) => item.id)).size !== cases.length
      || cases.some((item) => !hasRunEvidence(item))) {
      throw new Error("Dynamic report lacks comparable executed benchmark evidence");
    }
  }
  const score = dynamic ? report.score : report.staticScore;
  if (typeof score !== "number" || !Number.isFinite(score)) throw new Error("Report has no comparable score");
  return {
    mode: dynamic ? "dynamic" : "static",
    score,
    maxScore: dynamic ? 100 : 50,
    staticScore: report.staticScore,
    dynamicScore: dynamic ? report.dynamicScore : null,
    criticals: Array.isArray(report.criticals) ? report.criticals.length : 0,
    dimensions: Object.fromEntries((report.dimensions || []).map((item) => [item.id, item.score])),
    deterministicCoverage: typeof report.coverage?.deterministic === "number"
      ? report.coverage.deterministic
      : null,
    passingCases: Object.fromEntries((report.dynamic?.caseResults || [])
      .map((item) => [item.id, item.passed === true])),
    findingCount: Array.isArray(report.findings) ? report.findings.length : 0,
  };
}

function fingerprints(options) {
  return {
    evaluatorCommit: required(options, "evaluator-commit"),
    benchmarkHash: required(options, "benchmark-hash"),
    runtimeHash: required(options, "runtime-hash"),
  };
}

function sameFingerprints(left, right) {
  return left.evaluatorCommit === right.evaluatorCommit
    && left.benchmarkHash === right.benchmarkHash
    && left.runtimeHash === right.runtimeHash;
}

function now() {
  return new Date().toISOString();
}

function isNonEmptyObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length > 0;
}

function assessCandidate(state, candidate, candidateFingerprints, gates, options) {
  const baseline = state.baseline;
  if (!sameFingerprints(state.fingerprints, candidateFingerprints)) {
    return { decision: "incomparable", reasons: ["fingerprint-mismatch"], delta: null };
  }
  if (baseline.mode !== candidate.mode) {
    return { decision: "incomparable", reasons: ["score-mode-mismatch"], delta: null };
  }
  const delta = Math.round((candidate.score - baseline.score) * 100) / 100;
  const minimumGain = Number(options["minimum-gain"] || (baseline.mode === "dynamic" ? 0.5 : 0.01));
  const reasons = [];
  if (!gates || gates.passed !== true || !Array.isArray(gates.checks)
    || gates.checks.some((check) => check.passed !== true)) {
    reasons.push("quality-gates-failed-or-missing");
  }
  if (delta < minimumGain) reasons.push("no-effective-score-gain");
  if (candidate.criticals > baseline.criticals) reasons.push("new-critical-findings");
  for (const [dimension, baselineScore] of Object.entries(baseline.dimensions)) {
    if (typeof candidate.dimensions[dimension] === "number"
      && candidate.dimensions[dimension] + 0.001 < baselineScore) {
      reasons.push(`dimension-regression:${dimension}`);
    }
  }
  if (baseline.deterministicCoverage !== null
    && candidate.deterministicCoverage !== null
    && candidate.deterministicCoverage < baseline.deterministicCoverage) {
    reasons.push("deterministic-coverage-regression");
  }
  for (const [caseId, passed] of Object.entries(baseline.passingCases)) {
    if (passed && candidate.passingCases[caseId] === false) reasons.push(`dynamic-case-regression:${caseId}`);
  }
  return { decision: reasons.length ? "reject" : "accept", reasons, delta, minimumGain };
}

async function loadState(options) {
  const statePath = required(options, "state");
  const state = await readJson(statePath);
  if (state.version !== STATE_VERSION) throw new Error(`Unsupported state version: ${state.version}`);
  return { state, statePath };
}

async function run() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "init") {
    const report = await readJson(required(options, "baseline"));
    const reportFingerprints = fingerprints(options);
    const baseline = snapshot(report, reportFingerprints.benchmarkHash);
    const state = {
      version: STATE_VERSION,
      status: baseline.score >= baseline.maxScore ? "stopped" : "ready",
      stopReason: baseline.score >= baseline.maxScore ? "max-score" : null,
      epoch: 1,
      cycle: 0,
      maxConsecutiveRejections: Number(options["max-rejections"] || 3),
      consecutiveRejections: 0,
      acceptedMetadataCommit: required(options, "metadata-commit"),
      fingerprints: reportFingerprints,
      baseline,
      pendingCandidate: null,
      concerns: [],
      history: [{ type: "initialized", at: now(), metadataCommit: options["metadata-commit"] }],
    };
    await writeJson(required(options, "state"), state);
    return state;
  }

  const { state, statePath } = await loadState(options);
  if (command === "status") return state;

  if (command === "assess") {
    if (state.pendingCandidate) throw new Error("Finalize the pending candidate before assessing another one");
    if (state.status === "stopped") throw new Error("The loop is stopped; start a new epoch to continue");
    const report = await readJson(required(options, "candidate"));
    const gates = await readJson(required(options, "gates"));
    const candidateFingerprints = fingerprints(options);
    const candidate = snapshot(report, candidateFingerprints.benchmarkHash);
    const result = assessCandidate(state, candidate, candidateFingerprints, gates, options);
    state.cycle += 1;
    state.pendingCandidate = {
      ...result,
      snapshot: candidate,
      gates,
      commit: required(options, "candidate-commit"),
      branch: required(options, "candidate-branch"),
      assessedAt: now(),
    };
    state.status = "assessed";
    state.history.push({ type: "assessed", at: now(), cycle: state.cycle, ...result });
    await writeJson(statePath, state);
    return state.pendingCandidate;
  }

  if (command === "finalize") {
    if (!state.pendingCandidate) throw new Error("No pending candidate to finalize");
    const outcome = required(options, "outcome");
    const pending = state.pendingCandidate;
    if (outcome === "merged") {
      if (pending.decision !== "accept") throw new Error("Only an accepted candidate can be finalized as merged");
      state.baseline = pending.snapshot;
      state.acceptedMetadataCommit = pending.commit;
      state.consecutiveRejections = 0;
      state.history.push({ type: "merged", at: now(), cycle: state.cycle, commit: pending.commit, delta: pending.delta });
    } else if (outcome === "discarded") {
      if (pending.decision === "accept") throw new Error("An accepted candidate needs outcome merged or aborted");
      if (pending.decision === "reject") state.consecutiveRejections += 1;
      state.history.push({ type: "discarded", at: now(), cycle: state.cycle, commit: pending.commit, decision: pending.decision });
    } else if (outcome === "aborted") {
      state.history.push({ type: "aborted", at: now(), cycle: state.cycle, commit: pending.commit });
    } else {
      throw new Error("--outcome must be merged, discarded, or aborted");
    }
    state.pendingCandidate = null;
    if (state.baseline.score >= state.baseline.maxScore) {
      state.status = "stopped";
      state.stopReason = "max-score";
    } else if (state.consecutiveRejections >= state.maxConsecutiveRejections) {
      state.status = "stopped";
      state.stopReason = "consecutive-rejections";
    } else {
      state.status = "ready";
      state.stopReason = null;
    }
    await writeJson(statePath, state);
    return state;
  }

  if (command === "concern") {
    const concern = await readJson(required(options, "input"));
    if (!concern.id || !concern.ruleId || !CONCERN_TYPES.has(concern.type)
      || !isNonEmptyObject(concern.minimalReproduction)) {
      throw new Error("Concern requires id, ruleId, type, and minimalReproduction");
    }
    if (!state.concerns.some((item) => item.id === concern.id)) {
      state.concerns.push({ ...concern, status: "open", reportedAt: now() });
      state.history.push({ type: "concern-reported", at: now(), id: concern.id });
      await writeJson(statePath, state);
    }
    return state.concerns.find((item) => item.id === concern.id);
  }

  if (command === "resolve-concern") {
    const id = required(options, "id");
    const concern = state.concerns.find((item) => item.id === id);
    if (!concern) throw new Error(`Unknown concern: ${id}`);
    const resolution = required(options, "resolution");
    if (!["accepted", "rejected"].includes(resolution)) {
      throw new Error("--resolution must be accepted or rejected");
    }
    concern.status = resolution;
    concern.resolvedAt = now();
    concern.evidence = options.evidence || concern.evidence;
    state.history.push({ type: "concern-resolved", at: now(), id, resolution: concern.status });
    await writeJson(statePath, state);
    return concern;
  }

  if (command === "new-epoch") {
    if (state.pendingCandidate) throw new Error("Finalize the pending candidate before starting a new epoch");
    const report = await readJson(required(options, "baseline"));
    const reportFingerprints = fingerprints(options);
    const baseline = snapshot(report, reportFingerprints.benchmarkHash);
    state.epoch += 1;
    state.status = baseline.score >= baseline.maxScore ? "stopped" : "ready";
    state.stopReason = state.status === "stopped" ? "max-score" : null;
    state.consecutiveRejections = 0;
    state.fingerprints = reportFingerprints;
    state.baseline = baseline;
    state.history.push({ type: "new-epoch", at: now(), epoch: state.epoch });
    await writeJson(statePath, state);
    return state;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  const result = await run();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
