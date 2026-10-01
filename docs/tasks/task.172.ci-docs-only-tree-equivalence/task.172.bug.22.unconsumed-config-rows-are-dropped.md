# Bug Report: Task 172 - Configuration rows the parse does not consume are dropped silently

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-22
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 5 scoped review; reproduced by QA)
**Date Found**: 2026-10-01

## Description

The YAML subset stops a block at a dedent without an error, so rows after the stop are never read. Reproduced: `ci:` / `docsOnly:` / `enabled: false` with `enabled` indented to sit beside `docsOnly` (a key directly under `ci`) gives `enabled: true`; a first row indented deeper than a later `ci:` row (`  other: 1` then `ci:` ...) also drops `ci`. Each is an opt-out the owner wrote and the engine ignores, the same class as cycles 1 to 4 closed one spelling at a time.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; a configuration the engine cannot fully read is refused, not replaced by the defaults.

## Actual Behavior

See the description.

## Impact

An owner's opt-out is silently ignored, or a legitimate configuration is refused.

## Recommendation

Make the parse fail closed on the class rather than one more spelling: refuse any key under `ci` other than `docsOnly`, and refuse a configuration whose parsed structure does not account for every significant row (the parse must consume what it was given, or the file is refused with the count).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 5)

Reproduced by QA before the fix, and confirmed again by running the exported readers.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: the structural move rather than another spelling: `parseConfig` now compares the number of content rows with the number the parse accounts for (one per key and list element, recursively) and refuses the file with both counts when they differ, so a mis-indented, dedented or duplicated row cannot vanish. The specific diagnostics (block scalar, unknown key) are produced first so they name the cause, and a key under `ci` other than `docsOnly` is refused. `parseConfig` is split into the interpretation (`interpretConfig`) and the net around it.

Tests: four refused shapes (enabled beside docsOnly, a deeper first row, a duplicated key, a dedented row), the block-scalar diagnostic still winning, and four ordinary files not refused (comments, other keys, a block list, an inline comment, a marker, CRLF); this repository's own `skills-config.yaml` still parses (24 rows, 24 accounted for). Mutation proofs: removing the completeness check and removing the unknown-`ci`-key refusal each turn the CR5-2 test red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 5                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |
