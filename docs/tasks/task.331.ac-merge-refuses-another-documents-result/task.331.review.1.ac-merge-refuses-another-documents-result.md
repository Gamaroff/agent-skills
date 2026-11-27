# Task Review Report: Task 331 - The AC merge refuses another document's result

**Reviewed:** 2026-11-27
**reviewed_blob:** a40bd25c9b5579b25ad5330bd22bafe0fc1a1938
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-11-27

---

## Executive Summary

The task is small and well-sourced: every engine anchor (`finalise-rerun-scope.js:1144`, `:1178`, `:1140`, `:725`) resolves and the narrow refusal is reachable as planned. The review found one missed test site (an eval test that writes the old result path), a routing contradiction between the task and its plan, two stale comment/binding sites the rename touches, and a grep criterion with no test behind it. All were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 asked — autonomous run (develop-task Step 2 under develop-next); one decision taken and recorded below
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run: no questions were asked. One decision was taken in place of a question:

**D1: How does Step 3c route `result-document-mismatch`?**
- The task (§ 2 Benefit 3, § 5 BC1) says "as it routes `result-hash-mismatch`", which today is the `*)` HALT arm. The plan said `NEEDS_MANUAL_REVIEW`.
- **Decision**: HALT, in its own `case` arm naming the remedy. Two statements in the task against one in the plan, and both refusals mean the same thing: the file `merge` read is not this run's answer.
- **Impact**: § 5, Phase 2, § 9 and the plan now agree.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present; no placeholders.
- Frontmatter: `type: task`, `description`, `tags` present (OKF conformant).
- `github_issue: 958` exists (OPEN); body link `[#958](…/issues/958)` matches.
- Card preflight: 3 card blocks resolve (`sync-jira-task.js --check-card`, rc 0). Omitted counts: Summary 4, Success Criteria 2, Breaking Changes 5 — information, not defects.
- Change Log present; currency fixed by this review's rows. Sign-off not enabled.
- `doc-links.js`: 1 relative link resolves.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Pre-pass agents B and C were not dispatched; both passes ran inline in this session, so this review is not independent of the orchestrator.

### Important

- **I1 — Removed-literal sweep missed a test pair (check 15).** `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:240` and `:273` write `.claude/state/finalise-ac-result-1.yaml` and then run the Step 3c block. The task's grep (`-- skills shared docs`) never searched `evals/`. Found with `git grep -n 'finalise-ac-\(result\|merged\|extract\)-' -- '*.test.*' 'tests/**' 'evals/**' …`: 9 test hits (7 deferred-ci, 2 eval). Removed literals listed and searched: `finalise-ac-result-${DOD_N}` (2 test hits), `finalise-ac-merged-${DOD_N}` (7 test hits), the Step 6 comment "keyed by DOD_N alone" (0 test hits). **Fixed**: added to § 3, Phase 2, § 7 and the plan.
- **I2 — The extract block binds no `STEM` (check 16 / plan accuracy).** `SKILL.md:1016` binds only `AC_AGENT_ID` and `DOD_N`; the result path it writes must gain the stem. **Fixed**: Phase 2 names the binding and its guard.
- **I3 — A comment the rename falsifies.** Step 6 action 2a (`SKILL.md:1661`) says the merged file "is keyed by DOD_N alone and never removed". **Fixed**: Phase 2 rewrites the comment and keeps the `OWN_DOC` guard.

### Optional

- **O1 — Drifted anchors.** SKILL.md `:1020/:1043/:1048/:1657` → `:1021/:1045/:1050/:1659`; test `story_file` `:2156` → `:2262`; `agentDoc` `:2153` → `:2259` (task 327 landed in between). **Fixed** in task and plan.
- **O2 — Two sibling DOD_N-only paths unnamed.** `finalise-ac-extract-${DOD_N}.json` and `finalise-rerun-scope-${DOD_N}.json` stay keyed by run number. Both are rewritten in the same run before they are read, and a stale extract hash is refused as `result-hash-mismatch`. **Fixed**: named in Out of Scope with the reason.

Checks run with no finding: outcome reachability (check 10 — the `result-document-mismatch` branch is stated by Phase 1; the hash check precedes it at `:1178`, so the both-mismatched row returns `result-hash-mismatch`); invariant (check 11 — `path.resolve(c, abs) === path.resolve(c, rel)` and the trailing-slash form both `true`, run with `command node -e`); no enumerated reason list to extend (`git grep result-hash-mismatch`: engine, one test, SKILL.md prose); no new test file (check 18 n/a); no release-shape handling (check 12 n/a).

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases are ordered, files named, the code sketch matches the merge arm's shape. `estimated_effort_hours: 8` is within 2× of the rubric for 3 phases, 9 criteria, low risk.

## 4. Consistency & Completeness

### Important

- **I4 — Routing contradiction.** See D1. **Fixed.**
- **I5 — Negative-content criterion with no scan test (obs #7).** "`git grep … -- skills shared` finds no path without the stem" is a claim over a population with no test. **Fixed**: rescoped to a documentation criterion naming `skills/finalise/SKILL.md` (calibrated: the grep reads 4 at `92ed119de`), plus a behaviour criterion held by the two block tests that run the substituted blocks against the stem-keyed paths.

### Optional

- **O3 — § 8 test location.** The § 8 criterion now names the test file that holds it.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Low-risk refusal; the symlinked-checkout risk is named with its mitigation (resolved paths). Not a guard exemption — it adds a refusal — so no differential oracle is required. Rollback is a revert plus bundle.

---

## Summary of Recommendations

### Should Fix (Important) — 5, all applied
1. Add the eval test pair to the sweep (I1).
2. Bind `STEM` in the extract block (I2).
3. Rewrite the Step 6 comment the rename falsifies (I3).
4. Route `result-document-mismatch` as a HALT with its own arm (I4/D1).
5. Rescope the grep criterion; add a behaviour criterion held by the block tests (I5).

### Consider (Optional) — 3, all applied
1. Refresh drifted anchors. 2. Name the two sibling DOD_N-only paths as out of scope. 3. Name the test file in the § 8 criterion.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; every important finding was a missing site or a contradiction with a clear fix, and all are applied.

---

## Next Steps

Follow the plan phase by phase: failing cases first, the refusal, the four paths plus the extract binding, the routing arm and the comment, the nine test paths, then CHANGELOG and bundle.

---

## Review Metadata

- **Reviewer:** Claude (review-task, invoked by develop-task Step 2)
- **Review Date:** 2026-11-27
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.331.ac-merge-refuses-another-documents-result/task.331.ac-merge-refuses-another-documents-result.md
- **Architecture Docs Consulted:** none beyond the always-load set; the task touches one engine and its skill prose
- **Review Duration:** (not measured)
