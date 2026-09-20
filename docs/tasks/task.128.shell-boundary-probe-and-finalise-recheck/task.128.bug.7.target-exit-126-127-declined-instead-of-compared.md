# Bug Report: Task 128 - a target script's own 126/127 exit is declined instead of compared, so a reproduced finding can become a decline

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-2 refute review CR-3, verified: `bash <file>` never consults the shebang; launch failures carry `bash: <path>: No such file|Is a directory|Permission denied`)
**Date Found**: 2026-09-20

## Description
Cycle 1's 126/127 branch is reached by two distinguishable states — bash failing to open the file, and the **target** exiting 126/127 itself — and reports one value (`errored`). Since the stat check already removes the not-found and unreadable cases, in practice the branch fires on the target's own exit code: a hostile name that makes an unquoted script run it as a command (exit 127 under `set -e`) is now **declined** instead of `accepted`, and with the other hostile cases rejected the verdict can read `engages`. The branch's comment ("a shebang interpreter missing") describes a state that cannot occur under `bash "$1"`.

## Expected Behavior
Only bash's own launch failure is `errored`; a target-produced 126/127 is compared against `expected` like any other exit.

## Recommendation
Key the branch on bash's launch-failure stderr (`^bash: <entryPath>: (No such file or directory|Is a directory|Permission denied|cannot execute)`), not on the exit code alone.

## Developer Fix Cycle

### Iteration 1
**Root cause**: the branch keyed on the exit code alone; after the readability check that is the target's own code.
**Fix**: `isLaunchFailure(child, entryPath)` — exit 126/127 **and** bash's own message naming `entryPath` (`No such file or directory` / `Is a directory` / `Permission denied` / `cannot execute`). Anything else is compared. The readability check itself was hoisted to `runProbeSpec` (CR-7) so it runs once per entry.
**Tests**: `a TARGET's own 126/127 exit is compared, not declined (BUG-7)` (an `exit 127` script is scored — reproduced, not declined); `isLaunchFailure` table (four bash shapes true; target stderr, other-path message, code 0 false).
**Mutation proof**: path check dropped from `isLaunchFailure` → tests red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | launch failure keyed on bash stderr |
| 2026-09-20 | Closed | QA Engineer | Verified fixed at cycle 3 (execution) |
