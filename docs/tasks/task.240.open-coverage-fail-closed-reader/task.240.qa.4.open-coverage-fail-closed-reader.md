# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check (cycle 4)

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.4.open-coverage-fail-closed-reader.yml](./task.240.gate.4.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's character rule holds. All four bug.3 shapes read `unreadable`, the fixtures from cycles 1
and 2 read as designed, and the corpus is unchanged.

The scoped review found an older defect in a separate mechanism. `quoted()` keeps a double-quoted
escape as a literal character, which means a `category:` or `provenance:` value holding an escape
reads differently from YAML. This produces a false 0 that the base awk did not have (BUG-4). The
code dates from the first commit, and none of the earlier passes caught it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-240-QA-5)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-240-QA-1 / BUG-1 | ✅ FIXED (cycle 1) | Fixtures: 0, 1, `unreadable` |
| TASK-240-QA-2 / BUG-2 | ✅ FIXED (cycle 2) | Reads `unreadable` |
| TASK-240-QA-3 / BUG-3 | ✅ FIXED | All four shapes read `unreadable`. qa-fix mutation-proved M9 and M12–M15 |
| TASK-240-QA-4 (low) | ✅ RESOLVED BY DESIGN | Every quote nested under an empty key is now refused |

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:137`: a double-quoted escape is kept as the literal character. With `provenance: "pr\e-existing"`, the reader prints 0 where PyYAML and the base awk read 1 (TASK-240-QA-5, [bug.4](./task.240.bug.4.escape-in-deciding-value-misread.md)).

---

## Testing Scope

### Review Methodology

The review used direct tools, plus one read-only Explore code reviewer.

- **Reviewer pass:** scoped to the files changed since gate 3's head (`46146a35`), diffed against `origin/develop`. `open-coverage.js` is new on this branch, so the whole file was in scope.
- **Reviewer timing:** dispatched at 15:14:02Z; returned in 188,239 ms (completion notice `duration_ms`).
- **Cross-check:** each finding was reproduced three ways: with the reader, with the old awk block, and with PyYAML 6.0.3.

**Re-review scope:** narrowed to the files changed since `46146a35`: `CHANGELOG.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, `shared/resources/open-coverage.js` and `shared/resources/tests/open-coverage.test.mjs`.

**Step 4b:** unchanged; no fenced block changed this cycle.

CI on 32065fbf: not read this cycle (the gate decision does not depend on it).

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 counts read right | BUG-4: a deciding value with an escape is misread | CONCERNS |
| SC-2 parity | 92/92 locally | PASS |
| SC-4 corpus | 187 reports, 0 changes | PASS |
| SC-6 `ci:fast` | 6,634 pass, 0 fail (cycle 3 fix) | PASS |
| SC-7 / SC-8 | `bundle:check` 0; `validate` ×3 0 | PASS |
| SC-9 | M9 and M12–M15 (cycle 3) | PASS |
| SC-3, SC-5, SC-10, SC-11 | Unchanged | PASS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: An escape in a deciding value is misread**

- **Bug Report**: [task.240.bug.4.escape-in-deciding-value-misread.md](./task.240.bug.4.escape-in-deciding-value-misread.md)
- **Provenance**: new on this branch. The base awk reads 1 here, matching YAML.
- **Re-rating**: high → medium. In the 187 tracked reports, no `category:` or `provenance:` value contains a backslash, and review-pr writes both values bare. Confidence stays high.
- **Recommendation**: refuse an escape in a deciding value.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

| NFR | Status | Notes |
| --- | --- | --- |
| Security | PASS | boundary: internal; evidence: reasoned; probes 0 |
| Performance | PASS | One linear pass |
| Reliability | CONCERNS | BUG-4 |
| Maintainability | PASS | The nested rule is one character test |

---

## Code Review

`finding-anchors.js --rev HEAD`: the anchor resolves.

- [high→medium/high] `shared/resources/open-coverage.js:137`: an escape in a deciding value is kept literally, which gives a false 0. **Promoted** as TASK-240-QA-5.

**Mutation proofs:** none this cycle. qa-fix proved M9 and M12–M15 in cycle 3.

**Gap:** four cycles of hand-picked rows have each turned up the next shape that a YAML parser would
have caught. That is why gate 4 keeps CR-6, a differential test against a parser, in
`recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL, on TASK-240-QA-5 being fixed.

**Next Steps**: `/qa-fix` cycle 4.
