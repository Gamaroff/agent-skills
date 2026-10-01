# Bug Report: Task 172 - A config blob that parses to no mapping, or is not a regular file, is treated as not configured

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-20
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 4 scoped review; reproduced by QA)
**Date Found**: 2026-10-01

## Description

skills-config.yaml committed as a symlink (mode 120000) to a file holding `enabled: false`: git show returns the link text, the YAML subset yields nothing and the owner opt-out is ignored (reproduced, exit 0). `parseConfig("ci docsOnly\nenabled false")` and a top-level list also give the defaults. Empty file and unparseable file report one value.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; a configuration the engine cannot read is refused, not replaced by the defaults; an answer that can still change is never latched as final.

## Actual Behavior

See the description.

## Impact

The rule is lost for a poll, or an owner's opt-out is ignored.

## Recommendation

parseConfig refuses text with significant lines that does not parse to a mapping; readConfigAtCommit refuses a blob that is not a regular file (modes 120000 and 160000).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 4)

Reproduced by QA before the fix, and the reading in the source confirmed it.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: `parseConfig` throws a usage error (exit 2) for text that has a significant line (not blank, a comment or a document marker; a BOM is ignored) but does not parse to a non-empty mapping. `readConfigAtCommit` reads the entry's git mode first and refuses anything but `100644` or `100755` (a symlink, `120000`, or a submodule, `160000`); `readConfig` refuses a non-regular file the same way. An empty file, a comment-only file and no file remain "not configured".

Tests: `parseConfig` over a top-level list, a line without a colon, a bare link text and a BOM-prefixed list (refused) and over empty, comment-only, marker-only, BOM-only and other-keys-only text (defaults), with a BOM and CRLF config still read; a real-git repository whose `skills-config.yaml` is a symlink to a file holding `enabled: false` exiting 2 instead of 0; and a regular file in both modes (`100644`, `100755`) still read. Mutation proofs: removing the significance check, the mode check and the `lstat` check each turn a test red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 4                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |
