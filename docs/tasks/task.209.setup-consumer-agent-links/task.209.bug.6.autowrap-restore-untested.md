# Bug Report: Task 209 - nothing tests that the list turns autowrap back on

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
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

### Iteration 2

**Date**: 2026-10-14

**QA Reopening Reason** (cycle 6): the TERM/QUIT trap re-raised SIGINT, so a TERM or QUIT reached
the caller as Ctrl-C; and the new Ctrl-C test also passed on the code before the change.

**Move: scope the claim** (qa-fix Step 2.6, repeat subject: every fix to the terminal restore had
produced the next finding). The TERM/QUIT trap and the `_on_exit` restore are removed, so
`setup-consumer.sh` is byte-identical to the cycle-4 PASS state. The claim is now exactly what the
tests hold: enter and Ctrl-C restore autowrap. The Ctrl-C test requires the run to have died from
SIGINT (driver exit 254) and rethrows anything else; removing the INT restore turns it red. TERM,
QUIT and Ctrl-Z during the list are a known limitation, recorded in the gate.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 5 review, CR-1 |
| 2026-10-14 | Ready for QA | qa-fix | Restore asserted on enter and Ctrl-C; TERM/QUIT and EXIT restore |
| 2026-10-14 | Reopened | qa-task | Partly fixed per task.209.qa.6.setup-consumer-agent-links.md — the TERM/QUIT trap re-raised INT, and the new test passed without the change |
| 2026-10-14 | Ready for QA | qa-fix | Scoped back to the tested INT restore; Ctrl-C test requires a SIGINT death |
| 2026-10-14 | Closed | qa-task | Verified by task.209.qa.7.setup-consumer-agent-links.md |
