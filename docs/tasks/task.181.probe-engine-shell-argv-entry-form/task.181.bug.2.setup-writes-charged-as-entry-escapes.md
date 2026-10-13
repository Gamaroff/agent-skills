# Bug Report: Task 181 - setup writes are charged to the entry as escapes

**Task**: [task.181.probe-engine-shell-argv-entry-form.md](./task.181.probe-engine-shell-argv-entry-form.md)
**Bug ID**: TASK-181-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2, code review CR-1 / TASK-181-002)
**Date Found**: 2026-10-13

## Description

`runShellArgvCase` runs `--fixture-setup` through `watchedSpawn` with the probed entry's own `escapes` array and `escapeId` (`${c.id}@${shell}`). Anything the setup writes in the sandbox but outside the case directory — a `mktemp` in `$TMPDIR`, a home dotfile — is recorded as an escape **by the entry under probe**, so `main()` exits 1 with `ESCAPED n` on an entry that wrote nothing. The task's claim that a setup is never a verdict is false: its side effects become the entry's escape count.

## Steps to Reproduce

`ok.sh` refuses unless `$1` is `alpha`; `setup-tmp.sh` is `mktemp >/dev/null`. `runProbeSpec({ entry: "shell-argv:ok.sh", argv: ["{input}"], fixtureSetup: "setup-tmp.sh", cases: [legitimate "alpha", hostile "beta"] })`.

## Expected Behavior

The entry's escape count reflects only the entry's own runs; the setup's writes are reported as the setup's.

## Actual Behavior

`verdict: engages`, `escapes: [{ id: "a.ok@bash", path: "tmp/tmp.…" }, { id: "a.bad@bash", path: "tmp/tmp.…" }]` — two escapes charged to a clean entry.

## Recommendation

Track the setup's writes separately from the entry's. A setup is meant to build the case directory: a write outside it makes that run `errored` ("fixture setup wrote outside the case directory: …"), named, never an escape of the entry.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-13 — qa-fix, QA cycle 2

**Move**: Narrowing residue (pipeline offer): the shell-argv: arm re-implemented the per-case isolation `runFenceCase` has. Move: consolidate — `caseShellEnv` and `caseWatchedSpawn` define it once for both arms.

**Fix**: The setup now runs through `caseWatchedSpawn` with its own write list (`setupWrites`), never the entry's `escapes`. A setup write anywhere but the case directory errors that run, naming the paths ("fixture setup wrote outside the case directory: …"). A never-ran setup reports why (`neverRanDetail`: timeout only on `ETIMEDOUT`, else the signal or the launch error — CR-4).

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`; the setup contract in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, the engine header, `CHANGELOG.md` and the task document.

**Testing**: New test: a `mktemp` setup errors every run and charges the entry nothing; a setup that makes its scratch inside `"$1"` engages with no escapes. Mutation (setup writes back into the entry's list) → red. CR-4 test (`kill -TERM $$` reports SIGTERM, not a timeout) and its mutation → red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-13 | New | qa-task | Found in QA cycle 2 (refute pass) |
| 2026-10-13 | Ready for QA | qa-fix | Fix iteration 1 |
