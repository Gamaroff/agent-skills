# Bug Report: Task 232 - New shell-fn fixture has no shell directive, so CI's shellcheck job is red

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1, PR #748 checks)
**Date Found**: 2026-10-25

## Description

`shared/resources/tests/fixtures/security-probe/path-actions-lib.sh` is a sourced library and has no shebang. ShellCheck cannot tell which shell it targets, so the `shellcheck` job on PR #748 fails with SC2148 (error) at line 1. `bash scripts/lint-shell.sh` fails the same way locally.

The local `npm run ci` run in Step 3 reported green because `lint:shell` selects files with `git ls-files '*.sh'`, and the seven new fixtures were still untracked when it ran. The gate passed over files it could not see.

## Steps to Reproduce

1. `bash scripts/lint-shell.sh` on the PR head.
2. Read the output: `In shared/resources/tests/fixtures/security-probe/path-actions-lib.sh line 1: SC2148 (error)`.

## Expected Behavior

Every tracked source `.sh` passes `scripts/lint-shell.sh`, and the PR's `shellcheck` check is green.

## Actual Behavior

`lint_rc=1`, and the PR's `shellcheck` check fails.

## Impact

Merge is blocked by a red required check.

## Recommendation

Add a `# shellcheck shell=bash` directive as line 1. That is the form a sourced library takes. Then run `bash scripts/lint-shell.sh` with the fixtures tracked (staged), not before.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

The fixture is a sourced library with no shebang, so shellcheck cannot infer its dialect (SC2148). The local gate missed it because `lint:shell` lists files with `git ls-files`, and the fixture was untracked at the time.

#### Fix Implementation

Added `# shellcheck shell=bash` as line 1, the convention `undefined-command-guard.sh` already uses.

**Files modified**: `shared/resources/tests/fixtures/security-probe/path-actions-lib.sh`

**Testing**: `bash scripts/lint-shell.sh` is red on the tracked file without the directive and green with it.

## Status History

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-10-25 | New | Found in QA cycle 1 |
| 2026-10-25 | Ready for QA | qa-fix cycle 1 |
