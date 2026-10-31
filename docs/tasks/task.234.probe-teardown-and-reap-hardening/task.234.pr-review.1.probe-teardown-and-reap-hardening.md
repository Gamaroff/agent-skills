# PR Review Report: PR #800 — fix(task.234): probe sandbox teardown past PATH_MAX and process-group reap

**Reviewed:** 2026-10-31
**PR:** [#800](https://github.com/Gamaroff/agent-skills/pull/800) — `feature/task.234.probe-teardown-and-reap-hardening` → `develop` (OPEN)
**Work item:** [`task.234.probe-teardown-and-reap-hardening.md`](./task.234.probe-teardown-and-reap-hardening.md) — resolved via `branch stem`
**Tracker:** [#750](https://github.com/Gamaroff/agent-skills/issues/750) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.234.implementation.1.probe-teardown-and-reap-hardening-initial-run.md |
| Review report | ✅ | task.234.review.1.probe-teardown-and-reap-hardening.md |
| QA reports | 7 | task.234.qa.1 to task.234.qa.7 |
| Gate | PASS | task.234.gate.7.probe-teardown-and-reap-hardening.yml (95) |
| DoD | ❌ | not yet; the task is ready-for-review, and `/finalise` writes it |
| Sprint review | ❌ | not yet; written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The conformance lens found no criterion without evidence in the diff. Each criterion's evidence is recorded in QA report 7, § Success Criteria Verification.

## Conformance Findings

```
[PC-2] consistency · medium · confidence: high — pr_number
  The work item's frontmatter has no `pr_number` field, though the implementation report records PR #800 as created for this task.
  → Add `pr_number: 800` to the frontmatter of task.234.probe-teardown-and-reap-hardening.md.

[PC-1] trail · low · confidence: high — docs/tasks/task.234.probe-teardown-and-reap-hardening/task.234.implementation.1.probe-teardown-and-reap-hardening-initial-run.md:38
  The Pipeline Progress row for steps 5–6 still reads as escalated at gate 5 with QA-10 open, but QA Cycle 7 recorded gate 7 PASS with `Proceeding to 5c`.
  → Update the steps 5–6 row to record gate 7 PASS and the move to Step 5c.
```

## Code Review Findings

Skipped (`--no-code`). The QA loop ran the code reviewer on every cycle.

**Anchors:** 2 checked against `ce15a175` (via `head-branch`). All verified: one `ok`, and one `no-line`, which is a frontmatter field.

**Scope note:** the bundled `*/references/*` copies were left out of the diff as auto-generated. No excluded path is named in the work item, the PR body or a commit subject as a deliberate change.

## Machine-Readable Findings

```yaml
reviewed_gate: task.234.gate.7.probe-teardown-and-reap-hardening.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.234.probe-teardown-and-reap-hardening/task.234.implementation.1.probe-teardown-and-reap-hardening-initial-run.md:38"
    anchor_check: ok
    finding: "The Pipeline Progress row for steps 5–6 still reads as escalated at gate 5 with QA-10 open, but QA Cycle 7 recorded gate 7 PASS with Proceeding to 5c."
    suggested_action: "Update the steps 5–6 row to record gate 7 PASS and the move to Step 5c."
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: "The work item's frontmatter has no pr_number field, though the implementation report records PR #800 as created for this task."
    suggested_action: "Add pr_number 800 to the frontmatter of task.234.probe-teardown-and-reap-hardening.md."
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 800` to the task frontmatter (doc-only). The fix rides the acceptance commit.
2. Update the implementation report's steps 5–6 progress row (doc-only).
