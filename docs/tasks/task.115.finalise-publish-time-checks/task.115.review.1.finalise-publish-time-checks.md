# Task Review Report: Task 115 - finalise publishes before it verifies

**Reviewed:** 2026-09-13
**Review Depth:** Standard
**Task Status:** Planned (at review start)
**Overall Assessment:** GOOD (after fixes) — the four defects are real and well-sourced; the plan for the second CI read was not closable as written and the file map missed the documents the fix actually lands in

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-09-13

---

## Executive Summary

The task names four real defects in `/finalise` Step 7 and cites them accurately to observations #40, #48, #57, #59. Every technical claim was verified against the tree: the `IN PROGRESS` count (11) is exact, the both-locations rule at `document-status-lifecycle.md` is real, the `releases.md` one-liner exists, and the registry-tick / drift-test precedent (task.103) is the right shape to mirror. Two things were wrong. First, **Phase 2 could not be satisfied literally**: neither `skills/finalise/SKILL.md` nor `shared/resources/develop-pipeline-step-7-finalise.md` commits or pushes at Step 7 — the acceptance artefacts are committed at Step 8 by `/commit-changes`, *after* every outward side-effect — and SC2 asked the DoD summary, which is part of that acceptance commit, to record a CI reading taken on that same commit. Second, the file map and several citations pointed at the wrong places (a DoD "template asset" that is inline prose, a `>/dev/null 2>&1` audit for a suppression that exists nowhere in the shipped docs, "Step 5" for what is Step 7 action 1, "fourteen" checklist items where there are twelve).

**Critical Issues:** 1 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 asked — run is autonomous (`/develop-next`); each decision below is the recommended option, recorded so it can be overturned
**Implementation Readiness:** 8/10 (pre-fix: 6/10)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran under `/develop-next`'s autonomous directive: no `AskUserQuestion` was issued. Each question that would have been asked is recorded with the option the reviewer took, so a reader can disagree with a specific decision rather than with the whole review.

### Question Point 1: Structure & Scope

**Q1: Scope offers two remedies for the doubled header — remove the field (preferred) or add a fail-closed pre-post check. Testing Strategy assumes the check exists. Which one?**
- **Decision**: Remove the field. Scope already marks it preferred, and a check guards a defect the removal makes impossible.
- **Impact**: Testing Strategy rewritten — a protocol-shape test asserts the DoD template carries no `**Status:** IN PROGRESS` line and a DoD body carries exactly one status line; the "contradicting fixture" test is dropped.

### Question Point 2: Technical & Implementation

**Q2: Where does the acceptance commit + push happen, and where is the second CI reading recorded, given the DoD summary is inside the commit it would describe?**
- **Decision**: Step 7 gains its own commit+push of the acceptance artefacts, placed *before* the outward side-effects (PR comment, issue comment/close, board move). The second reading is recorded in the PR canonical summary comment and the implementation report — outside the verified commit. The DoD summary carries reading 1 with its head and a pointer to where reading 2 lives.
- **Impact**: SC2, Implementation Plan step 2, Phase 2 checkboxes and Files Summary rewritten; `develop-pipeline-step-7-finalise.md` and `develop-pipeline-step-8-commit.md` added to the file map. Step 8's implementation-report commit is docs-only and remains unverified by a *second* read — that residue is named in the task, and `develop-next` Step 3's merge gate (head-SHA + CI + local `npm run ci`) covers it for pipeline-driven merges.

**Q3: Phase 3 asks for an audit removing `>/dev/null 2>&1` from commits. No such suppression exists in `finalise/SKILL.md`, the step-7 doc or the step-5-6 doc. Audit or rule?**
- **Decision**: Rule + assertion. State "never suppress a `git commit`'s output or exit status in a chain" once, and make the artifact-exists checks tracked-and-pushed assertions. #48's suppression was improvised by an agent, not copied from a document, so there is nothing to remove.
- **Impact**: Implementation Plan step 3 and Phase 2 checkbox reworded.

### Question Point 3: Completeness & Safety

**Q4: `[Unreleased]` cites all four tasks merged since v0.46.0 (107, 108, 113, 114) but only bug 14 of bugs 13/14/15. Should the drift test cover bugs on day one?**
- **Decision**: Tasks only in the first version, matching SC4 as written. The `(bug N)` citation convention is documented alongside `(task N)`, and bugs are named as the follow-on once 13 and 15 are backfilled. A test that is red at birth on work this task did not touch teaches readers to skip it.
- **Impact**: Phase 3 checkbox and Success Criterion 4 made explicit about scope; the two uncited bugs are recorded in the task's References as the follow-on.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven numbered sections present; frontmatter carries `type: task`, `description`, `tags`, `updated`; filename follows `task.115.finalise-publish-time-checks.md`. Change Log present with the 1.0 row (enforcement `advisory`, default). Sign-off not enabled — not checked. No placeholders.

### Issues

#### Critical
- None

#### Important
- **Tracker linkage** — `github_issue` was absent. **Resolved during review**: issue [#401](https://github.com/Gamaroff/agent-skills/issues/401) created via `ensure-task-github-issue`, added to the *Agent Skills* board, Priority set to P1; `github_issue: 401` written to frontmatter and the body cross-reference inserted. (Estimate field does not exist on this board — non-blocking.)

#### Optional
- None

### Card preflight
`sync-jira-task.js --check-card` → `ok: true`. Three blocks resolve: Summary (369 chars, prose), Success Criteria (426 chars, list, 0 omitted), Breaking Changes (172 chars). No `+N more` truncation.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (every named file, test and rule exists) — but 4 mis-citations

### Issues

#### Important
- **DoD "template asset" does not exist as an asset** — `skills/finalise/assets/` holds only `sprint-review-summary-template.md`. The DoD header (`**Status:** IN PROGRESS`) is inline prose at `SKILL.md` Step 0 action 3 (≈l.87–100), and the "COMPLETED - ACCEPTED" transition is Step 7 action 1 (≈l.830) with a mirror at Step 8 (≈l.1493) and a second template at ≈l.1557.
  - **Location:** §3 Technical Background, §7 Files Summary
  - **Recommendation:** Name the inline locations; drop "asset".
- **"Step 5 asks for both edits"** — the two-edit instruction is Step 7 action 1, not Step 5 (`/finalise` has no Step 5 heading; Steps 3–5 are the parallel DoD checks). **"the checklist's fourteen items"** — the Step 7 Completion Checklist has 12 items in `finalise/SKILL.md` and 11 in the pipeline step-7 doc.
  - **Location:** §2 Current Problems 1 and 2
  - **Recommendation:** Cite by step/action, not count; line numbers decay within days (obs #22).
- **`>/dev/null 2>&1` on commits** — grep of `finalise/SKILL.md`, `develop-pipeline-step-7-finalise.md`, `develop-pipeline-step-5-6-qa-loop.md` finds one suppression, on `git ls-remote` (a read, l.1152). No documented commit is suppressed.
  - **Location:** §4 In Scope, §6 step 3
  - **Recommendation:** Per Q3 — a stated rule and tracked-and-pushed assertions, not an audit.
- **"after the Step 7 push"** — Step 7 has no push. `finalise/SKILL.md` never commits; the pipeline step-7 doc pushes only on the DoD-gaps HALT path (l.71). The acceptance commit is Step 8 (`develop-pipeline-step-8-commit.md`, `/commit-changes` + `git push origin HEAD`).
  - **Location:** §6 step 2, Phase 2
  - **Recommendation:** Per Q2 — introduce the acceptance commit+push at Step 7, before the side-effects.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved)

### Issues

#### Critical
- **Phase 2 is not closable as written.** SC2 ("The DoD summary records two CI readings with their heads, and the second is the pushed acceptance head") asks a file inside the acceptance commit to record a reading taken on that commit — recording it produces a newer commit, which is the defect #40 names. Combined with the missing Step 7 push, a developer following steps 2–3 literally has no commit to read CI on and no place to write the result.
  - **Impact:** The central phase of the task would be implemented as either a no-op or an infinite regress.
  - **Recommendation:** Per Q2. Order: local writes → acceptance commit + push → CI rollup on `git rev-parse HEAD` (bounded poll; HALT `ci-not-green-on-acceptance-head` on FAILURE; PENDING past the bound is also a HALT — waiting is correct, assuming is not) → outward side-effects, with both readings + heads in the PR canonical comment and the implementation report.

#### Important
- **Files Summary missed the pipeline documents** — `shared/resources/develop-pipeline-step-7-finalise.md` owns the Step 7 Completion Checklist, the DoD-to-PR post and the orchestrator-visible side-effects; `develop-pipeline-step-8-commit.md` owns the current commit point. Both change under Q2. Bundled `references/` copies regenerate with `npm run bundle` and are never edited directly.

#### Optional
- Effort: rubric gives 4h (5 SC, 5 plan steps, medium risk, 5 files, no integration keyword) vs frontmatter 6h — within the 2× band; no finding.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (resolved)

#### Important
- **Scope vs Testing Strategy** — §4 offers "remove (preferred) or add a check"; §8 tests only the check. Resolved per Q1.
- **Phase 3 scope vs corpus** — the `(bug N)` half of the convention would fail on bugs 13 and 15 today. Resolved per Q4.

#### Optional
- **Mermaid**: none present; none recommended — the Step 7 reorder is a five-item sequence the prose states directly.
- **Already implemented?** `develop-next` Step 3 already re-verifies the PR head (head-SHA equality, CI rollup, local `npm run ci`) before merging. That covers pipeline-driven merges but not `/finalise` run standalone or a PR merged by hand, so the task is not scoped down; the overlap is noted in the task so the second read is not mistaken for a duplicate of the merge gate.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risk is right: the second read adds wall-clock to every finalise, and the CHANGELOG check must not block complete work — both are named with mitigations (bounded poll; advisory first). Rollback is a single-PR `git revert` with the test left skipped rather than deleted.

#### Optional
- "blocking after one release cycle" — name the trigger. Recommended: the release that follows the one this ships in, recorded as a checklist line in `releases.md` so the flip is a release-time decision rather than a memory.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue
1. Restructure Phase 2: acceptance commit + push inside Step 7 before the outward side-effects; second reading recorded on the PR comment + implementation report; SC2 rewritten. — _Per Q2_

### Should Fix (Important) - 4 issues
1. Correct the citations: inline DoD header (not an asset), Step 7 action 1 (not Step 5), 12-item checklist (not fourteen), no existing commit suppression to remove. — _Per Q3_
2. Add `develop-pipeline-step-7-finalise.md` and `develop-pipeline-step-8-commit.md` to Files Summary. — _Per Q2_
3. Pick header removal and align Testing Strategy. — _Per Q1_
4. Scope the CHANGELOG drift test to tasks first; document `(bug N)` and name bugs 13/15 as the follow-on. — _Per Q4_

### Consider (Optional) - 2 items
1. Name the advisory→blocking trigger for `no-changelog-entry`.
2. Note the `develop-next` merge-gate overlap so the second read is not read as a duplicate.

---

## Implementation Readiness Assessment

**Score:** 8/10 (pre-fix 6/10)

**Scoring Breakdown (post-fix):**
- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High — the reorder touches the pipeline's publish step, which has the most side-effects of any step; the protocol-shape tests are what keep it honest.

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The defects are real and the precedent (task.103) is the right one; with Phase 2 made closable and the file map corrected, a developer can follow the plan without guessing where the commit point is.

---

## Next Steps

1. Follow the Implementation Plan phase by phase — Phase 2 first, since Phases 1 and 3 land inside the Step 7 reorder it introduces.
2. Mutation-prove every new test (revert the behaviour, confirm red) before the QA gate.
3. Close observations #40, #48, #57, #59 naming the PR.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous under /develop-next)
- **Review Date:** 2026-09-13
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md
- **Architecture Docs Consulted:** `skills/finalise/SKILL.md`; `shared/resources/develop-pipeline-step-7-finalise.md`; `shared/resources/develop-pipeline-step-8-commit.md`; `shared/resources/develop-pipeline-step-5-6-qa-loop.md`; `shared/resources/document-status-lifecycle.md`; `docs/contributing/releases.md`; `evals/shared/tests/task-registry-drift.test.mjs`; `CHANGELOG.md` (`[Unreleased]` vs `git log --merges v0.46.0..HEAD`)
- **Pre-pass:** executed in-line (no Explore subagents dispatched)
