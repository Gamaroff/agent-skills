# QA Report: Task 142 - Pin the hand-written reference docs to the skills they describe (cycle 3)

**Task**: [Link to task document](./task.142.reference-doc-skill-pinning.md)
**Gate File**: [task.142.gate.3.reference-doc-skill-pinning.yml](./task.142.gate.3.reference-doc-skill-pinning.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Gate Status**: PASS

---

## Executive Summary

The cycle-2 fixes hold. The cost tests and the live-corpus assertions now run the same function, the spy helper can no longer pass vacuously, and all six mutations turned the intended test red. Three low cleanups remain advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status |
| :--- | :--- |
| Gate 2 CR-1 — cost tests spied on code the assertions did not run | FIXED — assertions read `resolveCorpus()`'s results; a spawn in the flag loop turns the no-spawn test red |
| Gate 2 CR-2 — `withSpies` silent on a missing target | FIXED — installed count asserted; a misspelled target turns it red |
| Gate 2 CR-3 — restore before async work | FIXED — a promise from `fn` is refused; an async `fn` turns it red |
| Gate 1 CR-1 / CR-2 (advisory) | NOT FIXED — still advisory follow-ups |

## New Findings This Cycle

- **[low]** `tests/reference-doc-skill-pinning.test.js:126` — activation flags extracted but never checked → check or drop.
- **[low]** `tests/reference-doc-skill-pinning.test.js:161` — an empty `SKILL.md` and a missing one share one message → separate them.
- **[low]** `tests/reference-doc-skill-pinning.test.js:314` — the corpus is resolved twice → compute once.

### Review Methodology

Direct tools; Step 3b as one Explore subagent. `code_review_blocking=true`: no high-confidence bug, so nothing entered `top_issues[]`.

Re-review scope: files changed since gate 2 (head 0b1cd008a88b; 4 files, 1 code file) — default

Step 4b: not applicable — no runnable prose in the change set.

## Code Review

mutation-proven: spawn added in the flag loop → "resolving the whole corpus spawns no process…" → covered
mutation-proven: spy target misspelled → same test (installed-count assertion) → covered
mutation-proven: `fn` made async → same test (promise refused) → covered
mutation-proven: memoisation removed → "each SKILL.md is read once per run…" → covered
mutation-proven: `/develop-batch --dry-run --nope` → "every flag a row advertises…" → covered
mutation-proven: `skills/develop-batch` moved aside → "every row resolves…" + "every named skill exists" → covered

## Test Artifacts

```bash
command node --test tests/reference-doc-skill-pinning.test.js   # 17 pass
npm run ci:fast   # 4715 tests, 4714 pass, 0 fail, 1 skipped (symlinks aside)
```

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
