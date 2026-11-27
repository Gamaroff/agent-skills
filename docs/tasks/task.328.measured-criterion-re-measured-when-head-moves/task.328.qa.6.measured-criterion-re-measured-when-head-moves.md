# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 6)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.6.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.6.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.5.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.5.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-CR5-1 outcome order | ✅ FIXED | order check; restoring the old order turned the qa-task and identity tests red |
| T328-CR5-2 identity calibration | ✅ FIXED | a length-only comparison turned the calibration red |

## New Findings This Cycle

- **[medium]** Criterion 4 is unmet. It requires "unverified with re-measure", but cycle 3 removed "re-measure" and the parity test forbids it (T328-QA6-1). QA found this by re-reading the criterion against the paragraph. The reviewer did not raise it.
- **[low]** The deliberate unverified mapping is not stated (CR6-1; the reviewer's medium, downgraded because criterion 4 specifies the mapping). The order check is narrow (CR6-2). The locator is duplicated (CR6-3).

### Review Methodology

- Re-review scope: files changed since gate 5 (head e9c20b2b3; 3 files) — default.
- Diff review: code review. Reviewer returned in 69161 ms (`duration_ms`).
- Fast gate (LAN, `CI=true npm run test:remote`): 8948 tests, 8945 pass, 0 fail, TEST_EXIT=0.
- CI on dcbdab636748: green.
- This gate follows the owner-approved extra cycle. QA6-1 reverses the cycle-3 finding CR3-1, so it is escalated, not fixed.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–3, 6, 7, 9 | PASS | as cycle 1, plus the later tests |
| 4 | CONCERNS | the citation holds and the reason list is not restated; the "re-measure" wording the criterion names is absent (QA6-1) |
| 5 | PASS | amended wording (owner-approved) |
| 8 | PASS | fast gate 0 failed; CI green at dcbdab636; bundle:check 0 problems |

## Code Review

- [medium/medium] `skills/qa-task/SKILL.md:1106`: an undeclared remapping of Step 3's FAIL. Downgraded to low as T328-CR6-1, because criterion 4 specifies "unverified".
- [low/medium] `evals/shared/tests/qa-measured-figure-parity.test.mjs:69`: narrow order check. T328-CR6-2.
- [low/high] the locator is duplicated. T328-CR6-3.

mutation-proven: restored the cycle-4 order in qa-task → `qa-task grades a measured figure…` and `qa-task and qa-story hold the same measured-figure paragraph` red → covered
mutation-proven: sameParagraph compared lengths only → `calibration: the identity check sees a one-word drift…` red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability CONCERNS.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on criterion 4 (QA6-1).
