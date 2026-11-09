# Bug Report: Task 274 - `--fixture-copy` follows a symlinked intermediate directory

**Task**: [Link](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Bug ID**: TASK-274-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

`--fixture-copy` in `shared/resources/security-probe.mjs` checks containment lexically
(`isWithin(root, abs)`) and rejects a symlink only at the leaf (`lstatSync(abs).isSymbolicLink()`).
A symlinked intermediate directory passes both checks, so a file outside the repository root is read
and copied into every case directory.

## Steps to Reproduce

1. Make a scratch root `R` with `R/link` a symlink to a directory `O` outside `R` holding `outside.txt`.
2. Run `security-probe.mjs --entry shell-argv:s.sh --argv '["{input}"]' --cases-file cases.json --repo-root R --fixture-copy link/outside.txt`, where `s.sh` exits 7 if any file in its case directory holds the text `secret`.
3. Control: the same run without `--fixture-copy`.

## Expected Behavior

The path is declined with `bad-fixture-copy`; no outside bytes reach a case directory.

## Actual Behavior

The case is rejected by `s.sh` (exit 7): the outside file's content was copied in. The control run
accepts. Found by the diff reviewer (CR-1) and reproduced by QA.

## Impact

The flag exists to copy repo files. Outside bytes in a case directory leak into probe output and
the record, and the copy is made before any case runs. The path is operator-supplied, so exposure
is limited, but the containment rule the flag documents is not held.

## Recommendation

Resolve the path with `realpathSync` and require the result to stay within the realpath of the root
before reading; keep the leaf-symlink refusal. Add a control (an in-tree path accepted) and a
mutation proof (drop the realpath check, a named test goes red).

## Developer Fix Cycle

### Iteration 1

**Root cause**: containment was checked on the lexical path only; the leaf `lstat` cannot see a symlink higher up.

**Fix**: `security-probe.mjs` now requires `isWithin(root, realpathSync(abs))` after the leaf check and declines `bad-fixture-copy` ("resolves outside the repo root").

**Tests**: `fixture-copy: every unusable value is declined…` gains a symlinked-directory case (declined, nothing executed) with a real-directory control (copied). Mutation proof: disabling the realpath check turns that test red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-09 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix; regression tests and mutation proofs added |
| 2026-11-09 | Closed | qa-task | Verified by task.274.qa.2.qa-engines-stop-passing-what-they-cannot-see.md |
