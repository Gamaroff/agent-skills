# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.3.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.3.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2's block-level rule held. The safety re-probe, run by an independent read-only reviewer over about 100 evaluation routes, found two more spellings of the same family that the enumerated arithmetic-read detector does not list. QA reproduced both under bash 5.3: each classifies `runnable` and writes a file, and each control stays clean. This is the third consecutive HIGH finding in `qa-execute-snippets.mjs`, so the mechanism, not the line, must be replaced.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (code route; cycle 3, whole branch diff of 3227 lines, safety re-probe directive; the prior gate failed on security). The reviewer returned in about 84 seconds (measured from its completion notice) and its independent review ran. It did not time linearity this cycle.

Re-review scope: unscoped (prior gate failed on security). Step 4b: not applicable beyond the engine's own tests.

CI on b74ca09a7c79: pending at the last read (undecided; recorded, gate unchanged).

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-3 joined word and quoted literal | FIXED |
| T293-QA-4 literal piped into a later read | FIXED |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3127` — the arithmetic-read detector misses the offset of a positional expansion (T293-QA-5).
- **[medium]** `shared/resources/qa-execute-snippets.mjs:3127` — a subscript beginning with a digit is not seen (T293-QA-6).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | Real-bash table, 383/383 tests |
| Phase 2: refuse | CONCERNS | Partial | Two more same-family spellings |
| Phase 3: prove | PASS | Verified | Differential, docs scan, mutations |

**Overall Phase Completion**: 3/3 ticked, 2 of 3 verified clean.

---

## Success Criteria Verification

Unchanged from cycle 1 except that the differential atoms do not yet contain the two new shapes. CHANGELOG cites `(task 293)`. Criteria drift: clean.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T293-QA-5, positional offset**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: `set -- 'a[ $(touch W)]'; echo ${@:$1}` (and the `${*:$1}` form) classifies runnable and creates W. `set` is not an evaluating word and the detector lists only named-variable offsets. The control `set -- 2; echo ${@:$1}` stays runnable and writes nothing.
- **Impact**: a documented block can run a command the classifier promised to refuse.
- **Recommendation**: replace the enumerated detector with a default-deny rule (any live expansion or name-bracket in a block that holds a substitution literal).
- **Priority**: P0

### MEDIUM Severity Issues (1)

**Issue: T293-QA-6, subscript starting with a digit**
- **Severity**: MEDIUM
- **Category**: Security
- **Observation**: `set -- 'a[ $(touch W)]'; v=(1); echo ${v[1+$1]}` classifies runnable and creates W; `${v[ $1]}` is refused only by an unrelated unparseable-command rule.
- **Recommendation**: same replacement.
- **Priority**: P1

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Docs scan median +0.5% at the cycle-2 fix; not re-timed this cycle (no engine change).

### Reliability — PASS
`CI=true npm run ci:fast` green at the cycle-2 fix commit.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (0 escaped)
- Two reproduced bypasses beyond the corpus.

### Maintainability — CONCERNS
Three cycles running, each added spelling has been followed by a new spelling.

---

## Code Review

**Correctness bugs (2):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3127` — ARITHMETIC_READ misses `${@:off}` and `${*:off}` → replace the enumeration. Promoted to T293-QA-5, reproduced by QA (origin: code-review, reproduced by QA).
- [medium/medium] `shared/resources/qa-execute-snippets.mjs:3127` — a subscript beginning with a digit is not seen → same replacement. Promoted to T293-QA-6, reproduced by QA by execution at any confidence (step 5d).

**Cleanups (1):**
- `shared/resources/qa-execute-snippets.mjs:3119` — EVALUATING_WORD omits set, mapfile, readarray, getopts, trap, compgen, wait and shift, which are refused today only by the unrecognised-command rule → lock the dependency with a test, or list them. Advisory (`recommendations.future`).

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; calibration assembled-value block mutating, writes. Findings: runnable, wrote W. Controls: runnable, no write. Provenance: the develop-base engine classifies both shapes the same way and the task names the family, so both stay in `top_issues[]`.

mutation-proven: block rule (`blockEvaluates`) switched off → `task.293 each refusal is held on an input where it alone decides` and `task.293 every indirect-evaluation shape writes under real bash` → covered. The engine was restored from a `cp` snapshot; `cmp` clean.

---

## Regression Testing

Not re-run in full this cycle (no engine change since the cycle-2 fix commit, whose `CI=true npm run ci:fast` is the record); the four `task.293` tests were re-run under the mutation.

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
1. Third strike: replace the arithmetic-read enumeration with a default-deny rule; do not add a spelling.

### Short-term Actions (Non-Blocking)
1. Lock the dependency on the unrecognised-command rule with a test.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced bypasses of the refusal this task exists to deliver, the third consecutive cycle.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.293.qa.3.qa-snippet-classifier-indirect-evaluation.md`
**Gate File**: co-located at `task.293.gate.3.qa-snippet-classifier-indirect-evaluation.yml`
**Next Steps**: qa-fix cycle 3 under the third-strike constraint
