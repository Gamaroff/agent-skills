# QA Report: Task 115 - finalise publishes before it verifies (cycle 4)

**Task**: [Link to task document](./task.115.finalise-publish-time-checks.md)
**Gate File**: [task.115.gate.4.finalise-publish-time-checks.yml](./task.115.gate.4.finalise-publish-time-checks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: PASS

---

## Executive Summary

Cycle-4 re-review after the second review-driven fix cycle (`3b0d0d29`, answering `task.115.pr-review.2.*`). Scope: files changed since gate 3. All seven findings verified fixed; three pinned by new mutation-proved assertions. No new findings.

**Overall Assessment**: PASS · **Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Re-review scope**: since 2026-09-13T04:34:35Z (default) — `skills/finalise/SKILL.md`, `develop-pipeline-step-7-finalise.md`, `finalise-publish-boundary.test.mjs`, task doc, `CHANGELOG.md`.

| Prior finding (5c pass 2) | Status | Verification |
| --- | --- | --- |
| CR-1 unchecked `git add` before the guard | **FIXED** | Both add sites capture `ADD_EXIT` and HALT; scratch repo: bash exit 128 → HALT, zsh no-match → HALT; the happy re-run path (add ok, nothing staged) still takes the skip branch. Assertion mutation-proved. |
| CR-2 header filter dropped bullets | **FIXED** | `grep -E '^[+-]' \| grep -vE '^(\+\+\+\|---) '`; bullet-only edit → HALT. Mutation-proved. |
| CR-3 `git diff` missed staged-only changes | **FIXED** | `git diff HEAD -- "$f"`; staged-only status change → HALT. Mutation-proved. |
| CR-4 head check never tested the sampled head | **FIXED** | Poll writes `sampled_head` from `gh pr view --json headRefOid` (`unknown` → HALT); later turn re-derives `CI_HEAD_2`. Both halves mutation-proved. |
| PC-1 §8 claim | FIXED | Reworded: existing suites needed no change. |
| PC-2 §7 counts | FIXED | Counts removed; assertion groups described. |
| PC-3 CHANGELOG count | FIXED | "every assertion mutation-proved". |

## New Findings This Cycle

None. Searched: all fenced blocks in the two changed prose files re-extracted and parsed under `bash -n` and `zsh -n`; 4b executor on both (finalise 29 blocks 0/3/26, step-7 doc 11 blocks 0/2/9, 0 non-ok); the 6a add → guard → commit → push sequence re-read as one change and its re-run path exercised.

---

## Testing Scope
- [x] Automated: 105 targeted (7 suites); `ci:fast` 3257 / 3256 / 0 on the fix tree
- [x] Regression: contract/parity suites reading the changed docs
- [x] Code Review (Step 3b, narrowed, in-line — stated); Step 4b executor
- [x] Mutation-proof spot check (Step 3c): 5/5 `covered`

## Implementation Verification
Phases 1–4 PASS.

## Success Criteria
SC1–SC4 PASS; SC5 deferred by design (`parked_until: task.115 merged to develop`).

## Issues Found
HIGH: 0 · MEDIUM: 0 · LOW: 1 carried (unsubstituted `rollup()` placeholder waits `MAX_WAIT`).

## NFR Assessment
Performance PASS · Reliability PASS · Security PASS (reasoned, 0 probes) · Maintainability PASS.

## Code Review (Step 3b, narrowed)
**Correctness bugs (0).** **Cleanups (0).**
Mutation-proof spot check: registry add exit check dropped → red; `git diff` without `HEAD` → red; bullet-dropping filter restored → red; poll echoes its argument → red; re-derivation dropped → red — five of five, sources restored byte-identical.

## Final Assessment
**Gate Status**: PASS · **Quality Score**: 95/100 · **Deployment Recommendation**: APPROVED
**Next Steps**: 5c `/review-pr` pass 3, then `/finalise`.
