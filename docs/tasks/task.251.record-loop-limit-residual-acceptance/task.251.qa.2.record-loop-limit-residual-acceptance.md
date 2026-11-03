# QA Report: Task 251 - Record a loop-limit residual acceptance in one writer

**Task**: [Link to task document](./task.251.record-loop-limit-residual-acceptance.md)
**Gate File**: [task.251.gate.2.record-loop-limit-residual-acceptance.yml](./task.251.gate.2.record-loop-limit-residual-acceptance.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's three findings are fixed and verified. The cycle 2 refute pass over the whole branch diff
found one more medium defect in the same line-preserving YAML edit: a flow-style entry whose mapping
closes on a later line is edited into invalid YAML and reported as accepted. Two low findings are
advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`ready-for-review`)
- [x] All four phases ticked
- [x] Tests passing (`ci:fast` on the fix commit: exit 0, 0 failures)
- [x] Feature branch with open PR (#815)

### Testing Approach

- [x] Automated Testing (engine suite 19, plus the suites listed in the cycle 1 report)
- [x] Security Review (probe engine, committed cases file)
- [x] Code Review (Step 3b, refute pass)

### Review Methodology

Re-review, cycle 2: whole-branch diff, reviewed to refute (the diff is 4978 lines with docs, generated
copies and replay fixtures excluded). One independent read-only Explore reviewer, dispatched with the
shared prompt plus the refute directive; it returned 3 findings (completion notice `duration_ms`
75815). Pipeline run: `code_review_blocking=true`.
Re-review scope: whole branch (cycle 2 is always a full refute pass).

Step 4b: not re-run. This cycle's fix commit changed no SKILL.md or shared prose (code, tests and
task artefacts only); the cycle 1 result stands.

CI on 41f31595060a: pending (CI_SUMMARY). Nothing in the gate.

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| T251-QA-1 block-style brace waived wrongly | ✅ FIXED | test "a brace inside a block-style value is text"; reverted fix turned it red, restored (done in the fix cycle) |
| T251-CR-2 approver newline | ✅ FIXED | test "an approver or reason with a newline stays one line"; same revert proof |
| T251-QA-2 plan results carry no ok | ✅ FIXED | test "every plan result carries ok"; probe now `engages` (was `absent`) |

The three bug reports are closed (`status-history.js`).

## New Findings This Cycle

- **[medium]** `shared/resources/accept-qa-residual.js:146` — multi-line flow entry corrupted and reported accepted → T251-CR2-1 (reviewer CR-1, medium/medium; QA reproduced it, and found it worse than reported: the stray `status: waived` line makes the file invalid YAML)
- **[low]** `shared/resources/accept-qa-residual.js:478` — no timeout on the `qa-cycle.sh` spawn → advisory (CR-2)
- **[low/low]** `shared/resources/accept-qa-residual.js:565` — re-run after a Stop logs "none newly waived" → advisory (CR-3)

Searched: the whole branch diff, refute pass.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The writer | CONCERNS | Verified | T251-CR2-1 |
| Phase 2: Lock re-entry | PASS | Verified | unchanged since cycle 1 |
| Phase 3: Wire the option and prove the readers | PASS | Verified | unchanged |
| Phase 4: Bundle, sweep, release notes | PASS | Verified | re-bundled after the fix; hook confirmed all skills in sync |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Unchanged from cycle 1 except as follows. Criteria were verified from evidence, not checkboxes.

| Criterion | Evidence | Status |
| --- | --- | --- |
| All cycle 1 rows (writer, refusals, idempotence, states 3 and 6, lock, wiring, merge rule) | engine suite 19/19, `ci:fast` exit 0 on the fix commit | PASS |
| Lens does not raise the trail finding on a processed report; control still raises it | not run (5c is the lens) | UNVERIFIED (carried; named so it is not assumed) |
| `npm run ci` wall time within +5% of baseline | not measured | UNVERIFIED (carried) |

`criteria-drift.js`: clean. CHANGELOG: cites task 251.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T251-CR2-1 — multi-line flow entry corrupted and reported accepted**
- **Category**: Functional
- **Bug Report**: [task.251.bug.4.multi-line-flow-entry-corrupted-and-reported-accepted.md](./task.251.bug.4.multi-line-flow-entry-corrupted-and-reported-accepted.md)
- **Observation**: Reproduced with a control. `  - {id: X,` + `     status: open}` gets a stray `status: waived` line; single-line flow entry is correct.
- **Impact**: the accepted gate is not valid YAML and still holds the open status.
- **Recommendation**: refuse an entry whose dash line opens `{` without closing it; refusal test.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 (advisory, report only)

---

## NFR Assessment

### Performance — PASS
No new loops; writer 0.047 s on the task.250 shape.

### Reliability — CONCERNS
T251-CR2-1 reports success on a corrupted gate. Low items CR-2 and CR-3 are advisory.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 6 (run record `task.251.qa.2.record-loop-limit-residual-acceptance.security.run.json`; `escaped: 0`)
- `boundary: true`. Criteria signal: `["refused","refuses"]`. The probe engine ran `planReportEdit` with the committed
  cases file (one legitimate report, five refusals): verdict `engages`, 0 reproduced, 0 escaped. The refusal
  guards for the gate are held by the committed refusal tests; the open gap is T251-CR2-1.

### Maintainability — PASS
Thin wrappers over unchanged planners; bundled copies in sync.

---

## Code Review

**Correctness bugs (3):**
- [medium/medium] `shared/resources/accept-qa-residual.js:146` — multi-line flow entry → gate id T251-CR2-1.
- [low/medium] `shared/resources/accept-qa-residual.js:478` — no timeout on the `qa-cycle.sh` spawn. Not gated (low). Routed to `recommendations.future`.
- [low/low] `shared/resources/accept-qa-residual.js:565` — audit text after a re-run. Not gated. Routed to `recommendations.future`.

**Cleanups (0).**

Provenance: all three are in a file added by this change; there is no base to compare against.

Anchor check: the reviewer's `file_line` values were read at the lines named; the main finding was reproduced by running `planGateEdit`.

mutation-proven: cycle 1's three fixes → each committed test went red when its fix was reverted, in the fix cycle → covered (performed by the fixer, not repeated here). No fix was made this cycle.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` on the fix commit | PASS (exit 0, 0 failures) |
| Engine suite | PASS (19/19) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/accept-qa-residual.js`, `accept-qa-residual.sh`, `qa-diminishing-returns.js` (reader), the engine tests.

### Test Commands Executed
```bash
command node --test shared/resources/tests/accept-qa-residual.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure --entry 'shared/resources/accept-qa-residual.js#planReportEdit' --args-json '[…]' --cases-file <cases.json> --record <run.json> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T251-CR2-1 with a refusal test.

### Short-term Actions (Non-Blocking)
1. CR-2 timeout on the `qa-cycle.sh` spawn.
2. CR-3 audit text on a re-run.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One reproduced medium defect remains in the YAML edit; everything else is verified.
**Quality Score**: 92/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T251-CR2-1 fixed and re-verified.

---

**QA Report**: co-located at `task.251.qa.2.record-loop-limit-residual-acceptance.md`
**Gate File**: co-located at `task.251.gate.2.record-loop-limit-residual-acceptance.yml`
**Next Steps**: `/qa-fix` on T251-CR2-1, then re-review.
