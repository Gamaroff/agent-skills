# QA Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Task**: [Link to task document](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Gate File**: [task.283.gate.6.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.6.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Gate Status**: PASS (95/100)

---

## Executive Summary

T283-QA-12 is fixed: the `set -e` shape that aborted silently now passes, and two mutations (the old `grep -c .` count and the old `awk -v`) each turn a test red. The wall-time criterion is met (QA report 5). The full CI-parity run is green. The scoped review found two low defects in the new code; both are reproduced and both fail closed.

**Overall Assessment**: PASS, with one low advisory
**Deployment Recommendation**: READY

This is the sixth gate. The owner allowed it after the five-gate budget was spent.

---

## Re-Review Context

| Gate 5 finding | Status | Evidence |
| -------------- | ------ | -------- |
| T283-QA-12 `set -e` abort on an empty released region | ✅ FIXED | Reproduction now exits 0 under bash and zsh; new test and two mutations |

## New Findings This Cycle

- **[low]** T283-QA-13: the added-bullet list in the HALT message is empty when the new bullet text duplicates a base bullet, and under `set -eo pipefail` with thousands of added bullets the assignment exits 141 with no message. Both reproduced by QA (3000 bullets; duplicate bullet). The block still exits non-zero in both, so it fails closed.

---

## Review Methodology

Re-review scope: files changed since gate 5's head (`5584edb75…`; 2 files, generated copies excluded) — default.
Diff review: code review. One read-only Explore subagent, returned in 63 s.
CI-parity run on the server at `d59aa0410`: 8665 tests, 8662 pass, 0 fail, 3 skipped (exit 0).
Step 4b: the block is refused by the engine as `mutating`; committed tests execute it under bash and zsh.
`criteria-drift.js`: clean.

boundary: true. `probes_executed: 0`; the DoD will need an override.

mutation-proven: the fix author's two mutations were re-run by QA in this session as part of the fix; QA reproductions ran in scratch repos.

Not held by a test: the `git show` read-before-pipe guard. `git cat-file -e` runs first, so no failing case could be built; it is reasoned only.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: READY. The advisory T283-QA-13 and the five sibling `grep -c .` counts are follow-up work.
