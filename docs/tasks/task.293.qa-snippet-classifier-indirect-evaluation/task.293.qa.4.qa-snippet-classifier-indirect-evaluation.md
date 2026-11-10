# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.4.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.4.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3's default-deny held for every quoted carrier. The safety re-probe, run by an independent read-only reviewer, found one more carrier of the substitution literal: backslash-escaped text in an unquoted word. QA reproduced it under bash 5.3 for four builtins; each classifies `runnable` and writes a file, and the controls stay clean.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (code route; cycle 4, whole branch diff of 3670 lines, safety re-probe directive; the prior gate failed on security). The reviewer returned in about 44 seconds (measured from its completion notice); its independent review ran. It probed about 12 inputs and did not time linearity or check over-refusal this cycle.

Re-review scope: unscoped (prior gate failed on security). Step 4b: not applicable beyond the engine's own tests.

CI on 6cb6569732bf: pending at the read (undecided; recorded, gate unchanged).

**Order disclosure.** The reviewer's finding was reproduced on the committed head, and QA then went on to apply the fix in the working tree before writing this gate (step 5c asks for the gate first). The gate records the finding against head `6cb65697`, the reproduction predates the fix, and the fix is committed with this gate in the same commit, as in earlier cycles.

### Re-Review Context

| Previous finding | Status |
| --- | --- |
| T293-QA-5 positional offset | FIXED |
| T293-QA-6 digit-led subscript | FIXED |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:3272` — the literal check sees quote tokens and quoted here-documents only; an unquoted backslash-escaped word carries the literal past it (T293-QA-7).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | Real-bash table, 383/383 tests |
| Phase 2: refuse | CONCERNS | Partial | One more carrier |
| Phase 3: prove | PASS | Verified | Differential, docs scan, mutations |

**Overall Phase Completion**: 3/3 ticked, 2 of 3 verified clean.

---

## Success Criteria Verification

Unchanged from cycle 1 except that the differential atoms do not yet contain the new shapes. CHANGELOG cites `(task 293)`. Criteria drift: clean.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T293-QA-7, escaped unquoted word**
- **Severity**: HIGH
- **Category**: Security
- **Observation**: a double-bracket test, `printf -v`, `test -v` and `read`, each given an unquoted word of backslash-escaped bracket, dollar, paren, `touch W`, paren, bracket, classify runnable and create W. Controls (the same word with a plain number): runnable, no write. A printed escaped literal with no evaluating word stays runnable.
- **Impact**: a documented block can run a command the classifier promised to refuse.
- **Recommendation**: make the carrier default-deny: any dollar-paren or backtick text the tokenizer did not parse as a real substitution is a literal.
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Docs scan median +2.0% at the cycle-3 fix; the fix applied this cycle measured +1.3% over 7 runs.

### Reliability — PASS
`CI=true npm run ci:fast` green at the cycle-3 fix commit.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (0 escaped)
- One reproduced bypass beyond the corpus.

### Maintainability — CONCERNS
Four cycles running, each followed by a new route; the carrier list was the last enumeration.

---

## Code Review

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3272` — only quote tokens and quoted here-documents count as literal carriers → default-deny on the carrier. Promoted to T293-QA-7, reproduced by QA (origin: code-review, reproduced by QA).

**Cleanups (0).**

Reproduction (bash 5.3.20, scratch directory per case): calibration `x=5; echo $((x + 1))` runnable, no write; calibration `set -- 'a[ $(touch W)]'; echo ${@:$1}` mutating, writes. Finding: four forms runnable, wrote W. Controls: runnable, no write. Provenance: the develop-base engine classifies the shape the same way and the task names the family, so it stays in `top_issues[]`.

mutation-proven: the cycle-3 default-deny expansion test switched off (done in the cycle-3 fix) → `task.293 each refusal is held on an input where it alone decides` and `task.293 every indirect-evaluation shape writes under real bash` → covered. The carrier-level fix of this cycle was mutation-proven in the same way (see the implementation report); not re-run by QA this cycle.

---

## Regression Testing

Not re-run in full this cycle; the cycle-3 fix commit's `CI=true npm run ci:fast` (8346 tests, 0 fail) is the record.

---

## Test Artifacts

### Test Commands Executed
```bash
security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock'
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Close T293-QA-7 with a default-deny carrier, with table rows, decider rows and differential atoms.

### Short-term Actions (Non-Blocking)
1. Lock the dependency on the unrecognised-command rule with a test (cycle 3 cleanup).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced bypass of the refusal this task exists to deliver, the fourth consecutive cycle.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.293.qa.4.qa-snippet-classifier-indirect-evaluation.md`
**Gate File**: co-located at `task.293.gate.4.qa-snippet-classifier-indirect-evaluation.yml`
**Next Steps**: qa-fix cycle 4, then the fifth and last gate
