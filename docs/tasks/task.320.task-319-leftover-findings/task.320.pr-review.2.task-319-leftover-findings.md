# PR Review Report: PR #949 — fix(task.320): close the findings task 319 carried forward

**Reviewed:** 2026-11-26
**PR:** [#949](https://github.com/Gamaroff/agent-skills/pull/949) — `feature/task.320.task-319-leftover-findings` → `develop` (OPEN)
**Work item:** [`task.320.task-319-leftover-findings.md`](./task.320.task-319-leftover-findings.md) — resolved via `branch-stem`
**Tracker:** [#938](https://github.com/Gamaroff/agent-skills/issues/938) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`, Step 5c). Generated `*/references/*` bundled copies (18 files) excluded from the diff; none is named as a deliberate change by the work item.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.320.implementation.1.task-319-leftover-findings-initial-run.md |
| Review report | ✅ | task.320.review.1.task-319-leftover-findings.md |
| QA reports | 6 | task.320.qa.1 … qa.6 |
| Gate | WAIVED | task.320.gate.6.task-319-leftover-findings.yml (90) — residual accepted at the loop-limit escalation |
| DoD | ✅ | task.320.dod.1.task-319-leftover-findings.md (from the earlier finalise pass) |
| Sprint review | ❌ | not yet — written at acceptance |
| Open bugs | 3 | bug.3, bug.4 (Ready for QA), bug.5 (New) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

No coverage finding: the lens found every criterion addressed in the diff.

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md
  Bug 5 (T320-CR-601) still reads Status New; the gate 6 waiver accepts the residual, but the bug records neither a fix nor a deferral.
  → Record the owner's acceptance in bug 5 (Deferred, with a Status History row citing the gate 6 waiver).

[PC-2] trail · low · confidence: high — docs/tasks/task.320.task-319-leftover-findings/task.320.bug.3.opener-as-text-hides-a-fence.md
  Bug 3 still reads Status Ready for QA although QA cycle 6 has run.
  → Close bug 3 with a Status History row citing QA cycle 6's verification.

[PC-3] trail · low · confidence: high — docs/tasks/task.320.task-319-leftover-findings/task.320.bug.4.exact-key-the-parse-never-reached.md
  Bug 4 still reads Status Ready for QA although QA cycle 6 has run.
  → Close bug 4 with a Status History row citing QA cycle 6's verification.

[PC-4] consistency · low · confidence: high — docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md:12
  The work item's updated: 2026-11-25 is older than gate 6's updated: 2026-11-26T03:39:50Z.
  → Set updated: to 2026-11-26 and add a Change Log row for the waiver acceptance.

[PC-5] consistency · low · confidence: high — pr_number
  The work item's frontmatter has no pr_number field.
  → Add pr_number: 949 to the task frontmatter.
```

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 5 checked against `6501527418374178fd677c78e15673830876b5bf` (via `head-branch`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.320.gate.6.task-319-leftover-findings.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.bug.5.opener-inside-an-html-block-hides-a-fence.md"
    anchor_check: no-line
    finding: "Bug 5 (T320-CR-601) still reads Status New; the gate 6 waiver accepts the residual, but the bug records neither a fix nor a deferral."
    suggested_action: "Record the owner's acceptance in bug 5 (Deferred, with a Status History row citing the gate 6 waiver)."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.bug.3.opener-as-text-hides-a-fence.md"
    anchor_check: no-line
    finding: "Bug 3 still reads Status Ready for QA although QA cycle 6 has run."
    suggested_action: "Close bug 3 with a Status History row citing QA cycle 6's verification."
  - id: PC-3
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.bug.4.exact-key-the-parse-never-reached.md"
    anchor_check: no-line
    finding: "Bug 4 still reads Status Ready for QA although QA cycle 6 has run."
    suggested_action: "Close bug 4 with a Status History row citing QA cycle 6's verification."
  - id: PC-4
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md:12"
    anchor_check: ok
    finding: "The work item's updated: 2026-11-25 is older than gate 6's updated: 2026-11-26T03:39:50Z."
    suggested_action: "Set updated: to 2026-11-26 and add a Change Log row for the waiver acceptance."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "pr_number"
    fix_path: "docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md"
    anchor_check: no-line
    finding: "The work item's frontmatter has no pr_number field."
    suggested_action: "Add pr_number: 949 to the task frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Record the owner's acceptance in bug 5 so the waived MEDIUM finding is visibly deferred, not lost.
2. Close bugs 3 and 4 against QA cycle 6.
3. Add `pr_number: 949` and bump `updated:` on the task document.
