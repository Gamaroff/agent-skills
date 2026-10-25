# Bug Report: Task 232 - A trailing slash on an `absent` path skips the fixture-collision decline

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1; found by QA and independently by diff review CR-2)
**Date Found**: 2026-10-25

## Description

`pathAssertionProblem` (`shared/resources/security-probe.mjs:2136`) compares `normalize(p)` against the created paths. `normalize("sub/")` keeps the slash, so `absent: ["sub/"]` with a fixture that creates `sub/target` matches neither `m === f` nor `m.startsWith(f + sep)` (`"sub//"`). The case is not declined.

`casePathState` then resolves `sub/` to the existing directory, and the run is scored `sub/ was created`.

## Steps to Reproduce

End to end, through `runProbeSpec`: the entry is `shell-argv:…/non-remover.sh`, the fixture files are `{"sub/target": ""}`, and the case is legitimate with `expected: {stdout:"ok\n", exit:0, absent:[P]}`.

| P | Result |
| --- | --- |
| `sub` | declined — "names \"sub\", which the fixture itself creates" (correct) |
| `sub/` | executed 1, case `rejected`, detail `sub/ was created` (wrong) |

## Expected Behavior

`sub/`, `sub//` and `./sub/` are declined exactly as `sub` is.

## Actual Behavior

The case is scored, and a legitimate case reads as over-blocked on every run. A hostile case would read as reproduced.

## Impact

The decline that task.232 was written to make reliable has a spelling hole. The same root cause affects `removed`, but there it fails safe: `removed: ["sub/target/"]` is declined as "does not create".

## Recommendation

Normalise both sides the way the scorer resolves them: strip trailing separators after `normalize`, in `pathAssertionProblem` for `absent` and `removed` alike. The simplest route is one shared `caseKey(p)` helper, reused by `isCasePath` (BUG-2). Add `sub/` and `./sub/` rows to the per-form "absent path the fixture creates" tests.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

`pathAssertionProblem` compared `normalize()` spellings, which keep the trailing separator, while the scorer's `resolve` drops it — `sub/` and `sub` were one path to the scorer and two to the collision rule.

#### Fix Implementation

`pathAssertionProblem` compares by the same `caseKey` as `isCasePath` — one normaliser for both.

**Files modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`

**Testing**: Collision rows `sub/`, `./sub//`, `sub/marker/`, `pwned/`; every runner form's "absent path the fixture creates" test now also runs the trailing-slash spelling. Red on the pre-fix engine on all five forms.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-25 | New | qa-task | Found in QA cycle 1 |
| 2026-10-25 | Ready for QA | qa-fix | qa-fix cycle 1 |
| 2026-10-25 | Closed | qa-task | Verified by task.232.qa.2.probe-expected-path-assertions.md |
