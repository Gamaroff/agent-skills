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

## Records added at finalise (2026-11-20, head 1a3d7f56c)

**Renderer call sites, after the fix** (criterion 8): `git grep -n 'render-task-issue-body' -- 'skills/*/SKILL.md'` lists one invocation, `skills/ensure-task-github-issue/SKILL.md:175`, ahead of `tracker-issue.js --kind create`. `skills/ensure-task-github-issue/SKILL.md:164` and `skills/sync-github-task/SKILL.md:120` are prose only; the second says the renderer is deliberately not used on the update path. QA report 1's grep listed `sync-github-task:128` and predates the fix.

**Wall-time figure** (criterion 4): the five alternating pairs in QA report 5 (develop median 750 s, branch median 763 s, +1.7%) were taken before cycle-5 commit `d59aa0410` and the doc commits since, and no commit is named for them that is tree-equivalent to the head. The owner approved recording this as an override, not re-measuring: the later code change adds tests to one test file and edits one fenced block, and the margin to the 10% bound is 8.3 points. Recorded in the DoD as an override.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: READY. The advisory T283-QA-13 and the five sibling `grep -c .` counts are follow-up work.
