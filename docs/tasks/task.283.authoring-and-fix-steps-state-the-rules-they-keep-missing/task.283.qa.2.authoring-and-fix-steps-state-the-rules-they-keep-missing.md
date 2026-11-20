# QA Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Task**: [Link to task document](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Gate File**: [task.283.gate.2.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.2.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Gate Status**: CONCERNS (80/100)

---

## Executive Summary

Cycle 1's fixes hold: the unfetched-base and failed-diff guards HALT, the `sync-github-task` change is reverted, and the CHANGELOG entry exists. The cycle 2 refute pass found three new medium defects in the same two artefacts (the CHANGELOG block and the renderer), each reproduced by execution with a passing control. The wall-time criterion is still unmeasured.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| -------------- | ------ | -------- |
| T283-QA-1 no CHANGELOG entry | ✅ FIXED | `changelog-cites.sh task.283` prints `cites (task 283)`; Step 3 block run on this tree, base `develop`, exits 0 |
| T283-QA-2 sync-github-task calls renderer | ✅ FIXED | `git diff origin/develop --stat -- skills/sync-github-task` is one line; `bundle --check` 0 problems. Residual: CR-4 (low), the divergence is documented, not resolved |
| T283-QA-3 wall time unmeasured | ❌ NOT FIXED | Carried to gate 2 under the same id; needs measurement or an approved amendment |
| T283-QA-4 render block inputs unbound | ✅ FIXED | `:` guards added as the gate asked. Residual: CR-7 (low), the block still has no writer of its own |
| T283-QA-5 CHANGELOG block fails open on unfetched base | ✅ FIXED | Two tests per shell; see mutation proofs |
| T283-QA-6 vacuous control test | ✅ FIXED | Replaced with a renderer call. Residual: CR-5 (low), the test file still asserts the un-normalised priority |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-3-develop-loop.md:392` — a mixed hunk (an edited shipped bullet beside a new one) passes → T283-QA-7
- **[medium]** `shared/resources/develop-pipeline-step-3-develop-loop.md:389` — a non-`v` heading style, or a `* ` bullet, passes vacuously → T283-QA-8
- **[medium]** `shared/resources/render-task-issue-body.js:119` — priority printed un-normalised; the old template lowercased it and defaulted to `medium` → T283-QA-9
- **[low]** CR-4, CR-6, CR-7: advisory, listed in the gate's `recommendations`.

---

## Review Methodology

Re-review scope: unscoped, refute pass (cycle 2 is always the whole `origin/develop...HEAD` diff, 12 files; generated `skills/*/references` copies excluded).
Diff review: code review. One read-only Explore subagent; dispatched 04:07:53Z, returned in 78.9 s (`duration_ms` 78850).
Step 4b: the changed CHANGELOG block in `develop-pipeline-step-3-develop-loop.md` and the render block in `ensure-task-github-issue/SKILL.md` were refused by the engine as `mutating` (`changed-blocks-not-executed`); the committed tests execute the CHANGELOG block under bash and zsh instead. `ensure-task-github-issue` reports `no-executable-blocks`. Nothing was run in the live tree.
CI: the CI-parity run at the pre-fix tree had 8633 tests, 8629 pass, 1 fail (a Change Log row dated after `updated:`, my own error, fixed and re-run in `tests/work-item-artifact-naming.test.js`, 6 of 6). No full-suite run covers `2065f0929`. CI read of PR #922: not re-read this cycle (no push-time result before the gate).

---

## Success Criteria Verification

`criteria-drift.js`: clean (no criterion changed). `changelog-cites.sh task.283`: cites. Boundary signals: none in the criteria. The performance criterion (wall time within 10% of `develop`) is **unverified** (T283-QA-3).

---

## Code Review

**Correctness bugs (7):**
- [medium/high] `shared/resources/develop-pipeline-step-3-develop-loop.md:392` — mixed hunk passes → T283-QA-7. Reproduced: control exits 1 with the HALT, mixed hunk exits 0.
- [medium/high] `shared/resources/develop-pipeline-step-3-develop-loop.md:389` — vacuous threshold and `* ` bullet → T283-QA-8. Reproduced: both exit 0 with no output.
- [medium/high] `shared/resources/render-task-issue-body.js:119` — priority → T283-QA-9. Reproduced: `High` and `—`.
- [low/medium] `skills/sync-github-task/SKILL.md:120` (CR-4), `shared/resources/tests/render-task-issue-body.test.mjs:55` (CR-5), `shared/resources/render-task-issue-body.js:51` (CR-6), `skills/ensure-task-github-issue/SKILL.md:196` (CR-7) — advisory.

**Provenance:** all three promoted findings are in code this branch adds, so none is `pre-existing`.

boundary: true. The CHANGELOG block is a repository-state boundary the probe engine cannot reach (refused as `mutating`); `probes_executed: 0`, so the DoD will need an override.

mutation-proven: removed the `git rev-parse --verify` ref check → `bash: an unfetched base HALTs instead of passing` and the zsh twin went red → covered
mutation-proven: replaced the `DIFF_RC` exit-code check with `true` → `a git diff that fails with the base present HALTs (corrupt index)` (bash and zsh) went red → covered
mutation-proven: this cycle's reproductions were run against copies in a scratch directory; the working tree was not mutated.

---

## Test Artifacts

```bash
CI=true command node --test shared/resources/tests/develop-loop-changelog-placement.test.mjs   # 13 pass
CI=true command node --test shared/resources/tests/render-task-issue-body.test.mjs             # 6 pass
CI=true command node --test tests/work-item-artifact-naming.test.js                            # 6 pass
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100 (performance CONCERNS, reliability CONCERNS)
**Deployment Recommendation**: CONDITIONAL — T283-QA-7, -8, -9 fixed; T283-QA-3 measured or amended by an approver.
