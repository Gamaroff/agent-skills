# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file (cycle 5)

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.5.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.5.qa-next-state-file-owned-by-the-tool.yml)
**Previous**: [task.143.qa.4.qa-next-state-file-owned-by-the-tool.md](./task.143.qa.4.qa-next-state-file-owned-by-the-tool.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-143-QA4-1 — `executed` resume had no instruction to record its run file | **FIXED as specified** | The resume map has `--run-path` then `--state-set runFile`, and a test proves `priorRuns` is exact after it. The instruction itself carries TASK-143-BUG-5 |
| TASK-143-QA4-2 — timezone-dependent legacy test | **FIXED** | `TZ=UTC` is pinned. The suite passes 61/61 under UTC, Pacific/Kiritimati (+14), Pacific/Pago_Pago (−11) and Asia/Tokyo |

## New Findings This Cycle

- **[medium]** `skills/qa-next/SKILL.md:88` — the `executed` resume step calls `--run-path` unconditionally. A v0.51.0 run interrupted *inside* Step 4 has already written its `<date>-<env>.md`, so `--run-path` returns `-02`, the first file is listed in `priorRuns` without the `unverifiable` flag, and the run ends up with two run files (CR-1, medium/high) → TASK-143-BUG-5

**Pattern, for the escalation reader.** Cycles 1–5 have found defects in one area: the *migration* path for a state file written by v0.51.0 (`runFile: null`, no `priorRuns`/`bug`/`filedBug`). Each fix made that path more precise, and each more precise rule exposed a narrower case. The current-shape path (`--state-init` through `--state-clear`) has had no finding since cycle 1's two were fixed. The residue is confined to a pre-upgrade run that was interrupted and then resumed after the upgrade.

## Review Methodology

Direct tools plus one read-only Explore subagent. Cycle 5 is scoped to files changed since gate 4 (4 files; the cycle commit is `76481715`). `SAFETY_REPROBE=false`. The reviewer returned in about 50 seconds.

Re-review scope: since gate 4 (default).

Step 4b: `no-executable-blocks` (unchanged). Platform variance: `TMPDIR=/tmp` passes 61/61. Timezone sweep: see Re-Review Context.

## Issues Found

**MEDIUM (1)**: [task.143.bug.5.executed-resume-ignores-interrupted-step4-file.md](./task.143.bug.5.executed-resume-ignores-interrupted-step4-file.md). **Total**: HIGH 0, MEDIUM 1, LOW 0.

## NFR Assessment

- **Performance — PASS**
- **Reliability — CONCERNS**: TASK-143-BUG-5 (pre-upgrade run interrupted inside Step 4 only).
- **Security — CONCERNS**: **Evidence** measured, **Probes executed** 19 (`task.143.qa.5.security.run.json`). Only the pre-existing control-character labels reproduce, routed to `future`.
- **Maintainability — PASS**

## Code Review

**Correctness bugs (1):** [medium/high] `skills/qa-next/SKILL.md:88` → promoted as **TASK-143-BUG-5** (`code_review_blocking`).
**Cleanups (0).**

`boundary: true`; `probes_executed: 19`.

mutation-proven (cycle 4 fixes): `runFile` branch removed → "a pre-upgrade run resumed at executed that records its run file" → covered · TZ pin removed → the legacy test goes red under `TZ=Pacific/Kiritimati` → covered

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (TASK-143-BUG-5)
