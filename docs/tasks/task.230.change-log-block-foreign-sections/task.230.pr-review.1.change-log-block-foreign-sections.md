# PR Review Report: PR #735 — feat(change-log): lift foreign sections out of the change-log markers (task.230)

**Reviewed:** 2026-10-23
**PR:** [#735](https://github.com/Gamaroff/agent-skills/pull/735) — `feature/task.230.change-log-block-foreign-sections` → `develop` (OPEN)
**Work item:** [`task.230.change-log-block-foreign-sections.md`](./task.230.change-log-block-foreign-sections.md) — resolved via `branch-stem`
**Tracker:** [#734](https://github.com/Gamaroff/agent-skills/issues/734) — OPEN
**Verdict:** ✅ APPROVE

Develop-task Step 5c: conformance lens only (`--no-code`), effort medium. QA cycles 1–4 already ran the code reviewer over this diff, with blocking on.

**Scope:** `origin/develop...origin/feature/task.230.change-log-block-foreign-sections`, 23 files. The 69 `skills/*/references/*` copies were excluded. They are generated, and `bundle:check` proves them byte-identical to their `shared/resources/` sources. The task names them only as "regenerate".

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.230.implementation.1.change-log-block-foreign-sections-initial-run.md`. QA-cycle updates are held for Step 8 |
| Review report | ✅ | `task.230.review.1.change-log-block-foreign-sections.md` |
| QA reports | 4 | `task.230.qa.1…qa.4.change-log-block-foreign-sections.md` |
| Gate | PASS | `task.230.gate.4.change-log-block-foreign-sections.yml` (95). Cycle 4 reached 5c through the cosmetic-residue exit (route 2b) |
| DoD | — | not yet expected (status `ready-for-review`) |
| Sprint review | — | not yet expected |
| Open bugs | 0 | — |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Foreign sections lifted out of the markers (before and after) | `shared/resources/change-log.js` `partitionForeign`; K1–K27 in `shared/resources/tests/change-log.test.mjs` | ✅ met |
| Placement rule stated in the spec and step doc | `shared/resources/document-change-log.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `tests/deferred-work-placement.test.js` | ✅ met |
| Corpus guard | `evals/shared/tests/change-log-foreign-section-corpus.test.mjs` | ✅ met |
| Four documents repaired | task.166/170/175/203 diffs | ✅ met |
| Performance figure recorded in the implementation report | measured only in qa.4 | ⚠️ partial (PC-1) |
| `npm run ci` green | only `ci:fast` recorded | ⚠️ partial (PC-2) |

## Conformance Findings

```
[PC-1] coverage · low · confidence: medium — docs/tasks/task.230.change-log-block-foreign-sections/task.230.implementation.1.change-log-block-foreign-sections-initial-run.md
  The Performance criterion says the corpus guard's wall time and load go in the implementation
  report. The report has neither; the only measurement (0.726 s at load 1.32) is in qa.4.
  → Record the measured figure and its load in the implementation report when it is committed at Step 8.

[PC-2] coverage · low · confidence: medium — docs/tasks/task.230.change-log-block-foreign-sections/task.230.change-log-block-foreign-sections.md:297
  The Phase 4 box for a green `npm run ci` is ticked. The implementation report shows only
  `npm run ci:fast`, and QA cycle 1 says the full `npm run ci` was not run.
  → Run the full `npm run ci` with the symlink aside and record it, or untick the box.
```

## Code Review Findings

Skipped (`--no-code`). QA cycles 1–4 ran the shared code reviewer over this diff.

**Anchors:** 2 checked against `d40f65521968a5a906ab92cd7612281f511b1be5` (via `head-branch`). Both verified: PC-1 is `no-line`, PC-2 is `ok`.

## Machine-Readable Findings

```yaml
reviewed_gate: task.230.gate.4.change-log-block-foreign-sections.yml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "docs/tasks/task.230.change-log-block-foreign-sections/task.230.implementation.1.change-log-block-foreign-sections-initial-run.md"
    anchor_check: no-line
    finding: "The Performance criterion's corpus-guard wall time and load are not in the implementation report; the only measurement is in qa.4."
    suggested_action: "Record the measured figure and its load in the implementation report when it is committed at Step 8."
  - id: PC-2
    category: coverage
    severity: low
    confidence: medium
    ref: "docs/tasks/task.230.change-log-block-foreign-sections/task.230.change-log-block-foreign-sections.md:297"
    anchor_check: ok
    finding: "The Phase 4 npm run ci box is ticked, but only npm run ci:fast was run and recorded."
    suggested_action: "Run the full npm run ci with the symlink aside and record it in the implementation report, or untick the box."
truncated_count: 0
```

## Recommended Actions

1. Run the full `npm run ci` with `.agents/skills` moved aside, and record the result in the implementation report (PC-2).
2. Copy the corpus-guard timing into the implementation report (PC-1).
