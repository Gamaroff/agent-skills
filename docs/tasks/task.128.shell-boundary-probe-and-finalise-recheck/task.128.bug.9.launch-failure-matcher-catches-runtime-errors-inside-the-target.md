# Bug Report: Task 128 - `isLaunchFailure` matches bash's runtime errors *inside* the target, so a script that runs a name is declined instead of compared

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md) · **Bug ID**: TASK-128-BUG-9 · **Severity**: MEDIUM · **Priority**: P2 · **Status**: ✅ Ready for QA · **Found By**: QA (cycle-3 review CR-1, reproduced) · **Date Found**: 2026-09-20

## Description
`isLaunchFailure` requires stderr to *contain* `entryPath`. bash prefixes every runtime error inside a script with that same path: a target that executes each name (`for f in "$1"/*; do "$f"; done` under `set -e`) prints `<entryPath>: line 3: <fixture>/x.gate…: Permission denied`, exit 126 — and is declined as "bash could not open the script". That is exactly the BUG-7 scenario the branch was rewritten for; the BUG-7 test only exercised an empty-stderr `exit 127`.

## Steps to Reproduce
`shell:` a script `set -e; for f in "$1"/*; do "$f"; done; printf '12\n'` → `unverifiable / entry-not-probeable / executed 0`, declined detail "bash could not open the script (exit 126)".

## Expected Behavior
Only a message *about the script itself* (`^(bash|<entryPath>): <entryPath>: (No such file|Is a directory|Permission denied|cannot execute)`, no `line N:` segment) is a launch failure; the run above is compared and reproduced.

## Recommendation
Anchor the matcher to the script-as-subject shape; add the runs-names fixture to pin that its 126 is scored.

## Developer Fix Cycle — Iteration 1
**Fix**: `isLaunchFailure` builds `^(bash|<entryPath>): <entryPath>: (No such file or directory|Is a directory|Permission denied|cannot execute)` (multiline, path regex-escaped) — the message must be *about the script*; a `line N:` runtime error no longer matches. Fixture `runs-names.sh` (`set -e; for f in "$1"/*; do "$f"; done`) is now compared (`exit 126 ≠ 0`, declined 0); unit table covers the inside-script shapes and a path with regex metacharacters.
**Mutation proof**: containment-only matcher restored → tests red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | script-as-subject matcher |
