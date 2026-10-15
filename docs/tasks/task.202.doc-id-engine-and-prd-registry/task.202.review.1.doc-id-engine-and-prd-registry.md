# Task Review Report: Task 202 - Doc-id engine and PRD registry

**Reviewed:** 2026-10-15
**reviewed_blob:** 62088b454855489b455a14ea9ba0aee56b3829a8
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-10-15

---

## Executive Summary

A well-evidenced task: every measurement in §2 re-ran to the stated result, every cited symbol and path exists, and the card preflight and link check are clean. The review found three Important gaps: the grammar did not cover non-canonical artifact names that exist in the tree, an always-loaded architecture standard contradicts the new scheme and was out of scope, and the wall-clock criterion lacked a load record. All three were fixed in the task document.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-next` → `/develop-task --defaults`); every decision below took the recommended option and is recorded as such
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked: this review ran inside an autonomous develop pipeline. Auto-answers:

- Step 0 output format: Comprehensive report (pipeline default)
- Step 8.5 apply fixes: Yes, apply all critical + important fixes (pipeline default)
- Step 9 status: Yes, fixes complete → Ready for Development (pipeline default)
- I2 (artifact grammar): the reviewer chose the option that keeps `parse` in agreement with the existing `isWorkItemDocument` classifier, since task 206 will re-export one from the other.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Progress Tracking and References present; no placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Sign-off: `sign-off` not enabled in `skills-config.yaml` — check skipped.
- Change Log: present and current (status `planned`, one draft row) — review rows added.
- Tracker: `github_issue: 645` exists; body link `[#645](…/issues/645)` matches.
- Card preflight: exit 0 — 3 card blocks resolve (Summary +6, Success Criteria +8, Breaking Changes +4 omitted behind "+N more").

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Verified by execution, not by reading:

- `parseRegistry(t, "prd", …)` on the §2 table → `rows: 0`, malformed reason `"malformed row — no [title](story|task|bug.….md) link"` — matches.
- `nextStoryId(["story.1.1.a.md","story.1.3.b.md"], 1)` → `2` — matches.
- Slug-letter grep over `docs evals skills` → no output — matches.
- `WORK_ITEM_DOC_RE` / `WORK_ITEM_ARTIFACT_RE` (`finalise-fix-and-recheck.mjs:68,76`), `STORY_FILENAME_RE` / `nextStoryId` (`create-story/scripts/lib.js:23,93`), `isWorkItemHref` / `DEFAULT_COLUMNS` / `COLUMN_ALIASES` / `parseRegistry` (`select-next.mjs:373,1098,988,1199`), `card-preflight.js:55`, `prdRootFromConfig` (`generate-prd-epic-index.mjs:79`), `"type": "commonjs"` — all present as described.
- Test reach (check 18): `shared/resources/tests/*.test.mjs` and `evals/develop-next/unit/*.test.mjs` are both in the `npm test` script.
- Checks 14, 15, 16, 17, 19, 21: not applicable (no engine call-site list, nothing removed, no region replaced, no shell-string identity, no resume rule, no consumed foreign schema).

Pre-pass Agent B (architecture alignment, prepass-axes `source: architecture`): `drift`. Axes checked: What this repo produces, File naming, Status lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit, Do not. Two medium findings, consolidated as I1 below; the two low findings (two artifact lists until 206 — mitigated by the contract test; test location follows the card-preflight precedent) need no change.

Pre-pass Agent C (codebase scan): `not-implemented` — no `doc-id.js`, no test, no `prd-registry.md`, no `prd` kind in `select-next.mjs`.

### Important

- **I1 — An always-loaded standard contradicts the new scheme and was out of scope.** `docs/architecture/concepts/coding-standards.md:63` says "Epic numbers are globally unique", and § Registries does not mention a PRD registry. It is a `devLoadAlwaysFiles` entry, loaded into every pipeline run, so after this task it would contradict the four standards the task rewrites.
  - **Fix applied:** added to In Scope, Phase 3 and Files Summary (#12); the Migration criterion now covers it.
- **I2 — The `parse` grammar did not cover non-canonical artifact names that exist in the tree.** The plan's remainder forms were `.{slug}`, `.{artifact}.{seq}.{slug}` and `.plan.{slug}`. The tree also holds `task.12.review.2026-05-06.md` (dated), `task.11.review-task-tracker-dedup.review.2026-05-06.md` (slug before the keyword) and `task.133.dod.security.by-hand-probe.md` / `task.125.dod.security.run.json` (no seq). Under the plan these return `bad-artifact`, while `isWorkItemDocument` correctly calls them artifacts — a disagreement task 206 would inherit when it re-exports.
  - **Fix applied:** §3 Grammar now classifies them as artifacts with `seq: null, canonical: false` (round-trip covers canonical names only); a single-segment remainder is always the slug; Phase 1 and Testing Strategy gained an agreement test against `isWorkItemDocument` over tracked `task.*` / `bug.*` filenames, with named control cases. The plan's `parse` step 3 was updated to match.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases with files, risk and dependencies; the co-located plan gives the grammar as code, the check-reason table and the CLI contract. Effort 16h is consistent with the rubric (3 phases, 13 criteria, medium risk).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I3 — The wall-clock criterion lacked a load record.** "`check --corpus` … under 1 s (measured with `time`)" is a bound no per-PR test could assert, so it is held as a measured criterion — which finalise accepts only with the load it ran under and on the PR's head commit (obs #268).
  - **Fix applied:** the criterion now requires `time` on the head commit with `uptime` beside it.

Every other criterion classifies cleanly: behaviour criteria name their tests (round-trip, `matchesEpic`, `nextNumber`, fixture corpus, `parseRegistry` + roadmap regression), documentation criteria name the file and content, and none depends on a merge.

### Optional

- **O1 — Slug equal to an artifact word.** `story.1.2.3.plan.md` was ambiguous under the plan's remainder list. Resolved alongside I2: a single-segment remainder is always the slug.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks are named with mitigations; rollback is a clean revert because nothing calls the engine. The `isWorkItemHref` widening is kind-scoped with a roadmap regression test.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues — all applied

1. I1 — bring `coding-standards.md` § Registries into scope.
2. I2 — classify non-canonical artifacts; add the agreement test.
3. I3 — record load and head commit with the timing measurement.

### Consider (Optional) - 1 item — applied with I2

1. O1 — single-segment remainder is the slug.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three Important gaps were specification gaps with clear fixes, now applied to the task and plan.

---

## Next Steps

Task is ready for implementation via the develop pipeline (Step 3).

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous pipeline run)
- **Review Date:** 2026-10-15
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.202.doc-id-engine-and-prd-registry/task.202.doc-id-engine-and-prd-registry.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md (via pre-pass B)
