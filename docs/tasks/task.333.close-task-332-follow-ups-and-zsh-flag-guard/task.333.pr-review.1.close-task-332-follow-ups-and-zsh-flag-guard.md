# PR Review Report: PR #966 — fix(task.333): guard zsh flag expansion, disclose unverified AC copies (#965)

**Reviewed:** 2026-11-28
**PR:** [#966](https://github.com/Gamaroff/agent-skills/pull/966) — `feature/task.333.close-task-332-follow-ups-and-zsh-flag-guard` → `develop` (OPEN)
**Work item:** [`task.333.close-task-332-follow-ups-and-zsh-flag-guard.md`](./task.333.close-task-332-follow-ups-and-zsh-flag-guard.md) — resolved via `branch-stem`
**Tracker:** [#965](https://github.com/Gamaroff/agent-skills/issues/965) — OPEN
**Verdict:** ⚠️ CONCERNS

Invoked by `/develop-task` Step 5c with `--no-code`: the QA loop already ran the code reviewer each cycle with `code_review_blocking=true`. Only the conformance lens ran, and the verdict comes from its findings alone. Diff scope: `origin/develop...origin/feature/task.333…` with `*/references/*` excluded. The four excluded files are bundle output, and the task's Files Summary item 10 names them as such.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.333.implementation.1.close-task-332-follow-ups-and-zsh-flag-guard-initial-run.md |
| Review report | ✅ | task.333.review.1.close-task-332-follow-ups-and-zsh-flag-guard.md |
| QA reports | 2 | task.333.qa.1.…md, task.333.qa.2.…md |
| Gate | PASS | task.333.gate.2.close-task-332-follow-ups-and-zsh-flag-guard.yml (100) |
| DoD | ❌ | not yet: status `ready-for-review`, `/finalise` has not run |
| Sprint review | ❌ | not yet: `/finalise` writes it |
| Open bugs | 0 | — |
| Handover | — | none |

## Acceptance Criteria Traceability

The lens raised no coverage finding. Every success criterion is traced in QA reports 1 and 2, `criteria-drift.js` is `clean`, and the lens found no criterion without a hunk or a test.

## Conformance Findings

```
[PC-1] trail · medium · confidence: medium — docs/tasks/task.333.close-task-332-follow-ups-and-zsh-flag-guard/task.333.implementation.1.close-task-332-follow-ups-and-zsh-flag-guard-initial-run.md:141 ⚠️ unverified anchor (out-of-range)
  The QA Cycle 2 entry had no Action or PR Review row, so the resume detector could not tell the gate reached 5c, and QA Cycle 1 had no Running qa-fix row.
  → Add the Action and PR Review rows to both QA Cycle entries.
```

Anchor note: the lens read the working-tree copy of the implementation report. That copy's updates since its Step 4 commit stay uncommitted until Step 8, as the pipeline intends, so line 141 is past the end of the committed copy at the PR head. The finding itself held. It is fixed in the working tree: Cycle 1 now has `**Action**: Running qa-fix`, and Cycle 2 has `**Action**: Proceeding to 5c` plus a `**PR Review**` row carrying this verdict. The fix rides the acceptance commit.

## Code Review Findings

Skipped (`--no-code`). The QA loop's code review is recorded in QA reports 1 and 2.

**Anchors:** 1 checked against `4ecd2dab92b8` (via `head-branch`); 1 unverified (out-of-range, explained above).

## Machine-Readable Findings

```yaml
reviewed_gate: task.333.gate.2.close-task-332-follow-ups-and-zsh-flag-guard.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.333.close-task-332-follow-ups-and-zsh-flag-guard/task.333.implementation.1.close-task-332-follow-ups-and-zsh-flag-guard-initial-run.md:141"
    anchor_check: out-of-range
    finding: "The QA Cycle 2 entry had no Action or PR Review row, so the resume detector could not tell the gate reached 5c, and QA Cycle 1 had no Running qa-fix row."
    suggested_action: "Add the Action and PR Review rows to both QA Cycle entries."
truncated_count: 0
```

## Recommended Actions

1. Commit the implementation report's rows with the acceptance commit (done in the working tree).
2. Proceed to `/finalise`.
