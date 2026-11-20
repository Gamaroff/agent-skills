# QA Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Task**: [Link to task document](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Gate File**: [task.283.gate.4.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.4.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Gate Status**: CONCERNS (82/100)

---

## Executive Summary

The cycle 3 rewrite holds: every earlier reproduction (bugs 6, 7 and 9) now HALTs and the block passes on this repository's CHANGELOG. The scoped review reproduced one medium defect in the rewrite: a failed `mktemp` is read as a pass. The wall-time measurement is still running.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| -------------- | ------ | -------- |
| T283-QA-10 non-bullet replacement passes | ✅ FIXED | Three replacement shapes, a moved base and a new file each fail or note correctly under bash and zsh |
| T283-QA-3 wall time unmeasured | ❌ NOT FIXED | Measurement running; no rows yet |

## New Findings This Cycle

- **[medium]** `develop-pipeline-step-3-develop-loop.md:408` — a failed `mktemp` leaves both variables empty and the block exits 0 on a misplaced bullet → T283-QA-11. Reproduced: control exits 1; `TMPDIR=/nonexistent/dir` exits 0.
- **[low]** CR-2: the shallow-clone HALT names no remedy and the closing prose is wrong for it. CR-3: under `set -e` the diff line exits silently. CR-4: the stated limits and cleanup are untested. All folded into T283-QA-11.

---

## Review Methodology

Re-review scope: files changed since gate 3's head (`bbe0a3709…`; 2 files, generated copies excluded) — default.
Diff review: code review. One read-only Explore subagent, returned in 92 s.
Step 4b: the block is refused by the engine as `mutating`; committed tests execute it under bash and zsh.
`criteria-drift.js`: clean.

boundary: true. `probes_executed: 0`; the DoD will need an override.

mutation-proven: scratch-repo reproductions only; the working tree was not mutated.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 82/100
**Deployment Recommendation**: CONDITIONAL — T283-QA-11 fixed; T283-QA-3 recorded or amended by an approver.
