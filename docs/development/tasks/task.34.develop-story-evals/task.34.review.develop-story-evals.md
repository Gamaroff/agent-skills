---
id: task.34.review.develop-story-evals
title: "Review Report: task.34 develop-story evals"
type: review
task-ref: task.34.develop-story-evals.md
reviewed: 2026-05-11
review_depth: standard
---

# Task Review Report: Task 34 — Build evals for develop-story pipeline

**Reviewed:** 2026-05-11
**Review Depth:** Standard

> **Implementation Status**: ✅ All 9 critical + important recommendations implemented — 2026-05-11. Task status advanced: `draft` → `ready-for-development`.
**Task Status:** Draft / Planned
**Overall Assessment:** NEEDS REVISION

---

## Executive Summary

Task scope, motivation, and structure solid. Mirrors task.33 cleanly and covers the right story-specific risks (PR base, epic branch, resume). However, the plan anchors epic-branch assertions to a non-existent "Phase 0d" heading in `skills/develop-story/SKILL.md` — epic-branch creation actually lives in **Step 1, sub-step 1a** (`shared/resources/develop-pipeline-step-1-create-branch.md`). Plan also assumes runner features that don't exist today (`--assertions` flag, `stages[]` multi-invocation, skill-local assertion registration), and the chosen resume kill-signal (marker artefacts) requires modifying `qa-fix` — which the task's Out-of-Scope list forbids. Resolve these before implementation.

**Critical Issues:** 4 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡
**User Clarifications:** 4 answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1: Output format
**Decision:** Comprehensive report.

### Q2: "Phase 0d" mislabel
**Decision:** Rename references to **Step 1a (create-epic-branch)**.
**Impact:** All task + plan references to "Phase 0d" for epic-branch creation must be updated. Phase 0d in SKILL.md is the upfront-prompts step (Q1 base + Q2 PR target) and must not be conflated.

### Q3: Protocol assertion target
**Decision:** Point at `shared/resources/develop-pipeline-step-1-create-branch.md`.
**Impact:** `epic-branch-rules.test.mjs` parses the step-1 shared resource, not SKILL.md. SKILL.md still checked for the `create-epic-branch` mention in the description (pipeline shape test).

### Q4: Resume kill-signal
**Decision:** Add marker writes to qa-fix as part of this task.
**Impact:** Expands scope. Out-of-Scope item #3 ("Modifying develop-story SKILL.md or sub-skills — eval changes only") must be amended. Files Summary must add `skills/qa-fix/SKILL.md` (or shared step-5-6 resource). Phase 1 risk profile elevated.

---

## 1. Template Structure Compliance

**Status:** PASS with minor gaps.

All required sections present. Frontmatter complete. File naming follows `task.34.develop-story-evals.md` convention. `github_issue: 69` linked and verified.

Missing: explicit Mermaid diagram for current-vs-target architecture. Prose ASCII tree is adequate but a side-by-side flowchart would clarify the multi-stage smoke runner. **Optional**.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — 2 critical inaccuracies.

### Critical

- **C1. "Phase 0d" mislabel (hallucination by analogy).**
  - **Location:** Task §3 (Current Architecture), §6 Phase 2 (`epic-branch-rules.test.mjs`), §6 Phase 3 (`00-create-epic-branch` scenario notes); Plan §Phase 1 (assertions), §Phase 2 (test code lines 109–116).
  - **Evidence:** `grep -nE "^## |^### " skills/develop-story/SKILL.md` shows no "Phase 0d" heading. Phase 0d in SKILL.md = upfront prompts (line 48: "upfront prompts via AskUserQuestion (0d — Q1 base + Q2 PR target …)"). Epic-branch creation lives in `shared/resources/develop-pipeline-step-1-create-branch.md` lines 38–86 ("✅ Created epic branch: {EPIC_BRANCH} from develop" / "Update Pipeline Progress: ✅ 1a. create-epic-branch").
  - **Fix:** Rename throughout to **Step 1a (create-epic-branch)**. Update protocol test to parse `shared/resources/develop-pipeline-step-1-create-branch.md` instead of `skills/develop-story/SKILL.md`.

- **C2. Runner `--assertions` flag does not exist.**
  - **Location:** Plan §Phase 6 (`package.json` snippet: `node evals/shared/runner.mjs --assertions evals/develop-story/assertions.mjs …`).
  - **Evidence:** `evals/shared/runner.mjs` takes `process.argv[2]` as scenarioDir; no flag parsing. Assertions imported via `import * as A from "./assertions.mjs"` (shared only).
  - **Fix:** Either (a) move story-specific assertions into `evals/shared/assertions.mjs` (matches task.33 pattern), or (b) extend runner with `--assertions <path>` flag in Phase 1. Pick one; add the runner change to Files Summary.

### Important

- **I1. `epicBranchBasedOn` uses `git merge-base` — weak guarantee.**
  - **Location:** Plan §Phase 1, line 44–49.
  - **Issue:** `merge-base` returns the common ancestor and will succeed for *any* branch sharing history with develop, not specifically branches *created from* develop. A branch incorrectly forked from `main` could still pass.
  - **Fix:** Use `git rev-list --count develop..feature/epic.N.*` and assert the branch is reachable from develop, or inspect reflog at branch creation. Or simply check the first commit on the epic branch equals `HEAD` of develop at creation (captured by `git-sandbox` at fixture-init time).

### Optional

- **O1.** Plan §"Resume Scenario Design" mentions `pipeline-recorder.events` observability but task.33's recorder API isn't quoted. Cite the actual export so reviewers can verify feasibility.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND.

### Critical

- **C3. Resume kill-signal scope expansion not reflected in task.**
  - **Location:** Task §4 Out of Scope item #3 ("Modifying develop-story SKILL.md or sub-skills — eval changes only"); Plan §Phase 5.
  - **Issue:** User decision Q4 selected "add marker writes to qa-fix" — this *requires* modifying the `qa-fix` sub-skill (or `shared/resources/develop-pipeline-step-5-6-qa-loop.md`). Conflicts with stated scope boundary.
  - **Fix:** Move item from Out of Scope → In Scope. Add `skills/qa-fix/SKILL.md` (or step-5-6 shared resource) to Files Summary §Modified. Add a Phase 1.5 or expand Phase 5 to cover the marker emit. Elevate Risk Assessment item #1 (HIGH) to call out qa-fix touch.

- **C4. Smoke runner `stages[]` (multi-invocation) is not in Files Summary core deliverables.**
  - **Location:** Plan §Phase 5 ("Runner extension: support `stages[]` for multi-invocation scenarios."); Task §7 Files Summary §Possibly Modified.
  - **Issue:** Resume scenario *requires* this runner extension. It's not optional — moving it to "Possibly Modified" hides a load-bearing dependency.
  - **Fix:** Promote `evals/shared/runner.mjs` (multi-stage support) to §Core Implementation or §Modified (required). Add explicit Phase 1.5 deliverable "extend runner to support `stages[]` and kill-on-marker".

### Important

- **I2. Skill-local vs shared assertions ambiguity.**
  - **Location:** Plan §Phase 1 "Register in runner (or skill-local registration per task.32 pattern)".
  - **Issue:** "task.32 pattern" not validated in this repo; runner currently only imports `evals/shared/assertions.mjs`. Plan must pick one approach.
  - **Fix:** Choose either (a) add story assertions to `evals/shared/assertions.mjs` (consistent with task.33), or (b) extend runner to merge a per-scenario `assertionsPath` (cleaner long-term). Document the choice.

- **I3. `eval:all` script form diverges from current loop pattern.**
  - **Location:** Plan §Phase 6 package.json snippet.
  - **Issue:** Current `eval:all`: `for s in evals/create-task/scenarios/*/ evals/create-story/scenarios/*/ evals/develop-task/step-isolation/*/; do … done`. Plan rewrites as `npm run eval:create-task && …` — different shape, drops protocol tests.
  - **Fix:** Extend the existing loop to include `evals/develop-story/step-isolation/*/`; add a separate explicit invocation for protocol tests if needed.

- **I4. `00-create-epic-branch` scenario uses `skill: "create-branch"` but the work is performed by `develop-pipeline-step-1-create-branch.md` invoked from `develop-story`.**
  - **Location:** Plan §Phase 3, scenario.json snippet line 134.
  - **Issue:** Driver must know whether to invoke the `create-branch` skill directly or the step-1 shared resource through `develop-story`. Mismatch may cause epic-branch logic to be skipped (the standalone `create-branch` skill may not emit `1a. create-epic-branch` progress because that's pipeline-level).
  - **Fix:** Verify standalone `create-branch` handles epic-branch creation. If not, scenario `skill` should be `develop-story` with a fixture that short-circuits other steps, or invoke the step-1 resource directly via a thin driver harness.

### Optional

- **O2.** Plan §Phase 3 references `branchExists` assertion (line 162). Confirm it exists in task.33's shared assertions or list it as a new export.
- **O3.** No mention of golden-file refresh workflow when SKILL.md phases legitimately change. Reference task.33's recorded-fixture refresh procedure.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND.

- **C3 (above)** — task says "no sub-skill changes" but user decision requires qa-fix changes.
- **I5. Step-isolation folder numbering.** Task §3 Target Architecture lists `00-create-epic-branch` through `08-commit-changes` (9 folders). §6 Phase 3 enumerates "00-04". §6 Phase 4 enumerates "05-08". Plan §Phase 3 shows scenarios for 00, 01, 04 only — missing 02, 03 explicit detail. Add or reference task.33's pattern explicitly.
- **I6. Resume scenario assertion target.** Plan asserts `expectedIter: 3` after kill at iter 2 marker. Need to verify qa-fix MAX_ITER=5 still applies when resumed (loop counter rehydrated, not reset). Add explicit assertion: `assert qa-fix iters total ≤ 5 across both stages`.

Testing strategy completeness: good. Rollback plan: realistic. Success criteria: measurable.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE, needs one elevation.

- Risk #1 (resume scenario determinism) is now larger because marker emission requires qa-fix changes. Elevate to **CRITICAL** if marker emit lands in qa-fix; add specific mitigation: "marker writes behind `EVAL_MODE=1` env guard so production qa-fix is byte-identical."
- Risk #3 (PR base assertion in dry-run) — confirm task.33's `gh-sandbox` captures `--base` in dry-run receipts. If yes, cite the file/line. If unknown, add Phase 0 verification step.
- Rollback plan covers immediate + partial + forward fix. No changes needed.

---

## Summary of Recommendations

### Must Fix (Critical) — 4

1. **Rename "Phase 0d" → "Step 1a (create-epic-branch)"** throughout task and plan; retarget protocol test at `shared/resources/develop-pipeline-step-1-create-branch.md`. _(Q2, Q3)_
2. **Drop or replace `--assertions` flag** in package.json snippet — either move assertions to `evals/shared/assertions.mjs` OR extend runner with flag parsing. Document choice.
3. **Update scope:** move "modifying qa-fix" from Out-of-Scope to In-Scope. Add `skills/qa-fix/SKILL.md` (or shared step-5-6 resource) to Files Summary §Modified. Guard marker emit with `EVAL_MODE=1`. _(Q4)_
4. **Promote runner `stages[]` extension** from §Possibly Modified to §Modified core deliverable; add explicit Phase 1.5 deliverable.

### Should Fix (Important) — 5

1. Strengthen `epicBranchBasedOn` beyond `git merge-base` (use `rev-list --count` from develop or fixture-time capture).
2. Resolve skill-local vs shared assertions ambiguity (pick one, document).
3. Align `eval:all` script with existing loop pattern; don't rewrite as `&&` chain.
4. Verify `skill: "create-branch"` handles epic-branch creation in step-isolation `00-create-epic-branch`; switch to `develop-story` driver if not.
5. Add cross-stage assertion in resume scenario: total qa-fix iters ≤ 5.

### Consider (Optional) — 3

1. Cite `pipeline-recorder` exports in plan §Resume design.
2. Confirm `branchExists` assertion exists in shared lib.
3. Document golden-file refresh procedure.

---

## Implementation Readiness Assessment

**Score:** 6/10

| Axis | Score |
|---|---|
| Template Compliance | 9/10 |
| Technical Accuracy | 4/10 (C1 + C2) |
| Implementation Clarity | 6/10 (C4 + I2 + I4) |
| Consistency | 5/10 (C3 scope conflict) |
| Risk Management | 7/10 |

**Confidence:** Medium-Low until critical fixes applied. **NEEDS REVISION**.

---

## Next Steps

1. Apply the 4 Critical fixes to `task.34.develop-story-evals.md` + `task.34.plan.develop-story-evals.md`.
2. Apply the 5 Important fixes.
3. Re-run `/review-task 69` (or `/validate-story` equivalent) for re-scoring.
4. Then `/develop` with confidence the protocol tests will actually find the epic-branch contract where it lives.

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-11
- **Review Depth:** Standard
- **Task File:** `docs/development/tasks/task.34.develop-story-evals/task.34.develop-story-evals.md`
- **Sources Consulted:**
  - `skills/develop-story/SKILL.md`
  - `shared/resources/develop-pipeline-step-1-create-branch.md`
  - `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
  - `evals/shared/runner.mjs`
  - `evals/shared/lib/git-sandbox.mjs`
  - `evals/develop-task/` (task.33 baseline)
  - `package.json` (existing `eval:*` scripts)
  - GitHub issue #69
