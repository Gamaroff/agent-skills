# QA Report: Task 166 - Give measured non-functional criteria a defined path through review and finalise (cycle 3)

**Task**: [task.166.measured-non-functional-criteria.md](./task.166.measured-non-functional-criteria.md)
**Gate File**: [task.166.gate.3.measured-non-functional-criteria.yml](./task.166.gate.3.measured-non-functional-criteria.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate.2](./task.166.gate.2.measured-non-functional-criteria.yml) CONCERNS 70/100. Fix commit `467351c0`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR2-1 (medium) bound rule stale at four sites | FIXED | One wording at check 4, Issues to Flag, pin, CHANGELOG, task SC 3; mutation reverting Issues to Flag → red |
| CR2-2 (medium) missing-bound case ignored a planned test | FIXED | "a tested criterion needs no bound and no command"; mutation → red |
| CR2-3 (medium) unconditional FAIL claim | PARTIAL | CHANGELOG, deliverable 1, § 5, SC 1 fixed; Target Architecture line 88 missed (CR3-2) |
| CR2-4 (low) label normalisation | FIXED | asProse both sides; "unmeasured criterion" → red; code-formatted label matches |
| CR2-5 (low) count regex | FIXED, with residue | digits and stacked qualifiers caught; "Step 3" and "two kinds of evidence" over-match (CR3-5) |
| CR2-6 (low) header counts kinds | FIXED | |

---

## New Findings This Cycle

- **[medium]** `skills/review-task/SKILL.md:1124` — the measured branch accepts any bound with a command; finalise routes a test-assertable bound to the behaviour path (TASK-166-CR3-1)
- **[medium]** `task.166…md:88` — Target Architecture "FAIL when the bound is missing" (TASK-166-CR3-2)
- **[medium]** `task.166…md:5,34,152,232` — old rule and an unshipped remedy (TASK-166-CR3-3)
- **[low]** `finalise-dod-ac-kinds.test.mjs:85` — SC 1 claims pins the phrase list lacks (TASK-166-CR3-4)
- **[low]** count regexes over-match "Step 3 test-free kinds" and "two kinds of evidence" (TASK-166-CR3-5)
- **[low]** AC count check reads raw text, not normalised prose (TASK-166-CR3-6)
- **[low]** an untested unbounded runtime criterion draws two Important findings (TASK-166-CR3-7)

---

## Executive Summary

HIGH 0 for the third consecutive gate; MEDIUM 2 → 3 → 3. The deliverable's shipped prose is close; the residue is one real rule mismatch (CR3-1) and task-document restatements that cycle 2's sweep did not reach (CR3-2, CR3-3).

---

## Review Methodology

Direct tools plus one Explore subagent (181.8s). Cycle 3+ scope:

```
Re-review scope: files changed since gate 2 (head 6b89fef3ded1; 7 files) — default
```

`SAFETY_REPROBE`: false (gate.2 security PASS / reasoned). Loop routing: Convergence check — no trip (HIGH 0, 0, 0); `classifyLoopRoute` → `continue (not-a-pass-gate)`, route 2 declined (product-defect-signal).

CI (informational): hosted `Test` **success** on `6b89fef3` — the commit made over two local LOAD-SENSITIVE timing reds; in progress on `467351c0`.

---

## NFR Assessment

- **Security** — PASS · evidence: reasoned · probes executed: 0 · `boundary: false`
- **Performance** — PASS
- **Reliability** — PASS
- **Maintainability** — CONCERNS (task-document restatements drift from the shipped rule)

---

## Code Review

Run-level `code_review_blocking=true`: CR3-1, CR3-2, CR3-3 are `bug` + `confidence: high` and are promoted; CR3-4..7 confirmed by QA (grep of the quoted lines) and entered as low.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 70/100 · **Deployment**: CONDITIONAL — CR3-1, CR3-2, CR3-3 resolved
