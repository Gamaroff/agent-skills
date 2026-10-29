# QA Report: Task 239 - QA escalation and grant say what will run

**Task**: [Link to task document](./task.239.qa-escalation-and-grant-say-what-runs.md)
**Gate File**: [task.239.gate.4.qa-escalation-and-grant-say-what-runs.yml](./task.239.gate.4.qa-escalation-and-grant-say-what-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

This is cycle 4 of PR #779, at `978fa17d`. It is a scoped review of the 8 source files changed
since gate 3's head `274ebe31`. The reviewer re-derived the trip rule and the jq write set: the
cycle-3 qualifier is accurate, and the README lines now match the four fields the script writes.
Four lows remain, each a describer or a test the cycle-3 sweep did not reach. No HIGH or MEDIUM.

**Overall Assessment**: CONCERNS (low only)
**Deployment Recommendation**: READY for staging. Production is conditional on the four lows.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-239-QA3-CR-1: "flat" qualifier | ✅ FIXED | The reviewer showed "present at all three" follows from HIGH_N > 0, HIGH_{N-2} > 0 and the non-decreasing chain. One pronoun is ambiguous: now QA4-CR-3 |
| TASK-239-QA3-CR-2: grant script comment | ⚠️ PARTIAL | That comment is qualified, but two nearby comments miscount the fields. Now QA4-CR-2 |
| TASK-239-QA3-CR-3: README qa_phase | ✅ FIXED | Both READMEs list all four fields and are checked line by line. troubleshooting.md was not in scope of the check: now QA4-CR-1 |
| TASK-239-QA3-CR-4: plural slot | ✅ FIXED | Both templates take a list, and the template test pins it |

---

## New Findings This Cycle

- **[low]** `docs/reference/troubleshooting.md:192`: the write set omits `qa_phase`, and the parity loop does not read this file.
- **[low]** `shared/resources/grant-qa-cycles.sh:28,224`: "both fields" and "the three fields" where the jq write sets four.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:631`: "that cycle's 5a" can be read as the third granted cycle.
- **[low]** `evals/shared/tests/qa-escalation-template.test.mjs:258`: the new cases test only the in-test copy of the rule; the prose is not pinned.

---

## Review Methodology

- Re-review trigger: the previous gate was CONCERNS. Code moved since its head.
- Code review: one read-only Explore reviewer over `git diff origin/develop...HEAD` for the 8 source files changed since `274ebe31`, with the fix commit's diff read first. It ran for 111 s and every anchor was verified in-line.
- Convergence: HIGH sequence [0, 0, 0, 0], no trip. Route classifier: `continue (not-a-pass-gate)`. Narrowing: not signalled (no-medium).
- CI on `978fa17d`: validate, shellcheck, link-check and secret-scan pass; `test` was still pending when this gate was written.

## NFR Assessment

| NFR | Status | Notes |
| --- | --- | --- |
| Security | PASS | No accept/reject predicate changed |
| Performance | PASS | No runtime change |
| Reliability | PASS | No behaviour change |
| Maintainability | CONCERNS | Four low residues |

## Bug Status

| Bug | Status |
| --- | --- |
| [task.239.bug.1](./task.239.bug.1.third-strike-files-miss-loop-limit-strikes.md) | Closed |
| [task.239.bug.2](./task.239.bug.2.lock-restore-sentence-misstates-restore.md) | Closed |
