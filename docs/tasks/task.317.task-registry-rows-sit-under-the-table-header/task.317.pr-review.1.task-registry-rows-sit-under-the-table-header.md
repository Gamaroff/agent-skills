# PR Review Report: PR #928 — fix(task.317): task registry rows sit under the table header

**Reviewed:** 2026-11-21
**PR:** [#928](https://github.com/Gamaroff/agent-skills/pull/928) — `feature/task.317.task-registry-rows-sit-under-the-table-header` → `develop` (OPEN)
**Work item:** [`task.317.task-registry-rows-sit-under-the-table-header.md`](./task.317.task-registry-rows-sit-under-the-table-header.md) — resolved via `branch stem`
**Tracker:** none linked
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.317.implementation.1.task-registry-rows-sit-under-the-table-header-initial-run.md |
| Review report | ✅ | task.317.review.1.task-registry-rows-sit-under-the-table-header.md |
| QA reports | 2 | qa.1, qa.2 |
| Gate | PASS | task.317.gate.2.task-registry-rows-sit-under-the-table-header.yml (100) |
| DoD | ❌ | not expected yet: the task is at `ready-for-review`, inside the QA loop |
| Sprint review | ❌ | not expected yet |
| Open bugs | 0 | none |
| Handover | ❌ | none |

Scope note: generated `references/` copies were excluded from the diff (this change touches none).

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Every registry row lies in the one table block, held by a committed test with a floor | `evals/shared/tests/task-registry-drift.test.mjs` (`placementOf`, `PLACEMENT_MIN_ROWS`) | ✅ met |
| `registry-tick.js --annotate` answers `annotated` on a formerly stranded row | QA report 1, record 1 | ✅ met |
| Placement test fails when one row is moved after `## Notes` | QA report 1, record 2 | ✅ met |
| CHANGELOG `[Unreleased]` entry citing (task 317) | `CHANGELOG.md` | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: medium — docs/tasks/task.317.task-registry-rows-sit-under-the-table-header/task.317.task-registry-rows-sit-under-the-table-header.md
  Every box under the Success Criteria section is still unticked although the gate reads PASS.
  → Tick the criteria QA report 2 evidences, or leave them for /finalise on purpose.

[PC-2] consistency · low · confidence: low — docs/tasks/task-registry.md
  Row 317 reads `planned` while the document reads `ready-for-review`.
  → `/finalise` ticks the row status in the same step that writes `accepted`; nothing to do before then.

## Code Review Findings

Skipped (`--no-code`): the QA step already ran the code reviewer in both cycles.

**Anchors:** 2 checked against `HEAD` (via the working tree) — both `no-line` (a file reference, not a line); all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.317.gate.2.task-registry-rows-sit-under-the-table-header.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.317.task-registry-rows-sit-under-the-table-header/task.317.task-registry-rows-sit-under-the-table-header.md"
    anchor_check: no-line
    finding: "Every box under the Success Criteria section is still unticked although the gate reads PASS."
    suggested_action: "Tick the criteria QA report 2 evidences, or leave them for /finalise on purpose."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task-registry.md"
    anchor_check: no-line
    finding: "Row 317 reads planned while the document reads ready-for-review."
    suggested_action: "Nothing before /finalise, which ticks the row status with the acceptance write."
truncated_count: 0
```

## Recommended Actions

1. None blocking. Proceed to `/finalise`.
