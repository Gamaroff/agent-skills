# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check (cycle 3)

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.3.open-coverage-fail-closed-reader.yml](./task.240.gate.3.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fix holds for the shape it was written for: bug.2's report now reads `unreadable`. The
scoped review found that the fix is narrower than its claim. `nestedLine()` checks only the first
character of a line, so an opener behind a nested dash, an anchor or a key with a space is missed,
and so is a quote opened inside a flow collection. Each of those reads a false 0 (BUG-3). Cycle 2
also introduced one false `unreadable`, which is low.

This is the third MEDIUM on one mechanism: quote handling in `open-coverage.js`. The fix should
replace the scan rather than patch it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-240-QA-3)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-240-QA-1 / BUG-1 | ✅ FIXED (cycle 1) | The cycle 1 fixtures re-run: 0, 1, `unreadable` |
| TASK-240-QA-2 / BUG-2 | ⚠️ FIXED FOR ITS SHAPE | The bug.2 shape reads `unreadable`, and M9–M11 were proven by qa-fix. The class is not closed; see BUG-3 |

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:201`: the opener check in `nestedLine()` misses four shapes. Each gives a false 0 (TASK-240-QA-3, [bug.3](./task.240.bug.3.nested-opener-check-bypassed.md)):
  - `[a, "b]`;
  - `- - "open`;
  - `- &a "open`;
  - `- sub key: "open`.
- **[low]** `shared/resources/open-coverage.js:205`: the comment strip ignores quotes, so `- [a, "see #12"]` reads `unreadable` (TASK-240-QA-4).

---

## Testing Scope

### Review Methodology

The review used direct tools, plus one read-only Explore code reviewer.

- **Reviewer pass:** scoped to the files changed since gate 2's head (`a98f5470`), diffed against `origin/develop`. Generated copies and task documents were excluded. The reviewer was told which findings were already routed as pre-existing, so it would not report them again.
- **Reviewer timing:** dispatched at 15:03:59Z; returned in 52,019 ms (completion notice `duration_ms`).
- **YAML comparison:** each finding was reproduced three ways: through the reader, through the old awk block, and through PyYAML 6.0.3.

**Re-review scope:** narrowed to the files changed since `a98f5470`: `CHANGELOG.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, `shared/resources/open-coverage.js` and `shared/resources/tests/open-coverage.test.mjs`.

**Step 4b:** unchanged from cycles 1 and 2. This cycle changed no fenced block.

CI on 46146a35: not read this cycle. The fix commit was pushed at 15:03Z, and the gate decision
does not depend on CI.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 refusals read `unreadable`, counts read right | BUG-3: four valid shapes give a false 0 | CONCERNS |
| SC-2 parity under bash and zsh | 88/88 locally. CI was green at cycle 2 | PASS |
| SC-4 the corpus reads the same | 187 reports, 0 changes (cycle 2 fix) | PASS |
| SC-6 `ci:fast` | 6,622 pass, 0 fail (cycle 2 fix) | PASS |
| SC-7 `bundle:check` | exit 0 | PASS |
| SC-8 `validate` | develop-task, develop-story and qa-fix all exit 0 | PASS |
| SC-9 guards mutation-proven | M9–M11 proven by qa-fix in cycle 2 | PASS |
| SC-3, SC-5, SC-10, SC-11 | Unchanged since cycle 2 | PASS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: The nested opener check misses an opener behind a prefix**

- **Severity**: MEDIUM. The reviewer rated it high; it was re-rated on a measurement, below.
- **Bug Report**: [task.240.bug.3.nested-opener-check-bypassed.md](./task.240.bug.3.nested-opener-check-bypassed.md)
- **Provenance**: the base awk also reads 0. The finding stays in scope because it is the class
  bug.2 claimed to close, and the reader's header asserts the rule this breaks.
- **Re-rating**: from high to medium. 0 of 187 tracked reports carry any nested value under an empty
  key, and no writer emits one. Confidence stays high.
- **Recommendation**: replace the scan with a character rule (see the bug report).

### LOW Severity Issues (1)

- TASK-240-QA-4: a false `unreadable` on a closed flow line that holds a quoted `#`. The
  replacement resolves it by design, because every nested quote is then refused.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

| NFR | Status | Notes |
| --- | --- | --- |
| Security | PASS | boundary: internal; evidence: reasoned; probes 0 |
| Performance | PASS | One linear pass |
| Reliability | CONCERNS | BUG-3 |
| Maintainability | CONCERNS | Third MEDIUM on one mechanism |

---

## Code Review

These findings are advisory unless promoted. `finding-anchors.js --rev HEAD` resolved all three
anchors.

- [high→medium/high] `shared/resources/open-coverage.js:205`: a quote left open inside a flow collection that ends with `]` is missed, giving a false 0. **Promoted** as part of TASK-240-QA-3.
- [high→medium/high] `shared/resources/open-coverage.js:201`: an opener behind a nested dash, an anchor or a key with a space is missed, giving a false 0. **Promoted** as part of TASK-240-QA-3.
- [low/high] `shared/resources/open-coverage.js:205`: the comment strip ignores quotes, giving a false `unreadable`. **Promoted** as TASK-240-QA-4 (low).

**Mutation proofs:** none this cycle. Cycle 2's M9–M11 still cover the code under review, and the
next fix replaces the guarded code, so it must prove its own guards.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Targeted suites | 172/172 |
| Fixtures for cycles 1 and 2 | As expected |

### Test Commands Executed

```bash
command node --test shared/resources/tests/open-coverage.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs shared/resources/tests/pr-review-current.test.mjs tests/relationship-assertion-lint.test.js   # 172/172
npm run validate -- skills/{develop-task,develop-story,qa-fix}/   # 0 each
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL, on TASK-240-QA-3 being fixed.

**Next Steps**: run `/qa-fix` cycle 3. Replace the nested opener scan; do not patch it.
