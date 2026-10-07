# QA Report: Task 135 - Gate scoping from a recorded head, not a typed timestamp — cycle 2 (refute pass)

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Gate File**: [task.135.gate.2.gate-scoping-from-recorded-head.yml](./task.135.gate.2.gate-scoping-from-recorded-head.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 re-read the whole branch to refute cycle 1's fixes (head `60b4ef6e`). All four cycle-1 bugs are fixed as described and mutation-proven, but two of those fixes are incomplete in ways only the refute pass could see: binding `$LATEST_GATE` in Step 3b removed an accident that had kept cycle 3+ unscoped, and so exposed that `$SAFETY_REPROBE` is also read from another shell — cycle 3+ now narrows after a security FAIL. And branch-scoping the freshness test covers merged gates but not develop-batch's rebase of open PRs. Two MEDIUM siblings: the Phase 0 trigger reads `$LATEST_GATE` unbound, and excluding all of `docs/` hides documentation deliverables.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (92/92 on the three suites; eval replays green)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#531)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing (eval:develop-task, eval:develop-story, validate)
- [x] Security Review (reasoned)
- [x] Code Review (fresh Explore reviewer, refute directive)

### Review Methodology

Cycle 2: whole-branch diff (1506 lines, generated copies and `docs/tasks/*` excluded), reviewed to refute by a fresh read-only Explore subagent with the REFUTE PASS directive appended; `SAFETY_REPROBE=false` (gate 1's security axis: `PASS reasoned`). Direct tools for verification.

```
Re-review scope: whole branch — cycle 2 refute pass (REFUTE_PASS=true)
```

---

## Re-Review Context

| Cycle-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 freshness test red after rebase/squash | PARTIAL | Merged gates fixed (judgeCorpus test; M5 red). In-flight rebase not covered → CR2-2 |
| CR-2 Step 3b cannot see the gate | FIXED — but exposed CR2-1 | G [bash/zsh] + structural G; M6/M7 red |
| CR-3 trigger counts five directories | FIXED — over-corrected → CR2-4 | F4/F6; M8/M10 red |
| CR-4 uncommitted document edits invisible | FIXED | F5; M9 red |
| CR-5 … CR-8 | FIXED / documented | CR-6 message, CR-7 after(), CR-8 ls-files count |

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-re-review-scope.md` (block, both skills) — `$SAFETY_REPROBE` read unbound; cycle 3+ narrows after a security FAIL → refuse when unset (CR2-1, [bug 5](./task.135.bug.5.cycle-3-narrows-on-a-security-fail.md))
- **[high]** `shared/resources/tests/gate-head-freshness.test.mjs` — develop-batch rebases open PRs; on-branch gates then name unreachable heads → rewrite-proof corpus rules only (CR2-2, [bug 6](./task.135.bug.6.freshness-test-red-after-in-flight-rebase.md))
- **[medium]** `skills/qa-task/SKILL.md` Phase 0 step 3 — reads `$LATEST_GATE` unbound (CR2-3, [bug 7](./task.135.bug.7.phase-0-trigger-reads-latest-gate-unbound.md))
- **[medium]** `skills/qa-task/SKILL.md` — `:(exclude)docs` hides documentation deliverables (CR2-4, [bug 8](./task.135.bug.8.code-moved-excludes-all-docs.md))
- **[low]** untracked files invisible to `CODE_MOVED` (CR2-5); `merge-base` throw on unrelated history (CR2-6); the empty-list HALT's claim (CR2-7); preamble swallows `qa-cycle.sh` stderr (CR2-8); `qa-fix` gate-update text and `qa-gate-template.yaml` still schema 1 / typed `updated` (CR2-9)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: `head:` on the gate | CONCERNS | CR2-9: two gate-writer descriptions in qa-fix not updated |
| Phase 2: scope and trigger | FAIL | CR2-1, CR2-3, CR2-4 |
| Phase 3: freshness test + 5c row | FAIL | CR2-2 |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Gate carries schema 2, head, clock updated | PASS | gates 1–2 |
| Cycle N+1 file list from head | CONCERNS | correct when reached, but reached after a security FAIL too (CR2-1) |
| Trigger re-reviews after a hidden commit | CONCERNS | CR2-3 makes the skip unreachable; CR2-4 misses docs deliverables |
| Schema-1 → unscoped with reason | PASS | test C |
| Freshness test green; no `--since` | FAIL | CR2-2 |
| CHANGELOG | PASS | |

---

## Breaking Changes Validation

Unchanged from cycle 1: PASS.

---

## Issues Found

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 5. Bug reports 5–8 filed; lows in the gate's `recommendations.future`.

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS
CR2-2 would HALT every rebased develop-batch item; CR2-3 makes the PASS skip unreachable.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- CR2-1 switches off the safety re-probe carve-out on cycle 3+. `boundary: false` — `checkGate`, `judgeCorpus`, `branchChangedPaths` are test helpers taking repository files, not external input.

### Maintainability — PASS

---

## Code Review

Fresh Explore reviewer, refute directive. `code_review_blocking=true`: CR2-1 … CR2-4 promoted.

**Correctness bugs (9):**
- [high/high] `skills/qa-task/SKILL.md:429` — `$SAFETY_REPROBE` unbound in Step 3b (**CR2-1, promoted**)
- [high/high] `shared/resources/tests/gate-head-freshness.test.mjs:91` — in-flight rebase (**CR2-2, promoted**)
- [medium/high] `skills/qa-task/SKILL.md:187` — Phase 0 step 3 `$LATEST_GATE` unbound (**CR2-3, promoted**)
- [medium/high] `skills/qa-task/SKILL.md:194` — `:(exclude)docs` too wide (**CR2-4, promoted**)
- [low/medium] CR2-5 … CR2-9 as listed above

**Cleanups (0).**

Provenance: all in code this branch introduces; CR2-1 and CR2-3 are latent shapes the branch's own binding change exposed.

---

## Regression Testing

| Area | Result |
| --- | --- |
| three suites | 92/92 |
| eval:develop-task, eval:develop-story | PASS |
| validate qa-task / qa-story / qa-gate | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-scope-from-head.test.mjs shared/resources/tests/gate-head-freshness.test.mjs evals/shared/tests/qa-re-review-scope-parity.test.mjs
npm run eval:develop-task && npm run eval:develop-story
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/ ; npm run validate -- skills/qa-gate/
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: gate rule 1 — two HIGH entries.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.135.qa.2.gate-scoping-from-recorded-head.md`
**Gate File**: co-located at `task.135.gate.2.gate-scoping-from-recorded-head.yml`
**Next Steps**: `/qa-fix` CR2-1 … CR2-4 (and the lows); cycle 3 is the first narrowed cycle — it will exercise the new scope block on this task's own gates.
