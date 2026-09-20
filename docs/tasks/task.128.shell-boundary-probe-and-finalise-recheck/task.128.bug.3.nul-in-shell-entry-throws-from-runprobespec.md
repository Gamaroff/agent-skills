# Bug Report: Task 128 - a NUL byte in a `shell:` entry throws out of `runProbeSpec` instead of declining

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (security probe, `path` corpus `null-byte` case)
**Date Found**: 2026-09-20

## Description
`resolveEntry` accepts a path containing `\0` (lexically inside the root). For the JS form the import then fails and the case is declined. For the new shell form the path reaches `spawnSync` as argv, Node throws `ERR_INVALID_ARG_VALUE`, and the exception propagates out of `runProbeSpec` — whose JSDoc states the contract is "returns a verdict, never throws for a bad argument".

## Steps to Reproduce
```js
import("./shared/resources/security-probe.mjs").then(m => m.runProbeSpec({ sink: "filename", entry: "shell:shared/resources/qa-cycle\u0000.sh" }));
// TypeError [ERR_INVALID_ARG_VALUE]: The argument 'args[3]' must be a string without null bytes
```

## Expected Behavior
`bad-entry` from `resolveEntry` for both forms (a NUL is never a valid path), or at minimum a declined case.

## Actual Behavior
Uncaught throw from the engine on the shell form only.

## Impact
A caller (task.81's programmatic use, or a future CLI that reads entries from a file) gets a second failure mode the contract says does not exist. Fail-closed by crash, not silent — hence MEDIUM.

## Recommendation
Reject `\0` in `resolveEntry` as `bad-entry` for both forms (one line), and add the `null-byte` shape to the shell-entry tests.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)
**Date**: 2026-09-20 · **Root cause**: `resolveEntry` did not reject `\0`; the shell form passed the path to `spawnSync` as argv, which throws synchronously on a NUL, and `runShellCase` had no catch around the spawn.

#### Fix Implementation (In Progress → Ready for QA)
**Fix**: `resolveEntry` returns `bad-entry` (`entry contains a NUL byte`) for both forms before any path handling.
**Files**: `shared/resources/security-probe.mjs`; test `a NUL byte in an entry is bad-entry for BOTH forms, and the shell form never throws (BUG-3)`.
**Mutation proof**: check disabled → test red (throw).

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | In Progress | qa-fix | Investigation |
| 2026-09-20 | Ready for QA | qa-fix | NUL rejected in resolveEntry |
