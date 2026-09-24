# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file (cycle 4)

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.4.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.4.qa-next-state-file-owned-by-the-tool.yml)
**Previous**: [task.143.qa.3.qa-next-state-file-owned-by-the-tool.md](./task.143.qa.3.qa-next-state-file-owned-by-the-tool.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-143-BUG-4 (phase) | **FIXED** | No exclusion before `executed`. A same-day prior run is kept at `selected`/`resolved` (test) |
| TASK-143-BUG-4 (timezone) | **FIXED** | `localDate`. The `TZ=Asia/Tokyo` mirror keeps the previous-local-day run |
| TASK-143-BUG-4 (env label) | **FIXED (flagged)** | `priorRuns` is always in `unverifiable` from `executed` on |
| CR-4 duplicate comment | **FIXED** | |

## New Findings This Cycle

- **[low]** `skills/qa-next/SKILL.md` resume map: a v0.51.0 run resumed at `executed` has `runFile: null`. Under the new release its run file comes from `--run-path` (UTC `today()`), not from v0.51.0's local date, and the SKILL does not tell it to record that file with `--state-set runFile`. Doing so would make `priorRuns` exact through the existing `runFile` branch (CR-1, verified against `today()` at `uat-status.mjs:354`) → TASK-143-QA4-1
- **[low]** `evals/qa-next/unit/uat-status.test.mjs`: the legacy `runFile: null` test assumes every timezone is within ±12h of UTC. It **fails under `TZ=Pacific/Kiritimati`** (UTC+14), found by this cycle's timezone sweep → TASK-143-QA4-2
- **[cleanup]** the same test: a copied comment above the `selected`/`resolved` block (CR-2)

## Review Methodology

Direct tools plus one read-only Explore subagent. Cycle 4 is scoped to files changed since gate 3 (4 files; the cycle commit is `2adabb11`). `SAFETY_REPROBE=false`. The reviewer returned in about 90 seconds.

Re-review scope: since gate 3 (default).

Step 4b: `no-executable-blocks` (unchanged).

Platform variance, all runs of `evals/qa-next/unit/uat-status.test.mjs`: under `TMPDIR=/tmp`, 60/60. Under `TZ=UTC` and `TZ=Pacific/Pago_Pago` (−11), 0 failures. Under `TZ=Pacific/Kiritimati` (+14), **1 failure** (TASK-143-QA4-2).

## Issues Found

**LOW (2)**: TASK-143-QA4-1, TASK-143-QA4-2. **Total**: HIGH 0, MEDIUM 0, LOW 2.

## NFR Assessment

- **Performance — PASS**: no network calls.
- **Reliability — PASS**: the legacy derivation is exact where it can be and flagged where it cannot. QA4-1 is disclosed by the flag.
- **Security — CONCERNS**: **Evidence** measured, **Probes executed** 19 (`task.143.qa.4.security.run.json`). Only the pre-existing control-character labels reproduce (identical on `origin/develop`), routed to `future`.
- **Maintainability — PASS**: advisory CR-2.

## Code Review

**Correctness bugs (1):** [low/medium] `uat-status.mjs:1293`, the executed-resume premise (CR-1) → verified and entered as **TASK-143-QA4-1** (the fix belongs in SKILL.md).
**Cleanups (1):** CR-2, copied test comment.

`boundary: true`; `probes_executed: 19`.

mutation-proven (cycle 3 fixes): phase guard dropped → the legacy `runFile: null` test → covered · always-flag dropped → same → covered · UTC date in place of local → the Tokyo mirror → covered · date exclusion dropped → the near-midnight test → covered

## Recommendations

### Immediate
1. QA4-1: in the resume map, have a run whose `runFile` is null call `--run-path`, then `--state-set runFile`, before Step 4.
2. QA4-2: pin `TZ` in the legacy test.

### Short-term
Control characters in `--env` (pre-existing), and the `--state-set` lock ownership check. Both are follow-ups.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (QA4-1, QA4-2)
