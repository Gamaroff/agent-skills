# QA Report: Task 209 - setup-consumer.sh links each user's agents (cycle 2)

**Task**: [Link to task document](./task.209.setup-consumer-agent-links.md)
**Gate File**: [task.209.gate.2.setup-consumer-agent-links.yml](./task.209.gate.2.setup-consumer-agent-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-14
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA-209-1 / TASK-209-BUG-1 — unknown id exits 0 | ✅ FIXED | Probe re-run: all 5 hostile ids exit non-zero (0 reproduced); test asserts the code. Bug closed. Its fix introduced TASK-209-BUG-2, below. |

## Executive Summary

The exit status is fixed, but the refute pass found that the fix stops the full wizard after it has
already written steps 1–8 (TASK-209-BUG-2), and that a failed `mkdir`/`ln` is reported as a link made
(TASK-209-BUG-3, reproduced).

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL — fix both bugs; owner's
real-terminal check still open

## Review Methodology

Re-review scope: unscoped — cycle 2 full refute pass over the PR #659 merge diff plus fix commit
`1746fa09`. One read-only reviewer with the refute directive. Reviewer time: 114 s.

## New Findings This Cycle

- **[medium]** `scripts/setup-consumer.sh:2030` — the cycle-1 `return 1` stops the full wizard at step 8b after steps 1–8 wrote → validate ids at parse time. Promoted: QA-209-2 ([TASK-209-BUG-2](./task.209.bug.2.typo-stops-the-full-wizard-midway.md)).
- **[medium]** `scripts/setup-consumer.sh:1982` — `mkdir`/`ln` failures ignored inside `status=$(...)`; reproduced with `.claude` as a regular file → check both explicitly. Promoted: QA-209-3 ([TASK-209-BUG-3](./task.209.bug.3.failed-link-reported-as-linked.md)).
- **[low, advisory]** `scripts/setup-consumer.sh:1969` — link identity by raw `readlink` text (a trailing slash reads as "aimed elsewhere").
- **[low, advisory]** `scripts/setup-consumer.sh:222` — a terminal lost mid-list reports "no terminal".
- **[low, cleanup]** `scripts/setup-consumer.sh:2027` — the extra "Wizard exited prematurely" row; resolved by parse-time validation.

## Security — PASS

- **Evidence**: measured · **Probes executed**: 8 (`task.209.qa.2.security.run.json`), 0 reproduced.

## Test Commands Executed

```bash
npm test     # 5487: 5469 pass, 4 fail (obs #39, worktree-only)
node skills/qa-task/references/security-probe.mjs --sink shell-exec \
  --entry 'shell-argv:scripts/setup-consumer.sh' --argv '["--links-only","--link-agents","{input}"]' \
  --cases-file docs/tasks/task.209.setup-consumer-agent-links/task.209.qa.2.security.cases.json \
  --fake-gh .claude/state/fakegh --record docs/tasks/task.209.setup-consumer-agent-links/task.209.qa.2.security.run.json --json
```

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` for QA-209-2 and -3.
