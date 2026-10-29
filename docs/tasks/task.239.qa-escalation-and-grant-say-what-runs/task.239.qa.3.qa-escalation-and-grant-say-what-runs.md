# QA Report: Task 239 - QA escalation and grant say what will run

**Task**: [Link to task document](./task.239.qa-escalation-and-grant-say-what-runs.md)
**Gate File**: [task.239.gate.3.qa-escalation-and-grant-say-what-runs.yml](./task.239.gate.3.qa-escalation-and-grant-say-what-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

This is cycle 3 of PR #779, at `274ebe31`. It is a scoped review of the 7 source files changed
since gate 2's head `31f6b48b`. Cycle 2 fixed all seven gate-2 findings. The medium one, bug.2,
is closed: the lock-restore sentence now HALTs and cites the resume contract's restore step. The
review found four low residues of the cycle-2 edits and no HIGH or MEDIUM finding.

**Overall Assessment**: CONCERNS (low only)
**Deployment Recommendation**: READY for staging. Production is conditional on the four lows.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-239-QA2-CR-1: lock-restore sentence (bug.2) | ✅ FIXED | Step 3 HALTs on a failed jq and cites **Restore the lock (both resume paths)**. The reviewer checked it against `restore_lock` and raised nothing |
| TASK-239-QA2-CR-2: route 2c and pre-grant MEDIUM | ✅ FIXED | The window note names route 2c, the grant sizes and the MEDIUM-0 floor; the reviewer checked it against `classifyLoopRoute` |
| TASK-239-QA2-CR-3: three-strike file on a loop limit | ✅ FIXED | The behavioural test carries a two-strike and a three-strike file. Dropping the "struck" label turns it red (qa-fix mutation) |
| TASK-239-QA2-CR-4: plural flat-count reading | ⚠️ PARTIAL | Rule 2 is plural, but the template slot and the CHANGELOG are singular. Now QA3-CR-4 |
| TASK-239-QA2-CR-5: "k cycles" | ⚠️ PARTIAL | Qualified at three sites, but the qualifier says "flat" where the trip is "present and not falling", and the grant script's comment was missed. Now QA3-CR-1 and CR-2 |
| TASK-239-QA2-CR-6: write-set describers | ⚠️ PARTIAL | Both READMEs name the field, but two note lines omit `qa_phase`. Now QA3-CR-3 |
| TASK-239-QA2-CR-7: vacuous guard | ✅ FIXED | Replaced by a per-file read check |

---

## New Findings This Cycle

- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:631`, `CHANGELOG.md:21` and `docs/reference/troubleshooting.md:192`: the qualifier calls the re-arm condition "flat". A rising 1, 2, 3 trips, a flat 0, 0, 0 does not, and 3, 2, 2, 2 trips at the fourth granted cycle.
- **[low]** `shared/resources/grant-qa-cycles.sh:233`: the header comment still says, unqualified, that a grant runs k cycles.
- **[low]** `skills/develop-task/README.md:361`, `skills/develop-story/README.md:376`: the note lines omit `qa_phase`, and the line-level check tests only the new field.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2015,2061` and `CHANGELOG.md:31`: the flat-count slot and the CHANGELOG are singular.

---

## Review Methodology

- Re-review trigger: the previous gate was CONCERNS. Code moved since its head.
- Code review: one read-only Explore reviewer over `git diff origin/develop...HEAD` for the 7 source files changed since `31f6b48b`, with the fix commit's own diff read first. It ran for 195 s and every anchor was verified in-line.
- Convergence: HIGH sequence [0, 0, 0], no trip. Route classifier: `continue (not-a-pass-gate)`. Narrowing: not signalled (no-medium).
- CI on `274ebe31`: green (validate, shellcheck, link-check, branch rule).

## NFR Assessment

| NFR | Status | Notes |
| --- | --- | --- |
| Security | PASS | No accept/reject predicate changed |
| Performance | PASS | No runtime change |
| Reliability | PASS | The damaged-lock case now has a defined next step |
| Maintainability | CONCERNS | Four low prose and test residues |

## Bug Status

| Bug | Status |
| --- | --- |
| [task.239.bug.1](./task.239.bug.1.third-strike-files-miss-loop-limit-strikes.md) | Closed (cycle 2) |
| [task.239.bug.2](./task.239.bug.2.lock-restore-sentence-misstates-restore.md) | Closed (this cycle) |
