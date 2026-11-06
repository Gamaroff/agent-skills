# QA Report: Task 265 - Skill prose follows the file-write rules

**Task**: [task document](./task.265.skill-prose-follows-the-file-write-rules.md)
**Gate File**: [task.265.gate.3.skill-prose-follows-the-file-write-rules.yml](./task.265.gate.3.skill-prose-follows-the-file-write-rules.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: PASS

---

## Executive Summary

Both cycle 2 findings are fixed. The scoped review of the fix commit found one low false positive in the widened ratchet pattern, which QA reproduced. It fails loudly and affects no tracked file, so it does not gate.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
| --- | --- | --- |
| T265-QA-6 revert recipe asserts an empty `git diff --stat` | FIXED | `file-write-rules.md`, `mutation-proving.md` and `qa-task/SKILL.md` now verify with `cmp <snapshot> <file>`; 11 bundled `file-write-rules.md` copies match their source |
| T265-QA-7 ratchet misses a spaced heredoc; quadratic scan | FIXED | pattern allows spaces and a backslash, scan bounded to 200 characters; mutation-proven: restoring the old pattern turns 2 of 7 tests red |

## Testing Scope

Re-review scope: files changed since gate 2 (head `aea4fed6`), the fix commit `b77b1f51`, 354 patch lines. One independent read-only Explore subagent reviewed the diff.

CI on `b77b1f51`: validate, link-check, secret-scan, shellcheck and test pass. `bundle --check`: 0 problems. `ci:fast`: 7946 tests, 0 failed. Step 4b: 0 changed fenced blocks in `qa-task/SKILL.md` (the change is prose). Criteria drift: clean.

## New Findings This Cycle

- **[low]** `shared/resources/tests/payload-heredoc-ratchet.test.mjs:33` — the gap before the operator lets `cat <<< "x"` match. QA ran the pattern: true as written, false with `(?<!<)<<(?!<)`. `see cat and 1 << n` also matches and cannot be told apart from `cat > f << EOF` without losing the spaced form. No tracked line hits either, so the 32 counts hold (T265-QA-8).

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1 State the rule once | PASS | |
| 2 Mutation revert recipe | PASS | restated sites agree |
| 3 Gate write and fresh-body post | PASS | |
| 4 Ratchet | PASS | one low advisory (T265-QA-8) |
| 5 Bundle and sweep | PASS | 129 skills, 0 problems |

## Issues Found

LOW: 1 (T265-QA-8). HIGH: 0, MEDIUM: 0.

## NFR Assessment

Security PASS (`boundary: false`), Performance PASS, Reliability PASS, Maintainability PASS.

## Code Review

Independent reviewer, scoped diff. Anchor resolves (`ok`).

**Correctness bugs (1):** [low/medium] `payload-heredoc-ratchet.test.mjs:33` — see T265-QA-8.
**Cleanups (0).**

Boundary: false.

## Wall-time record at the PR head (added by `/finalise`, DoD run 1)

Success criterion 4 asks that `CI=true command npm test` stay within 10% of `develop`. Cycle 2 measured it once at `aea4fed6`: branch 167 s against `develop` 163 s (+2.5%). The DoD AC check found that reading was taken before the cycle 2 and 3 commits, so it was re-taken at the PR head `e76822a1`:

| Reading | Branch | Load average at start | Note |
| --- | --- | --- | --- |
| Cycle 2, `aea4fed6` | 167 s | 0.4 | `develop` 163 s at load 4.2 (+2.5%) |
| DoD run 1, `e76822a1` | 191 s wall (suite `duration_ms` 134,713) | 2.6 | `develop` not re-run: a clean worktree has no `.agents/skills` symlink and exits 1, so the run is not comparable |

The 191 s figure is higher than 167 s, and the load was 6.6 by the end of the run, so it is not a clean comparison with `develop`. What the 10% bound protects is the cost the branch added to the suite. The only test file the branch adds is `shared/resources/tests/payload-heredoc-ratchet.test.mjs`, run alone three times: 168 ms, 162 ms, 168 ms of a 134,713 ms suite (0.12%). The branch adds no other test file and no runtime code.

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: READY
