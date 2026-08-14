# Evaluator Decision Log

## 2026-08-14 — Candidate registry parse-loss

- Concern: `candidate-registry-ignored`
- Rule: `candidate.registry.coverage`
- Type: `parse-loss` / `false-negative`
- Expected: a candidate registry receives independent, reproducible diagnostics
  and can participate in a Loop epoch without changing formal OAS scoring.
- Actual: `score-metadata.mjs` only traversed `specs/*/openapi.json`; a repository
  could add or degrade `catalog/api-collection-candidates.json` with no finding
  or score change.
- Minimal reproduction: one valid formal OAS fixture plus a candidate registry
  containing a mutable contract source, inconsistent blocked gate, stale
  evidence, incomplete localization, and a slug already present in
  `catalog/source.json` produced the same formal report as a clean registry.
- Impact: every candidate product was outside evaluator coverage; score impact
  was unknowable because no candidate score mode existed.

Decision: add a generic, read-only candidate evaluator and explicit
`candidate-registry` 50-point mode. Formal static/dynamic totals and findings
remain unchanged; their reports only receive a nested diagnostic. State
fingerprints record score mode, and state refuses cross-mode comparisons or
candidate reports whose dimensions do not add up to the declared score.

Calibration covers a full-quality registry, a deliberately defective registry,
and a historical Metadata tree with no candidate registry. The evaluator does
not encode current slugs, ranks, product count, or target score. Contract
evidence only passes immutability when a 40- or 64-hex revision is embedded in
the HTTPS source URL; an explicitly mutable source cannot pass this check.

## 2026-08-14 — Invalid leaf examples received a presence reward

- Concern: `invalid-leaf-example-presence-reward`
- Rule: `examples.leaf` / `examples.valid`
- Type: `weight-distortion`
- Expected: an invalid or generic placeholder example must not score above a
  safely omitted example; a valid, meaningful example must score above both.
- Actual: leaf example presence and validity were separate checks. A missing
  example failed one check, while `examples: ["example"]` passed presence and
  failed validity. In the minimal fixture this scored `5.13/6`, above the
  missing example's `4.90/6`. In the Dropbox calibration, deleting 105 generic
  placeholders while leaving 139 evidence gaps reduced the examples dimension
  from `5.53/6` at `6a445c7` to `5.45/6` at `d5b6fc3`.
- Impact: the evaluator rewarded values it simultaneously rejected and created
  pressure to retain or invent unsupported Metadata examples.

Decision: leaf coverage passes only when a non-empty `examples` array is both
schema-valid and meaningful. A missing array still emits `examples.leaf`; a
present but unusable array retains the more precise `examples.valid` finding
without an additional missing finding. Calibration locks the ordering to
meaningful valid > missing >= invalid placeholder. Dimension weights and all
non-example scoring rules remain unchanged.
