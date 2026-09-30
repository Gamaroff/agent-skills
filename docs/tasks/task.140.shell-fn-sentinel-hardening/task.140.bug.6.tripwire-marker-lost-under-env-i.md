# Bug Report: Task 140 - The trip-wire records nothing when gh is called under env -i

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 3, code review CR-2)
**Date Found**: 2026-09-30

## Description

The trip-wire stub finds its marker path in `$PROBE_GH_TRIPPED`. A call under `env -i PATH="$PATH" gh …` — a pattern this repository's own `*.test.sh` files use — still reaches the stub (exit 127), but the variable is gone, `: > ""` fails silently, nothing is recorded, and the run is scored against the stub's answer.

## Steps to Reproduce

Library `f() { X=gh; env -i PATH="$PATH" "$X" api x >/dev/null 2>&1; printf '%s\n' "$1"; }`, no `--fake-gh`: result `no-hostile-case-was-rejected`, executed 20.

## Recommendation

Write the absolute marker path into the stub's text when it is created, not into the environment; add a row that calls gh under `env -i PATH="$PATH"`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: the stub read its marker path from `$PROBE_GH_TRIPPED`, which `env -i` removes.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: `tripwireGh(markerPath)` writes the absolute, single-quoted marker path into the stub text; `PROBE_GH_TRIPPED` is gone from the child environment.

**Files Modified**:
- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md` §5 (+ 2 bundled copies)

**Testing**: new row: `env -i PATH="$PATH" "$X"` under both `shell-fn:` and `shell:` declines `needs-fake-gh` with the run-time detail. Red on the cycle-2 engine, green on the fix.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in cycle 3 5b |
