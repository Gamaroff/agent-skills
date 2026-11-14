# QA Report: Task 308 - Pause commits cancel the step 7 CI poll

**Task**: [Link to task document](./task.308.pause-commits-cancel-the-step-7-ci-poll.md)
**Gate File**: [task.308.gate.1.pause-commits-cancel-the-step-7-ci-poll.yml](./task.308.gate.1.pause-commits-cancel-the-step-7-ci-poll.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-14
**Gate Status**: CONCERNS

---

## Executive Summary

The hook now holds the pause-commit push at steps 7 and 8, and finalise 6c reads its acceptance head from a recorded file instead of local `HEAD`. The behaviour works and its hook and reader tests are mutation-proved. Two medium findings remain: the new writer line is held by no test, and the docs misname the commit that carries a pause made during the 6c wait.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

First review, no prior gate. Direct tools plus one read-only Explore reviewer. Reviewer dispatch and return: not measured (completion notice reported 26.9 s). Diff review: code review. Step 4b: ran over `skills/finalise/SKILL.md`; 50 blocks found, 0 executed (48 mutating, 2 placeholder), both changed blocks mutating (the 6c poll starter and the later-turn reader); the reader's lines are executed by the committed tests instead. CI on 33c3c867bd72: pending.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: SHA sources | PASS | Verified | Table recorded in the task doc; fix disposition for the 6c later-turn read |
| Phase 2: Hold + head fix | CONCERNS | Partial | Writer line untested (T308-QA-1); doc wording (T308-QA-2) |
| Phase 3: Tests and docs | PASS | Verified | 17g moved to step 5, 17h/17i added, two finalise tests added |

**Overall Phase Completion**: 3/3 phases done, 1 with findings

---

## Success Criteria Verification

All criteria checked against the committed tests and code: step 7 pause is committed and not pushed (17h), step 5 still pushes (17g), step 8 still held (17f), the held commit leaves with the next push (17i), the later-turn head comes from the recorded file (two tests, mutation-proved). `criteria-drift`: clean. CHANGELOG cites `(task 308)`.

---

## Issues Found

### MEDIUM Severity Issues (2)

**T308-QA-1: writer line untested.** Bug report: [task.308.bug.1.step7-head-writer-untested.md](./task.308.bug.1.step7-head-writer-untested.md). Deleting `printf … > .claude/state/finalise-ci-head-2.txt` (SKILL.md:2274) leaves all tests green. Control: reverting the reader reds three tests.

**T308-QA-2: docs name the wrong carrier.** Bug report: [task.308.bug.2.pause-during-6c-wait-carried-by-step8.md](./task.308.bug.2.pause-during-6c-wait-carried-by-step8.md). A pause during the 6c wait follows the acceptance push, so Step 8's commit carries it.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

Performance PASS. Reliability PASS (a missing head HALTs). Security PASS, evidence `reasoned`: no input boundary, `boundary: false`, criteria signals empty. Maintainability CONCERNS (the two findings).

---

## Code Review

Advisory except the reproduced finding (5d). Reviewer reviewed 1 patch file, 6 files.

**Correctness bugs (2):**
- [medium/medium] `skills/finalise/SKILL.md:2274` — CR-1 said the writer reads an unbound `$CI_HEAD_2` and a stale head file could survive. Not reproduced: the same block compares `PR_HEAD` with `$CI_HEAD_2` and HALTs first, so an empty value cannot reach the writer, and the writer overwrites the file before any read. QA's own measurement found the real gap: the writer is untested (T308-QA-1, origin: code-review, reproduced by QA).
- [low/medium] `shared/resources/develop-pipeline-on-precompact.sh:416` — CR-2: a pause during the 6c wait is carried by Step 8, not finalise. Confirmed by reading (T308-QA-2).

**Cleanups (0).**

mutation-proven: delete the 6c writer line → finalise-publish-boundary tests all green → no-red-untested
mutation-proven: revert later-turn reader to `git rev-parse HEAD` → three finalise-publish-boundary tests red → covered
mutation-proven: remove the `7)` hold arm → hook scenario 17h red → covered

---

## Test Artifacts

### Test Commands Executed
```bash
npm run test:remote   # ci:fast on the LAN server: 3992 ok, 0 not ok (dev run, same code)
node --test evals/shared/tests/finalise-publish-boundary.test.mjs
bash shared/resources/develop-pipeline-on-precompact.test.sh   # 40 passed
python3 skills/create-skill/scripts/quick_validate.py skills/finalise   # ok
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium findings, no high.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — fix T308-QA-1 and T308-QA-2.

**Next Steps**: `/qa-fix` for both findings, then re-review.
