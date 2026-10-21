# PR Review Report: PR #716 — feat(task.213): loop-supervisor engine registry (claude, agy) and --model flag

**Reviewed:** 2026-10-21
**PR:** [#716](https://github.com/Gamaroff/agent-skills/pull/716) — `feature/task.213.loop-supervisor-engine-registry-and-model-flag` → `develop` (OPEN)
**Work item:** [`task.213.loop-supervisor-engine-registry-and-model-flag.md`](task.213.loop-supervisor-engine-registry-and-model-flag.md) — resolved via `branch-stem`
**Tracker:** [#715](https://github.com/Gamaroff/agent-skills/issues/715) — OPEN
**Verdict:** ✅ APPROVE

Scope: conformance lens only (`--no-code`, develop-task Step 5c). The code reviewer already ran in QA cycles 1 and 2 with `code_review_blocking=true`. Nothing was excluded from the diff. The one `references/` path, `skills/loop-supervisor/references/engines.js`, is hand-authored and the subject of the PR.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.213.implementation.1.loop-supervisor-engine-registry-and-model-flag-initial-run.md` |
| Review report | ✅ | `task.213.review.1.loop-supervisor-engine-registry-and-model-flag.md` |
| QA reports | 2 | `task.213.qa.1.…md`, `task.213.qa.2.…md` |
| Gate | PASS | `task.213.gate.2.loop-supervisor-engine-registry-and-model-flag.yml` (100) |
| DoD | — | not yet expected (status `ready-for-review`; `/finalise` has not run) |
| Sprint review | — | not yet expected |
| Open bugs | 0 | `task.213.bug.1.claude-p-lines-lack-default-qualifier.md` closed in QA cycle 2 |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `dry-run --engine claude` argv unchanged (normalised session id), additive keys | Phase 1 characterisation test, `evals/loop-supervisor/unit/run-loop.test.mjs` | ✅ met |
| `dry-run --engine agy --model <id>` argv carries the model | `run-loop.test.mjs` `t213:` cases; `engines.js` agy `buildArgs` | ✅ met |
| Non-`SUCCESS`/unknown agy status → `isError: true`, classified `error` | `evals/loop-supervisor/unit/engines.test.mjs` | ✅ met |
| `--engine agy` with `--max-cost`/`--max-turns` exits 1 naming flag and engine | `run-loop.test.mjs` `t213:` refusal cases | ✅ met |
| `--dangerously-skip-permissions` refused on claude, passed through on agy only when given | `run-loop.test.mjs` `t213:` cases | ✅ met |
| `--engine claude --effort <level>` reaches the argv | `run-loop.test.mjs` `t213:` cases | ✅ met |
| CLI flags win over `loopSupervisor.engine/model/effort` | `run-loop.test.mjs` precedence cases | ✅ met |
| Pre-existing suites within 10% of base wall time | implementation report, measured −3% with load line | ✅ met |
| `dry-run` never executes the engine binary | marker-file test with fake `claude` and `agy` on `PATH` | ✅ met |
| No `if (engine === …)` in `run-loop.mjs` | `skills/loop-supervisor/scripts/run-loop.mjs` reads the table | ✅ met |
| Full `npm test` and `validate` pass | gate 2 evidence: `ci:fast` exit 0 at `f982c944` | ✅ met |
| No doc says every iteration is `claude -p` | cycle-1 fix `f982c944`; QA cycle 2 search clean | ✅ met |
| `configuration.md` documents the three keys and flags | `docs/reference/configuration.md` | ✅ met |

## Conformance Findings

```
[PC-1] coverage · low · confidence: medium — skills/loop-supervisor/references/render.js
  Files Summary item 3 asks that render.js's handling of a null cost or transcript be confirmed and covered with a test, but the PR changes neither render.js nor render.test.mjs, and no render test passes costUsd or transcriptPath as null.
  → Add a render.test.mjs case that renders a row and totals with costUsd null and transcriptPath null and asserts the em dash, not $NaN.
```

Verified by the orchestrator: the only `costUsd: null` in `evals/loop-supervisor/` is `engines.test.mjs:190`, which covers the parser, not the renderer.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 1 checked against `4f301bf3ec8091abf26ffd6a4948e7c769395b8a` (via `head-branch`). All verified (PC-1 names a file with no line: `no-line`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.213.gate.2.loop-supervisor-engine-registry-and-model-flag.yml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "skills/loop-supervisor/references/render.js"
    anchor_check: no-line
    finding: "Files Summary item 3 asks that render.js's handling of a null cost or transcript be covered with a test, but no render test passes costUsd or transcriptPath as null."
    suggested_action: "Add a render.test.mjs case with costUsd null and transcriptPath null that asserts the em dash, not $NaN."
truncated_count: 0
```

## Recommended Actions

1. Optional: add the null-cost render test (PC-1). It is LOW and does not block. A follow-up task can carry it alongside the deferred CR-4 and CR-5.
