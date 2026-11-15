# PR Review Report: PR #909 — fix(task.309): pin the 6c head writer position and clear the stale head file

**Reviewed:** 2026-11-15
**PR:** [#909](https://github.com/Gamaroff/agent-skills/pull/909) — `feature/task.309.pin-6c-head-writer-position-and-clear-stale-head-file` → `develop` (OPEN)
**Work item:** [`task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md`](./task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md) — resolved via `branch stem` (current branch)
**Tracker:** [#908](https://github.com/Gamaroff/agent-skills/issues/908) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.309.implementation.1.pin-6c-head-writer-position-and-clear-stale-head-file-initial-run.md |
| Review report | ✅ | task.309.review.1.pin-6c-head-writer-position-and-clear-stale-head-file.md |
| QA reports | 1 | task.309.qa.1.pin-6c-head-writer-position-and-clear-stale-head-file.md |
| Gate | PASS | task.309.gate.1.pin-6c-head-writer-position-and-clear-stale-head-file.yml (100) |
| DoD | ❌ | not yet written; `/finalise` runs after this step |
| Sprint review | ❌ | not yet written; `/finalise` writes it |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Moving the writer below the launch turns the order test red | order assertion in `evals/shared/tests/finalise-publish-boundary.test.mjs`; QA mutation 1 red | ✅ met |
| A stale head file is gone after the shipped `rm` line | `skills/finalise/SKILL.md:2269` and the clear test; QA mutation 2 red | ✅ met |
| The later-turn reader is unchanged; its tests stay green | reader line untouched by the diff; 48/48 | ✅ met |
| Bundle clean, CHANGELOG cites the task | `bundle:check` clean; `cites (task 309)` | ✅ met |

## Conformance Findings

[PC-1] trail · medium · confidence: high — docs/tasks/task.309.pin-6c-head-writer-position-and-clear-stale-head-file/task.309.implementation.1.pin-6c-head-writer-position-and-clear-stale-head-file-initial-run.md
  At the committed PR head the implementation report has no QA Cycle 1 entry and its Pipeline Progress row 4 still reads Pending.
  → Commit the working-tree report update (Step 8 owns that commit).
  _Orchestrator note: by design. The report's updates are held out of per-cycle commits and committed once at Step 8; not a coverage finding, so it does not route to 5b._

[PC-2] consistency · low · confidence: high — docs/tasks/task.309.pin-6c-head-writer-position-and-clear-stale-head-file/task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md
  Frontmatter carries `github_issue: 908` but no `pr_number` although PR 909 is open.
  → Add `pr_number: 909` to the task frontmatter (finalise writes it at acceptance).

## Code Review Findings

Skipped (`--no-code`). The code lens ran in QA cycle 1 (Step 3b); its two advisory findings are in the QA report.

**Anchors:** 2 checked against `9e73cf9e67d8385f4611829dcbd40f21d3a5b676` (via `head-branch`) — all verified (both `no-line`: the refs are file paths, not lines)

## Machine-Readable Findings

```yaml
reviewed_gate: task.309.gate.1.pin-6c-head-writer-position-and-clear-stale-head-file.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.309.pin-6c-head-writer-position-and-clear-stale-head-file/task.309.implementation.1.pin-6c-head-writer-position-and-clear-stale-head-file-initial-run.md"
    anchor_check: no-line
    finding: "At the committed PR head the implementation report has no QA Cycle 1 entry and its Pipeline Progress row 4 still reads Pending."
    suggested_action: "Commit the working-tree report update; Step 8 owns that commit."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.309.pin-6c-head-writer-position-and-clear-stale-head-file/task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md"
    anchor_check: no-line
    finding: "Frontmatter carries github_issue 908 but no pr_number although PR 909 is open."
    suggested_action: "Add pr_number 909 to the task frontmatter; finalise writes it at acceptance."
truncated_count: 0
```

## Recommended Actions

1. Nothing blocks. Step 8 commits the implementation report, which clears PC-1.
2. `/finalise` writes `pr_number: 909`, which clears PC-2.
