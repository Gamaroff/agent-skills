# Sprint Review Summary - loop-supervisor: an engine registry (claude, agy) and a --model flag

**Story/Task ID:** task.213
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff
**Pull Request:** [#716](https://github.com/Gamaroff/agent-skills/pull/716)

---

## Summary

loop-supervisor no longer assumes that every iteration is `claude -p`. Each engine is now one row
in a registry. Antigravity (`agy`) is the second row, and `--engine`, `--model` and `--effort` pick
the engine, the model and the effort for a run.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] With `--engine claude`, `dry-run` produces the same argv as before. The new plan keys are
  additive (AC1).
- [x] With `--engine agy --model …`, `dry-run` puts the model on the argv (AC2).
- [x] An agy result that is not `SUCCESS`, or has an unknown status, is classified as an error
  (AC3).
- [x] `--max-cost` and `--max-turns` on agy exit 1 and name the flag and the engine (AC4).
- [x] `--dangerously-skip-permissions` is refused on claude. On agy it applies only when the
  operator passes it (AC5).
- [x] `--effort` reaches the claude argv (AC6).
- [x] CLI flags beat the `loopSupervisor.*` config keys, even when the flag value equals the
  default (AC7).
- [x] The five pre-existing test files run within 10% of their base wall time: +2.5% (AC8).
- [x] `dry-run` never executes the engine binary (AC9).
- [x] There is no `if (engine === …)` in `run-loop.mjs` (AC10).
- [x] Full `npm test` and `validate` pass (AC11, AC12).
- [x] Every in-scope `claude -p` line is qualified as the default engine. `configuration.md`
  documents the three keys and flags (AC13, AC14).

### Key Features Implemented

- **Engine registry**: `skills/loop-supervisor/references/engines.js` gives each engine its argv
  builder, its result parser and the flags it supports.
- **Engine, model and effort flags**: `--engine`, `--model` and `--effort` on the CLI, with the
  `loopSupervisor.engine` / `.model` / `.effort` config keys as fallbacks.
- **Pre-spawn refusal**: a flag the selected engine cannot honour exits 1 before anything is
  spawned, instead of being silently ignored.

---

## Technical Details

### Files Modified/Created

- `skills/loop-supervisor/references/engines.js`: new; the registry, `resolveEngine` and
  `assertSupported`.
- `skills/loop-supervisor/scripts/run-loop.mjs`: reads the engine row; the per-engine branches are
  gone.
- `evals/loop-supervisor/unit/engines.test.mjs`, `run-loop.test.mjs` and two agy fixtures: 31 new
  tests.
- The loop-supervisor README and SKILL.md, `docs/reference/configuration.md`,
  `docs/reference/commands.md`, the unattended-runs runbook and the develop-next SKILL/README: updated
  for the qualified wording and the new flags.

### Architecture/Design Decisions

Engines are table entries, not branches. Adding an engine means adding one row and its tests, with
no change to `run-loop.mjs`. `resolveEngine` is an own-key allow-list.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** `--max-turns` and `--max-cost` are refused on agy, which cannot enforce
  them. Claude runs are unchanged.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 31 new tests in `evals/loop-supervisor/unit/engines.test.mjs` and
  `run-loop.test.mjs`.
- **Test Coverage:** Every acceptance criterion has a per-PR test.

### Code Review

- **QA:** gate 2 PASS 100/100, after 2 QA cycles. TASK-213-BUG-1 was fixed in cycle 1.
- **PR Review (Step 5c):** APPROVE, with 1 LOW (PC-1).

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] `resolveEngine` was probed with 12 candidates (10 hostile, 2 legitimate). None reproduced.
- [x] Skip-permissions is not a config key, so it cannot be widened by default.
- [x] The engine is spawned from an argv array, with no shell.

### Compliance Review

Not applicable. This is internal tooling.

---

## Documentation

- [x] The loop-supervisor README and SKILL.md
- [x] `docs/reference/configuration.md` and `commands.md`
- [x] The CHANGELOG `[Unreleased]` entry (task 213)

---

## Demo Notes

### How to Verify

1. Run `command node skills/loop-supervisor/scripts/run-loop.mjs dry-run --engine agy --model <m>`.
   The plan shows the agy argv with the model on it.
2. Add `--max-cost 5` to the same command. It exits 1 and names the flag and agy.
3. Run `dry-run --engine claude`. The argv is the same as before this change.

---

## Impact & Value

### Technical Impact

The supervisor can now drive more than one model family, and each further engine is a single
table entry. This is the first step of the all-models goal (tasks 213–214).

---

## Known Limitations & Future Work

- **CR-4 and CR-5 (LOW):** two documentation claims about agy were deferred.
- **PC-1 (LOW):** no render test passes a null `costUsd` or `transcriptPath`.
- **Fixtures:** the agy unit tests read fixtures captured from agy 1.4.2 in Phase 0. They will need
  re-capturing if agy's result format changes.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review._
