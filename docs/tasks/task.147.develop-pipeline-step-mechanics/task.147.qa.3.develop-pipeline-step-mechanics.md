# QA Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Task**: [Link to task document](./task.147.develop-pipeline-step-mechanics.md)
**Gate File**: [task.147.gate.3.develop-pipeline-step-mechanics.yml](./task.147.gate.3.develop-pipeline-step-mechanics.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate-2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (bug.7): a held own file passes check 5 | FIXED | Step 4 derivation, guard and restore, then the Step 8 checklist, run in separate shells: check 5 fails naming the file |
| CR-2 (bug.8): the guard holds `.claude/` | FIXED | No-ignore fixture: the scope record survives the guard |
| CR-3 (bug.9): a guard re-run strands files | FIXED | Guard, guard, restore: both files come back |
| CR-6, CR-7, CR-8, CR-9 (low) | FIXED | Re-sync HALT case; stale-record cases; cases 21–23 |

Bugs 7–9 are closed. The HIGH count per gate is now 2, 1, 0.

---

## Executive Summary

The cycle-2 fixes hold. The cycle-3 review scoped to the files changed since gate 2 found edge defects in the new state records and in scope normalisation. There are three MEDIUM findings. The first is CR-1: a `tee -a Issues Log` from before this task writes files that a guard re-run would hold, which fails Step 8 on a correct run. The second is CR-3: Step 8 deletes the only pointer to held files that were never restored. The third is CR-4: `.` segments give a vacuous scope. Two findings are LOW. None is HIGH.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

The Step 3b pass ran as an independent Explore reviewer over the branch-vs-base diff of the 21 non-generated files changed since gate 2's `updated:` (2943 lines), as cycle 3+ requires. It returned in about 3.5 minutes and was waited for. Its output tripped the harness's instruction-shaped check only because it mentions `.claude/settings.json`; that was treated as data. Re-review scope: since 2026-09-25T09:49:12Z (default).

Platform variance: `TMPDIR=/tmp` gives 88/88 node tests and 23/23 shell cases. Step 4b has nothing new: the changed blocks are git mutations or template-slot blocks (see gate 1 and obs #186).

Route classifier: `continue` (not-a-pass-gate). The convergence check is not tripped, because HIGH_3 is 0.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-4-create-pr.md` — `tee -a Issues Log` writes `Issues` and `Log` files that a guard re-run would hold, and Step 8 then fails (CR-1). The `tee` exists 3 times on origin/develop; it is promoted because of how it combines with the new held record.
- **[medium]** `shared/resources/develop-pipeline-step-8-commit.md` — held files that were never restored are skipped, and the cleanup deletes the only pointer to them (CR-3).
- **[medium]** `shared/resources/verify-push-state.sh` — a `.` segment or `//` makes the scope vacuous (CR-4).
- **[low]** step-8 — a mismatched held record is skipped silently (CR-2).
- **[low]** step-4 — a tracked `.claude/` change scopes the whole `.claude` directory (CR-5).

---

## NFR Assessment

- **Security** — PASS. Evidence: reasoned. Probes executed: 0.
- **Performance** — PASS.
- **Reliability** — CONCERNS (CR-1, CR-3, CR-4).
- **Maintainability** — PASS.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100 (100 − 3×10)
**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4
