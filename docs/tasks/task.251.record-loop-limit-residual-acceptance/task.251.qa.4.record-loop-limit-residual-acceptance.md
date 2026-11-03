# QA Report: Task 251 - Record a loop-limit residual acceptance in one writer

**Task**: [Link to task document](./task.251.record-loop-limit-residual-acceptance.md)
**Gate File**: [task.251.gate.4.record-loop-limit-residual-acceptance.yml](./task.251.gate.4.record-loop-limit-residual-acceptance.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's scanner closes every extent shape the earlier cycles named, and the reviewer found no case where
it calls a span balanced and gets it wrong. The remaining findings are in the status-key match beside it:
a quoted `status` key and a duplicated one are edited and reported accepted while the entry stays open.
Neither shape is one this pipeline writes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`ready-for-review`)
- [x] All four phases ticked
- [x] Tests passing (`ci:fast` on the cycle 3 fix commit: exit 0, 0 failures)
- [x] Feature branch with open PR (#815)

### Testing Approach

- [x] Automated Testing (engine suite 28/28)
- [x] Security Review (probe engine, committed gate cases file)
- [x] Code Review (Step 3b)

### Review Methodology

Re-review, cycle 4. Re-review scope: files changed since gate 3 (head 07aa92808854; 2 code files plus 2 bundled copies, 232-line patch) — default. One independent read-only Explore reviewer executed 28 gate variants and returned 2 findings (completion notice `duration_ms` 32107). QA reproduced both. Pipeline run: `code_review_blocking=true`.

Step 4b: not applicable. The cycle 3 fix commit changed no SKILL.md or shared prose.

CI on 70abf7ad39f4: not read at gate time; `ci:fast` run locally on the working tree before the commit was green.

Loop route classifier (cycle 4, HIGH sequence 0,0,0,0): `continue` (not-a-pass-gate).

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T251-CR3-1 flow extent guessed from brace characters | ✅ FIXED | nested-map, comment-brace and trailing-junk gates are now refused; the probe on the cycle 3 cases file reads `engages`; the reviewer ran 28 variants and found no wrong span |

Bug 5 is closed.

## New Findings This Cycle

- **[medium]** `shared/resources/accept-qa-residual.js:202` — a quoted `status` key is not matched, so a second plain `status` is appended → T251-CR4-1
- **[low]** `shared/resources/accept-qa-residual.js:202` — a duplicated top-level `status` has only its first copy waived → T251-CR4-2

Searched: files changed since gate 3.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The writer | CONCERNS | Verified | T251-CR4-1, -2 |
| Phase 2: Lock re-entry | PASS | Verified | unchanged |
| Phase 3: Wire the option and prove the readers | PASS | Verified | unchanged |
| Phase 4: Bundle, sweep, release notes | PASS | Verified | bundled copies in sync |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Unchanged from cycles 1 to 3. `criteria-drift.js` clean. The two carried unverified criteria (5c lens trail rule; `npm run ci` wall time) stay named in the cycle 1 report.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T251-CR4-1 — quoted status key**
- **Category**: Functional
- **Bug Report**: [task.251.bug.6.flow-status-key-quoted-or-duplicated.md](./task.251.bug.6.flow-status-key-quoted-or-duplicated.md)
- **Observation**: `- {id: X, "status": open}` becomes `{id: X, "status": open, status: waived }`; edit, ok true. The plain control is edited correctly.
- **Recommendation**: match the key with optional quotes.
- **Priority**: P2

### LOW Severity Issues (1)

**Issue: T251-CR4-2 — duplicated status**: `{id: X, status: open, status: open}` becomes `{id: X, status: waived, status: open}`; waive every matching segment. Same bug report.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (two advisories carried)

---

## NFR Assessment

### Performance — PASS
One linear scan per open entry.

### Reliability — CONCERNS
T251-CR4-1 and -2 report success on an entry that still holds the open status.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 6 (run record `task.251.qa.4.record-loop-limit-residual-acceptance.security.run.json`; `escaped: 0`)
- `boundary: true`. Criteria signal: `["refused","refuses"]`. The probe engine ran `planGateEdit` with the committed gate cases file: verdict `present-but-inert`, 2 hostile gates accepted (quoted and duplicated status key), which are T251-CR4-1 and -2.

### Maintainability — PASS
The extent is defined once; the findings are in the status-key match.

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `shared/resources/accept-qa-residual.js:202` — quoted status key → T251-CR4-1
- [low/medium] `shared/resources/accept-qa-residual.js:202` — duplicated status → T251-CR4-2

**Cleanups (0).**

Provenance: the file is added by this change; no base to compare against.
Anchor check: line 202 read; both candidates reproduced by running `planGateEdit`.

mutation-proven: cycle 3's comment handling disabled → its committed scanner test went red → covered (performed by the fixer). No fix this cycle.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` on the cycle 3 fix | PASS (exit 0) |
| Engine suite | PASS (28/28) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/accept-qa-residual.js` (`flowSpan`, `waiveEntry`, `planGateEditRaw`), its test file.

### Test Commands Executed
```bash
command node --test shared/resources/tests/accept-qa-residual.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure --entry 'shared/resources/accept-qa-residual.js#planGateEdit' --args-json '[…]' --cases-file <cases.json> --record <run.json> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Match a quoted status key and waive every top-level status segment (T251-CR4-1, -2).

### Short-term Actions (Non-Blocking)
1. Timeout on the `qa-cycle.sh` spawn; audit text after a re-run.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two reproduced defects in the status-key match; none in the extent.
**Quality Score**: 92/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T251-CR4-1 fixed and re-verified.

---

**QA Report**: co-located at `task.251.qa.4.record-loop-limit-residual-acceptance.md`
**Gate File**: co-located at `task.251.gate.4.record-loop-limit-residual-acceptance.yml`
**Next Steps**: `/qa-fix` on T251-CR4-1 and -2.
