# PR Review Report: PR #770 — feat(task.238): QA loop acts on the signals it already has (#768)

**Reviewed:** 2026-10-28
**PR:** [#770](https://github.com/Gamaroff/agent-skills/pull/770) — `feature/task.238.qa-loop-acts-on-signals-it-has` → `develop` (OPEN)
**Work item:** [`task.238.qa-loop-acts-on-signals-it-has.md`](./task.238.qa-loop-acts-on-signals-it-has.md) — resolved via `branch-stem`
**Tracker:** [#768](https://github.com/Gamaroff/agent-skills/issues/768) — OPEN
**Verdict:** 🚨 REQUEST CHANGES

Context: this review was run by hand after the QA loop escalated at its limit (8 of 8). It is option 2
of the HALT message ("accept the current gate status"). The verdict comes from the deterministic
table. PC-3 is the escalation itself: the highest gate did not reach 5c, and cycle 8's fix has no gate.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.238.implementation.1.qa-loop-acts-on-signals-it-has-initial-run.md |
| Review report | ✅ | task.238.review.1.qa-loop-acts-on-signals-it-has.md |
| QA reports | 8 | task.238.qa.1–qa.8.qa-loop-acts-on-signals-it-has.md |
| Gate | CONCERNS | task.238.gate.8.qa-loop-acts-on-signals-it-has.yml (80) |
| DoD | ✅ | task.238.dod.1.qa-loop-acts-on-signals-it-has.md (an earlier run, GAPS) |
| Sprint review | ❌ | not yet — the task is `ready-for-review`; `/finalise` writes it |
| Open bugs | 1 | task.238.bug.17 (Ready for QA, fix `92e33b0f` ungated) |
| Handover | ❌ | none (none expected) |

## Acceptance Criteria Traceability

The conformance lens checked the success criteria against the diff. Its only coverage findings are
two LOW wording mismatches (PC-1, PC-2). The Phase 1 checkbox and the Overview still describe the
`pre-existing` fast-gate outcome, which QA cycle 6 deleted. SC-2 and SC-6 were amended to match.

## Conformance Findings

```
[PC-3] trail · high · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.implementation.1.qa-loop-acts-on-signals-it-has-initial-run.md:475
  The QA Cycle 8 entry for the highest gate (gate.8, CONCERNS 80, CR8-1 open) does not read
  Proceeding to 5c, and the cycle 8 fix 92e33b0f has never been gated.
  → Run one more QA cycle so a gate on 92e33b0f or later reaches 5c.

[PC-4] trail · medium · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.bug.17.open-coverage-reads-zero-for-unread-value-shapes.md
  bug.17 is still open (Ready for QA): no gate after its fix has verified it.
  → Verify bug.17 in the next QA cycle and close it once the gate confirms the fix.

[PC-5] consistency · medium · confidence: high — pr_number
  The work item frontmatter has no pr_number field, though the work is open as PR #770.
  → Add pr_number: 770 to the task frontmatter.

[PC-1] coverage · low · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:156
  The ticked Phase 1 checkbox describes a pre-existing red outcome that QA cycle 6 deleted.
  → Reword it to the two outcomes the amended SC-2 names, and point to Deferred Work.

[PC-2] coverage · low · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:34
  The Overview still promises three fast-gate outcomes, including the deleted pre-existing red.
  → Amend the Overview to match the amended SC-2.
```

## Code Review Findings

Skipped (`--no-code`). The code lens ran in every QA cycle in 5a, with `code_review_blocking=true`.

**Anchors:** 5 checked against `51dc912e74a8cf807b83fc335c929ca90fde8485` (via `head-branch`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.238.gate.8.qa-loop-acts-on-signals-it-has.yml
findings:
  - id: PC-3
    category: trail
    severity: high
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.implementation.1.qa-loop-acts-on-signals-it-has-initial-run.md:475"
    anchor_check: ok
    finding: The highest gate's QA cycle entry does not read Proceeding to 5c, and the cycle 8 fix 92e33b0f has never been gated.
    suggested_action: Run one more QA cycle so a gate on 92e33b0f or later reaches 5c.
  - id: PC-4
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.bug.17.open-coverage-reads-zero-for-unread-value-shapes.md"
    anchor_check: no-line
    finding: bug.17 is still open (Ready for QA) because no gate after its fix has verified it.
    suggested_action: Verify bug.17 in the next QA cycle and close it once the gate confirms the fix.
  - id: PC-5
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: The work item frontmatter has no pr_number field, though the work is open as PR #770.
    suggested_action: Add pr_number 770 to the task frontmatter.
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:156"
    anchor_check: ok
    finding: The ticked Phase 1 checkbox describes a pre-existing red outcome that QA cycle 6 deleted.
    suggested_action: Reword it to the two outcomes the amended SC-2 names, and point to Deferred Work.
  - id: PC-2
    category: coverage
    severity: low
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:34"
    anchor_check: unchecked-text
    finding: The Overview still promises three fast-gate outcomes, including the deleted pre-existing red.
    suggested_action: Amend the Overview to match the amended SC-2.
truncated_count: 0
```

## Recommended Actions

1. Run one more QA cycle on `92e33b0f` (resume at 5a with 1 more cycle). That clears PC-3 and PC-4.
2. Fix the doc-only findings PC-5, PC-1 and PC-2 in the task document.
3. Then `/finalise`.
