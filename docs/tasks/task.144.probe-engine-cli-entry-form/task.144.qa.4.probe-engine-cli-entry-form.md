# QA Report: Task 144 - security-probe: a `cli:` entry form (cycle 4)

**Task**: [task.144.probe-engine-cli-entry-form.md](./task.144.probe-engine-cli-entry-form.md)
**Gate File**: [task.144.gate.4.probe-engine-cli-entry-form.yml](./task.144.gate.4.probe-engine-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue (gate 3) | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1: guarded-flag key merges distinct controls | medium | **FIXED** (mechanism replaced) | `cliControlKey` skeleton. The both-directions test is mutation-proved against both superseded designs: keeping values fails both tests, and guarded-flag-only fails the skeleton test |
| CR-2: caught-crash false-pass case misstated | low | FIXED | §5 and the engine header now state both halves |
| CR-3: slot heuristics undocumented | low | FIXED — but its remedy is inert | The documented `--name` remedy is not keyed; see CR-2 below |
| CR-4: stale record test naming | low | FIXED | — |

---

## New Findings This Cycle

- **[medium]** `shared/resources/probe-boundary-rule.md:295` — **CR-2**. The §5 advice to "give such a
  probe its own `--name`" is inert: `controlKey` uses sink, entry and skeleton only, and never the name.
- **[medium]** `shared/resources/finalise-dod-security-prompt.md:179` — **CR-3**. It still says "a
  different template is a different control in the record". No check lists the sites that state the
  `cli:` key.
- **[medium, advisory — confidence medium]** CR-1. Any value-dropping key merges controls whose
  flag *values* select behaviour. The suite's own `cli-refuser` shows it: `--mode strict` and
  `--mode lax` behave differently and share one skeleton.
- **[low, advisory]** CR-4. A per-run path passed as a bare positional stays in the skeleton, so
  re-runs of that control split.
- **[cleanup]** CR-5. The skeleton test's end-to-end comment names the uat-status pair, but the test
  runs an analogue.

**What three cycles of this key show.** Three consecutive gates have found the `cli:` record key
wrong. The whole template split too much, the guarded flag merged too much, and the skeleton merges
behaviour-selecting values. Every value-dropping heuristic has a counter-example. The durable fix is
**explicit identity**: a supplied `--name` *is* the control's key, and the heuristic is only the
fallback when no name is given.

---

## Testing Scope

Direct tools, plus one Explore reviewer over the scoped diff: 6 files and 1816 lines, weighted to the
314-line cycle-3 delta.

Re-review scope: since 2026-09-23T18:33:53Z (default; prior gate security `OK measured`).

## NFR Assessment

- **Security — PASS.** Evidence: measured, 17 probes executed. The `--argv` validator engages
  17 of 17 (`task.144.qa.4.security.run.json`).
- **Performance / Reliability / Maintainability — PASS.** The cli tests pass 17 of 17 under
  `TMPDIR=/tmp`.

## Code Review

**Correctness bugs (4):** CR-2 [medium/high] and CR-3 [medium/high] are **promoted**. CR-1
[medium/medium] and CR-4 [low/medium] are advisory.
**Cleanups (1):** CR-5.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **HIGH**: 0 · **MEDIUM**: 2
**Deployment Recommendation**: CONDITIONAL — CR-2 and CR-3 fixed
**Next Steps**: `/qa-fix` cycle 4. Key on `--name` when given; fix the finalise prompt; add a key-statement population test.
