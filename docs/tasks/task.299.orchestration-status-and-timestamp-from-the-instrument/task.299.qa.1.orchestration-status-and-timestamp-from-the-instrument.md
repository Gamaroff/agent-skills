# QA Report: Task 299 - Orchestration reads status and time from the instrument

**Task**: [Link to task document](./task.299.orchestration-status-and-timestamp-from-the-instrument.md)
**Gate File**: [task.299.gate.1.orchestration-status-and-timestamp-from-the-instrument.yml](./task.299.gate.1.orchestration-status-and-timestamp-from-the-instrument.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: CONCERNS

---

## Executive Summary

The prose fixes (12 time placeholders, two background-form notes) and the bundled copies are correct, and `ci:fast` is green (8461 pass, 0 fail). The guard test, the task's main deliverable, misses several shapes it claims to catch and has no non-vacuity floor on its status rule.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one read-only Explore reviewer for the diff (first review: whole branch diff, bundled copies excluded, 1178 lines). Diff review: code review. Step 4b: not applicable in effect, because the engine reports 0 changed blocks across the six edited files (the edits are prose and inline spans). CI on 5cf248b4a0db: pending (`CI_SUMMARY`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Measure | PASS | Verified | Commands, counts and exclusions recorded in the implementation report Decisions Log |
| Phase 2: Fix | PASS | Verified | Diff shows `date -u` named at every placeholder; `bundle:check` in sync |
| Phase 3: Guard | CONCERNS | Partial | Guard exists and is mutation-proved on one shape; see Code Review |

**Overall Phase Completion**: 2/3 clean, 1 with concerns.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Measurement recorded | commands, counts, hits classed | In the implementation report; QA Findings table reproduced here | PASS | 7 status hits all exclusions; 12 time hits fixed |
| No unclassed hit | 0 | 0 (population test) | PASS | |
| Guard flags fixture and passes fixed form | yes | yes for the listed shapes | CONCERNS | Misses shapes in T299-QA-1/2 |
| Guard adds at most 3 s | 3000 ms | median 357 ms | PASS | runs 245, 370, 269, 357, 406 ms; load 4.56 |
| bundle:check, format:check, lint:shell, ci:fast | pass | pass | PASS | `npm run validate -- skills/nestjs-debug/` also passes |
| CHANGELOG entry | present | present | PASS | `changelog-cites.sh`: cites (task 299) |

`criteria-drift.js`: clean. `probe-boundary-signals.mjs`: no signals.

---

## Breaking Changes Validation

None documented; none found. PASS.

---

## Issues Found

### MEDIUM Severity Issues (3)

- **T299-QA-1** WRAPPED_STATUS misses quoted bare `"$?"`, `"exit $?"`, `"EXIT=$?".`, a following `; true`, and a trailing comment. Reproduced by running the regex; control `cmd; echo "rc=$?"` flagged.
- **T299-QA-2** No `&&` / `||` wrappers. Reproduced; control flagged.
- **T299-QA-3** No non-vacuity floor for the status rule on shipped text.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 0

---

## NFR Assessment

Performance PASS (357 ms median). Reliability CONCERNS (guard can read clean). Security PASS, evidence reasoned, `boundary: false`. Maintainability PASS.

---

## Code Review

**Correctness bugs (5):**
- [medium/high] `tests/orchestration-instrument-reads.test.js:41` — WRAPPED_STATUS misses claimed shapes (promoted: T299-QA-1)
- [medium/medium] `tests/orchestration-instrument-reads.test.js:41` — no `&&` / `||` (reproduced by QA, promoted: T299-QA-2)
- [medium/high] `tests/orchestration-instrument-reads.test.js:155` — no status non-vacuity floor (promoted: T299-QA-3)
- [low/medium] `tests/orchestration-instrument-reads.test.js:55` — time rule paired per file (disclosed in header; advisory)
- [low/medium] `tests/orchestration-instrument-reads.test.js:67` — `git ls-files` skips untracked new sources (advisory)

**Cleanups (1):**
- `skills/nestjs-debug/SKILL.md:938` — HTML comment inside the markdown template fence is copied into generated logs

mutation-proven: reverted `>> "$TEST_LOG"` is the developer's own proof (status shape → red); QA did not re-run mutations this cycle → dev-only.

---

## Regression Testing

Remote `ci:fast` green on this head per the implementation report; bundled copies in sync.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/orchestration-instrument-reads.test.js   # x5, all rc=0
npm run validate -- skills/nestjs-debug/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <6 files> --diff-base <merge-base> --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The deliverable fixes are good; the guard's claim is wider than its regex.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL — fix T299-QA-1..3.

---

**Next Steps**: `/qa-fix` the three guard findings, add a fixture per missed shape, re-run QA.
