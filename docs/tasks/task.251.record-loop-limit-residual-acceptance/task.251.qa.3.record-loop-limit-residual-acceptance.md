# QA Report: Task 251 - Record a loop-limit residual acceptance in one writer

**Task**: [Link to task document](./task.251.record-loop-limit-residual-acceptance.md)
**Gate File**: [task.251.gate.3.record-loop-limit-residual-acceptance.yml](./task.251.gate.3.record-loop-limit-residual-acceptance.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's refusal works for the shape it named. The review of that fix found that the same mechanism, a
guess at where a flow-style gate entry ends, still passes two other shapes: a nested map and a closing
brace inside a comment. Both are edited into the wrong span and reported as accepted. This is the third
cycle to correct that one check, so the recommendation is to define the span once, not to patch again.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`ready-for-review`)
- [x] All four phases ticked
- [x] Tests passing (`ci:fast` on the cycle 2 fix commit: exit 0, 0 failures)
- [x] Feature branch with open PR (#815)

### Testing Approach

- [x] Automated Testing (engine suite 20/20)
- [x] Security Review (probe engine, committed gate cases file)
- [x] Code Review (Step 3b)

### Review Methodology

Re-review, cycle 3. Re-review scope: files changed since gate 2 (head 41f31595060a; 2 code files, 62-line
patch) — default. One independent read-only Explore reviewer; it returned 1 finding (completion notice
`duration_ms` 14431). QA ran the reviewer's candidate, which the reviewer had not. Pipeline run:
`code_review_blocking=true`.

Step 4b: not applicable. The cycle 2 fix commit changed no SKILL.md or shared prose.

CI on 07aa92808854: pending at the time of the read; nothing in the gate.

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T251-CR2-1 multi-line flow entry corrupted | ⚠️ PARTIAL | the plain multi-line case is refused (test, mutation-proven); a nested map and a comment brace still pass → T251-CR3-1 |

Bug 4 is closed; bug 5 carries the remainder.

## New Findings This Cycle

- **[medium]** `shared/resources/accept-qa-residual.js:275` — the refusal asks whether any `}` follows the opening brace; nested maps and comment braces defeat it → T251-CR3-1 (reviewer CR-1, low/low; QA reproduced it and kept the medium rating of the same defect class)

Searched: files changed since gate 2.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The writer | CONCERNS | Verified | T251-CR3-1 |
| Phase 2: Lock re-entry | PASS | Verified | unchanged |
| Phase 3: Wire the option and prove the readers | PASS | Verified | unchanged |
| Phase 4: Bundle, sweep, release notes | PASS | Verified | bundled copies in sync |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Unchanged from cycles 1 and 2. `criteria-drift.js` clean; CHANGELOG cites task 251. The two carried
unverified criteria (5c lens trail rule; `npm run ci` wall time) stay named in the cycle 1 report.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T251-CR3-1 — flow extent guessed from brace characters**
- **Category**: Functional
- **Bug Report**: [task.251.bug.5.flow-extent-guessed-from-brace-characters.md](./task.251.bug.5.flow-extent-guessed-from-brace-characters.md)
- **Observation**: Reproduced with a control. Nested map: `a: {b: 1, status: waived },`; comment: `# note, status: waived }`; `status: open` stays; result `edit`, `ok: true`. The single-line nested entry is edited correctly.
- **Recommendation**: one scanner (brace depth, quotes, comment) defines the span; both the refusal and `waiveEntry` use it.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (two advisories carried)

---

## NFR Assessment

### Performance — PASS
One regex per open entry.

### Reliability — CONCERNS
T251-CR3-1 reports success on a gate edited into the wrong span.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 6 (run record `task.251.qa.3.record-loop-limit-residual-acceptance.security.run.json`; `escaped: 0`)
- `boundary: true`. Criteria signal: `["refused","refuses"]`. The probe engine ran `planGateEdit`
  with the committed gate cases file: verdict `present-but-inert`, 2 hostile gates accepted (the nested-map
  and comment-brace flow entries), which is T251-CR3-1.

### Maintainability — CONCERNS
Three cycles in a row corrected the same detection; the span should be defined once.

---

## Code Review

**Correctness bugs (1):**
- [low/low] `shared/resources/accept-qa-residual.js:275` — the `lastIndexOf("}")` test is a brace heuristic → T251-CR3-1 (promoted by QA after reproduction).

**Cleanups (0).**

Provenance: the file is added by this change; no base to compare against.
Anchor check: line 275 read; the candidate was reproduced by running `planGateEdit`.

mutation-proven: cycle 2's refusal disabled → its committed test went red → covered (performed by the fixer in the fix cycle). No fix this cycle.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` on the cycle 2 fix | PASS (exit 0) |
| Engine suite | PASS (20/20) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/accept-qa-residual.js` (`planGateEditRaw`, `waiveEntry`), its test file.

### Test Commands Executed
```bash
command node --test shared/resources/tests/accept-qa-residual.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure --entry 'shared/resources/accept-qa-residual.js#planGateEdit' --args-json '[…]' --cases-file <cases.json> --record <run.json> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Define the flow extent once and use it in both places (T251-CR3-1).

### Short-term Actions (Non-Blocking)
1. Timeout on the `qa-cycle.sh` spawn; audit text after a re-run.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One reproduced medium defect of a class already corrected twice.
**Quality Score**: 92/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T251-CR3-1 fixed and re-verified.

---

**QA Report**: co-located at `task.251.qa.3.record-loop-limit-residual-acceptance.md`
**Gate File**: co-located at `task.251.gate.3.record-loop-limit-residual-acceptance.yml`
**Next Steps**: `/qa-fix` on T251-CR3-1, consolidating the flow extent into one scanner.
