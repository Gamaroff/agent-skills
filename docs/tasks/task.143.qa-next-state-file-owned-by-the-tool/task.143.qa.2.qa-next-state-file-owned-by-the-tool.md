# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file (cycle 2)

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.2.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.2.qa-next-state-file-owned-by-the-tool.yml)
**Previous**: [task.143.qa.1.qa-next-state-file-owned-by-the-tool.md](./task.143.qa.1.qa-next-state-file-owned-by-the-tool.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-143-BUG-1 — `--state-init` resume output indistinguishable | **FIXED** | `--state-init` now refuses any existing state with exit 5 and prints nothing. It is covered by the refuse-any test, the direct exclusive-create test and the 8-process concurrency test (exactly one winner, 5/5 runs; the non-exclusive mutant was killed 5/5) |
| TASK-143-BUG-2 — legacy `priorRuns` counts the run's own file when `runFile` is null | **PARTIAL** | The own file is now excluded, but by two heuristics that misfire → TASK-143-BUG-3 |
| Advisory CR-3 — non-exclusive lock | **FIXED** | `link()`-based exclusive create |

## New Findings This Cycle

- **[medium]** `skills/qa-next/scripts/uat-status.mjs` (`stateView`, legacy `priorRuns`): the cycle-1 exclusions misfire in two ways. A v0.51.0 `na`/`blocked` early exit leaves `Last run` naming the previous run. The mtime comparison depends on a hand-written `startedAt` and on mtimes that a checkout refreshes. → TASK-143-BUG-3: identify the own file by the run-file name date, since v0.51.0 wrote one `<date>-<env>.md` per date.
- **[low]** `skills/qa-next/scripts/uat-status.mjs:29`: the header comment still describes the pre-fix exit-5 rule. → TASK-143-QA2-2.

## Review Methodology

Direct tools plus one read-only Explore subagent. This is **cycle 2 (`REFUTE_PASS=true`)**, so the whole branch diff was reviewed again (`origin/develop...HEAD`, 2467 lines, 15 files) with the refute directive, starting from cycle 1's fixes (`f0682730`). The reviewer returned in about 3 minutes.

Re-review scope: unscoped (cycle 2 refute pass; the prior gate's security axis read `CONCERNS measured`, so `SAFETY_REPROBE=false`).

Step 4b: `no-executable-blocks`, as in cycle 1. SKILL.md's blocks are all refused as mutating, which is information, not a finding.

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: State schema and subcommands | CONCERNS | TASK-143-BUG-3, TASK-143-QA2-2 |
| Phase 2: SKILL.md speaks commands | PASS | "`--state-init` never resumes", Step 1 exit 5 on either command, stop table |
| Phase 3: The LOW deferrals | PASS | unchanged |
| Phase 4: Docs, CHANGELOG, validation | PASS | CHANGELOG now qualifies the `engages` claim with the control-character caveat |

## Success Criteria Verification

Functional criteria are as in cycle 1, with these changes. "A second `--state-init` over any existing state exits 5 …" is **PASS**. "A legacy file is answered with derived values" is **CONCERNS** (TASK-143-BUG-3). Performance, code quality and migration criteria: PASS.

## Breaking Changes Validation

BC1 (the skill writes the state file through the tool) is CONCERNS: the migration path for a real v0.51.0 file is still imprecise (TASK-143-BUG-3). BC2 (`--env` refusals) is PASS.

## Issues Found

**MEDIUM (1)**: TASK-143-BUG-3, see [task.143.bug.3.legacy-own-file-heuristics-misfire.md](./task.143.bug.3.legacy-own-file-heuristics-misfire.md).
**LOW (1)**: TASK-143-QA2-2, the stale header comment.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

## NFR Assessment

### Performance — PASS
58 tests run in 28.6s. There are no network calls.

### Reliability — CONCERNS
TASK-143-BUG-3. Advisory CR-1: a `--state-set` from a run whose lock an operator cleared would write into the next run's lock. That needs an operator to clear a *live* run and is routed to `future`.

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 19 (`task.143.qa.2.security.run.json`, `totals.executed`)
- Unchanged from cycle 1. Every path, sequence, two-digit and empty case is rejected, and every legitimate label is accepted. `\n`, `\r` and `\t` labels are accepted, which is **pre-existing** (identical on `origin/develop`). It is routed to `future`, not to `top_issues[]`.

### Maintainability — PASS
Advisory cleanups: CR-5 (the `-NN` label check is subsumed by the built-name check) and CR-6 (a legacy read walks `runs/` and parses the registry twice).

## Code Review

**Correctness bugs (3):**
- [medium/medium] `uat-status.mjs:1409` — `--state-set` does not confirm it owns the lock (CR-1) → advisory, `future`
- [low/medium] `uat-status.mjs:1288` — `Last run` exclusion misfires after a v0.51.0 early exit (CR-2) → verified, merged into **TASK-143-BUG-3**
- [low/low] `uat-status.mjs:1294` — mtime ≥ `startedAt` is fragile (CR-3) → verified, merged into **TASK-143-BUG-3**

**Cleanups (3):**
- `uat-status.mjs:29` — stale header comment (CR-4) → **TASK-143-QA2-2**
- `uat-status.mjs:895` — redundant `-NN` label check (CR-5)
- `uat-status.mjs:1296` — double `priorRuns` walk and double registry parse on a legacy read (CR-6)

`boundary: true` (the `--env` guard); `probes_executed: 19`.

mutation-proven (cycle 1 fixes, re-read this cycle): `--state-init` printing the state on exit 0 → "refuses ANY existing state" → covered · `rename` in place of `link` → "created exclusively" → covered · init without `exclusive` → "eight concurrent" → covered (5/5 runs; the test is race-dependent)

## Regression Testing

`evals/qa-next/unit/uat-status.test.mjs` passes 58/58. Cycle 1's fast gate passed 3983/0.

## Recommendations

### Immediate Actions (Blocking)
1. TASK-143-BUG-3: identify the own file by the filename date.
2. TASK-143-QA2-2: the header comment.

### Short-term Actions (Non-Blocking)
1. Follow-up task: refuse control characters in `--env` (pre-existing).
2. Lock ownership check on `--state-set` (CR-1).
3. Fold the redundant label check (CR-5) and compute the legacy row and history once (CR-6). Both can be done alongside BUG-3.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL (TASK-143-BUG-3 fixed)
