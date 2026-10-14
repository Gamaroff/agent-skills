# QA Report: Task 188 - Resume from evidence, not flags (cycle 2)

**Task**: [Link to task document](./task.188.resume-from-evidence-not-flags.md)
**Gate File**: [task.188.gate.2.resume-from-evidence-not-flags.yml](./task.188.gate.2.resume-from-evidence-not-flags.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Testing Completed**: 2026-10-11
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 is a refute pass over the whole branch diff (head `7f5ee934`). It found that cycle 1's
fix for the Bitbucket reconciliation went too far: the new `${VCS:?}` guard refuses on every real run,
because each fenced block runs as its own shell and the block binds nothing. It also found that the
three-valued tick check reads only `origin`, so a tick that Step 4 committed but could not push still
routes back to Step 4. Both are high. Two medium findings correct an over-broad branch fallback and a
claim that does not hold for Bitbucket.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing locally (guard 44/44, shape 67/67)
- [x] Code on feature branch with open PR (#634, OPEN)

### Review Methodology

Direct tools plus one read-only Explore reviewer with the REFUTE directive (cycle 2 always runs on the whole
branch diff). Dispatched 14:17:13Z, returned 14:21:00Z (`duration_ms` 177536). Re-review scope:
unscoped. This is the cycle-2 refute pass over `origin/develop...HEAD`, 11 files and 1783 lines.
`SAFETY_REPROBE=false`, because gate 1 did not fail on security.

Step 4b: unchanged since cycle 1 (`no-executable-blocks`, information); the executed harness covers the blocks.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| CR-1: reconciliation silent on Bitbucket | **PARTIAL**. The block no longer runs silently, but now it never runs (CR2-1) | `skills/develop-next/SKILL.md:80` |
| QA-1: failed look reads as not-ticked | **FIXED** for fetch, read and parser failures; a local-only tick is still missing (CR2-2) | tick cases for a failed fetch, a roadmap not on origin, and a parser that cannot load |
| QA-2: prose boundary unprobed | Open, no code change (DoD override) | — |

---

## New Findings This Cycle

- **[high]** `skills/develop-next/SKILL.md:80`: the merge-flag block reads `VCS`/`BB_*` and binds none of them, so the cycle-1 guard refuses on every real run. Fix: resolve the platform inside the block and drop the INPUTS entry (CR2-1).
- **[high]** `skills/develop-next/SKILL.md:112`: the tick check reads only `origin`, so a tick committed but not pushed routes to a re-tick. Fix: add a fourth answer, `ticked-unpushed`, that routes to a push (CR2-2).
- **[medium]** `skills/develop-next/SKILL.md:84`: the branch fallback has no `accepted` precondition, so a reopened bug matches its earlier merged PR. Fix: apply the fallback only when the document is accepted or closed (CR2-3).
- **[medium]** `skills/develop-next/SKILL.md:475`: the claim that both arms judge the merge by state is false for Bitbucket. Fix: scope the claim (CR2-4).
- **[low]** `skills/develop-next/SKILL.md:81`: the Bitbucket guard checks `BB_API`, which is a constant, not the credential. This is subsumed by CR2-1's fix.

---

## Issues Found

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 1 (subsumed)

Details are in the gate's `top_issues[]` (CR2-1 to CR2-4). The two high findings were promoted
under `code_review_blocking`. QA raised the two medium-confidence findings itself after checking them:
CR2-3 against the bug floor in `roadmap-selection.md` (which includes `reopened`), and CR2-4 against
the Bitbucket arm at `skills/develop-next/SKILL.md:432`.

---

## NFR Assessment

### Performance: PASS
### Reliability: FAIL
CR2-1 leaves the merge reconciliation unable to run, and CR2-2 leaves the duplicate-tick path open.
### Security: PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0. The boundary is `true`, and no engine entry form reaches a fenced prose block, so finalise needs a DoD override.
### Maintainability: PASS

---

## Code Review

**Correctness bugs (5):**
- [high/high] `skills/develop-next/SKILL.md:80`: the block has no binding for `VCS`, so the guard refuses on every real run. Promoted as **CR2-1**.
- [high/high] `skills/develop-next/SKILL.md:112`: a tick that was committed but not pushed reads as `not-ticked`. Promoted as **CR2-2**.
- [medium/medium] `skills/develop-next/SKILL.md:84`: the branch fallback has no `accepted` precondition. Raised by QA as **CR2-3**.
- [medium/medium] `skills/develop-next/SKILL.md:475`: the Bitbucket arm does not judge by state. Raised by QA as **CR2-4**.
- [low/medium] `skills/develop-next/SKILL.md:81`: the guard checks `BB_API`, not the credential. Subsumed by CR2-1.

**Cleanups (0).**

boundary: true, with `probes_executed: 0` (DoD override).

Provenance: CR2-1 comes from cycle 1's fix. CR2-2's duplicate-tick path also exists on `origin/develop`,
where a resume goes straight to Step 4. It is still in scope, because the task's Benefits promise that
"a Change Log row never runs twice", so the matching output on base means the task is unfinished.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 40/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: run `/qa-fix` for CR2-1 to CR2-4, then QA cycle 3.
