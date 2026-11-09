# Task Review Report: Task 272 - finalise names its preconditions and standalone routes

**Reviewed:** 2026-11-08
**reviewed_blob:** 09c82541f715a55bcc4f2c7c1af74ec7af5292b0
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its Phase 1 owner decision is already answered (docs-only branch off `develop` with a PR). Five defects in the plan's inputs were found and fixed in the task document; none needed a user decision.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️ (all fixed)
**Optional Improvements:** 2 💡 (fixed)

**User Clarifications:** 0 (pipeline run; Phase 1 was answered before dispatch)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked during this review. Plan Phase 1 (where the post-merge acceptance commit goes) was answered by the owner before the pipeline started: a docs-only branch off `develop` with a PR.

---

## 1. Template Structure Compliance

**Status:** PASS. OKF `type: task` and `description` present; no placeholders; card preflight (`--check-card`): 3 card blocks resolve; relative links resolve (`doc-links.js`: 1 link, 0 broken).

#### Optional
- Line anchor `:1110` (Tests & PR Approved? column) had drifted. Replaced with the heading text and a grep to find it. Other anchors (`:87`, `:115`, `:249`–`:358`, `:345`, `:442`, `:480`, `:103`) were read and resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed). Hallucinations: 0.

#### Important
- **Field-source mismatch (check 21).** The plan reads `reviewDecision` and PR state "via `pr-read.sh`". `shared/resources/pr-read.sh` emits only `PR_READ_NUMBER`, `PR_READ_HEAD`, `PR_READ_BASE`, `PR_READ_HEAD_BRANCH`. State and `reviewDecision` come from `gh pr view --json state,reviewDecision,url` (`finalise-dod-ac-prompt.md` Step 3). On Bitbucket there is no `gh` answer. **Fixed:** task Target Architecture names the source and says Bitbucket reports `unverifiable`, never missing.
- **Waiver field names (check 21).** The task said "`approved_by` on a `WAIVED` gate". The `qa-gate` schema's fields are `waiver.active` and `waiver.approved_by`. **Fixed.**
- **Edit-the-source rule.** The task listed `skills/finalise/references/resolve-pr-number.sh` and a new script "under `skills/finalise/references/` or `shared/resources/`". Both `finalise-record-preflight.js` and `resolve-pr-number.sh` have their sources in `shared/resources/`; the `references/` copies are generated and `npm run bundle` reverts edits to them. **Fixed:** Files Summary names the sources, and SKILL.md must cite the new script so the bundler reaches it.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed).

#### Important
- **Removed-literal sweep (check 15).** Phase 3 rewrites the 7.7 and 6a blocks, which are pinned by tests the plan never lists besides `finalise-bug-mode.test.mjs`: `finalise-acceptance-blocks`, `finalise-6a-registry-staging`, `acceptance-commit-carries-5c`, `transition-protocol-parity`. **Fixed:** Phase 4 now carries the sweep with those suites named as the first to read.
- **Test reach (check 18).** A new test under `evals/shared/tests/` is reached by the `package.json` glob `evals/shared/tests/*.test.mjs`. Recorded in Phase 4.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT.

#### Optional
- AC "an existing fixture passes unchanged" named no location. **Fixed:** it now names the `finalise-*.test.mjs` suites and the QA report's test run.
- The performance criterion states a numeric bound (10%), the command (`CI=true command npm test`, median of five, `uptime` beside each) and the QA report as the record. Held.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The High-risk Phase 3 has mitigation and a rollback. Note for develop: the post-merge route accepts on a `**Verification Result**: ✅ Fixed` line (already read at `skills/finalise/SKILL.md:266`), so the DoD must record that basis.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 4, all applied
1. Name the producer of PR state and `reviewDecision`; Bitbucket is `unverifiable`.
2. Use `waiver.active` and `waiver.approved_by`.
3. Edit `shared/resources/` sources; cite the new script from SKILL.md.
4. Add the removed-literal sweep and the named pinning suites.

### Consider (Optional) - 2, applied
1. Replace the drifted `:1110` anchor.
2. Name where the "behaves as before" criterion is evidenced.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after fixes)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; the four important ones were plan-input corrections and are applied.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-11-08
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.272.finalise-names-its-preconditions-and-standalone-routes/task.272.finalise-names-its-preconditions-and-standalone-routes.md
- **Pre-pass:** Explore subagents not dispatched; architecture and codebase checks performed inline (independent pre-pass did not run).
- **Architecture Docs Consulted:** skills/finalise/SKILL.md, shared/resources/pr-read.sh, finalise-dod-ac-prompt.md, qa-gate SKILL.md
