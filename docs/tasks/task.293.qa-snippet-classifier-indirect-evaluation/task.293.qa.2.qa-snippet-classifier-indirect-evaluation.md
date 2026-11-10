# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.2.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.2.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's two bypasses are fixed and held. The cycle-2 refute pass and safety re-probe, run by an independent read-only reviewer, found two further bypasses of the same family. QA reproduced both under bash 5.3: each classifies `runnable` and writes a file, and each control stays clean.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (code route; cycle 2, whole branch diff of 2508 lines, refute directive and safety re-probe directive both appended). The reviewer returned in about 48 seconds (measured from its completion notice) and ran about 32 probes in its own scratch directory. The independent review ran.

Re-review scope: unscoped (prior gate failed on security). Step 4b: not applicable beyond the engine's own tests; the one changed Markdown file documents the engine and its fenced blocks are classifier inputs, not executed prose.

CI on c685463bcf8a: pending (undecided; recorded, gate unchanged).

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-1 value assembled from pieces | FIXED (rule held; reviewer found no variant) |
| T293-QA-2 quoted substitution as a subscript | FIXED |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3229` — a bare word joined to a quoted literal escapes the assigned-literal rule (T293-QA-3).
- **[high]** `shared/resources/qa-execute-snippets.mjs:3231` — a literal piped into a later `read` escapes the same-segment rule (T293-QA-4).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | Real-bash table, 383/383 tests |
| Phase 2: refuse | CONCERNS | Partial | Two more same-family bypasses |
| Phase 3: prove | PASS | Verified | Differential, docs scan, mutations |

**Overall Phase Completion**: 3/3 ticked, 2 of 3 verified clean.

---

## Success Criteria Verification

Unchanged from cycle 1 except that the differential atoms do not yet contain the two new shapes. CHANGELOG cites `(task 293)`. Criteria drift: clean.

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: T293-QA-3, joined word and quoted literal**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: `x=a` followed directly by a single-quoted `[$(touch W)]`, then `echo $((x))`, classifies runnable and creates W. The control with `[5]` stays runnable and writes nothing.
- **Impact**: a documented block can run a command the classifier promised to refuse.
- **Recommendation**: decide assignment by the enclosing assignment word, not the character before the quote.
- **Priority**: P0

**Issue: T293-QA-4, literal piped into a later read**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: `echo` of a single-quoted `a[$(touch W)]` piped into a brace group with `read x; echo $((x))` classifies runnable and creates W. The `printf` form is caught only because `printf` is itself an evaluating word. The control with `a[5]` stays runnable.
- **Impact**: same as above.
- **Recommendation**: a block-level rule, so no segment boundary can separate the literal from the read.
- **Priority**: P0

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
The reviewer timed `x=a[` at 1e4, 4e4 and 1e5 repeats: linear.

### Reliability — PASS
`CI=true npm run ci:fast` green at the fix commit (8346 tests).

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (0 escaped)
- Two reproduced bypasses beyond the corpus.

### Maintainability — CONCERNS
Two cycles running, each added spelling has been followed by a new spelling. Replace the segment-local test with a block-level rule.

---

## Code Review

**Correctness bugs (2):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3229` — the assigned-literal test reads the one character before the quote → decide by the enclosing assignment word. Promoted to T293-QA-3, reproduced by QA (origin: code-review, reproduced by QA).
- [high/high] `shared/resources/qa-execute-snippets.mjs:3231` — the evaluating-word search is limited to the literal's own segment → block-level rule. Promoted to T293-QA-4, reproduced by QA.

**Cleanups (0).**

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; calibration `y='$'; z='(touch W)'; x="a[$y$z]"; echo $((x))` mutating, writes (the bypass is real bash behaviour). Both findings: runnable, wrote W. Controls: runnable, no write.

Provenance: the develop-base engine classifies both shapes the same way, and the task names this family, so both stay in `top_issues[]` rather than going to `recommendations.future`.

mutation-proven: assembled-value rule (`EXPANDED_ASSIGNMENT`) switched off → `task.293 each refusal is held on an input where it alone decides` and `task.293 every indirect-evaluation shape writes under real bash` → covered. The engine was restored from a `cp` snapshot; `cmp` clean.

---

## Regression Testing

The engine test file was not re-run in full this cycle; the fix commit's `CI=true npm run ci:fast` (8346 tests, 0 fail) is the record, and the four `task.293` tests were re-run under the mutation.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test --test-name-pattern "task.293" shared/resources/tests/qa-execute-snippets.test.mjs
security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock'
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Close T293-QA-3 and T293-QA-4 with a block-level rule, with table rows, decider rows and differential atoms.

### Short-term Actions (Non-Blocking)
1. Recorded unseen shapes and the advisory over-refusals stay as in cycle 1.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced bypasses of the refusal this task exists to deliver.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.293.qa.2.qa-snippet-classifier-indirect-evaluation.md`
**Gate File**: co-located at `task.293.gate.2.qa-snippet-classifier-indirect-evaluation.yml`
**Next Steps**: qa-fix cycle 2
