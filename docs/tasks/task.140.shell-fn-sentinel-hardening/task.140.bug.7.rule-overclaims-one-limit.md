# Bug Report: Task 140 - Rule §5 states one limit to the gh trip-wire; there are at least three

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-7
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (QA cycle 4, code review CR-1/CR-2/CR-3, provenance-checked)
**Date Found**: 2026-09-30

## Description

`probe-boundary-rule.md` §5 says the trip-wire's "one limit" is an absolute path to a real `gh`. Executed on cycle 4, three other shapes also reach a real `gh` with nothing recorded, and the run is scored:

1. A library that puts another directory ahead of the trip-wire on `PATH` (`export PATH="/usr/local/bin:$PATH"`), then calls `gh`.
2. The same prepend with `--fake-gh` given: the fixture is bypassed, and the record still names the fixture as what answered.
3. A `gh` call backgrounded past the spawn (`( sleep 2; gh … ) &`) runs after the sandbox and its trip-wire directory are deleted.

The engine behaviour in all three is **identical at `origin/develop`** (verdict `absent`, 20 executed, the planted real `gh` ran), so it is not introduced by this change and is routed to `recommendations.future`. The defect **this change introduces** is the claim: the rule this branch added tells a reader there is one bypass when there are at least three.

## Steps to Reproduce

The scratch driver ran a planted "real `gh`" (it writes a marker), put ahead of the trip-wire, under `runProbeSpec` at HEAD `ab079810` and at `origin/develop`. Each shape → `absent`, executed 20, marker written, at both.

## Expected Behavior

§5 states every known limit, each with a row that pins it. Otherwise the limits are closed.

## Recommendation

State the three shapes in §5 as limits beside the absolute path, and pin the PATH-prepend shape with a row, as the absolute-path limit is pinned. Closing them needs a post-source `gh` function shadow, a fixture-answered marker for `--fake-gh`, and a process-group kill before teardown. That is follow-up work, not this task's scope.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: rule §5 now states all three limits beside the absolute path: a library `PATH` prepend (which also bypasses `--fake-gh` while the record names the fixture), and a `gh` call backgrounded past the spawn. It says all three predate task.140 and that closing them is follow-up work. The same claim was corrected in the CHANGELOG entry and in two engine comments.

**Files Modified**:
- `shared/resources/probe-boundary-rule.md` §5 (+ 2 bundled copies)
- `shared/resources/security-probe.mjs` (comments only; + 4 bundled copies)
- `CHANGELOG.md`
- `shared/resources/tests/security-probe.test.mjs` — a row pinning the PATH-prepend limit

**Testing**: the pin row is green: the prepended `gh` runs and the run is not declined. Probe population: `probe-boundary-rule.md` is the only executed document that restates the trip-wire's limit.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-30 | New | QA Engineer | QA cycle 4 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in cycle 4 5b |
| 2026-09-30 | Closed | QA Engineer | Verified cycle 5 |
