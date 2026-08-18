# Bug Report: Task 51 - `tracker: null` halts the run

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-17

## Description

`tracker: null` (and `tracker: ~`) is the documented YAML spelling of "no override". It worked before
this task and halts after it.

Cause, at `shared/resources/read-config.sh:107-134`: tier 1 correctly maps an explicit YAML null to
`auto`, but the short-circuit at L128 only returns early for a value that is **not** `auto`. Control
therefore falls through to the awk tier, which returns the literal text `null`, and `validate_enum`
rejects it.

The same applies to `vcs: null`.

## Steps to Reproduce

```bash
printf 'tracker: null\n' > skills-config.yaml
source shared/resources/resolve-platform.sh; echo $?      # 1
```

## Expected Behavior

`rc=0`, `TRACKER` detected as if the key were absent.

## Actual Behavior

`❌ tracker: "null" is not a recognised value.` and `rc=1`.

## Impact

A previously-working, legal config now halts every guarded call site. Falsifies Success Criterion 7
independently of the zsh defect.

## Recommendation

Make tier 1's `auto` authoritative when tier 1 actually ran, rather than treating it as "no answer".
Distinguish "tier 1 unavailable" from "tier 1 said auto" — e.g. have the python tier emit a distinct
`__NONE__` sentinel for an absent/null key and map that to `auto` without consulting awk. Add
`tracker: null`, `tracker: ~` and `vcs: null` fixtures under both tiers.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress) — 2026-08-17

Root cause was the tier-1 short-circuit treating `auto` as "no answer" rather than as an answer.
Tier 1 correctly mapped YAML null to `auto`; because that equalled the fallback sentinel, control
fell through to awk, which returned the literal text `null`.

#### Fix Implementation (In Progress → Ready for QA) — 2026-08-17

Two changes:

1. **Tier 1 is now authoritative when it runs.** The python program emits a distinct `__NONE__`
   sentinel for an absent-or-null key, which the reader maps to `auto` and returns immediately.
   Tier 2 is consulted only when tier 1 could not run or could not parse.
2. **The awk tier learned YAML's null spellings** (`null`, `Null`, `NULL`, `~`) so an awk-only host
   agrees with tier 1 rather than halting.

**Files**: `shared/resources/read-config.sh`, `shared/resources/tracker-access.test.sh`

**Testing**: new §15 asserts `tracker: null` and `tracker: ~` resolve to status 0 and detect
normally, under **both** tiers.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-17 | In Progress | qa-fix | Investigation started |
| 2026-08-17 | Ready for QA | qa-fix | Fix implemented, covered by new assertions |
