# Task Review Report: Task 33 — Build evals for develop-task pipeline

**Reviewed:** 2026-05-11
**Review Depth:** Standard
**Task Status:** Planned (was: frontmatter `draft` / body `📋 Planned` — drift)
**Overall Assessment:** GOOD

---

## Executive Summary

Task is well-structured greenfield work. Pre-pass confirms zero existing implementation — pure new build. Three minor clarifications resolved interactively: status lifecycle drift, ambiguous assertion-registration mechanism in Phase 3, and missing fixture spec for qa-fix loop cap test in Phase 5.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after applying fixes)

---

## User Decisions & Clarifications

### Q1: Status drift — frontmatter `status: draft` vs body `📋 Planned`
- **User Decision**: Both → `planned`
- **Impact**: Frontmatter and body both promoted to Planned (lowercase / Title Case per lifecycle).

### Q2: Phase 3 assertion-registration mechanism
- **User Decision**: Add to `shared/assertions.mjs`
- **Impact**: branchExists / prCreated / pipelineStepsRan / loopBoundedAt / noLockFilesLeft register in shared dispatcher. No new `--assertions` flag required. Removes ambiguity in Phase 3.

### Q3: Phase 5 qa-fix loop-cap fixture
- **User Decision**: Add fixture spec
- **Impact**: Phase 5 to specify replay fixture records 5 `qa-fix` transcript events; assertion uses `loopBoundedAt(events, 'qa-fix', 5)`.

---

## 1. Template Structure Compliance

**Status:** PASS (minor)

### Important
- Status lifecycle drift: frontmatter `status: draft` vs body `📋 Planned` (line 4 vs line 17). Per `shared/resources/document-status-lifecycle.md`, both must stay in sync. **Fix per Q1.**

### Optional
- File naming ✓ (`task.33.develop-task-evals.md`).
- All 11 mandatory sections present.
- github_issue: 68 linked ✓ (verified via `gh issue view 68`).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

PREPASS_B confirms:
- 7 physical step files (`develop-pipeline-step-{0,1,2,3,4,5-6,7,8}.md`) = 8 logical pipeline steps (step 5-6 combined). Task §5.1 acknowledges this.
- `evals/shared/` infra exists (runner.mjs, drivers/, lib/, tests/). task.32 merged ✓.
- `develop-pipeline-resume-contract.md` exists — Phase 4 step-contract test dependency satisfied.
- `evals/shared/lib/tracker-cleanup.mjs` already present (only existing lib module).

### Important
- Phase 3 assertion-registration ambiguity (Q2 above). Plan reads "Register new fns in `evals/shared/runner.mjs` switch (or skill-local registration)" — the latter requires a `--assertions` flag that doesn't exist in current `runner.mjs` (hardcoded switch at runner.mjs:81-90). **Fix per Q2:** commit to shared/assertions.mjs path.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (minor)

### Important
- **Phase 5 fixture for qa-fix loop cap**: Plan says scenario "includes qa-fix iteration cap test (loopBoundedAt = 5)" without specifying fixture shape. Replay mode needs a deterministic transcript with 5 qa-fix events. **Fix per Q3:** add concrete fixture spec.

### Optional
- Phase 5 lists 8 step-isolation folders (`01..08-*`) but pipeline has 7 step files (5-6 combined). Folder count is fine (logical step isolation), but a one-liner in Phase 5 explaining the 8-folder / 7-file divergence would prevent confusion at implementation time.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Scope, Implementation Plan, Files Summary all aligned.
- Testing Strategy covers unit (lib modules), integration (replay scenarios), smoke (full e2e), regression (`npm test` baseline).
- Files Summary item 24 ("register new assertion fns") consistent with Q2 resolution.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- HIGH risk (pipeline-recorder driver coupling) well-identified with narrow `RecordedEvent` interface mitigation.
- MEDIUM risks (smoke flakiness, stale fixtures, sandbox cleanup) all have concrete mitigations.
- Rollback plan covers immediate / partial / forward-fix paths.

No gaps.

---

## Summary of Recommendations

### Must Fix (Critical) — 0
None.

### Should Fix (Important) — 3
1. **Status lifecycle alignment** — frontmatter `status: planned`, body `**Status:** Planned`. _Per Q1._
2. **Phase 3 — commit to shared/assertions.mjs registration** — remove "or skill-local registration" hedge. _Per Q2._
3. **Phase 5 — add qa-fix loop-cap fixture spec** — concrete fixture shape (5 simulated qa-fix events) + assertion form. _Per Q3._

### Consider (Optional) — 1
1. Add a one-line note in Phase 5 clarifying 8 logical step-isolation folders ↔ 7 physical pipeline-step files (5-6 combined).

---

## Implementation Readiness Assessment

**Score:** 8/10

| Axis | Score |
|---|---|
| Template Compliance | 9/10 |
| Technical Accuracy | 9/10 |
| Implementation Clarity | 7/10 |
| Consistency | 9/10 |
| Risk Management | 9/10 |

**Confidence:** High — once fixes applied.

**Recommendation:** ✅ READY TO IMPLEMENT after applying 3 important fixes.

---

## Next Steps

1. Apply 3 fixes to task doc (Step 8.5 will offer to do this).
2. Promote status: `draft → planned` (already merged into Q1 fix).
3. Begin Phase 1 (git-sandbox + pipeline-recorder).

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-11
- **Review Depth:** Standard
- **Task File:** `docs/development/tasks/task.33.develop-task-evals/task.33.develop-task-evals.md`
- **Pre-pass Agents:** B (architecture alignment) + C (codebase scan) — both succeeded
- **Issue Linkage:** github_issue 68 (verified)
