# QA Report: Task 209 - setup-consumer.sh links each user's agents (cycle 3)

**Task**: [Link to task document](./task.209.setup-consumer-agent-links.md)
**Gate File**: [task.209.gate.3.setup-consumer-agent-links.yml](./task.209.gate.3.setup-consumer-agent-links.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-10-14 · **Gate Status**: CONCERNS

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA-209-2 — typo stops the full wizard midway | ✅ FIXED | `an unknown id stops the FULL wizard before any step writes`; mutation red |
| QA-209-3 — failed link reported as linked | ✅ FIXED | `a link that cannot be made is reported as failed, never as linked`; mutation red |

TASK-209-BUG-2 and TASK-209-BUG-3 closed.

## Review Methodology

Re-review scope: files changed since gate 2 (head 1746fa09e61e; 2 files) — default. One read-only
reviewer. Reviewer time: 68 s.

## New Findings This Cycle

- **[medium]** `scripts/setup-consumer.sh:2113` — a `failed` link is counted with kept/missing and recorded as `warn`, so the run exits 0 and says "Restart your agents" → record the step as `fail`. Promoted: QA-209-4 ([TASK-209-BUG-4](./task.209.bug.4.failed-link-recorded-as-warning.md)).
- **[low, advisory]** `scripts/setup-consumer.sh:1983` — a folder `mkdir -p` created stays behind when `ln -s` then fails.
- **[low, cleanup]** `scripts/setup-consumer.sh:2053` — `link_agents`' unknown-id branch is now unreachable and duplicates `_check_link_agents`.
- **[low, cleanup]** `scripts/setup-consumer.sh:1957` — the status-word comment omits `failed`.

## Test Commands Executed

```bash
npm test     # 5494: 5476 pass, 4 fail (obs #39, worktree-only)
```

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` for QA-209-4.
