# QA Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Task**: [Link to task document](./task.147.develop-pipeline-step-mechanics.md)
**Gate File**: [task.147.gate.2.develop-pipeline-step-mechanics.yml](./task.147.gate.2.develop-pipeline-step-mechanics.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: FAIL

---

## Re-Review Context

| Gate-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (bug.1): a failed merge deletes the branch | FIXED | Repro re-run: exit 1, origin keeps `feature/x`. The test runs the block with no `HALT()` injected |
| CR-2 (bug.2): the registry close is uncommitted | FIXED | `{extra-scope-paths}` with its table, a named-vs-unnamed test, and develop-bug wiring |
| CR-4 (bug.3): the leak check reads an unbound array | FIXED | Scope file; leak test in separate shells, nothing injected |
| CR-5 (bug.4): the delete status becomes the block status | FIXED | Repro re-run: exit 0 after the merge; already-deleted case |
| CR-6 (bug.5): a committed deletion aborts staging | FIXED | Repro re-run: exit 0; committed-deletion case |
| QA-1 (bug.6): the rename source is skipped | FIXED | Cases 14 and 15, bash 5 and 3.2 |
| CR-7, CR-8, QA-2 (low) | FIXED | Cases 16–20 and the prose |

Bugs 1–6 are closed.

---

## Executive Summary

Every gate-1 finding is fixed and verified. CI on `f4dee2d2` is 5/5 green. The cycle-2 refute pass re-read the whole branch as one change and found what cycle 1's per-fix view could not: the Step 4 guard and the scoped Step 8 check, each correct alone, together let Step 8 report unpushed work as pushed (HIGH). The cycle-1 state-file fix is also vulnerable in two ways: it can be moved (CR-2) or overwritten (CR-3).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

The Step 3b refute pass was run by an independent Explore reviewer over the **whole** branch diff (5524 lines, 49 files), with the REFUTE directive appended as cycle 2 requires. It returned in about 5 minutes and was waited for. The reviewer's output tripped the harness's instruction-shaped check only because it mentions `.claude/settings.json`; that is data, and no directive was followed.

Re-review scope: unscoped (cycle 2 refute pass). Gate 1's security axis read `PASS reasoned`, so no safety re-probe was required.

Step 4b over this cycle's changed files:

- step-4, step-8, develop-next, develop-batch and the develop-bug step-7 doc: `no-executable-blocks`.
- develop-bug SKILL.md: 1 runnable block at line 53, `cat .agents/skills/develop-bug/SKILL.md`, a context-recovery line untouched by this diff. It fails only because the engine runs in an empty temporary directory. This is environmental and pre-existing, and it is not a gate finding.

Platform variance: `TMPDIR=/tmp` gives 76/76 node tests and 20/20 shell cases.

---

## New Findings This Cycle

- **[high]** `shared/resources/develop-pipeline-step-8-commit.md` (check 5) — a held-and-restored new file of the run's own passes scoped check 5 as a warning → [bug.7](./task.147.bug.7.scoped-check-5-hides-held-own-file.md)
- **[medium]** `shared/resources/develop-pipeline-step-4-create-pr.md` (guard) — moves `.claude/` when it is not ignored → [bug.8](./task.147.bug.8.guard-moves-pipeline-state.md)
- **[medium]** `shared/resources/develop-pipeline-step-4-create-pr.md` (guard) — a re-run overwrites the hold record → [bug.9](./task.147.bug.9.guard-rerun-strands-first-hold.md)
- **[low]** `skills/develop-next/SKILL.md` — a failed re-sync checkout is not stated as a HALT (CR-6)
- **[low]** step-4 scope file: a stale file is accepted (CR-7)
- **[low]** `verify-push-state.sh`: a worktree-side rename is missed (CR-8); a symlinked absolute or `..` scope (CR-9)

---

## Code Review

**Correctness bugs (10):** CR-1 [high/medium], CR-2 [high/medium], CR-3 [medium/high], CR-4 [medium/high], CR-5 [medium/medium], CR-6 [medium/low], CR-7 [low/medium], CR-8 [low/medium], CR-9 [low/medium], CR-10 [low/low].

- Promoted after QA verification (by reading the blocks and the porcelain semantics): CR-1 as HIGH, CR-2 and CR-3 as MEDIUM, and CR-6, CR-7, CR-8 and CR-9 as LOW.
- **Pre-existing** (provenance): CR-4 (`${PR_NUMBER:+…}` has one occurrence on origin/develop's step-8, as recorded by gate 1) and CR-5 (`gh pr merge "$PR_ID" --"$mergeStrategy"` has one occurrence on origin/develop). Both go to `recommendations.future`.
- **Not reachable**: CR-10 (cross-repository PR heads).

mutation-proven (cycle-1 fixes, qa-fix f4dee2d2): 9 of 9 reverted, and each turned its named committed test red → covered.

---

## NFR Assessment

- **Security** — PASS. Evidence: reasoned. Probes executed: 0. There is no boundary.
- **Performance** — PASS. Suites run in 0.1–4.6s.
- **Reliability** — FAIL. CR-1, CR-2 and CR-3.
- **Maintainability** — PASS.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 60/100 (100 − 20 − 2×10)
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3 (scoped to files changed since this gate)
