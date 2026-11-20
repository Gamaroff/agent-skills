# QA Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Task**: [Link to task document](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Gate File**: [task.283.gate.3.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.3.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Gate Status**: CONCERNS (80/100)

---

## Executive Summary

Cycle 2's fixes hold: the mixed hunk, the digit heading style, the `*` bullet and the priority normalisation each have a test that goes red when the fix is reverted, and the full CI-parity run is green (8642 tests, 8639 pass, 0 fail). The scoped review reproduced one more medium defect in the same CHANGELOG block: a bullet that replaces a non-bullet line passes. The wall-time measurement is running.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| -------------- | ------ | -------- |
| T283-QA-7 mixed hunk passes | ⚠️ PARTIAL | Mixed-hunk test passes under bash and zsh; the new defect T283-QA-10 is the same heuristic failing on a neighbouring shape |
| T283-QA-8 heading style, `*` bullet, no-heading note | ✅ FIXED | Three tests per shell; reviewer found no defect |
| T283-QA-9 priority not normalised | ✅ FIXED | `priorityCell` lowercases and defaults to `medium`; reviewer found no regression |
| T283-QA-3 wall time unmeasured | ❌ NOT FIXED | Measurement started 04:29Z, writing `.claude/state/walltime-283.tsv` |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-3-develop-loop.md:401` — `old` counts every removed line, so a bullet replacing a heading, blank or prose line passes → T283-QA-10
- **[low]** CR-2 (diff against the base tip, not the merge-base) and CR-3 (a string-presence test asserts nothing about behaviour): folded into T283-QA-10.

---

## Review Methodology

Re-review scope: files changed since gate 2 (head `2065f0929cdee99fd6326f5c0ffbbe2d7cfd18f9`; 5 files, generated copies excluded) — default.
Diff review: code review. One read-only Explore subagent; dispatched 04:29:25Z, returned in 64.4 s (`duration_ms` 64351).
Step 4b: the CHANGELOG block is refused by the engine as `mutating`; the committed tests execute it under bash and zsh.
CI on `bbe0a3709`: not re-read; the CI-parity run on the server was green on the same tree.

---

## Success Criteria Verification

`criteria-drift.js`: clean. `changelog-cites.sh task.283`: cites. The performance criterion is **unverified** pending the measurement (T283-QA-3).

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `shared/resources/develop-pipeline-step-3-develop-loop.md:401` — `extra = nb - old` counts non-bullet removals → T283-QA-10. Reproduced: control exits 1 with the HALT; "### Fixed" plus blank replaced by a bullet exits 0; a prose line replaced by a bullet exits 0.
- [low/medium] `…:399` — diff against the base tip, argued from the code, not run (CR-2).
- [low/high] `shared/resources/tests/develop-loop-changelog-placement.test.mjs:236` — a string-presence test (CR-3).

**Provenance:** all in code this branch adds; none `pre-existing`.

boundary: true. `probes_executed: 0`; the DoD will need an override.

mutation-proven: the cycle 2 fixes were each reverted in this session and the named test went red, then restored (`an edit beside a new entry…`, `a "* " bullet…`, `a "## [1.1.0]" heading style…`, `no release heading at all…`, the renderer's priority test) → covered
mutation-proven: this cycle's reproductions ran against scratch repos; the working tree was not mutated.

---

## Test Artifacts

```bash
CI=true command node --test shared/resources/tests/develop-loop-changelog-placement.test.mjs   # 21 pass
CI=true command node --test shared/resources/tests/render-task-issue-body.test.mjs             # 7 pass
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100 (performance CONCERNS, reliability CONCERNS)
**Deployment Recommendation**: CONDITIONAL — T283-QA-10 fixed; T283-QA-3 recorded or amended by an approver.
