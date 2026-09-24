# QA Report: Task 145 - review-task: trace a criterion's stated outcome through the function that decides it (cycle 2)

**Task**: [Link to task document](./task.145.review-outcome-reachability-check.md)
**Gate File**: [task.145.gate.2.review-outcome-reachability-check.yml](./task.145.gate.2.review-outcome-reachability-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Gate Status**: FAIL

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1: branch element vacuous at 3 sites | FIXED | `/branch that fires/`. The phrase-only mutant is red at 4/4 sites, and the old regex with the same mutant is green. |
| QA-2: review-bug "fixed code" in a pre-fix review | PARTIAL | The wording now fits a pre-fix review, but the same defect exists at the three *other* pre-implementation sites (CR2-1), and the new wording mishandles a stale bug (CR2-3). |
| QA-3: wrong existence-check cross-reference | FIXED | "Checks 1–5 and 9" (review-task) and "Checks 1–6" (review-story), verified against each file's list. |
| CR-3 / CR-4 (advisory): reader fence handling | PARTIAL | The opening-side cases are fixed and self-tested. The closing-fence case is still open (CR2-4). |

## New Findings This Cycle

- **[high]** `skills/create-task/SKILL.md:433` (also review-task check 10 and review-story check 7): reachability is judged against today's code at pre-implementation sites. create-task's auto-fix rewrites intent into current behaviour → evaluate against the planned state (CR2-1).
- **[medium]** `tests/outcome-reachability-check.test.js`: the check's verdict sentence is not held (measured: inverting it leaves `fail 0`) → add a verdict element (CR2-2).
- **[medium]** `skills/review-bug/SKILL.md:82`: a stale bug's already-returning branch passes as "reachable" → route it to likely-already-fixed (CR2-3).
- **[low]** `tests/outcome-reachability-check.test.js`: a closing fence at the item indent does not end the item (CR2-4).
- Advisory: CR2-5 (backtick info string), CR2-6 (self-test fixture), CR2-7 (review-story hallucination-pattern line).

---

## Executive Summary

Cycle 1's fixes hold for what they addressed. The refute pass went looking for the claim that is
false, and found that the check, at its three pre-implementation sites, judges reachability against
code that the task under review is about to change. That is a HIGH finding. The population test also
holds the check's subject but not its verdict.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED until CR2-1 is fixed

---

## Testing Scope

### Review Methodology

The review used direct tools. The **cycle-2 refute pass** was an independent Explore reviewer over
the whole-branch diff (1586 lines), with the refute directive plus documentation-transition probes.
The reviewer ran the suite and probed the readers in memory. QA re-measured CR2-1 by reading and
CR2-2 by mutation (`cp` snapshot, restored; `git status --porcelain skills/` empty after).

Re-review scope: unscoped (cycle 2 is a full refute pass; `SAFETY_REPROBE` false, since the prior
security axis read `OK reasoned`).

Step 4b gives the same result as cycle 1. review-task and review-story show `zero-blocks-executed`,
which is pre-existing (identical on base). create-task and review-bug show `no-executable-blocks`.
The diff adds 0 fenced blocks.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: review-task check 10 | FAIL | Judged against today's code at a pre-implementation site (CR2-1) |
| Phase 2: sibling sites | FAIL | Same at create-task (with an auto-rewrite) and review-story; review-bug's stale case (CR2-3) |
| Phase 3: population test | CONCERNS | Verdict not held (CR2-2); closing-fence overreach (CR2-4) |
| Phase 4: docs and validation | PASS | All gates green |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Check 10 with worked example and severities | CONCERNS | Present, but it misfires on tasks that change the deciding function |
| Sibling sites carry their form | FAIL | CR2-1 at create-task and review-story |
| Test fails when the check or an element is removed | PASS for elements, CONCERNS overall | Elements are held (12/12). The verdict is not (CR2-2) |
| < 1 s, no network | PASS | |
| `ci:fast` / `bundle:check` / `check:generated` | PASS | 4000 tests, 3999 pass, 0 fail, 1 skipped |
| CHANGELOG, hand run recorded | PASS | The hand run's controls never changed the deciding function, which is why they could not see CR2-1 |

---

## Issues Found

HIGH: 1 (CR2-1, [bug 3](./task.145.bug.3.pre-implementation-state.md)) · MEDIUM: 2 (CR2-2 [bug 4](./task.145.bug.4.verdict-not-held.md), CR2-3 [bug 5](./task.145.bug.5.review-bug-stale-branch.md)) · LOW: 1 (CR2-4)

---

## NFR Assessment

- **Security — PASS.** Evidence: reasoned. Probes executed: 0. `boundary: false`.
- **Performance — PASS.**
- **Reliability — CONCERNS.** The check misfires on any task that changes its deciding function.
- **Maintainability — CONCERNS.** The verdict is not held by the population test.

---

## Code Review

Cycle-2 refute pass (independent Explore reviewer):

**Correctness bugs (5):**
- [high/high] `skills/create-task/SKILL.md:433` plus review-task check 10 and review-story check 7: pre-implementation state → **gate CR2-1**
- [medium/high] `tests/outcome-reachability-check.test.js:71`: verdict not held → **gate CR2-2**
- [medium/medium] `skills/review-bug/SKILL.md:82`: stale bug branch → confirmed by QA → **gate CR2-3**
- [low/high] `tests/outcome-reachability-check.test.js:172`: closing-fence overreach → **gate CR2-4**
- [low/medium] `tests/outcome-reachability-check.test.js:88`: backtick info string or 4+ space indent opens a fence → advisory (CR2-5)

**Cleanups (2):**
- `tests/outcome-reachability-check.test.js:249`: sibling fixture says "a branch", so its doesNotMatch cannot fail (CR2-6)
- `skills/review-story/SKILL.md:960`: the hallucination-pattern line is missing (CR2-7)

**Boundary rule:** `boundary: false`, `probes_executed: 0`.

**Mutation-proof spot check:**

```markdown
mutation-proven: "branch that fires" phrase removed at each site → per-site test → covered (cycle-1 fix holds)
mutation-proven: review-bug verdict replaced with "Never flag it." → no test red → no-red-untested (CR2-2)
mutation-proven: review-task "Confirm … branch that fires" bullet deleted → no test red → no-red-untested (CR2-2)
```

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` cycle 2 on CR2-1 through CR2-4, plus the cheap advisories CR2-5 (info-string half), CR2-6 and CR2-7.
