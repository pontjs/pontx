# Quality Loop Protocol

## 1. Comparable snapshot

Two reports are comparable only when all fingerprints match:

```text
evaluator commit + benchmark hash + runtime hash + score mode
```

Static-only reports compare `staticScore` on a 50-point scale. Reports with a
dynamic score compare `score` on a 100-point scale. Never compare a provisional
static projection with a completed dynamic score.

A dynamic report is comparable only when the scorer actually executed the
independent benchmark with the Pontx Codex adapter. The report must be
non-provisional, contain at least three traces for every executable case, and
carry a content-derived benchmark hash in `dynamic.evidence` that matches the
state fingerprint. The one valid zero-attempt result is a preflight Critical
showing that the benchmark API is absent, because no Agent run is then possible.
A supplied hash, adapter self-report, or projected static score is not execution
evidence.

## 2. State transitions

```text
ready -> assessed -> merged -> ready
                  -> discarded -> ready|stopped
      -> incomparable -> ready
ready|stopped -> new epoch -> ready
```

`assess` is advisory and creates a pending candidate. Only `finalize` changes
the accepted baseline or the consecutive rejection count. This makes a failed
Git merge unable to masquerade as an accepted improvement.

## 3. Scorer contract

The scorer is read-only and reports:

- exact Metadata/evaluator commits and benchmark/runtime fingerprints;
- static, dynamic, total, dimension and Critical values;
- deterministic CLI coverage and per-case pass/fail state;
- findings with paths, affected Endpoints and remediation;
- commands, exit codes and whether generated output reproduced cleanly;
- evaluator concerns with a minimal fixture when applicable.

In dynamic mode the scorer also reports the benchmark path and content hash,
adapter identity, runs per case, per-case traces/pass state, and deterministic
CLI coverage across every Metadata collection. Dynamic mode is explicit opt-in;
without a benchmark file the report remains static and provisional.

The scorer must not repair files, regenerate checked-in output in the target
worktree, or accept an improver's claimed score. Run generators in an authorized
candidate worktree or a temporary copy.

Candidate assessment also consumes a gate report. It has `passed: true` only
when every listed command has `passed: true`, with command, exit code and scope
recorded. The state tool refuses assessment without gate evidence; an explicit
failed gate report produces a rejected candidate.

## 4. Improver contract

The improver receives one bounded target set. It may use rule diagnostics to
find evidence, but cannot edit evaluator code, scoring weights, golden cases,
or state. It must distinguish authoritative facts from inference and avoid
inventing examples, errors, constraints, translations or upstream behavior.

Every candidate should be one reviewable commit. It must include canonical
Chinese and locale counterparts, approved hashes and regenerated catalog when
those files change.

## 5. Evaluator concern schema

```json
{
  "id": "request-body-allof-required",
  "ruleId": "request-examples.values",
  "type": "false-positive",
  "expected": "An unresolved JSON Pointer satisfies the dynamic field",
  "actual": "The request body is rejected as incomplete",
  "metadataPath": "dida365.createTask.default",
  "minimalReproduction": {},
  "evidence": ["OpenAPI path or authoritative documentation"],
  "impact": { "apis": 1, "score": 0.1 }
}
```

Allowed types are `false-positive`, `false-negative`, `parse-loss`,
`nondeterminism`, `weight-distortion`, and `unactionable-rule`.

An evaluator change needs a minimal regression fixture, calibration against
good and bad examples, full evaluator tests, package builds and a decision-log
entry. Security boundaries cannot be relaxed only because current Metadata
contains a violation.

## 6. Merge and disposal

The orchestrator resolves exact worktree paths before mutation. Merge only into
the designated integration branch, never directly into `main` or `develop`
unless separately authorized. Prefer fast-forward when the candidate starts at
the accepted commit. After merge, rescore the integrated commit before
finalizing state.

Rejected worktrees may be archived for diagnosis or removed after their exact
paths and commits are recorded. Never clean or reset a user's existing
worktree. Cross-repository evaluator and Metadata commits remain separate.

## 7. Dynamic evaluation

Use independent fixtures and dry-run first. Run every changed case plus all
high-risk cases. A final acceptance report uses at least three attempts per
case and compares the same cases. A candidate fails the regression guard when
any previously passing case becomes failing, even when its average total score
increases.

The checked-in smoke benchmark is a protocol-level seed, not a claim of broad
catalog coverage. Extend it with independent cases before using the dynamic
score as a release-quality signal. Never derive expected requests from the
Metadata being scored, access production APIs, or expose provider credentials.

## 8. Stop semantics

Only comparable rejected candidates increment stagnation. Successful merge
resets it. An accepted evaluator correction starts a new epoch and resets it.
An invalid run, tool outage, merge conflict or fingerprint mismatch is aborted,
not counted as evidence that Metadata cannot improve.
