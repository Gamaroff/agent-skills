# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.7.open-coverage-fail-closed-reader.yml](./task.240.gate.7.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 7 is the last cycle of the granted re-entry. It re-reviews `5f69c201` (qa-fix cycle 6). The
three cycle-6 findings are fixed: a comment ends a wrapped value, an indicator-led value is refused,
and the generator now reaches both shapes. Two more shapes that YAML rejects still get a count. One
is a whitespace-only line holding a tab (BUG-9, found by the hand probe), which falsifies cycle 6's
own claim about tabs. The other is a plain flow value holding a bracket (CR-1, now BUG-10).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-240-QA-8: comment inside a wrapped plain value | BUG-6 | ✅ FIXED | Both repro shapes `unreadable`; nested-plain variant `unreadable`; wrap, comment, then next key still reads 0 as YAML does |
| TASK-240-QA-9: indicator-leading value | BUG-7 | ✅ FIXED | All five repro shapes plus `? x`, `: x`, `\|x`, `>x`, `!x` `unreadable`; `?x`, `-x`, `>-` block still count |
| TASK-240-QA-10: generator misses shapes | BUG-8 | ✅ FIXED (for its three named gaps) | The widened suite went red on the cycle-6 reader (542 of 25,000); fresh seeds now green; worktree mutations each red |
| CR-4 (gate 6 future): tab after a colon | — | ⚠️ PARTIAL | Refused on content lines; a whitespace-only line with a tab is still skipped (BUG-9) |
| CR-5 (gate 6 future): N floor | — | ✅ FIXED | `OPEN_COVERAGE_DIFF_N=999` fails with "too small" |

BUG-6, BUG-7 and BUG-8 are closed in this cycle (Step 9b).

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:291`: a whitespace-only line holding a tab is
  skipped as blank, so the reader counts a block that PyYAML rejects → refuse it before the blank skip
  ([BUG-9](./task.240.bug.9.tab-in-blank-line-accepted.md), TASK-240-QA-11)
- **[medium]** `shared/resources/open-coverage.js:124`: a plain flow value holding `[` or `]` is
  accepted, and PyYAML raises ParserError → refuse it
  ([BUG-10](./task.240.bug.10.flow-value-bracket-accepted.md), TASK-240-QA-12, CR-1)
- **[low]** `shared/resources/tests/open-coverage-differential.test.mjs:215`: the flow generator
  never emits a bracket mid-value (BUG-10, TASK-240-QA-13, CR-2)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none: printed contract unchanged)
- [x] Code on feature branch with open PR (#776)

### Review Methodology

Direct tools (re-review), plus one read-only Explore code-review subagent. It was dispatched at 16:44:42Z and its completion notice was handled at 16:48:44Z (`duration_ms` 210,496, 3.5 min).

Re-review scope: files changed since gate 6 (head 22bdc3e9d7f4; 13 files). This is the default, with `SAFETY_REPROBE=false` (clause 1 false; clauses 2–3 do not hold, since no prior gate failed on security).

QA also ran a 34-shape hand probe against PyYAML. It covered shapes outside the generator's grammar, next to each rule cycle 6 added.

CI on 5f69c201f78f: pending.

Step 4b: not applicable. There is no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: reader contract | PASS | Verified | Printed contract unchanged |
| Phase 1: fail-closed reader | CONCERNS | Partial | BUG-9 and BUG-10 |
| Phase 2: 5c wiring | PASS | Verified | Unchanged since gate 6 |
| Phase 3: tests and corpus | PASS | Verified | Corpus test green; differential suite green at 10 seeds |

**Overall Phase Completion**: 4/4 phases complete, 1 with concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Reader prints `unreadable` or YAML's count, never another | 0 wrong counts | 2 shape classes wrong | CONCERNS | BUG-9 and BUG-10; corpus 0 of each |
| Tracked reports read the same as before | 0 changes | 0 | PASS | `open-coverage.test.mjs` corpus case |
| Tests passing | 100% | 6680/6680 | PASS | `ci:fast` at 5f69c201 |
| Validation (`npm run validate`) | pass | pass | PASS | develop-task and develop-story |
| Bundle in sync | 0 problems | 0 | PASS | `bundle:check` |

---

## Breaking Changes Validation

None. The printed `OPEN_COVERAGE=` contract and routing are unchanged. The new refusals turn shapes that YAML rejects from a count into `unreadable`, which is the fail-closed direction.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: A whitespace-only line holding a tab is skipped as blank**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.240.bug.9.tab-in-blank-line-accepted.md](./task.240.bug.9.tab-in-blank-line-accepted.md)
- **Observation**: `  ⇥` between two entries makes the reader print 2, while PyYAML raises ScannerError. The same happens at the end of a block and between the lines of a block scalar.
- **Impact**: This breaks the reader contract and falsifies cycle 6's stated tab rule. The count matches what the writer meant.
- **Recommendation**: Refuse such a line before the blank skip, and let the generator emit whitespace-only lines.
- **Priority**: P2

**Issue: A plain flow value holding a bracket is accepted**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.240.bug.10.flow-value-bracket-accepted.md](./task.240.bug.10.flow-value-bracket-accepted.md)
- **Observation**: `- {category: coverage, provenance: pre-existing]}` makes the reader print 1, while PyYAML raises ParserError.
- **Impact**: YAML gives no value for a deciding key, but the reader still compares one. Corpus: 0 plain hits; the only bracket among the 4 tracked flow entries is inside quotes.
- **Recommendation**: Refuse a bracket anywhere in a plain flow value, and add it to the generator.
- **Priority**: P2

### LOW Severity Issues (1)

- CR-2: the flow generator does not emit a bracket mid-value (filed with BUG-10).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
One linear pass. The differential suite at N=25,000 runs in seconds.

### Reliability — CONCERNS
BUG-9 and BUG-10: two shapes that YAML rejects still get a count.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, as on gates 1–6. `countOpenCoverage` reads a review report the pipeline itself writes, and no corpus sink models that input. The PyYAML differential suite and the hand probe exercise its fail-closed property. It only parses text: no eval, no shell, no file write.

### Maintainability — PASS
The header matches the code, except for the tab claim that BUG-9 falsifies. CR-3 and CR-4 are advisory.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true` from the pipeline).

**Correctness bugs (2):**
- [medium/high] `shared/resources/open-coverage.js:124`: a plain flow value holding `[` or `]` mid-value is accepted, though PyYAML rejects it → refuse a bracket anywhere in a plain flow scalar. **Promoted: TASK-240-QA-12.** Reproduced by QA (3 shapes).
- [low/high] `shared/resources/tests/open-coverage-differential.test.mjs:215`: the flow generator never puts a bracket inside a flow value → add risky bracketed values. **Promoted: TASK-240-QA-13.**

**Cleanups (2):**
- `shared/resources/open-coverage.js:532`: a thrown reader defect reports `bad-line`, the same reason as malformed input → give it its own reason.
- `shared/resources/open-coverage.js:550`: an unreadable file reports `no-section` → give it a separate reason.

All four anchors were checked: `ok`.

boundary: internal (internal_reason: the input is a review report this pipeline writes; no corpus sink models it). Probes executed: 0. Escaped: 0.

mutation-proven: `endsAtComment` with `plain` removed → open-coverage.test.mjs refused rows (3 red) → covered
mutation-proven: backtick dropped from `INDICATOR` → open-coverage.test.mjs indicator row plus the differential suite (2 red) → covered
mutation-proven: tab rule disabled → open-coverage.test.mjs tab rows plus the differential suite (5 red) → covered

The proofs ran in a scratch worktree at HEAD, after the reviewer had returned its tree read. The file was restored and cmp-verified each time.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `ci:fast` (format check plus full `npm test`) | PASS: 6680 pass, 0 fail |
| `pr-review-loop-parity.test.mjs` | PASS |
| Differential suite, seeds 11, 42, 99, 1234 and 2026 × 25,000 | PASS |
| Hand probe, 34 shapes | 1 wrong (BUG-9); 4 over-refusals, all fail-closed |

---

## Test Artifacts

### Files Reviewed
`shared/resources/open-coverage.js`, its two bundled copies, both test suites, `CHANGELOG.md`, and the task.240 docs.

### Test Commands Executed
```bash
npm run ci:fast
python skills/create-skill/scripts/quick_validate.py skills/develop-task
python skills/create-skill/scripts/quick_validate.py skills/develop-story
OPEN_COVERAGE_DIFF_N=25000 OPEN_COVERAGE_DIFF_SEED=<seed> node --test shared/resources/tests/open-coverage-differential.test.mjs
OPEN_COVERAGE_DIFF_N=999 node --test shared/resources/tests/open-coverage-differential.test.mjs
node <scratchpad>/qa7-probe.mjs "$PWD"
```

### Coverage Report
Not measured by the repository's test runner (node --test, no coverage flag). Branch coverage of the new guards was established by mutation instead.

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-9: refuse a whitespace-only line that holds a tab.
2. BUG-10: refuse a bracket in a plain flow value, and widen the generator first.

### Short-term Actions (Non-Blocking)
1. CR-3 and CR-4: give an internal error and an unreadable file their own reasons.
2. CR-6 (carried): the `python3 -I` user-site gap.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings. Two medium shapes break the reader's contract. Both counts are the ones the writer meant, and the corpus holds neither shape.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-240-QA-11 and QA-12 fixed

---

**QA Report**: co-located at `task.240.qa.7.open-coverage-fail-closed-reader.md`
**Gate File**: co-located at `task.240.gate.7.open-coverage-fail-closed-reader.yml`
**Next Steps**: The cycle budget (7) is spent, so the pipeline goes to Loop Escalation.
