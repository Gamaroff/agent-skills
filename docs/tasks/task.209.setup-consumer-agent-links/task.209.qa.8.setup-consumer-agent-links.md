# QA Report: Task 209 - setup-consumer.sh links each user's agents (cycle 8)

**Task**: [Link to task document](./task.209.setup-consumer-agent-links.md)
**Gate File**: [task.209.gate.8.setup-consumer-agent-links.yml](./task.209.gate.8.setup-consumer-agent-links.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-10-14 · **Gate Status**: PASS

## Re-Review Context

Re-QA of the fixes for the gaps `/finalise` run 1 found (`task.209.dod.1.setup-consumer-agent-links.md`).

| DoD gap | Status | Evidence |
| --- | --- | --- |
| Security — an id after a newline never checked | ✅ FIXED | One `_link_agents_ids` parse splits on commas and newlines; `--link-agents reads ids across newlines…` refuses `claude\nclaud` and links `claude\r\ngemini`; removing the split turns it red |
| SC5 — guards without a mutation record | ✅ FIXED | Recorded below |

mutation-proven: no-terminal guard removed → `with no terminal and no --link-agents, the list is skipped…` (now requires no `/dev/tty` errors) → covered
mutation-proven: wrap-around removed → `the list: space ticks, arrows move and wrap, enter confirms` → covered
mutation-proven: pre-tick removed → `the list pre-ticks agents already linked, so enter keeps them` → covered
mutation-proven: newline split removed → `--link-agents reads ids across newlines…` → covered

## Review Methodology

Two read-only review rounds on the gap-fix diff. Round 1 found the parse's exit status was lost
through `< <(...)` and an empty list would abort under bash 3.2's `set -u` (low); fixed with a command
substitution and an empty-array guard. Round 2: no findings in this file. The bash 3.2 guard cannot be
exercised on CI's bash 5; it is on task.210's macOS checklist.

## New Findings This Cycle

None.

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Next Steps**: `/finalise` run 2.
