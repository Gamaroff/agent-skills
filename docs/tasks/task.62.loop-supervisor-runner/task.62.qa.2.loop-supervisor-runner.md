# QA Report: Task 62 - Run each loop iteration in a fresh Claude process (Cycle 2, re-review)

**Task**: [task.62.loop-supervisor-runner.md](./task.62.loop-supervisor-runner.md)
**Gate File**: [task.62.gate.1.loop-supervisor-runner.yml](./task.62.gate.1.loop-supervisor-runner.yml) (updated in place)
**Previous Report**: [task.62.qa.1.loop-supervisor-runner.md](./task.62.qa.1.loop-supervisor-runner.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-28
**Gate Status**: PASS

---

## Re-Review Context

Scope: files changed since gate 1 (`git diff 951c21d..HEAD`) — `run-loop.mjs`, `classify.js`, `run-loop.test.mjs`, plus documentation. Quick-verification scope per the re-review rules: the fix is a targeted change to one function plus a new exported helper, with no new functionality.

| Previous issue | Status |
| -------------- | ------ |
| **LS-1** (medium) — config overrides an explicit CLI flag whose value equals the default | ✅ **FIXED** |
| LOW — `retry-once` in the `onError` JSDoc type but unimplemented | ✅ **FIXED** |

---

## Verification of LS-1

**The fix changes the mechanism, not just the symptom.** Presence is now *tracked* — `parseArgs` records each named option in an `explicit` Set — rather than *inferred* by comparing against `DEFAULTS`. That removes the entire class of bug rather than special-casing `--base`: every option that can be filled from config is covered by the same rule, and any option added later inherits it.

Verified four ways:

1. **Regression tests** — 9 added, covering the explicit-flag-equals-default case, explicit-differs-from-default, config filling unnamed options, per-option (not all-or-nothing) tracking, an absent `explicit` Set, and the concrete oracle-ref scenario that made the bug consequential. 110/110 pass (was 101).

2. **Mutation-proven.** Restoring the original `=== DEFAULTS` comparison turns exactly the right 3 tests red:
   ```
   ✖ LS-1: an explicit flag EQUAL TO THE DEFAULT still beats config
   ✖ LS-1: explicit tracking is per-option, not all-or-nothing
   ✖ LS-1: the oracle ref survives a disagreeing config end to end
   ```
   Suite returns to 110/110 on revert. `mutation-proven: yes` for LS-1 — the tests bind to the behaviour, they do not merely execute it.

3. **Live behaviour** against a config saying `baseBranch: main, cooldownSeconds: 300`:
   - `--base develop --cooldown 10` → `base=develop cooldown=10` (was `main`/`300` before the fix)
   - no flags → `base=main cooldown=300` (config still fills in, as intended)

4. **Completeness of the new flag→key table** — checked structurally, not by eye: 14 `KEY_OF` entries against 14 `switch` cases, with no case missing from the table and no table entry lacking a case; and behaviourally, each of the 14 flags parsed alone records exactly itself in `explicit`.

---

## Adversarial pass over the fix itself

A fix is new code, so it was reviewed as such rather than treated as the closure of a finding:

| Probe | Result |
| ----- | ------ |
| Does the new `Set` leak into serialised output? | No — `dry-run`'s JSON is a hand-built object; verified `explicit` is absent from it. A `Set` would have serialised as `{}` and silently corrupted the payload |
| Dangling binding from the refactor? | The `const ls = …` removed from `main()` is now declared inside `applyConfig`; no reference to it survives outside that function |
| Partial `explicit` state on a parse error? | Unreachable — an unknown option throws before the object is returned |
| Caller that did not use `parseArgs`? | `applyConfig` reads a missing `explicit` as "nothing supplied" and falls back to config-fills-everything — the safe direction, and tested |
| Error path / recovery | N/A — pure argument handling, no I/O, no lifecycle |

---

## Regression Check

| Area | Result | Notes |
| ---- | ------ | ----- |
| Full unit suite | PASS | 110/110 |
| `dry-run`, both adapters | PASS | `develop-next` → `ok=true, probe=selected`; `generic` → `ok=true, wouldSpawn=true` |
| `format:check` | PASS | Clean |
| `quick_validate.py` | PASS | ✓ loop-supervisor |
| `npm run bundle` | PASS | in sync (idempotent) |
| Cycle-1 tests still pass | PASS | All 101 originals green alongside the 9 new |

No behaviour outside argument handling was touched. The classifier and adapters are byte-identical apart from one JSDoc type line.

---

## NFR Assessment (delta only)

### Reliability — CONCERNS → **PASS**

The sole reason for the previous CONCERNS was LS-1's silent oracle degradation. That path is now closed at the mechanism level and covered by a mutation-proven test. Everything else in the previous reliability assessment stands unchanged.

Security, Performance and Maintainability are unchanged from cycle 1 (all PASS). Maintainability arguably improved: the precedence rule is now an exported, independently-testable function with the reasoning written at the point of decision.

---

## Issues Found

**HIGH: 0 · MEDIUM: 0 · LOW: 0**

One advisory observation, recorded rather than raised as a finding:

- The `KEY_OF` table must stay in step with the `switch`. A flag added to one and not the other loses its explicit tracking **silently** — no test currently asserts the two are in sync (the 9 new tests pin behaviour for the 14 flags that exist today). Verified complete for the current 14. A cheap future guard would be a test that derives both lists from the source and asserts equality. Not blocking: the failure mode requires a future edit, and it degrades to the previous behaviour rather than to something worse.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The single medium finding from cycle 1 is fixed at the mechanism level, mutation-proven, and confirmed live. No new issues introduced; no regressions. All repo gates green.
**Quality Score**: 96/100

The deterministic formula (`100 − 20×FAILs − 10×CONCERNS`) yields 100. Deducting 4 to keep the score honest about one criterion that remains **unverified rather than passing**: SC5 (one real `/develop-next` iteration) is deferred to a post-merge operator step and therefore has no evidence behind it yet. That is a deliberate, documented deferral rather than a defect — but a 100 would assert coverage this review does not have.

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Proceed to `/finalise`. Post-merge, run the deferred SC5 acceptance step on a clean tree.
