# Bug Report: Task 232 - `isCasePath` accepts `./` and `a/../`, which name the case directory itself

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 1; diff review CR-1, measured by QA)
**Date Found**: 2026-10-25

## Description

`isCasePath` (`shared/resources/security-probe.mjs:2114`) refuses a path whose `normalize()` is `.`. But `path.normalize` keeps a trailing separator, so `normalize("./")` and `normalize("a/../")` are both `"./"`. That is not `"."`, and `"./".split("/")` holds no `".."`. Both paths are accepted.

`casePathState` then resolves either one to the case directory, which always exists. So the assertion reads `./ was created` on every run. This is BUG-13's shape: a path that exists before the script runs scores every run as a side effect. The old separator-free rule refused both.

## Steps to Reproduce

```
node -e 'import("./shared/resources/security-probe.mjs").then(m => { for (const p of ["./","a/../","a/..","."]) console.log(JSON.stringify(p), m.expectedProblem({stdout:"",absent:[p]})) })'
```

## Expected Behavior

`./`, `a/../`, `.//` and any spelling that normalises to the case directory are refused, the same as `.`.

## Actual Behavior

`"./"` → `null` and `"a/../"` → `null` (accepted). `"a/.."` and `"."` are refused.

On base (`origin/develop`) both are refused by the separator-free rule, so the defect is new in this change.

## Impact

Under `./`, a hostile case scores as reproduced on every run, and a legitimate case scores as over-blocked. The grammar test's refused list has neither spelling, so the suite cannot see it.

## Recommendation

Strip trailing separators before the `.` and `..` tests: `normalize(p).replace(/\/+$/, "")`, or the platform `sep`. Treat an empty result as `.`. Add `./`, `a/../`, `.//` and `a/./..//` to the grammar test's refused rows, and confirm the test goes red without the fix.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

`path.normalize` keeps a trailing separator, so `./` and `a/../` normalise to `./`, which is not `.` and has no `..` segment.

#### Fix Implementation

New exported `caseKey(p)`: `normalize`, then trailing separators dropped. `isCasePath` compares by it, so every spelling of the case directory is `.` and refused.

**Files modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`

**Testing**: Grammar test refuses `./`, `.//`, `a/../`, `a/./..//`, `../`; the base-differential test now checks a flip resolves strictly inside the case directory (the old syntactic check passed `./`); new `caseKey` test. All red on the pre-fix engine.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-25 | New | qa-task | Found in QA cycle 1 |
| 2026-10-25 | Ready for QA | qa-fix | qa-fix cycle 1 |
| 2026-10-25 | Closed | qa-task | Verified by task.232.qa.2.probe-expected-path-assertions.md |
