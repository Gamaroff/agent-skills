# Bug Report: Task 51 - Null normalisation applied to the top-level reader but not the nested one

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-8
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2)
**Date Found**: 2026-08-17
**Introduced by**: the cycle-1 fix for BUG-3 — applied to one of the two readers that needed it

## Description

The BUG-3 fix added YAML-null normalisation to `read_config_key`'s awk tier with the rationale that
"awk hands back the literal text `null` and strict validation rejects a config that is both legal
and previously working". The identical bug sits one function below, in
`read_nested_config_key`, and was left in place.

## Steps to Reproduce

```yaml
access:
  tracker: null      # also NULL, ~
```

## Expected Behavior

Both tiers treat it as "not configured" → `ACCESS_TRACKER=full`, status 0.

## Actual Behavior

| tier | result |
|---|---|
| python | `rc=0 AT=full` |
| awk | `rc=1` — `❌ access.tracker: "null" is not a recognised value` |

A hard halt of every guarded call site on any host without pyyaml.

## Impact — wider than access

`resolve-paths.sh` uses the same reader:

```yaml
prd:
  prdShardedLocation: null
architecture:
  architectureShardedLocation: ~
```

| tier | result |
|---|---|
| python | `PRD_ROOT=docs/prd  ARCH_ROOT=docs/architecture` |
| awk | `PRD_ROOT=null  ARCH_ROOT=~` |

`ARCH_ROOT=~` unquoted in a later path expression expands to `$HOME`. `render-retro.sh` gets
`RETRO_LOCATION=null` by the same route.

Test §15 covers only the top-level spelling, which is why this passed.

## Recommendation

Normalise nulls in one place both readers share, rather than at each call site — the duplication is
what let the second one be forgotten. Extend §15 to the nested key and to `PRD_ROOT`/`ARCH_ROOT`.

---

## Developer Fix Cycle

### Iteration 1 — 2026-08-17

**Fix**: extracted `_config_denull` and called it from **both** readers. The original fix was inline
in one of them, which is exactly why the second was forgotten — one helper with two call sites cannot
drift the way two copies did.

Verified across both tiers: `access.tracker: null|NULL|~` → `full`, status 0; and
`prdShardedLocation: null` / `architectureShardedLocation: ~` → the defaults, never the literal
`null` or `~`.

**Files**: `shared/resources/read-config.sh`, `shared/resources/tracker-access.test.sh` (§20)

**Mutation**: removing the nested reader's denull → 7 failures.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 2 — introduced by a cycle-1 fix |
| 2026-08-17 | Ready for QA | qa-fix | Fixed and mutation-proved |
