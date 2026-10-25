# Bug Report: Task 232 - The new path grammar is a boundary the probe cannot reach (probes_executed 0)

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1, boundary rule)
**Date Found**: 2026-10-25

## Description

`isCasePath` (`shared/resources/security-probe.mjs:2114`) is a boundary under `probe-boundary-rule.md`: a predicate whose `false` stops a path from being read. It is module-private, so no engine entry form can import it. `probes_executed` for this change is 0. The DoD probe's zero-guard fails on the same record.

## Steps to Reproduce

A development-only probe in a scratch worktree, with `export` added to the one line: `--sink path --entry 'shared/resources/security-probe.mjs#isCasePath'`. Result: 11 executed; verdict `present-but-inert`.

| Case | Outcome |
| --- | --- |
| dot-dot-relative, dot-dot-deep, absolute, null-byte, prefix-not-boundary, empty | rejected |
| encoded-traversal | accepted |
| symlink-escape | accepted |
| nested-relative, dots-in-name, leading-dot (legitimate) | accepted |

Both accepted hostiles are handled outside this predicate. The engine never URL-decodes a case path, so `%2e%2e` is a literal name inside the case directory. A symlink is caught by `casePathState`'s ancestor realpath, which the per-form containment tests pin. That reasoning has to be recorded, not left implied.

## Expected Behavior

The predicate is reachable by the engine, a committed probe record shows `probes_executed > 0`, and the accepted-by-design hostiles are declined in a cases file with the reason.

## Actual Behavior

The predicate is unreachable, so the count is 0.

## Impact

The DoD probe will raise the same gap at finalise.

## Recommendation

Export `isCasePath`, or export the shared `caseKey` helper BUG-2 suggests along with the predicate. QA cycle 2 then probes it with `--sink path` and a cases file that records `encoded-traversal` and `symlink-escape` with their downstream handlers.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

`isCasePath` was module-private, so the probe's JS entry form could not reach the grammar and the security dimension recorded `probes_executed: 0`.

#### Fix Implementation

`isCasePath` (and `caseKey`) are exported. QA cycle 2 probes `isCasePath` with `--sink path`.

**Files modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`

**Testing**: The `caseKey` test imports `isCasePath` directly and checks the refused and accepted spellings.

## Status History

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-10-25 | New | Found in QA cycle 1 |
| 2026-10-25 | Ready for QA | qa-fix cycle 1 |
