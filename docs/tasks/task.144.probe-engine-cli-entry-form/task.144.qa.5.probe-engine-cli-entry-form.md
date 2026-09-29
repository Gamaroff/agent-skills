# QA Report: Task 144 - security-probe: a `cli:` entry form (cycle 5)

**Task**: [task.144.probe-engine-cli-entry-form.md](./task.144.probe-engine-cli-entry-form.md)
**Gate File**: [task.144.gate.5.probe-engine-cli-entry-form.yml](./task.144.gate.5.probe-engine-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue (gate 4) | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-2: the `--name` escape hatch is inert | medium | **FIXED** | A named `cli:` control keys on its name. Mutation-proved: unkeying the name turns the test red |
| CR-3: finalise prompt states the superseded key | medium | **FIXED** | Prompt updated. The identity population test goes red on the reverted prompt |
| CR-1 (advisory): behaviour-selecting flag values share a skeleton | medium | FIXED by `--name` | Named strict/lax are two controls. An unnamed collision warns |
| CR-4 (advisory): positional per-run path | low | FIXED by `--name` | One name gives one control, and `executed` is not doubled |
| CR-5 (cleanup): analogue comment | low | FIXED | — |

---

## New Findings This Cycle

- **[medium]** `security-probe.mjs` `recordRun` — **CR-1**. The replace report is not gated on "unnamed",
  so a **named** re-run whose argv differs prints "pass --name to keep them apart". Reproduced.
- **[low]** `security-probe.mjs` — **CR-2**. Four engine comments still state the skeleton-only key.
- **[low, advisory]** CR-3: the name is not trimmed before keying, and a control probed once unnamed
  and once named lands in two entries.
- **[cleanup]** CR-4: the identity predicate misses "its own control" wording, and its floor equals
  the match count.

---

## Testing Scope

Direct tools, plus one Explore reviewer over the scoped diff: 10 files and 2222 lines, weighted to
the 423-line cycle-4 delta.

Re-review scope: since 2026-09-23T18:45:43Z (default; prior gate security `OK measured`).

## NFR Assessment

- **Security — PASS.** Evidence: measured, 17 probes executed. The validator engages 17 of 17 (`task.144.qa.5.security.run.json`).
- **Performance / Reliability / Maintainability — PASS.** The cli tests pass 18 of 18 under `TMPDIR=/tmp`.

## Code Review

**Correctness bugs (3):** CR-1 [medium/high] and CR-2 [low/high] are **promoted**. CR-3 [low/medium] is advisory.
**Cleanups (1):** CR-4.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **HIGH**: 0 · **MEDIUM**: 1
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed
**Next Steps**: `/qa-fix` cycle 5. This is the last budgeted cycle, so Loop Escalation's half-cycle rule decides after it.
