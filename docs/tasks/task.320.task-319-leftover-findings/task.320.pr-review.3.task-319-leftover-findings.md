# PR Review Report: PR #949 — fix(task.320): close the findings task 319 carried forward

**Reviewed:** 2026-11-26
**PR:** [#949](https://github.com/Gamaroff/agent-skills/pull/949) — `feature/task.320.task-319-leftover-findings` → `develop` (OPEN)
**Work item:** [`task.320.task-319-leftover-findings.md`](./task.320.task-319-leftover-findings.md) — resolved via `branch-stem`
**Tracker:** [#938](https://github.com/Gamaroff/agent-skills/issues/938) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.320.implementation.1.task-319-leftover-findings-initial-run.md |
| Review report | ✅ | task.320.review.1.task-319-leftover-findings.md |
| QA reports | 7 | task.320.qa.1 to qa.7 |
| Gate | CONCERNS | task.320.gate.7.task-319-leftover-findings.yml (90), no open entry; QA Cycle 7 reads `Proceeding to 5c` |
| DoD | ✅ | task.320.dod.1, dod.2 (gaps; run 3 follows at Step 7) |
| Sprint review | ❌ | expected: the task is not yet accepted |
| Open bugs | 1 | task.320.bug.5 (deferred to task.326; header still reads New, see PC-1) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The traceability is unchanged from pr-review 2. Criterion 1 is amended: the HTML-block case moves to task.326, approved by the owner. QA report 7 maps all 17 criteria.

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — docs/tasks/task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md:7
  Bug 5's header still reads Status New. Its last Status History row says it was deferred to task.326 with the owner's approval.
  → Set the header Status to Deferred (to task.326), so it matches the recorded deferral.

[PC-2] trail · low · confidence: low — docs/tasks/task.320.task-319-leftover-findings/task.320.implementation.1.task-319-leftover-findings-initial-run.md:40
  The QA-loop phase row stops at cycle 6 and gate 6. The Completion section says QA Iterations 6, but QA cycle 7 and gate 7 exist.
  → Add cycle 7 and gate 7 to the phase row, and update QA Iterations to 7.
```

## Code Review Findings

Skipped (`--no-code`). The code lens ran in QA cycle 7 (5a).

**Anchors:** 2 checked against `dbdb8f1395ed` (via `head-branch`). All are verified (1 `ok`, 1 `unchecked-text`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.320.gate.7.task-319-leftover-findings.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md:7"
    anchor_check: ok
    finding: "Bug 5 still has the header Status New while its last Status History row records the deferral to task.326."
    suggested_action: "Set the header Status to Deferred (to task.326) so it matches the recorded deferral."
  - id: PC-2
    category: trail
    severity: low
    confidence: low
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.implementation.1.task-319-leftover-findings-initial-run.md:40"
    anchor_check: unchecked-text
    finding: "The QA-loop phase row and Completion section stop at cycle 6 although QA cycle 7 and gate 7 exist."
    suggested_action: "Add cycle 7 and gate 7 to the phase row and set QA Iterations to 7."
truncated_count: 0
```

## Recommended Actions

1. PC-1 and PC-2 are doc-only. Fix both in the 5c carry before Step 7.
