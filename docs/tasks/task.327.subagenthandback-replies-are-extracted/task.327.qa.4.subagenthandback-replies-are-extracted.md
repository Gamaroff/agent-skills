# QA Report: Task 327 - SubagentHandback replies are extracted, not hand-copied

**Task**: [task.327.subagenthandback-replies-are-extracted.md](./task.327.subagenthandback-replies-are-extracted.md)
**Gate File**: [task.327.gate.4.subagenthandback-replies-are-extracted.yml](./task.327.gate.4.subagenthandback-replies-are-extracted.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Testing Completed**: 2026-11-27
**Gate Status**: PASS

---

## Executive Summary

Cycle 4 re-enters QA after DoD 1 found two gaps ([DoD 1](./task.327.dod.1.subagenthandback-replies-are-extracted.md)). Both are closed. #6 now has a stale `--out` case for every non-extracted reason. #10 was amended with an approver, and its three guards of pre-existing rules each go red under a named mutation, re-run this cycle.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous item | Source | Status |
|---|---|---|
| #6: no stale `--out` test for `transcript-ambiguous`, `empty-block`, `entity-escaped` | DoD 1 | ✅ FIXED (commit 1d914ac8e) |
| #10: three new tests could never be red before their change | DoD 1 | ✅ FIXED: criterion amended, approved by the owner; mutation evidence below |
| Gate 3 advisories CR-1..CR-3 | gate 3 | carried as `recommendations.future` |

## New Findings This Cycle

- **[low/medium, advisory]** `shared/resources/tests/agent-reply-block.test.mjs:501`: the coverage check trusts the module's own `REASONS` list (CR-1). Measured: every `reason:` literal in `agent-reply-block.js` is in `REASONS` or is `usage`, so there is no present defect. Routed to `recommendations.future`.
- **[cleanup]** `shared/resources/tests/agent-reply-block.test.mjs:515`: the comment says every reason is reported, but a wrong reason still stops at the first case (CR-2).

---

## Testing Scope

### Review Methodology

Direct tools (re-review, test-only change). One Explore reviewer for the diff: dispatched 00:34Z, returned in 58 s (`duration_ms` 57798).

Re-review scope: files changed since gate 3 (head 53bcb574e1f2; 1 code file) — default

Diff review: code review.

CI_SUMMARY=CI on 1d914ac8e4a3: pending

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| Phases 1–4 | PASS | Module unchanged since gate 3; the cycle adds test cases only |

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1–5, 7–9, 11, 13–14 | unchanged since gate 3 | PASS | carried; module unchanged (`git diff 53bcb574e..HEAD -- shared/resources/agent-reply-block.js` is empty) |
| 6 | No file at `--out` after any answer but `extracted` | PASS | `agent-reply-block.test.mjs:453` seeds all six reasons; mutations (m), (n) below |
| 10 (amended) | Red before the change, or red under a named mutation for a guard of a pre-existing rule | PASS | 7 tests red before their change (qa.1); `:351`, `:427`, `:436` red under (b), (c), (c2), re-run below |
| 12 | `npm test` under CI=true; bundle leaves no diff | PASS | ci:fast 8926 tests, 8923 pass, 0 fail (LAN server); `npm run bundle` left no diff |

criteria-drift: drift (base: review-commit). #7 added (approved by review-task), #10 reworded (approved by the owner).

changelog: cites (task 327).

---

## Breaking Changes Validation

None.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (advisory)

---

## NFR Assessment

### Performance — PASS
Test-only change.

### Reliability — PASS
Every non-extracted reason is now held by a stale `--out` case.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 23. The DoD 1 plan was re-run at `1d914ac8e`: 0 reproduced, 0 escaped. Record: `task.327.qa.4.security.run.json`.
- Boundary: true, signal `never`.

### Maintainability — PASS
Two advisory items.

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `shared/resources/tests/agent-reply-block.test.mjs:501`: the coverage check reads `REASONS`, which `extract()` never validates against → tie it to the returned reasons (advisory; no present defect, measured).

**Cleanups (1):**
- `shared/resources/tests/agent-reply-block.test.mjs:515`: a reason mismatch stops the loop at the first case → collect mismatches too, or narrow the comment.

Anchors: `finding-anchors.js` → ok.

mutation-proven: (b) the later-of-two check replaced by `!handback` → `:351` "a block only in an earlier hand-back, then a text turn with no block" (and `:314`) → covered
mutation-proven: (c) the exact tool name check replaced by `true` → `:427` "a tool_use of another name is never read" (and QA-4) → covered
mutation-proven: (c2) the string / non-empty message check replaced by `!== undefined` → `:436` "a hand-back whose message is empty or not a string" → covered
mutation-proven: (m) clearing skipped when the agent id is ambiguous → `:453` stale `--out` test, red naming `transcript-ambiguous` only → covered
mutation-proven: (n) the `--out` clear disabled → `:453`, red naming all six reasons (run at development in commit 1d914ac8e) → covered

Each mutation was edited in and back with the file tool. `cmp` against the snapshot printed nothing, and the 20 tests were green again after.

---

## Regression Testing

ci:fast on the LAN server: 8926 tests, 8923 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run test:remote
CI=true command node --test shared/resources/tests/agent-reply-block.test.mjs
command node .agents/skills/finalise/references/security-probe-plan.mjs --plan task.327.dod.1.security.plan.json --record task.327.qa.4.security.run.json ...
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both DoD gaps are closed with committed tests and mutation evidence. Nothing blocks.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: 5c PR review, then re-run `/finalise`.
