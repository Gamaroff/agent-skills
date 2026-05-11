# QA Report: Task 24 — Pipeline Resume Stale-Context Detector

**Task**: [task.24.pipeline-resume-stale-context-detector.md](./task.24.pipeline-resume-stale-context-detector.md)
**Gate File**: [task.24.gate.1.pipeline-resume-stale-context-detector.yml](./task.24.gate.1.pipeline-resume-stale-context-detector.yml)
**QA Engineer**: QA Agent
**Review Date**: 2026-05-10
**Testing Completed**: 2026-05-10
**Gate Status**: CONCERNS

---

## Executive Summary

Task 24 implements a stale-context detector Explore subagent for pipeline resume, adding Phase 0a to `develop-pipeline-resume-contract.md` and wiring both SKILL.md files. Phases 1–3 are complete and the design is sound. Two medium severity issues found: the detector's gap-detection logic incorrectly flags missing summaries for steps 1 and 4 (which never produce summaries by design), and Phase 0b lacks an explicit cross-reference to Phase 0a's narrowing. Phase 4 integration testing is deferred by design.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases 1–3 completed (Phase 4 deferred by design — integration testing)
- [x] No automated tests (documentation-only task — no code files)
- [x] Breaking changes: None documented — None expected
- [x] Code on feature branch with open PR #59

### Testing Approach

- [x] Code review (diff review — all modified/added files)
- [x] Logic trace (detector decision table vs resume-contract Phase 0b behavior)
- [x] Cross-reference check (SKILL.md wiring vs resume-contract spec)
- [ ] Integration testing — deferred (Phase 4; requires actual precompact pauses in live pipeline)

### Review Methodology

Direct tools — documentation-only task, 4 phases but no code to test. Adaptive strategy: direct tools.

---

## Implementation Verification

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Schema | ✅ PASS | Output JSON schema fully defined in `pipeline-resume-detector-prompt.md` with all required fields and field definitions table |
| Phase 2: Detector prompt | ✅ PASS | `shared/resources/pipeline-resume-detector-prompt.md` created; logic covers lock read, summary listing + validation, gap check, mtime delta, fallback on missing lock |
| Phase 3: Wire into resume contract | ✅ PASS | Phase 0a added to `develop-pipeline-resume-contract.md`; Step 0a added to both `develop-story/SKILL.md` and `develop-task/SKILL.md`; detector output surfaced to user; blocking_issues halt documented |
| Phase 4: Validation | ⚠️ DEFERRED | Integration testing requires actual precompact pauses — cannot be automated in this pipeline run |

**Overall Phase Completion**: 3/4 — Phase 4 deferred

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| Resume reads only summaries + lock, never raw artifacts | Yes | Yes — orchestrator dispatches subagent; main never re-reads | ✅ PASS | By design in SKILL.md Step 1 |
| Recommended-step decision matches manual baseline | Yes | Not yet testable | ⚠️ DEFERRED | Phase 4 integration testing |

### Performance

| Criterion | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| Resume main token usage reduced ≥80% | Yes | Not yet measurable | ⚠️ DEFERRED | Phase 4 integration testing |

### Quality

| Criterion | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| Tamper detection works | Yes | Logic verified in code review | ⚠️ PARTIAL | mtime comparison logic is correct; live test deferred |
| Fallback on missing lock | Yes | Yes — blocking_issues: ["Lock file absent..."], recommended_step: 1 | ✅ PASS | |
| Schema validation | Yes | Yes — jq -e validation documented | ✅ PASS | |

### Migration

| Criterion | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| Requires task.26 summary artifacts | Yes | task.26 accepted ✅ | ✅ PASS | |

---

## Issues Found

### MEDIUM Severity Issues (2)

---

**Issue 1: Detector gap-detection incorrectly flags steps 1 and 4 as missing summaries**

- **Severity**: MEDIUM
- **Category**: Functional logic error
- **Location**: `shared/resources/pipeline-resume-detector-prompt.md`, Step 3 — "Check for summary gaps"
- **Observation**: The detector checks for summaries for ALL steps in `1..LOCK_STEP`, exempting only steps 2 and 8. But steps 1 (create-branch) and 4 (create-pr) also never produce summaries — they don't dispatch Explore subagents. If LOCK_STEP ≥ 4, the detector would flag steps 1 and 4 as missing summaries and add them to `blocking_issues`, incorrectly blocking the resume.
- **Impact**: False-positive blocking issues on any resume from Step 5 or later. User would see confusing "Summary missing for step 1/4" messages and be unable to auto-resume. Defeats the purpose of the detector.
- **Recommendation**: Expand the exemption list in Step 3 from `[2, 8]` to `[1, 2, 4, 8]` — all steps that do not dispatch Explore subagents and therefore never produce `.summaries/step-*.json` files. Alternatively, simplify the gap logic to only check whether LOCK_STEP's own summary exists (the original plan's intent), and drop the "gap before LOCK_STEP" blocking_issue.
- **Priority**: P1 — must fix before this feature is useful in production

---

**Issue 2: Phase 0b wording lacks explicit Phase 0a scope-narrowing cross-reference**

- **Severity**: MEDIUM
- **Category**: Documentation clarity
- **Location**: `shared/resources/develop-pipeline-resume-contract.md`, Phase 0b header
- **Observation**: Phase 0b says "For each step marked ✅ in the implementation report, verify the expected artifact exists." This does not reference the narrowing from Phase 0a (`recommended_step`). An orchestrator reading Phase 0b in isolation would verify ALL ✅ steps, not just those up to `recommended_step - 1`. The narrowing is only described in Phase 0a and in SKILL.md.
- **Impact**: Low practical risk (orchestrators read the full contract), but creates a maintenance hazard — a future edit to Phase 0b could silently remove the narrowing behavior. Also makes the two-phase design harder to understand without reading both sections.
- **Recommendation**: Add a one-line note at the start of Phase 0b: "Verify only steps **up to `recommended_step - 1`** (set by Phase 0a). Steps at or after `recommended_step` are ⏳ Pending — do not verify."
- **Priority**: P2 — should fix before merge to prevent future confusion

---

### LOW Severity Issues (1)

**Issue 3: Step 1 output message doesn't use `recommended_step` terminology**

- **Location**: `skills/develop-story/SKILL.md` and `skills/develop-task/SKILL.md`, Step 1 item 3
- **Observation**: The output message template still says "Resuming from Step {N+1}" — which may not equal `recommended_step` in re-execute scenarios (where recommended_step = LOCK_STEP, not LOCK_STEP+1).
- **Recommendation**: Update to "Resuming from `recommended_step` (Step {recommended_step})" for clarity.
- **Priority**: P3 — cosmetic clarity fix

---

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS (with caveat)

The design correctly delegates artifact reading to the Explore subagent. Main-context token usage on resume will be reduced proportionally to how many summaries exist. Performance gain not yet measurable (Phase 4 deferred). The mechanism is sound.

### Reliability — PASS

Fallback behavior is comprehensive:
- Lock absent → recommended_step: 1 (restart safely)
- Summary absent for LOCK_STEP → re-execute (conservative)
- JSON validation failure → fall back to full Phase 0b
- Blocking issues → halt and surface to user

All failure modes have defined behavior. No silent failures.

### Security — PASS

Read-only Explore subagent — no writes. Lock file is internal state (not user-supplied). No injection vectors identified.

### Maintainability — CONCERNS

The exemption list in the detector prompt (`[2, 8]`) is a maintenance hazard: any new step that doesn't dispatch a subagent must be manually added to the exemption list, or false blocking_issues will appear. This is related to Issue 1.

Additionally, the summaries-based approach creates an implicit dependency between the detector and which steps dispatch subagents — a change to any step's subagent usage would require updating the detector's exemption list.

Recommendation: Document the exemption list maintenance contract in the detector prompt header.

---

## Regression Testing

| Area | Status | Notes |
|------|--------|-------|
| develop-pipeline-resume-contract.md Phase 0b | ✅ PASS | Existing Phase 0b unchanged (only Phase 0a prepended); artifact verification tables intact |
| develop-story/SKILL.md Context Compression Recovery | ✅ PASS | Steps 0 and 1 preserved; Step 0a inserted between them; mandatory recovery note preserved |
| develop-task/SKILL.md Context Compression Recovery | ✅ PASS | Identical to develop-story — parallel change verified |
| Graceful Pause handling in SKILL.md | ✅ PASS | Graceful Pause section unchanged in both skill files |
| develop-pipeline-step-0-resolve-and-prepare.md | ✅ PASS | Unchanged — Phase 0b detection logic unmodified |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/pipeline-resume-detector-prompt.md` (new)
- `shared/resources/develop-pipeline-resume-contract.md` (Phase 0a added)
- `skills/develop-story/SKILL.md` (Step 0a wired)
- `skills/develop-task/SKILL.md` (Step 0a wired)
- `docs/tasks/task.24.../task.24.pipeline-resume-stale-context-detector.md`
- `docs/tasks/task.24.../task.24.plan.pipeline-resume-stale-context-detector.md`
- `docs/tasks/task.24.../task.24.review.2026-05-09.md`

### Commands Executed

```bash
# No code tests — documentation task
git diff main...HEAD --stat
git log main...HEAD --oneline
```

### Coverage Report

N/A — no code changes.

---

## Recommendations

### Immediate Actions (Blocking before production use)

1. **Fix Issue 1**: Expand exemption list in `pipeline-resume-detector-prompt.md` Step 3 from `[2, 8]` to `[1, 2, 4, 8]` — or simplify gap logic to only check LOCK_STEP's summary (P1)
2. **Fix Issue 2**: Add scope-narrowing cross-reference note to Phase 0b header in `develop-pipeline-resume-contract.md` (P2)

### Short-term Actions (Non-blocking)

3. Fix Issue 3: Update Step 1 output message to reference `recommended_step` (P3)
4. Phase 4: Conduct integration testing — pause mid-Step 3, pause mid-Step 7, tamper test

---

## Final Assessment

**Gate Status**: CONCERNS — 73/100
**Rationale**: Implementation phases 1–3 complete and design is sound. Two medium severity issues: detector gap logic produces false blocking_issues for steps 1 and 4 (P1), and Phase 0b lacks explicit narrowing cross-reference (P2). No high severity issues. No breaking changes.

**Quality Score**: 73/100

**Deployment Recommendation**: CONDITIONAL — fix Issues 1 and 2 before enabling this feature in production pipelines. The detector produces incorrect blocking_issues for any resume from Step 5+.

---

**QA Report**: `task.24.qa.1.pipeline-resume-stale-context-detector.md`
**Gate File**: `task.24.gate.1.pipeline-resume-stale-context-detector.yml`
**Next Steps**: Apply P1 + P2 fixes, then proceed to finalise

---

## Issue Resolution Summary (QA Cycle 2 — 2026-05-10)

**Gate**: CONCERNS → **PASS** | **Score**: 73 → **90/100**

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| Detector exemption list incomplete (steps 1, 4 not exempt) | MEDIUM | ✅ CLOSED | REQUIRED_STEPS logic introduced; exemption list `[1, 2, 4, 8]` applied across all decision cases |
| Phase 0b missing Phase 0a narrowing cross-reference | MEDIUM | ✅ CLOSED | Scope note added to Phase 0b header |
| Step 1 output message doesn't reference recommended_step | LOW | ✅ CLOSED | Both SKILL.md files updated |

**Additional fix identified during verification**: `recommended_step = LOCK_STEP + 1` case was still broken because the "all summaries present" evaluation implicitly included exempt steps. Fixed by building `REQUIRED_STEPS` set explicitly (commit f01534e).

**Deployment Recommendation**: APPROVED (staging + production) — conditional deployment conditions cleared.
