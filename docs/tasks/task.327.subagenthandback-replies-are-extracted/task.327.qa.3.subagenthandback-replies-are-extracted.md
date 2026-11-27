# QA Report: Task 327 - SubagentHandback replies are extracted, not hand-copied (cycle 3)

**Task**: [task.327.subagenthandback-replies-are-extracted.md](./task.327.subagenthandback-replies-are-extracted.md)
**Gate File**: [task.327.gate.3.subagenthandback-replies-are-extracted.yml](./task.327.gate.3.subagenthandback-replies-are-extracted.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Gate Status**: PASS

---

## Executive Summary

Both cycle 2 findings are fixed, and each fix is held by a named test and a mutation. The scoped re-review found no bug, only three low cleanups, which are recorded as advisory. Gate PASS.

**Deployment Recommendation**: READY, once CI on 53bcb574e is green.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T327-QA-4 earlier-turn hand-back extracted after a new prompt | ✅ FIXED | test "task 327 QA-4 …"; mutation j (never clear) and k (clear on every user line) both red |
| T327-QA-5 lstat error read as "nothing there" | ✅ FIXED | test "task 327 QA-5 …"; mutation l red |

## Review Methodology

Direct tools plus code review: one read-only Explore subagent over the files changed since gate 2, given their full branch diff. It returned after 105625 ms. It checked `isPrompt` against 2462 subagent transcripts on this host.

Re-review scope: files changed since 17b74641b (CHANGELOG.md, shared/resources/agent-reply-block.js, its finalise copy, the test file)

CI on 53bcb574e1f2: pending

Step 4b: no fenced block changed.

## Real-transcript check

The real host hand-back transcript was re-extracted after the turn-rule change:

- Result: `{"reason":"extracted","bytes":17900,"sha256":"77072d335c5e3efee8b7192872d87b047c51a7fe5398afd668f0f8f602a970c9","reply":"handback"}`, identical to cycle 1.
- User-line shapes across this host's transcripts that contain a `SubagentHandback`: `["tool_result"]` (1198) and string prompts (162). So the rule never drops a hand-back on its own result.

## New Findings This Cycle

None gating.

## Code Review

**Cleanups (3), advisory:**
- `shared/resources/agent-reply-block.js:137`: no test uses a mixed `tool_result` + text prompt line, which is the one shape that tells `some` from `every` (CR-1).
- `shared/resources/agent-reply-block.js:136`: a user line with missing or non-array content resets the text tail but keeps the hand-back. No such line exists on this host (CR-2).
- `shared/resources/agent-reply-block.js:133`: `isPrompt` sits between `replyText`'s JSDoc and `replyText` (CR-3).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (3 advisory cleanups)

---

## NFR Assessment

| NFR | Status |
| --- | --- |
| Security | PASS. Evidence: reasoned. Probes executed: 0 |
| Performance | PASS |
| Reliability | PASS |
| Maintainability | PASS |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 92/100
**Next Steps**: Step 5c `/review-pr`.
