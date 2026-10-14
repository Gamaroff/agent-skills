# PR Review Report: PR #613 — feat(task.173): carry the 5c review into the acceptance commit

**Reviewed:** 2026-10-08
**PR:** [#613](https://github.com/Gamaroff/agent-skills/pull/613) — `feature/task.173.fold-5c-review-into-acceptance-commit` → `develop` (OPEN)
**Work item:** [`task.173.fold-5c-review-into-acceptance-commit.md`](./task.173.fold-5c-review-into-acceptance-commit.md) — resolved via `branch stem`
**Tracker:** [#540](https://github.com/Gamaroff/agent-skills/issues/540) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.173.implementation.1.fold-5c-review-into-acceptance-commit-initial-run.md |
| Review report | ✅ | task.173.review.1.fold-5c-review-into-acceptance-commit.md |
| QA reports | 7 | task.173.qa.1 … qa.7 |
| Gate | PASS | task.173.gate.7.fold-5c-review-into-acceptance-commit.yml (100) |
| DoD | ❌ | not yet — Step 7 writes it |
| Sprint review | ❌ | not yet — Step 7 writes it |
| Open bugs | 2 | task.173.bug.1, task.173.bug.2 — both still `Ready for QA` (PC-1) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The conformance lens found no coverage or scope gaps. Its findings concern the trail and the
document's consistency only.

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.bug.1.carry-restore-wipes-uncommitted-work.md:7
  Both bug reports (bug.1 and bug.2, line 7) still read "Ready for QA". QA report 2 records
  CR-1 and CR-2 as FIXED, and gate 7's bug_resolution says 0 remain, so the bug files disagree
  with the gate and stay open.
  → Close both bug files with a Status History row that cites the QA cycle-2 verification
    (task.173.qa.2), before /finalise.

[PC-2] consistency · medium · confidence: medium — docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.fold-5c-review-into-acceptance-commit.md
  The frontmatter has no pr_number. The only PR reference in the body is tinker-city's
  "PR #981" (lines 31 and 471), so /finalise Step 3a's fallback (skills/finalise/SKILL.md:458)
  would read PR 981 instead of #613, and its Step 6 could write pr_number: 981.
  → Add pr_number: 613 to the task frontmatter before Step 7.
```

## Code Review Findings

Skipped (`--no-code`). The QA step ran the code reviewer on every cycle. Gate 7 carries CR7-1 and
CR6-2 as advisory.

**Anchors:** 2 checked against `d0a95bdc8b0ff9006ab9c4bb72ceb75b52d2f4cb` (via `head-branch`). All
verified: PC-1 reads `ok`, and PC-2 reads `no-line`, because it names a whole document.

Scope: the diff excluded `*/references/*` (auto-generated bundled copies). The task does not name
the newly bundled `bb-auth.js`, `ci-tree-equivalence.js` or `doc-links.js` copies.

## Machine-Readable Findings

```yaml
reviewed_gate: task.173.gate.7.fold-5c-review-into-acceptance-commit.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.bug.1.carry-restore-wipes-uncommitted-work.md:7"
    anchor_check: ok
    finding: Both co-located bug reports still read Ready for QA although QA cycle 2 verified their fixes and gate 7 records 0 remaining.
    suggested_action: Close bug.1 and bug.2 with a Status History row citing the QA cycle-2 verification before /finalise.
  - id: PC-2
    category: consistency
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.fold-5c-review-into-acceptance-commit.md"
    anchor_check: no-line
    finding: The task frontmatter has no pr_number and the body names only tinker-city PR 981, which /finalise would read as this PR.
    suggested_action: Add pr_number 613 to the task frontmatter before Step 7.
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 613` to the task frontmatter (PC-2). Without it, `/finalise` reads the wrong PR.
2. Close `task.173.bug.1` and `task.173.bug.2`, citing QA cycle 2 (PC-1).
