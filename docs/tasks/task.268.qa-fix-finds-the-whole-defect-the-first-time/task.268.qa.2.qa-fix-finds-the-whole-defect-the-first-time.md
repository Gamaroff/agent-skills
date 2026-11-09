# QA Report: Task 268 - qa-fix finds the whole defect the first time

**Task**: [Link to task document](./task.268.qa-fix-finds-the-whole-defect-the-first-time.md)
**Gate File**: [task.268.gate.2.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.2.qa-fix-finds-the-whole-defect-the-first-time.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's fixes closed the CHANGELOG and Step 7 findings. Its fix for the Step 4 guard introduced a HIGH bug: the block that refuses an unsubstituted slot also refuses a substituted one. The gate is FAIL until that is repaired.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| T268-QA-1 CHANGELOG entry | FIXED | `changelog-cites.sh task.268` prints `cites (task 268)` |
| T268-QA-2 Step 7 contradiction | FIXED | Step 7 now says to add the block, or post with a logged warning; names triggers (a) and (b) |
| T268-QA-3 Step 4 guard unrunnable | NOT FIXED | the placeholder is now a slot, but the refusal check inside the block is broken (T268-QA-4) |

### Review Methodology

Refute pass (cycle 2, one prior gate): whole branch diff, excluding generated copies and task documents, reviewed by a read-only Explore subagent that was told to find the false claim, starting with cycle 1's commit. Re-review scope: unscoped whole-branch diff (cycle 2 is always a full refute pass). Reviewer time: 21.7 s from the completion notice.

CI on b88d057e9078: head mismatch (PR head 91e2da1d39b5; the cycle 1 fix commit is local and not pushed)

Step 4b: the one changed fenced block (Step 4 guard) was executed by hand with the slot substituted (see below); the engine's fence form was not run, because the block has to be fixed first.

---

## New Findings This Cycle

- **[high]** `skills/qa-fix/SKILL.md:843` — the unsubstituted-slot check cannot pass once the slot is filled → T268-QA-4.
- **[medium]** `skills/qa-fix/SKILL.md:836` — prose offers `git add -N`, the block only refuses; a path with a space is split → T268-QA-5.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1: Step 3.5 probes | PASS | unchanged since gate 1 |
| 2: Step 2.6 moves | PASS | six moves, test pinned and mutation-proven in gate 1 |
| 3: Steps 4 and 7 | FAIL | Step 4 guard always refuses a filled slot |
| 4: shared doc + bundle | PASS | `bundle --check` 0 problems |

---

## Success Criteria Verification

Unchanged from gate 1 except the CHANGELOG criterion, which now passes. `criteria-drift.js`: clean.

---

## Issues Found

### HIGH Severity Issues (1)

**T268-QA-4** `skills/qa-fix/SKILL.md:843`. The `case` pattern holds the literal slot text. Substitution replaces every occurrence, so after substitution the pattern equals the variable's value and always matches. Reproduced with the block extracted and the slot replaced by `skills/qa-fix`: it prints `HALT: skills/qa-fix was not substituted…` and exits 1. The PR base has no such block, so b88d057e introduced it. In cycle 1 I verified the guard with a shell function that never contained the slot text, so the check could not have found this; the substitution path was the one to run.

### MEDIUM Severity Issues (1)

**T268-QA-5** `skills/qa-fix/SKILL.md:836`. Prose says "run `git add -N` … or refuse"; the block only refuses. `$CHANGED_PATHS` is word-split.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — FAIL
A guard that refuses every filled slot blocks Step 4 for any cycle that follows it literally.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: reasoned
- **Probes executed**: 0
- The Step 4 guard is a boundary (criteria signals `refused`, `is refused`). The hand reproduction does not count toward probes executed. After the fix the fence form (`--entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}'`) must run with a clean path, an untracked file and an empty slot.

### Maintainability — CONCERNS
Step 7 paraphrases the Step 2.6 triggers (CR-3); the test header still says four moves (CR-4).

---

## Code Review

**Correctness bugs (2):**
- [high/high] `skills/qa-fix/SKILL.md:843` — slot check matches its own substituted value (CR-1) → T268-QA-4.
- [medium/high] `skills/qa-fix/SKILL.md:836` — prose and block disagree; word-splitting (CR-2) → T268-QA-5.

**Cleanups (2):**
- `skills/qa-fix/SKILL.md:962` — restates the Step 2.6 triggers; omits the Struck mechanism block (CR-3).
- `tests/qa-fix-structural-move.test.js:8` — header comment still says a four-move menu (CR-4).

Provenance: the base branch holds no `changed-paths` text, so both bugs are new in this change. Reviewer line numbers were checked against the file and match.

---

## Regression Testing

Unchanged since gate 1: `ci:fast` green on this tree (7944 pass, 0 fail) after the cycle 1 fixes. That green is why this defect needs a behavioural probe: no test runs the Step 4 block.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence HIGH bug in a block this task added.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED until T268-QA-4 is fixed.

**Next Steps**: `/qa-fix` T268-QA-4 and T268-QA-5, probing the block with the fence form, then `/qa-task` cycle 3.
