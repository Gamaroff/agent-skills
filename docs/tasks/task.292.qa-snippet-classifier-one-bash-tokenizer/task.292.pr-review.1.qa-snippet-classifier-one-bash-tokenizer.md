# PR Review Report: PR #869 — feat(task.292): one bash tokenizer for the QA snippet classifier

**Reviewed:** 2026-11-10
**PR:** [#869](https://github.com/Gamaroff/agent-skills/pull/869) — `feature/task.292.qa-snippet-classifier-one-bash-tokenizer` → `develop` (open)
**Work item:** [`task.292.qa-snippet-classifier-one-bash-tokenizer.md`](./task.292.qa-snippet-classifier-one-bash-tokenizer.md) — resolved via `branch stem`
**Tracker:** issue #868 — open
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`, pipeline Step 5c). The code lens ran in each QA cycle. The 12 generated `references/` copies were excluded from the diff by design: they are byte copies of `shared/resources`, and the task's own Files Summary does not name them as a deliberate change.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.292.implementation.1.qa-snippet-classifier-one-bash-tokenizer-initial-run.md |
| Review report | ✅ | task.292.review.1.qa-snippet-classifier-one-bash-tokenizer.md |
| QA reports | 3 | qa.1, qa.2, qa.3 |
| Gate | CONCERNS | task.292.gate.3.qa-snippet-classifier-one-bash-tokenizer.yml (90) |
| DoD | absent | correct: the task is `ready-for-review` |
| Sprint review | absent | correct for the same reason |
| Open bugs | 0 | bug.1 and bug.2 are closed |
| Handover | absent | none expected |

## Acceptance Criteria Traceability

The lens traced the Success Criteria against the diff and tests. The `tokenize` unit tests, the T290-QA-3 gap rows, the fixed-seed differential slice, the `\s` allowlist test and the 20000-deep nesting test are all present in `shared/resources/tests/qa-execute-snippets.test.mjs`. The committed instruments are `scripts/qa-snippets-differential.mjs` and `scripts/qa-snippets-docscan.mjs`. Several checkboxes in the task document are unticked (PC-2).

## Conformance Findings

[PC-1] trail · medium · confidence: high — `docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.implementation.1.qa-snippet-classifier-one-bash-tokenizer-initial-run.md`
  The implementation report records its QA cycles under headings named Cycle 1 and Cycle 2, so no heading reads QA Cycle N, there is no Cycle 3 entry, and no PR Review row exists for step 5c to read.
  → Rename the headings to QA Cycle N, add the cycle 3 entry with its Action row, and add the PR Review row.

[PC-2] consistency · low · confidence: high — `docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.qa-snippet-classifier-one-bash-tokenizer.md`
  Success Criteria and Progress Tracking boxes for work the diff and QA 3 evidence show done are still unticked.
  → Tick the boxes the evidence supports and leave the rest open.

[PC-3] coverage · low · confidence: low — `shared/resources/tests/qa-execute-snippets.test.mjs:4957`
  The test for making the substitution scan recursive again is a 20000-level nesting check that might not go red for a differently shaped recursion.
  → Dismissed after measurement: a recursive scan overflows the stack near 7365 frames in this Node, so the 20000-deep test goes red for it. Not a committed mutation proof, so recorded rather than closed with a test.

## Code Review Findings

Skipped (`--no-code`): the code lens ran in QA cycles 1 to 3.

**Anchors:** 3 checked against `HEAD` (via local HEAD) — all verified (PC-1 and PC-2 name files, not lines).

## Machine-Readable Findings

```yaml
reviewed_gate: task.292.gate.3.qa-snippet-classifier-one-bash-tokenizer.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.implementation.1.qa-snippet-classifier-one-bash-tokenizer-initial-run.md"
    anchor_check: no-line
    finding: "The implementation report records its QA cycles under headings named Cycle 1 and Cycle 2, so no heading reads QA Cycle N, there is no Cycle 3 entry, and no PR Review row exists for step 5c to read."
    suggested_action: "Rename the headings to QA Cycle N, add the cycle 3 entry with its Action row, and add the PR Review row."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.qa-snippet-classifier-one-bash-tokenizer.md"
    anchor_check: no-line
    finding: "Success Criteria and Progress Tracking boxes for work the diff and QA 3 evidence show done are still unticked."
    suggested_action: "Tick the boxes the evidence supports and leave the rest open."
  - id: PC-3
    category: coverage
    severity: low
    confidence: low
    ref: "shared/resources/tests/qa-execute-snippets.test.mjs:4957"
    anchor_check: ok
    finding: "The test for making the substitution scan recursive again is a 20000-level nesting check that might not go red for a differently shaped recursion."
    suggested_action: "Dismissed after measurement: a recursive scan overflows the stack near 7365 frames, so the 20000-deep test goes red for it."
truncated_count: 0
```

## Recommended Actions

1. Fix PC-1 and PC-2 in the same carry (documents only): rename the implementation report's cycle headings, add cycle 3 and the PR Review row, tick the supported boxes.
2. File the follow-up task for T292-CR-1 to CR-3 (gate 3, `recommendations.future`).
