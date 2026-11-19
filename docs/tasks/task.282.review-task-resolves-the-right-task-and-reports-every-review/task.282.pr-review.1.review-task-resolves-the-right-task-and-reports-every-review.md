# PR Review Report: PR #921 — feat(task.282): review comments keyed per review; bare number resolves as a task id first

**Reviewed:** 2026-11-19
**PR:** [#921](https://github.com/Gamaroff/agent-skills/pull/921) — `feature/task.282.review-task-resolves-the-right-task-and-reports-every-review` → `develop` (OPEN)
**Work item:** [`task.282.review-task-resolves-the-right-task-and-reports-every-review.md`](./task.282.review-task-resolves-the-right-task-and-reports-every-review.md) — resolved via `branch stem`
**Tracker:** none — no issue linked
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.282.implementation.1.review-task-resolves-the-right-task-and-reports-every-review-initial-run.md |
| Review report | ✅ | task.282.review.1.review-task-resolves-the-right-task-and-reports-every-review.md |
| QA reports | 3 | qa.1, qa.2, qa.3 |
| Gate | PASS | task.282.gate.3.review-task-resolves-the-right-task-and-reports-every-review.yml (96) |
| DoD | ❌ | not yet — `/finalise` has not run (correct at this step) |
| Sprint review | ❌ | not yet — `/finalise` has not run (correct at this step) |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Not run: Step 5c passes `--no-code` and runs the conformance lens alone; the QA reports carry the criterion-by-criterion table (all seven PASS in QA report 3).

## Conformance Findings

[PC-1] trail · low · confidence: low — `task.282.implementation.1.review-task-resolves-the-right-task-and-reports-every-review-initial-run.md:147`
  The `### QA Cycle 3` entry has Gate Result PASS (96/100) but no `**Action**: Proceeding to 5c` line, while cycles 1 and 2 each carry an Action line.
  → Add the Action line to the Cycle 3 entry so the accepting route is recorded explicitly. **Fixed** in the working tree (carried into the acceptance commit).

[PC-2] consistency · medium · confidence: high — `pr_number`
  The work item's frontmatter has no `pr_number` field, although PR #921 is open for this work.
  → Set `pr_number: 921` in the work item frontmatter. **Fixed** in the working tree.

[PC-3] consistency · low · confidence: medium — `task.282.review-task-resolves-the-right-task-and-reports-every-review.md:303`
  The Change Log ends at the cycle 2 qa-fix row and has no row for the cycle 3 QA gate PASS (96/100), although gate 3 and QA report 3 exist.
  → Append a Change Log row recording the cycle 3 QA gate PASS. **Not a defect:** the row `QA gate PASS (96/100) — no gating findings (cycle 3, scoped re-review)` is present on the branch head `028efc28c` at line 304; the lens read an earlier copy. No change made.

[PC-4] scope · low · confidence: medium — `shared/resources/resolve-bare-task.sh`
  The PR adds a new resolver script and its test, and the work item text does not name them; its Files Summary lists only edits to Input Resolution and Step 0a prose.
  → Name the helper script and its test in the task's Files Summary. **Fixed** in the working tree (item 3a added).

## Code Review Findings

Skipped (`--no-code`): the QA loop already ran the code reviewer every cycle.

**Anchors:** 4 checked against `028efc28c31dd2e88d82c3012fee1e0027783726` (via `head-branch`) — all verified (PC-1 and PC-3 `unchecked-text`, PC-2 and PC-4 `no-line`: clean forms).

## Machine-Readable Findings

```yaml
reviewed_gate: task.282.gate.3.review-task-resolves-the-right-task-and-reports-every-review.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: low
    ref: "docs/tasks/task.282.review-task-resolves-the-right-task-and-reports-every-review/task.282.implementation.1.review-task-resolves-the-right-task-and-reports-every-review-initial-run.md:147"
    anchor_check: unchecked-text
    finding: "The QA Cycle 3 entry has Gate Result PASS (96/100) but no Action line, while cycles 1 and 2 each carry one."
    suggested_action: "Add the Action line to the Cycle 3 entry so the accepting route is recorded explicitly."
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: "The work item's frontmatter has no pr_number field, although PR #921 is open for this work."
    suggested_action: "Set pr_number to 921 in the work item frontmatter."
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.282.review-task-resolves-the-right-task-and-reports-every-review/task.282.review-task-resolves-the-right-task-and-reports-every-review.md:303"
    anchor_check: unchecked-text
    finding: "The Change Log has no row for the cycle 3 QA gate PASS (96/100)."
    suggested_action: "Append a Change Log row recording the cycle 3 QA gate PASS."
  - id: PC-4
    category: scope
    severity: low
    confidence: medium
    ref: "shared/resources/resolve-bare-task.sh"
    anchor_check: no-line
    finding: "The PR adds a resolver script and its test that the work item text does not name in its Files Summary."
    suggested_action: "Name the helper script and its test in the task's Files Summary."
truncated_count: 0
```

## Recommended Actions

1. Commit the three document fixes (PC-1, PC-2, PC-4) with the acceptance commit. PC-3 needs nothing.
