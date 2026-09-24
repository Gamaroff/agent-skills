# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file (cycle 7)

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.7.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.7.qa-next-state-file-owned-by-the-tool.yml)
**Previous**: [task.143.qa.6.qa-next-state-file-owned-by-the-tool.md](./task.143.qa.6.qa-next-state-file-owned-by-the-tool.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Gate Status**: CONCERNS

This is the last cycle of the re-entered loop's budget (7).

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-143-BUG-6: the resume treated a same-named file as its own | **FIXED** | `stateView` flags a legacy `priorRuns` from `executed` on whether or not `runFile` is set. The resume map always takes a fresh `--run-path`, and the "stays exact" claim is gone. Restoring the old guard turns both named tests red |
| TASK-143-QA6-1: date-dependent collision assertion | **FIXED** | The fixture is dated from the UTC `today()`, and `-02` is asserted exactly on any day. Advisory CR-3: the test reads the clock separately from the tool, so a run straddling UTC midnight could fail |

## New Findings This Cycle

- **[low]** `evals/qa-next/unit/uat-status.test.mjs`: cycle 6 made the date rule unconditional, and it now masks the `runFile` exclusion. Dropping `state.runFile` from the `own` set leaves the suite 62/62 in the local TZ and in UTC, and only `TZ=Pacific/Kiritimati` goes red (1 test). The exclusion is load-bearing only when the UTC `--run-path` date falls before the local start date, which happens only east of UTC. (CR-2, low/medium, **verified by mutation**) → TASK-143-QA7-1

**Gate-6 timestamp corrected.** Gate 6 carried a hand-written `updated: '2026-09-24T08:40:00Z'`. It was written at 19:23:11Z (file mtime; its PR comment was posted at 19:24:12Z). It is corrected in place, and this cycle's scope uses the corrected value. The wrong value happened to precede the real commit, so the scope it would have produced was the same.

## Review Methodology

Direct tools plus one read-only Explore subagent. The reviewer returned in about 100 seconds, and `waiting_on` was set and cleared. `SAFETY_REPROBE=false`: the prior security axis reads `CONCERNS measured`.

Re-review scope: since 2026-09-24T19:23:11Z (default). That is 11 files. The reviewable ones are `CHANGELOG.md`, `skills/qa-next/SKILL.md`, `skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs` and the task's design text, reviewed as the branch diff over those paths. The cycle-6 commit `ec620781` was named as the focus.

Step 4b: `no-executable-blocks`. There are 9 blocks in `skills/qa-next/SKILL.md`, all refused as mutating; both bash and zsh ran. Unchanged.

Platform variance: 62/62 under the local TZ, `TMPDIR=/tmp`, `TZ=Pacific/Kiritimati`, `Pacific/Pago_Pago`, `Asia/Tokyo` and `UTC`.

## Issues Found

**LOW (1)**: TASK-143-QA7-1 (no separate bug file).
**Total**: HIGH 0, MEDIUM 0, LOW 1.

## NFR Assessment

- **Performance: PASS**
- **Reliability: CONCERNS.** This is a documented limitation, not a queue entry. When an interrupted v0.51.0 Step 4 half-wrote a file, that file now stays beside this run's fresh file. This run flags it, but a later current-shape run counts it as a prior run (CR-1, medium/medium). Bug 6 chose this trade-off over overwriting an earlier committed run, and it is routed to `future`.
- **Security: CONCERNS.**
  - **Status**: CONCERNS
  - **Evidence**: measured
  - **Probes executed**: 19 (`task.143.qa.7.security.run.json`)
  - Verdict `present-but-inert`, unchanged from cycle 6. The five reproduced labels (space-only, LF, CR, TAB, ESC) behave identically on `origin/develop`, so they are pre-existing and routed to `future`.
- **Maintainability: PASS.** Advisory CR-3 and CR-4.

## Code Review

**Correctness bugs (3):**

- [medium/medium] `skills/qa-next/SKILL.md:88`: a half-written v0.51.0 file stays in `runs/<item>/`, and later current-shape reads count it without a flag. → This is the trade-off bug 6 recorded. Routed to `recommendations.future` (surface it to the owner, or record it in the state)
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:1295`: the date rule masks the `runFile` exclusion in the tests. → **Verified by mutation** and raised as **TASK-143-QA7-1**
- [low/low] `evals/qa-next/unit/uat-status.test.mjs:2647`: the test reads the clock separately from the tool, so a run straddling UTC midnight could fail. → Advisory, routed to `future`

**Cleanups (1):**

- `evals/qa-next/unit/uat-status.test.mjs:2675`: the "never taken over" assertion cannot fail, because nothing writes the file. It restates `--run-path`'s behaviour. → Advisory, routed to `future`

`boundary: true`; `probes_executed: 19`.

- mutation-proven: `stateView` legacy flag guard restored to `!state.runFile && executed` → the two cycle-6 tests went red → covered
- mutation-proven: `state.runFile` dropped from `own` → no red in the local TZ or UTC; red under `TZ=Pacific/Kiritimati` → data-dependent (TASK-143-QA7-1)

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (TASK-143-QA7-1 fixed or accepted)
