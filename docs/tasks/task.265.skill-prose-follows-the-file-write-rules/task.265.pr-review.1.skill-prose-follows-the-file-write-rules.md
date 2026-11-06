# PR Review Report: PR #849 — feat(task.265): state the file-write rules once, add recipes and a heredoc ratchet

**Reviewed:** 2026-11-06
**PR:** [#849](https://github.com/Gamaroff/agent-skills/pull/849) — `feature/task.265.skill-prose-follows-the-file-write-rules` → `develop` (OPEN)
**Work item:** [`task.265.skill-prose-follows-the-file-write-rules.md`](./task.265.skill-prose-follows-the-file-write-rules.md) — resolved via `branch stem`
**Tracker:** none — the document carries no `github_issue` or `jira_key`
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`, pipeline Step 5c); the code lens ran in each of the three QA cycles. Excluded from the diff: `*/references/*` (bundled copies; `bundle --check` reports 0 problems).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.265.implementation.1.skill-prose-follows-the-file-write-rules-initial-run.md |
| Review report | ✅ | task.265.review.1.skill-prose-follows-the-file-write-rules.md |
| QA reports | 3 | qa.1, qa.2, qa.3 |
| Gate | PASS | task.265.gate.3.skill-prose-follows-the-file-write-rules.yml (95/100) |
| DoD | ❌ | not yet written; correct, `/finalise` is the next step |
| Sprint review | ❌ | same |
| Open bugs | 0 | |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Covered by the three QA reports; the conformance lens raised no coverage finding.

## Conformance Findings

[PC-1] trail · medium · confidence: high — docs/tasks/task.265.skill-prose-follows-the-file-write-rules/task.265.implementation.1.skill-prose-follows-the-file-write-rules-initial-run.md
  The implementation report held only a QA Cycle 1 entry, though gates 2 and 3 exist.
  → Add QA Cycle 2 and 3 entries and the Step 5c row. **Fixed in the working tree** (rides the acceptance commit).

[PC-2] trail · low · confidence: high — docs/tasks/task.265.skill-prose-follows-the-file-write-rules/task.265.implementation.1.skill-prose-follows-the-file-write-rules-initial-run.md:38
  The step 5-6 row still read Pending.
  → Mark it done. **Fixed in the working tree.**

[PC-3] consistency · medium · confidence: high — pr_number
  The task frontmatter has no `pr_number` although PR #849 is open.
  → Left for `/finalise`, which writes `pr_number` with `completed_date` at acceptance (the Step 7 pipeline doc).

[PC-4] consistency · low · confidence: medium — docs/tasks/task.265.skill-prose-follows-the-file-write-rules/task.265.skill-prose-follows-the-file-write-rules.md:38
  The Progress Tracking row and part of the Success Criteria checkboxes are unticked (14 remain; the cited "all" overstates it).
  → Left for `/finalise`, which ticks verified criteria.

## Code Review Findings

Skipped (`--no-code`); the code lens ran in QA cycles 1 to 3.

**Anchors:** 4 checked against `e76822a1` (via `head-branch`) — all verified.

## Machine-Readable Findings

```yaml
reviewed_gate: task.265.gate.3.skill-prose-follows-the-file-write-rules.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.265.skill-prose-follows-the-file-write-rules/task.265.implementation.1.skill-prose-follows-the-file-write-rules-initial-run.md"
    anchor_check: no-line
    finding: "The implementation report held only a QA Cycle 1 entry although gates 2 and 3 exist; fixed in the working tree."
    suggested_action: "Commit the updated report with the acceptance commit."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.265.skill-prose-follows-the-file-write-rules/task.265.implementation.1.skill-prose-follows-the-file-write-rules-initial-run.md:38"
    anchor_check: unchecked-text
    finding: "The step 5-6 row still read Pending; fixed in the working tree."
    suggested_action: "Commit the updated report with the acceptance commit."
  - id: PC-3
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number although PR 849 is open."
    suggested_action: "Let /finalise write pr_number at acceptance."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.265.skill-prose-follows-the-file-write-rules/task.265.skill-prose-follows-the-file-write-rules.md:38"
    anchor_check: unchecked-text
    finding: "The Progress Tracking row and part of the Success Criteria are unticked."
    suggested_action: "Let /finalise tick the verified criteria."
truncated_count: 0
```

## Recommended Actions

1. Run `/finalise` (writes `pr_number`, ticks the criteria and the registry row).
2. Commit the implementation report update with the acceptance commit.
