# QA Report: Task 209 - setup-consumer.sh links each user's agents (cycle 5)

**Task**: [Link to task document](./task.209.setup-consumer-agent-links.md)
**Gate File**: [task.209.gate.5.setup-consumer-agent-links.yml](./task.209.gate.5.setup-consumer-agent-links.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-10-14 · **Gate Status**: CONCERNS

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-209-BUG-5 — frames stack in a narrow terminal (found by the owner's real-terminal check after gate 4 passed) | ✅ FIXED | `the list redraws in place in a terminal narrower than its lines`; mutation red; the owner re-ran it on Linux: works. Bug closed. |

Criterion 6: Linux verified by the owner; macOS deferred by the owner to task.210.

## Review Methodology

Re-review scope: files changed since gate 4 (head c0db062aa3fc; 2 files) — default. One read-only
reviewer. Reviewer time: 117 s.

## New Findings This Cycle

- **[medium]** `shared/resources/tests/setup-consumer-agent-links.test.mjs:478` — nothing checks autowrap is restored; removing the restore stays green. Promoted: QA-209-5 ([TASK-209-BUG-6](./task.209.bug.6.autowrap-restore-untested.md)).
- **[low]** `scripts/setup-consumer.sh:2222` — TERM, QUIT, Ctrl-Z and the EXIT trap did not restore the terminal.
- **[low, cleanup]** `shared/resources/tests/setup-consumer-agent-links.test.mjs:420` — the window-size comment overstated what the pty size does.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: verify the BUG-6 fix (cycle 6).
