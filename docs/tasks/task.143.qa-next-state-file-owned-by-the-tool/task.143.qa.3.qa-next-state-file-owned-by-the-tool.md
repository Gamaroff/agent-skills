# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file (cycle 3)

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.3.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.3.qa-next-state-file-owned-by-the-tool.yml)
**Previous**: [task.143.qa.2.qa-next-state-file-owned-by-the-tool.md](./task.143.qa.2.qa-next-state-file-owned-by-the-tool.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-143-BUG-3 — cycle-1 legacy heuristics misfire | **FIXED as specified** | The `Last run` and mtime heuristics are gone. The early-exit and refreshed-mtime cases pass. The replacement rule carries TASK-143-BUG-4 |
| TASK-143-QA2-2 — stale header comment | **FIXED** | The header now reads "exit 5 run-in-progress whenever a state file exists" |
| TASK-143-BUG-1, BUG-2 | FIXED (cycle 2) | unchanged |

## New Findings This Cycle

- **[medium]** `uat-status.mjs` `stateView`: the date exclusion ignores the phase, so it drops a same-day prior run before this run has written anything (CR-1) → TASK-143-BUG-4
- **[medium]** `uat-status.mjs` `startDate`: the earlier of the UTC and local dates is wrong east of UTC (CR-2, platform variance) → TASK-143-BUG-4
- **[low]** `uat-status.mjs` `stateView`: the date-only match cannot see the v0.51.0 env label (CR-3) → TASK-143-BUG-4
- **[cleanup]** `uat-status.mjs:898`: duplicated comment sentence (CR-4), advisory

**Pattern, stated so the next cycle reads it:** three consecutive cycles have found defects in *the same mechanism*, the derivation of a v0.51.0 file's own run file when `runFile` is null. No HIGH finding has been raised, so neither the third-strike rule nor the Convergence check fires. Still, the finding texts show that the mechanism cannot be exact from `executed` on, because v0.51.0 did not record the fact it needs. The recommended fix makes the exact part exact (before `executed`) and flags the rest as `unverifiable`, rather than adding a fourth heuristic.

## Review Methodology

Direct tools plus one read-only Explore subagent. Cycle 3 is scoped to files changed since gate 2 (`uat-status.mjs`, `uat-status.test.mjs`, `SKILL.md`, `CHANGELOG.md`; 1291-line branch diff; the cycle commit is `1b926a42`). `SAFETY_REPROBE=false`, because gate 2's security axis was CONCERNS with `measured` evidence. The reviewer returned in about 75 seconds.

Re-review scope: since 2026-09-24T05:16:00Z (default).

Step 4b: `no-executable-blocks` (unchanged).

Platform variance: `TMPDIR=/tmp command node --test evals/qa-next/unit/uat-status.test.mjs` passed 59/59. The TZ variance in CR-2 is a different axis. It was reproduced by reading the code and is to be pinned by a UTC+ test in the fix.

## Issues Found

**MEDIUM (2)** and **LOW (1)**, all in one mechanism: [task.143.bug.4.legacy-date-rule-phase-and-timezone.md](./task.143.bug.4.legacy-date-rule-phase-and-timezone.md).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

## NFR Assessment

### Performance — PASS
There are no network calls, and the suite passed 59/59.

### Reliability — CONCERNS
TASK-143-BUG-4, in the legacy derivation only. A current-shape state file is unaffected.

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 19 (`task.143.qa.3.security.run.json`)
- Unchanged. Only the pre-existing control-character labels reproduce, routed to `future`.

### Maintainability — PASS
Advisory CR-4.

## Code Review

**Correctness bugs (3):** CR-1 [medium/high], CR-2 [medium/high] → promoted (`code_review_blocking`). CR-3 [low/medium] → entered by QA. All three are TASK-143-BUG-4.
**Cleanups (1):** CR-4, duplicated comment.

`boundary: true`; `probes_executed: 19`.

mutation-proven (cycle 2 fixes): date exclusion removed → the legacy `runFile: null` test → covered · `>=`→`>` → same → covered · `unverifiable` dropped → same → covered · UTC-only start date → the near-midnight test → covered

## Recommendations

### Immediate Actions (Blocking)
1. TASK-143-BUG-4: apply no exclusion before `executed`, use the local date only, and flag `unverifiable` from `executed` on.

### Short-term Actions (Non-Blocking)
1. Control characters in `--env` (pre-existing), as a follow-up task.
2. Lock ownership check on `--state-set` (cycle 2 CR-1).
3. CR-4 comment.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL (TASK-143-BUG-4 fixed)
