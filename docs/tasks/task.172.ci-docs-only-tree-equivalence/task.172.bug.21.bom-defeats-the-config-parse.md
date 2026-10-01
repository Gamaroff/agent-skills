# Bug Report: Task 172 - A leading BOM defeats the configuration parse whenever anything precedes the ci key

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-21
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 5 scoped review; reproduced by QA)
**Date Found**: 2026-10-01

## Description

A skills-config.yaml that starts with a UTF-8 BOM and has any top-level key before `ci:` (or a `---` marker) loses its opt-out: the YAML subset counts the BOM as one column of indent on the first row, so `ci:` at column 0 ends the mapping and is never read. Reproduced: a BOM, then `version: 2`, then `ci:` with `docsOnly.enabled: false`, gives `enabled: true`. The same file with the BOM removed gives `false`. With a `---` marker after the BOM the file is refused as "does not parse to a mapping", which fails closed but rejects an ordinary configuration. The cycle 4 test for a BOM puts `ci:` first, which hides it. `hasSignificantLine` strips the BOM and the parser does not.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; a configuration the engine cannot fully read is refused, not replaced by the defaults.

## Actual Behavior

See the description.

## Impact

An owner's opt-out is silently ignored, or a legitimate configuration is refused.

## Recommendation

Strip a leading U+FEFF once, in `parseConfig`, before both the significance check and the parser; test a BOM with another key before `ci` and a BOM with a `---` marker.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 5)

Reproduced by QA before the fix, and confirmed again by running the exported readers.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: `parseConfig` strips a leading U+FEFF once, before the significance check, the completeness count and the YAML parser, so a BOM no longer shifts the first row's indent. A BOM then a key, a `---` marker or a comment before `ci` all read.

Tests: four BOM spellings (key, marker, comment, CRLF) read as the opt-out, and a committed BOM'd file with a key before `ci` is `disabled` through git. Mutation proof: removing the strip turns the CR5-1 test red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 5                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |
