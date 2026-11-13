# PR Review Report: PR #883 — fix(task.291): the context-pressure statusline test no longer leaks a ctx-wrap- directory

**Reviewed:** 2026-11-11
**PR:** [#883](https://github.com/Gamaroff/agent-skills/pull/883) — `feature/task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory` → `develop` (OPEN)
**Work item:** [`task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md`](./task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md) — resolved via `branch stem`
**Tracker:** issue 882 — open
**Verdict:** ✅ APPROVE

Review scope: conformance lens only (the code lens ran in QA cycles 1 and 2). Done in-line at low effort with no independent reviewer, so independence is lost. Diff: 11 files, none excluded.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.291.implementation.1 (initial run) |
| Review report | ✅ | task.291.review.1 |
| QA reports | 2 | qa.1, qa.2 |
| Gate | PASS | gate.2 (100/100) |
| DoD | ❌ | not yet written; `/finalise` is the next step |
| Sprint review | ❌ | not yet written; `/finalise` is the next step |
| Open bugs | 0 | none |
| Handover | ❌ | none; not applicable |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Reproduction prints 0 after the fix | QA report 1 and 2 (0 in 100 runs); fix in `tests/lib/tmp-state-cleanup.mjs` | ✅ met |
| Regression test red with the fix reverted | "no ctx-wrap- directory survives a slow recorder" in `context-pressure-statusline.test.mjs`; mutation proof in QA report 1 | ✅ met |
| `CI=true npm test` passes, `ctx-wrap` absent from the ratchet | ratchet file untouched in the diff | ✅ met |
| Five existing tests within 10% of develop (amended) | QA report 2, seven alternating runs | ✅ met |
| No test waits past 3000 ms | helper's 3000 ms total bound | ✅ met |
| Every state-dir test waits or settles | `stateDir()` registers each directory with the tracker | ✅ met |
| Lint and prettier | QA report 1 | ✅ met |
| `CHANGELOG.md` cites the task | `CHANGELOG.md` entry "(task 291)" | ✅ met |
| `bundle:check` reports 0 problems | re-run in this review: 129 skills, 0 problems | ✅ met |

## Conformance Findings

[PC-1] trail · low · confidence: high — task.291.qa.2.context-pressure-statusline-test-leaks-ctx-wrap-directory.md
  QA report 2 records the `bundle:check` criterion as "not run". It was run here and reports 0 problems, so the criterion is met but its evidence is absent from the QA report.
  → `/finalise` should cite this run as the evidence.

[PC-2] consistency · low · confidence: high — task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md
  Files Summary item 2 under "Possibly" (`context-pressure-statusline.sh`) is ticked ✅, but the wrapper is not in the diff. The conditional file was not needed.
  → Mark it "not needed" when finalising.

## Code Review Findings

Skipped (`--no-code`): QA ran the code lens in cycles 1 and 2.

## Machine-Readable Findings

```yaml
reviewed_gate: task.291.gate.2.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: task.291.qa.2.context-pressure-statusline-test-leaks-ctx-wrap-directory.md
    anchor_check: no-line
    finding: "QA report 2 records the bundle:check criterion as not run; this review ran it and it reports 0 problems."
    suggested_action: "Cite this run as the evidence at finalise."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md
    anchor_check: no-line
    finding: "Files Summary ticks the optional wrapper file although it is not in the diff."
    suggested_action: "Mark it not needed when finalising."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`; fold PC-1 and PC-2 into its DoD notes.
