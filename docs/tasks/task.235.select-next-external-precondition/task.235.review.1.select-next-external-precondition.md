# Task Review Report: Task 235 - select-next registry fallback selects an item blocked on another repository

**Reviewed:** 2026-10-27
**reviewed_blob:** 1424b0c83bc3849345c8a1bb7ca6421dc44ed5ff
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 critical + important recommendations implemented — 2026-10-27

---

## Executive Summary

A well-grounded task: every `select-next.mjs` line anchor resolves, the reuse targets (`frontmatterScalar`, `DEP_EMPTY_RE`) exist, and the scope boundaries (`--batch`, roadmap path, no new stop reason) are correct. The review found one falsified claim — a YAML `null` would hold a row — and five criteria whose evidence was unreachable or unheld. All were fixed in the document and the plan; none needed user input.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 5 ⚠️ (fixed)
**Optional Improvements:** 2 💡 (1 fixed, 1 noted)

**User Clarifications:** 0 questions asked (autonomous develop-task pipeline run; every finding resolved from the codebase)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-task` (invoked by `/develop-next`, `--defaults`). No user present: output format auto-answered "Comprehensive report", Step 8.5 "Yes, apply all critical + important fixes", Step 9 "Yes, fixes complete". No question was needed — each finding had one answer the code determines.

---

## Pre-pass

- **Agent B (architecture alignment)**: `aligned`. `axes_checked`: What this repo produces, SKILL.md authoring, File naming, Status lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit, Do not (`prepass-axes.js` source: `architecture`). One low note: `tech-stack.md` does not list the `evals/develop-next/unit` layer — not this task's concern.
- **Agent C (codebase scan)**: `not-implemented`. No `blocked_on_external` / `readExternalBlock` / `externalBlock` anywhere outside docs. No engine call sites enumerated, so no population diff.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present. No placeholders.
- OKF: `type: task`, `description`, `tags` present.
- Tracker: `github_issue: 759` exists (OPEN); body link matches; board Priority self-heal ran (no-op).
- Card preflight: 3 card blocks resolve (Summary +4, Success Criteria +10, Breaking Changes +4 omitted behind `+N more`).
- Change Log present and current; review rows added. Sign-off disabled in `skills-config.yaml` — not checked.
- `doc-links.js`: 3 relative links resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Every `select-next.mjs` anchor verified with `sed -n`: 543, 861, 886, 911, 998, 1161, 1165, 1518, 1521, 1601, 1615, 2080, 2114 each hold the named code.

#### Critical

- **[Falsified invariant — check 11] A YAML null holds a row.** The document said a `DEP_EMPTY_RE` value "counts as not blocked, so a placeholder never hides a row". Run on the real `frontmatterScalar`:
  `blocked_on_external: null` → `"null"`, held: **true**; `~` → `"~"`, held: **true** (`""`, `none`, `"none"` → not held). This repository writes unset keys as `null` (`github_issue: null`), so an author following house style would hide the task on a condition named "null".
  - **Fix applied:** `externalBlockOf` also rejects `/^(?:null|~)$/i` (a separate `YAML_NULL_RE`; `DEP_EMPTY_RE` is not widened because it also reads the `Depends on` cell). Added to Target Architecture, Phase 2, Phase 3, Success Criteria and the plan's code and mutation proofs.

#### Optional

- **Drifted anchor:** `skills/create-task/SKILL.md:265` → the rule is at line **269** (and reads "does not parse free text", which the § 7 grep already covers). **Fixed.**

### Check 15 (removed literals)

`git grep` over `*.test.*` and `evals/**` for `rejected on document status`, `selector cannot see free text` and `selector does not parse free text`: no hits. The rationale rewording breaks no test.

### Check 18 (runner reach)

New tests go in the existing `evals/develop-next/unit/select-next.test.mjs`, reached by `test:suite`'s `'evals/develop-next/unit/*.test.mjs'` glob.

### Check 20 (site list carries its grep)

§ 7 records its grep. Re-run: two hits, `skills/create-task/SKILL.md:269` and `docs/tasks/task-registry.md:24` — matches the list.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are concrete, ordered, with files and mutation proofs. The check order (floor → hold → dependencies) is stated as the requirement and pinned by a criterion. `roadmap-selection.md` is a skill-local file (no `shared/resources/` source), so editing it in place is correct. Effort 16h is consistent with the rubric.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

1. **[Outcome reachability — check 10] The tree-level criterion was vacuous.** "On the real tree after Phase 4, the selector does not select T174" and "T174 must appear in `passedOver`" — but on today's tree the roadmap's Phase 17 still holds T236 (and T235 until it is ticked), so `selectNext` returns a roadmap row and never calls `registryFrontier`; the output carries no `registryFrontier`. The criterion would pass whether or not the feature worked. **Fix:** tree evidence moved to `--lint` (evaluates every registry row; `passedOver` is in its output at `select-next.mjs:2102`). Expected outcome reworded.
2. **[Outcome reachability] "Every held row is named" over-claims.** Selection short-circuits; rows ranked below the selection are pushed `eligible: null` without being read, so a held row there is never named. **Fix:** deliverable 2, benefit 3, the Target Architecture note, risk 1's mitigation and the plan's `roadmap-selection.md` instruction now say "every held row the frontier evaluated" — all rows above a selection; all rows on `roadmap-complete` and under `--lint`.
3. **[Behaviour criterion with no test] Held rows named in the selected rationale.** No planned test asserted it. **Fix:** Phase 3 rationale test (held row ranked above the selection is named and counted as held).
4. **[Non-functional criterion held neither way] "Read at most once per run".** A per-PR test could assert it, but `main` is not exported, so no test could reach the loader's cache. **Fix:** Phase 2 extracts `loadRegistries` into exported `makeRegistryLoader(paths, readFile)`; Phase 3 read-count test with a counting `readFile`; the plan's mutation proof drops the cache.
5. **[Non-functional criterion with no bound] "No measurable change to runtime".** **Fix:** bound stated — head within 110% of `develop`, both measured with `uptime; time command node --test evals/develop-next/unit/select-next.test.mjs` on the PR head commit, figures recorded in the implementation report.

#### Optional

- The control case (different repository name and phrasing, a bug row, a `none` row that must still be selected) is well specified. No change.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Not a guard exemption in the refuse-by-default sense: it narrows what is selected, and the failure direction (a row hidden) is named as the critical rollback trigger, with the YAML-null fix closing the one unintended route to it. Rollback is a revert; the field is inert without the reader.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue — applied

1. Treat `null` / `~` as placeholders in `externalBlockOf`; test both.

### Should Fix (Important) - 5 issues — applied

1. Tree-level evidence via `--lint`, not a plain selector run.
2. Scope "every held row" to evaluated rows.
3. Test that the selected rationale names a held row.
4. Export `makeRegistryLoader` and test the read count.
5. State a numeric wall-time bound and its command.

### Consider (Optional) - 2 items

1. Anchor 265 → 269 — applied.
2. `tech-stack.md` does not list the `evals/*/unit` layer (pre-pass B) — out of scope; noted only.

---

## Implementation Readiness Assessment

**Score:** 8/10 (pre-fix 6/10: one falsified invariant, five unheld or vacuous criteria)

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 7/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every finding was a precise, single-answer fix now in the document and plan; no critical issue remains.

---

## Next Steps

Task is ready for implementation. Follow the plan phase by phase: failing tests first, then the frontier check, then edge cases and docs.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, autonomous)
- **Review Date:** 2026-10-27
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.235.select-next-external-precondition/task.235.select-next-external-precondition.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Review Duration:** ~25 min
