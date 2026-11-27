# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 3)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.3.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.3.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.2.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.2.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-QA-1 criterion 5 | ✅ FIXED | Amended; criteria-drift reports `approved: true` (approver Lorien Gamaroff) |
| T328-CR2-2 "or equal to" missed | ✅ FIXED | new test passes; removing the group turns it red |
| T328-CR2-3 Step 3 paraphrase | ⚠️ PARTIAL | the figure-scope paraphrase is gone; the outcome wording still restates Step 3 (CR3-1) |
| T328-CR2-4 id read as bound | ✅ ACCEPTED | documented at the regex as an advisory false positive |

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1102` and qa-story: "re-measure" is used for every rejection. Step 3 uses it only for the head/load failures (T328-CR3-1).
- **[medium]** `skills/qa-task/SKILL.md:50`: `measured: true` is treated as Step 3's classification (T328-CR3-2).
- **[low]** `shared/resources/finalise-record-preflight.js:62`: lower, higher and bigger are missed (T328-CR3-3). Reproduced: `NUMERIC_BOUND.test` returns false for all three.
- **[low]** `evals/shared/tests/qa-measured-figure-parity.test.mjs:61`: the paraphrase guard is too narrow (T328-CR3-4).

### Review Methodology

- Re-review scope: files changed since gate 2 (head 4fc09e876341; 5 files) — default.
- Diff review: code review. Reviewer returned in 75715 ms (`duration_ms`).
- CI on 77c4e7dccc98: green.
- LAN fast gate: TEST_EXIT=124. The run hit its 30-minute limit with tests at 70–85 s each under host load, so it is recorded and carries no verdict. The GitHub CI Test job on the same head (full hermetic suite) is the test evidence for this cycle.
- **Repeat subject** (qa-fix Step 2.6, trigger b): `skills/qa-task/SKILL.md` is named by gates 1, 2 and 3. The next fix takes the **consolidate** move: the paragraph keeps only the citation, the command and the one answer it checks, and defers every outcome to Step 3.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–4, 6, 7, 9 | PASS | as cycle 1, plus the cycle-2 tests |
| 5 | PASS | amended wording (owner-approved): the one newly listed example by path is recorded in qa.1 (task 320 #10; 375 → 376) |
| 8 | PASS | CI (`npm test` under CI) green at 77c4e7dcc; bundle:check 0 problems |

## Code Review

- [medium/high] `skills/qa-task/SKILL.md:1102`: the outcome is overbroad. Promoted as T328-CR3-1.
- [medium/medium] `skills/qa-task/SKILL.md:50`: `measured` is treated as a classification. Promoted as T328-CR3-2: raised in two consecutive cycles and checked against Step 3.
- [low/high] `shared/resources/finalise-record-preflight.js:62`: missing comparatives. Promoted as T328-CR3-3.
- [low/high] `evals/shared/tests/qa-measured-figure-parity.test.mjs:61`: narrow guard. Promoted as T328-CR3-4.
- Cleanup: `shared/resources/tests/finalise-record-preflight.test.mjs:230`: the "no " loop is vacuous. Future.

mutation-proven: removed "or equal to" from NUMERIC_BOUND → `an "or equal to" bound is a record criterion and measured` red → covered
mutation-proven: re-added "a figure taken on the head commit" to qa-task → `qa-task grades a measured figure…` red → covered
mutation-proven: dropped "from the repository root" in qa-story → `qa-story grades a measured figure…` red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability CONCERNS.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on CR3-1 and CR3-2.
