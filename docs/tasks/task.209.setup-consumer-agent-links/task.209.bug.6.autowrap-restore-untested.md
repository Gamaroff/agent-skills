# Bug Report: Task 209 - nothing tests that the list turns autowrap back on

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 5 review of the TASK-209-BUG-5 fix)
**Date Found**: 2026-10-14

## Description

The TASK-209-BUG-5 fix turns autowrap off while the list is drawn and says it is restored on enter
and Ctrl-C. No test checked the restore: removing `\033[?7h` from `_checklist_restore` left the
whole suite green, and every later line of the wizard (and of the user's shell) would have been
clipped. Also, only `INT` restored the terminal; `TERM`, `QUIT` and an exit through the wizard's
EXIT trap did not.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-14

**Fix**: `finalAutowrap()` in the test reads the last `CSI ?7 h|l` in the output. The narrow-terminal
test asserts it is `on` after enter; a new test, `Ctrl-C in the list leaves autowrap on and links
nothing`, asserts it after Ctrl-C. The list's trap now covers `INT TERM QUIT`, and `_on_exit`
restores the terminal when the list was drawing. Removing the restore turns both tests red.

**Files Modified**: `scripts/setup-consumer.sh`, `shared/resources/tests/setup-consumer-agent-links.test.mjs`

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 5 review, CR-1 |
| 2026-10-14 | Ready for QA | qa-fix | Restore asserted on enter and Ctrl-C; TERM/QUIT and EXIT restore |
