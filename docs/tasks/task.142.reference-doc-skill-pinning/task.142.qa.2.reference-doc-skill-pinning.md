# QA Report: Task 142 - Pin the hand-written reference docs to the skills they describe (cycle 2)

**Task**: [Link to task document](./task.142.reference-doc-skill-pinning.md)
**Gate File**: [task.142.gate.2.reference-doc-skill-pinning.yml](./task.142.gate.2.reference-doc-skill-pinning.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review after `/finalise` run 1 halted on four criteria and the task was re-scoped: two spy-based cost tests were added and two criteria moved to Deferred Work. The cycle-2 refute pass found that the cost tests measure a helper the live assertions do not call.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

---

## Re-Review Context

| Previous finding | Status |
| :--- | :--- |
| Gate 1 CR-1 — substring flag match | NOT FIXED (advisory follow-up, unchanged) |
| Gate 1 CR-2 — unused activation `flags` field | NOT FIXED (advisory follow-up, unchanged) |
| finalise run 1 gaps AC7/AC8 (untested) | FIXED — two tests added, mutation-proven |
| finalise run 1 gaps AC9/AC16 (post-merge) | Re-scoped to Deferred Work (user-approved) |

## New Findings This Cycle

- **[medium]** `tests/reference-doc-skill-pinning.test.js:144` — the cost tests spy on `resolveCorpus()`, but the live-corpus assertions repeat its lookups inline, so the spied code and the checked code differ → route the assertions through `resolveCorpus()`.
- **[low]** `tests/reference-doc-skill-pinning.test.js:330` — `withSpies` skips a non-function target silently, so "no spies installed" passes as "nothing called" → assert the installed count.
- **[low]** `tests/reference-doc-skill-pinning.test.js:340` — `withSpies` would restore before async work finishes if `fn` ever became async → reject a thenable; name the destructured-import blind spot.

### Review Methodology

Direct tools; Step 3b as one Explore subagent over the whole `origin/develop...HEAD` diff (1956 lines) with the cycle-2 REFUTE PASS directive. `code_review_blocking=true`: CR-1 (bug, high confidence) entered `top_issues[]`; CR-2/CR-3 advisory.

Re-review scope: unscoped (cycle 2 — whole branch diff, refute pass).

Step 4b: not applicable — no runnable prose in the change set.

## Code Review

**Correctness bugs (3):** CR-1 [medium/high], CR-2 [low/medium], CR-3 [low/low] — as above.

## Test Artifacts

```bash
command node --test tests/reference-doc-skill-pinning.test.js   # 17 pass
npm run ci:fast   # 4714 pass, 0 fail, 1 skipped (symlinks aside)
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: fix CR-1 (and CR-2/CR-3 while in the file), then cycle 3.
