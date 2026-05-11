---
id: task.32.review.1
title: "Review Report: Reorganize evals/ from full-flow/ into per-skill structure"
type: review
task-ref: task.32.evals-reorganize-per-skill.md
created: 2026-05-11
---

# Task Review Report: Task 32 — Reorganize evals/ from full-flow/ into per-skill structure

> **Implementation Status**: ✅ All 4 critical+important recommendations implemented — 2026-05-11

**Reviewed:** 2026-05-11
**Review Depth:** Standard
**Task Status:** Planned (Draft in frontmatter)
**Overall Assessment:** GOOD

---

## Executive Summary

Task is well-scoped, purely mechanical, with an excellent co-located plan file. Verification of repo state confirms imports, REPO_ROOT computation, and `$SANDBOX` placeholder use are stable across the move (no functional risk). Four issues surfaced via review — one critical (phase-ordering bug that breaks `rmdir`), three important (vocabulary drift, stale `scenario.json:name` fields, hypothetical CI risk).

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after applying fixes from this review)

---

## User Decisions & Clarifications

### Q1 — Phase ordering bug (rmdir fails before README removed)
- **Decision:** Move README split into Phase 3
- **Impact:** Phase 3 must `git rm` (or `git mv`) the old `evals/full-flow/README.md` before `rmdir evals/full-flow`. Phase 5 only writes the 3 new READMEs.

### Q2 — `full-flow` as L4 layer name
- **Decision:** Rename layer to "L4 End-to-end" (or similar) — eliminate `full-flow` term entirely
- **Impact:** Phase 5 must update `AGENTS.md:178`, `docs/evals.md:185`, and `docs/README.md:19` to use the new layer label.

### Q3 — Stale `scenario.json:name` field
- **Decision:** Update name field in Phase 3
- **Impact:** Add checkbox to Phase 3 to rewrite `name` field in all 5 `scenario.json` files to match new dir basenames.

### Q4 — Hypothetical CI `paths:` filter risk
- **Decision:** Remove §10.2 from risk section
- **Impact:** Current `.github/workflows/test.yml` has no `paths:` filter — risk does not apply. Real CI work is mechanical step-name + script updates (already in Phase 4).

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory sections present. Frontmatter complete. Filename follows `task.{n}.{name}.md` convention. Plan file co-located. GitHub issue linkage (`github_issue: 67`) present and verified open.

**Minor:** body `Status:` ("📋 Planned") and frontmatter `status:` (`draft`) disagree — frontmatter should be `planned` per status lifecycle.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Verified against current repo state:
- `evals/full-flow/runner.mjs:29` computes `REPO_ROOT = path.resolve(__dirname, "..", "..")` — same depth from `evals/shared/`, no change needed ✅
- `evals/full-flow/assertions.mjs:21` uses `require("../../shared/resources/create-skills-lib.js")` — same depth from `evals/shared/`, stable ✅
- Runner uses `path.basename(absScenarioDir)` for sandbox naming — auto-propagates dir rename ✅
- All scenario assertion paths use `$SANDBOX/...` placeholder — stable across rename ✅
- Test imports use `../<file>` style — stable ✅

No invented APIs, libraries, or paths.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved via Q1+Q3)

### Critical
- **Phase ordering bug**: `rmdir evals/full-flow` in Phase 3 cleanup will fail because Phase 5 has not yet removed `evals/full-flow/README.md`.
  - **Location:** Plan §Phase 3 cleanup; Task §Phase 3 line 186
  - **Fix (per Q1):** Move `git rm evals/full-flow/README.md` (or its content rescue) into Phase 3 before the `rmdir` step.

### Important
- **`scenario.json:name` field updates not specified**: After rename, `01-happy-task/scenario.json` becomes `01-happy/scenario.json` but its `"name": "01-happy-task"` field remains stale.
  - **Location:** Plan §Phase 3 audit step
  - **Fix (per Q3):** Add explicit checkbox: "Update `name` field in all 5 scenario.json files to match new dir basenames."
  - **Files:** `01-happy/scenario.json`, `02-id-collision/scenario.json`, `03-tracker-live/scenario.json` (create-task); `01-happy/scenario.json`, `02-missing-core-config/scenario.json` (create-story).

- **README inline path reference missed**: `evals/full-flow/scenarios/05-tracker-payload-live/README.md:46` mentions `evals/full-flow/lib/tracker-cleanup.mjs`. After move, the README itself relocates but its prose remains stale.
  - **Fix:** Add to Phase 3 audit grep follow-up: rewrite to `evals/shared/lib/tracker-cleanup.mjs`.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (resolved via Q2)

### Important
- **L4 layer-name vocabulary drift**: Task §Phase 5 says "Update AGENTS.md if it names old paths" — but `AGENTS.md:178` and `docs/evals.md:185` use `full-flow` as the **layer name** (e.g., `**L4 Full-flow**`), not just a path. Pure path-replace leaves taxonomy inconsistent.
  - **Location:** `AGENTS.md:178`, `docs/evals.md:185`, `docs/README.md:19`
  - **Fix (per Q2):** Rename L4 label to "End-to-end" (or similar). Add explicit Phase 5 step listing these three files and the new label.

### Optional
- Task §5.1 "After" script list omits `eval:create-story:cli` and `eval:create-story:sdk` (plan §Phase 4 has them). Add to task for consistency.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND (resolved via Q4)

### Important
- **Hypothetical risk §10.2**: References CI `paths:` filter that does not exist in `.github/workflows/test.yml` (verified — only `branches: [main]` + `pull_request:`).
  - **Fix (per Q4):** Remove §10.2 entirely. Real CI exposure is workflow lines 25–26 and 50 (script + path strings), already covered by Phase 4.

Rollback plan otherwise solid: `git revert <merge-commit>` is appropriate for atomic file-move task.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. **Move README removal into Phase 3** so `rmdir evals/full-flow` succeeds. Order: split README content → write 3 new READMEs (Phase 5 stays as the *write* step) OR `git rm` the old README in Phase 3 and write replacements in Phase 5. Either way, Phase 3 cleanup must leave the directory empty before `rmdir`.

### Should Fix (Important) — 3

1. Add Phase 3 checkbox to rewrite `name` field in all 5 `scenario.json` files to match new dir basenames.
2. Phase 5: rename L4 layer label from "Full-flow" to "End-to-end" in `AGENTS.md:178`, `docs/evals.md:185`, `docs/README.md:19`.
3. Remove risk §10.2 (hypothetical CI `paths:` filter — does not apply).

### Consider (Optional) — 2

1. Add Phase 3 follow-up: rewrite stale prose path in `05-tracker-payload-live/README.md:46` (`evals/full-flow/lib/...` → `evals/shared/lib/...`).
2. Sync task §5.1 "After" script list with plan §Phase 4 — add `eval:create-story:cli` / `:sdk`.

---

## Implementation Readiness Assessment

**Score:** 8/10

| Axis | Score |
|---|---|
| Template Compliance | 9/10 |
| Technical Accuracy | 10/10 |
| Implementation Clarity | 7/10 (phase-order bug + missing scenario.json step) |
| Consistency | 7/10 (L4 layer-name drift) |
| Risk Management | 8/10 (one hypothetical risk) |

**Confidence:** High after fixes applied.

**Recommendation:** ✅ READY TO IMPLEMENT once the four issues above are addressed (all are small text edits to the task/plan files — no code or architecture change needed).

---

## Next Steps

1. Apply fixes per Q1–Q4 to the task and plan documents.
2. Update frontmatter `status:` to `planned`.
3. Set status to `Ready for Development`.
4. Run `/develop-task` to execute the reorg.
5. Verify: `npm test` + `npm run eval:all` green; `evals/full-flow/` gone; `git log --follow` shows renames preserved.

---

## Review Metadata

- **Reviewer:** Claude (Opus 4.7)
- **Review Date:** 2026-05-11
- **Review Depth:** Standard
- **Task File:** `docs/development/tasks/task.32.evals-reorganize-per-skill/task.32.evals-reorganize-per-skill.md`
- **Plan File:** `docs/development/tasks/task.32.evals-reorganize-per-skill/task.32.plan.evals-reorganize-per-skill.md`
- **Architecture Docs Consulted:** repo state (evals/, package.json, .github/workflows/test.yml, AGENTS.md, docs/evals.md, docs/README.md)
- **Pre-pass Agents:** skipped (small scoped refactor)
