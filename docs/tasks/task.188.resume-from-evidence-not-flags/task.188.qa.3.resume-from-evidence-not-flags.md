# QA Report: Task 188 - Resume from evidence, not flags (cycle 3)

**Task**: [Link to task document](./task.188.resume-from-evidence-not-flags.md)
**Gate File**: [task.188.gate.3.resume-from-evidence-not-flags.yml](./task.188.gate.3.resume-from-evidence-not-flags.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fixes hold. The merge reconciliation now resolves its own platform, the tick check has a
`ticked-unpushed` answer, the branch fallback needs `accepted`, and the Bitbucket claim is scoped.
No HIGH findings remain. Three narrower crash windows were found, and QA raised them after checking
each one. The medium one is an uncommitted Step 4 tick that still reads `not-ticked`.

**Overall Assessment**: CONCERNS. **Deployment Recommendation**: CONDITIONAL on CR3-1.

---

## Review Methodology

Direct tools, plus one read-only Explore reviewer, dispatched 14:41:52Z (`duration_ms` 128028).
Re-review scope: the 7 files changed since gate 2's head (`7f5ee934`), which is the default.
`SAFETY_REPROBE=false`. Step 4b is unchanged (`no-executable-blocks`, information only).

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| CR2-1: the reconciliation never ran (no `VCS` in its shell) | FIXED | the `VCS`-unset case resolves and reconciles; mutation proof red |
| CR2-2: a tick committed but not pushed read as not-ticked | FIXED | the `ticked-unpushed` case; mutation proof red |
| CR2-3: the branch fallback had no `accepted` precondition | FIXED | shape test; mutation proof red |
| CR2-4: the Bitbucket claim was false | FIXED | Step 3 rule scoped; task document corrected |

---

## New Findings This Cycle

- **[medium]** `skills/develop-next/SKILL.md:150`: a Step 4 tick edited but not committed reads `not-ticked`, so it is re-ticked (CR3-1).
- **[low]** `skills/develop-next/SKILL.md:167`: a reconciled merge skips Step 3's post-merge items, which are the head-branch delete and `pr-merged` (CR3-2).
- **[low]** `skills/develop-next/SKILL.md:102`: the success line prints even when the run-state write fails (CR3-3).

---

## Code Review

**Correctness bugs (3):** listed above. All three are medium confidence, so none was promoted
automatically. QA raised each one after checking it against the block and its fixtures.

**Cleanups (0).**

boundary: true. `probes_executed: 0` (finalise needs a DoD override).

---

## NFR Assessment

- **Performance**: PASS
- **Reliability**: CONCERNS (CR3-1 to CR3-3)
- **Security**: PASS. Evidence: reasoned. Probes executed: 0.
- **Maintainability**: PASS

---

## Final Assessment

**Gate Status**: CONCERNS. **Quality Score**: 90/100.
**Next Steps**: run `/qa-fix` for CR3-1 to CR3-3, then QA cycle 4.
