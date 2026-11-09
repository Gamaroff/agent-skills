# PR Review Report: PR #860 — feat(task.272): finalise names its preconditions and routes standalone bugs

**Reviewed:** 2026-11-08
**PR:** [#860](https://github.com/Gamaroff/agent-skills/pull/860) — `feature/task.272.finalise-names-its-preconditions-and-standalone-routes` → `develop` (OPEN)
**Work item:** [`task.272.finalise-names-its-preconditions-and-standalone-routes.md`](./task.272.finalise-names-its-preconditions-and-standalone-routes.md) — resolved via `branch stem`
**Tracker:** none — the task has no linked issue
**Verdict:** 🚨 REQUEST CHANGES

Scope note: conformance lens only (Step 5c passes `--no-code`; QA ran the code review every cycle). Bundled `references/` copies were excluded from the diff.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.272.implementation.1 |
| Review report | ✅ | task.272.review.1 |
| QA reports | 2 | qa.1 (FAIL), qa.2 (PASS) |
| Gate | PASS | task.272.gate.2 (95) |
| DoD | ❌ | not yet — the task is before `/finalise` |
| Sprint review | ❌ | not yet — same |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Conformance Findings

[PC-1] trail · high · confidence: high — the implementation report ⚠️ no line anchor
  The report's QA Iteration History stops at cycle 1 (FAIL), with no cycle 2 entry, so the highest gate (PASS) is not shown to have reached Step 5c, and the Pipeline Progress row for steps 5–6 is still pending.
  → Add a QA Cycle 2 entry and the PR Review row, and update the row.

[PC-2] consistency · low · confidence: medium — `pr_number`
  The work item frontmatter has no `pr_number`, though PR #860 is open.
  → Add `pr_number: 860`.

Both findings are documentation-only. They are fixed in the orchestrator's carry and ride the acceptance commit; no code changes.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 2 checked against `0ec5bad6` (via `head-branch`) — both `no-line` (file-level refs, nothing to verify)

## Machine-Readable Findings

```yaml
reviewed_gate: task.272.gate.2.finalise-names-its-preconditions-and-standalone-routes.yml
findings:
  - id: PC-1
    category: trail
    severity: high
    confidence: high
    ref: "docs/tasks/task.272.finalise-names-its-preconditions-and-standalone-routes/task.272.implementation.1.finalise-names-its-preconditions-and-standalone-routes-initial-run.md"
    anchor_check: no-line
    finding: "The implementation report's QA Iteration History stops at cycle 1 (FAIL) with no cycle 2 entry, so the highest gate is not shown to have reached Step 5c."
    suggested_action: "Add a QA Cycle 2 entry and the PR Review row, and update the Pipeline Progress row."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "pr_number"
    anchor_check: no-line
    finding: "The work item frontmatter has no pr_number although PR 860 is open."
    suggested_action: "Add pr_number: 860 to the work item frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Record QA cycle 2 and the 5c row in the implementation report (PC-1).
2. Add `pr_number: 860` to the task frontmatter (PC-2).
