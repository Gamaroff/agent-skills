# Task Review Report: Task 207 - Doc numbering enforcement and sweep

**Reviewed:** 2026-10-16
**reviewed_blob:** e881fecb7a5d3306a75d7bcb63506621134c8c19
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-10-16

---

## Executive Summary

The task is well-scoped and its two guards are modelled on proven tests, but it was written before
task.202–task.206 landed and its plan's corpus-test code calls an engine API that does not exist, and
its list of hand-rolled sites is stale. Re-measured against `develop` at `fc69695a`, every finding
below has a fix that is now in the task document.

**Critical Issues:** 1 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous `develop-task` run — each open point resolved with the recommended option, recorded below)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run (`/develop-next` → `/develop-task --defaults`): no human present, so no
`AskUserQuestion` call was made. Each open point took the recommended option:

- **QP1 — scope of the review-epic field split.** The chokepoint scan finds a live defect the task did
  not name (I2). Decision: **in scope** — the task already says every remaining site is moved to
  `doc-id.js` or allowlisted, and this one is a real bug, so it is moved, not allowlisted.
- **QP2 — corpus floor shape.** The engine returns a total, not per-kind counts. Decision: **floor on
  `documents` and `reason`**, not an engine change (engine changes are out of scope, §4).
- **QP3 — `docs/development/epic-registry.md`.** Already a retirement pointer written by task.203's
  migration; it stays as is. No decision needed beyond recording it.

---

## Pre-pass

- **Agent B (architecture):** `aligned`; axes checked (source `architecture`): What this repo produces,
  SKILL.md authoring, File naming, Cross-skill resources, Registries, Validation before commit, Do not.
  One low note: `coding-standards.md` § Registries still reads "adopt in tasks 204/206" — folded into
  the sweep (O3).
- **Agent C (codebase):** `not-implemented`. Neither test exists; `checkCorpus` exists at
  `shared/resources/doc-id.js:946`; `AGENTS.md:166` still carries `## Epic Registry`; the sweep
  population is 50 files. No engine call-site enumeration, so no `population_diff`.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking and References are present. OKF `type: task`
and `description` present. No placeholders. Sign-off not configured (check skipped). Change Log present
and current for `planned`. Card preflight: 3 blocks resolve. `doc-links.js`: 3 relative links resolve.
Issue #650 is OPEN and linked in the body.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1

### Critical

- **C1 — the corpus test's engine API does not exist (check 11).** The plan's Phase 1 code calls
  `checkCorpus({ root })` and reads `r.counts.prd / .epic / .story`. The real signature is
  `checkCorpus(prdRoot, ctx)` (`doc-id.js:946`), returning `{ reason, findings, documents, unreadable }`
  — no per-kind counts. Written as planned, `r.counts` is `undefined` and the floor assertion throws.
  - **Evidence:** `command node -e 'const d=require("./shared/resources/doc-id.js");const r=d.checkCorpus("docs/prd");console.log(r.reason,r.documents,r.findings.length)'` → `ok 22 0`.
  - **Fix (applied):** floor on `reason === "ok"` and `documents >= 22` (1 PRD + 4 epics + 17 stories);
    `root-missing`, `empty` and `unreadable` fail. Findings are `{ reason, path, detail }`.

### Important

- **I1 — the chokepoint key matches comments (check 13).** A raw-line match on the compound key hits
  three non-parsers: `shared/resources/finalise-fix-and-recheck.mjs:79` (a JSDoc comment quoting the
  old regex), `shared/resources/tests/finalise-fix-and-recheck.test.mjs:726` (comment) and `:847`
  (a string's trailing comment). These are exactly the "cries wolf" hits §10's high risk names.
  **Fix (applied):** the code shapes match regex **literals** only — strip `//` and `/* */` comment text
  and string contents before matching — and the MUST_MISS controls gain a comment quoting
  `story\.\d+\.\d+`.
- **I2 — the site list is stale, and the scan finds a live defect (check 20).** Measured with the
  command now recorded in §3, the remaining hits are: `skills/sync-jira-story/scripts/sync-jira-story.js:198`
  and `:807`; `shared/resources/tests/generate-prd-epic-index.test.mjs:58`; title regexes at
  `skills/develop-next/scripts/select-next.mjs:343` and `sync-jira-story.js:253-254`; and in executable
  Markdown, the **review-epic block** at `shared/resources/review-pipeline-step-0a-branch-setup.md:111-112`.
  That block runs `awk -F. '{print $2}'` on `EPIC_BASENAME`, which for `epic.1.42.payments` reads the
  PRD number (`1`), and the auto-skip at `:163` (`feature/epic.${EPIC_NUM}.*`) then matches every
  PRD-1 epic branch — the same defect task.206 fixed for stories. `bug-doc.js:51`, `create-story/scripts/lib.js`,
  `uat-status.mjs`, `continuation.mjs`, `finalise-fix-and-recheck.mjs:69/:122`,
  `generate-prd-epic-index.mjs:135`, `jira-create-epic.js` and `sync-jira-epic.js` no longer hit.
  **Fix (applied):** §3 and §7 list the measured sites; the review-epic block moves onto `doc-id.js`.
- **I3 — a removed literal is pinned by an allowlist (check 15).** `tests/epic-numbering-retirement.test.js:49`
  allowlists `shared/resources/open-knowledge-format.md` with reason "task.207 — prose sweep", and its
  stale-entry test (`:92`) **fails** once that file stops naming `epic-registry.md`. **Fix (applied):**
  the entry is removed in the same commit as the sweep edit; listed in §7.
- **I4 — the review-epic fix must be executed by a test (step 6 check 4, obs #258).** A chokepoint
  test only proves the `awk` is gone, not that the new block derives `P`/`E` correctly. **Fix
  (applied):** the rewritten block is extracted and run against a fixture (the pattern
  `epic-numbering-retirement.test.js` § 2 already uses), asserting `EPIC_NUM`, `EPIC_SLUG` and the
  auto-skip pattern for `epic.1.42.payments`.
- **I5 — the duplicate-id mutation case (check 11).** Copying a whole epic directory duplicates its
  stories too (28 documents, not 23). It still yields `duplicate-id`, but the case reads as more than it
  tests. **Fix (applied):** copy the epic document alone into a sibling directory.
  - **Evidence (all three cases run against temp copies):** flat story dir → `bad-shape`; missing
    `prd_number` → `frontmatter-mismatch`; duplicate `(P, E)` → `duplicate-id`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

Phases are ordered, files named, risks rated. The chokepoint population derives from `git ls-files`
(470 code files today, floor 400 holds). Both new files are reached by `npm test`'s existing
`tests/*.test.js` and `evals/shared/tests/*.test.mjs` globs (check 18).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

- **I6 — a wall-clock criterion with no command (step 6 check 4, obs #206/#268).** "Both new tests
  together add < 2 s to `npm test` on CI" is a bound no per-PR test asserts, so it needs a measured
  bound. **Fix (applied):** the criterion names the command (`uptime; time command node --test …`),
  run on the PR head and recorded in the implementation report.
- **I7 — the sweep-population figures are stale (check 7).** Re-measured: 19 `SKILL.md`, 11
  `shared/resources/*.md`, 20 `docs/**` (was 25/12/22). Literal-id grep: 25/4/3 files, including
  deliberate negative examples such as `skills/create-epic/SKILL.md:93` ("❌ Wrong: `epic.3.auto-hide`").
  **Fix (applied):** figures updated with date and commit; negative examples are named as unaffected.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The chokepoint test is a new refuse-by-default guard, not an exemption to one, so no differential
oracle is required. Rollback is per-file and independent.

---

## Summary of Recommendations

### Must Fix (Critical) - 1

1. C1 — correct the corpus test's `checkCorpus` call and floor. ✅

### Should Fix (Important) - 7

1. I1 — regex-literal-only matching; comment control. ✅
2. I2 — measured site list; review-epic block moved to `doc-id.js`. ✅
3. I3 — drop the `open-knowledge-format.md` retirement allowlist entry with the sweep. ✅
4. I4 — execute the rewritten review-epic block in a test. ✅
5. I5 — duplicate case copies the epic document alone. ✅
6. I6 — measured bound for the < 2 s criterion. ✅
7. I7 — re-measured population; negative examples unaffected. ✅

### Consider (Optional) - 3

1. O1 — `select-next.mjs:343` parses roadmap prose (`Epic 1.2`), a different grammar from a document
   id; allowlist it with that reason rather than force it through `doc-id.js`.
2. O2 — `generate-prd-epic-index.test.mjs:58` is a test hand-rolling `prd\.(\d+)`; route it through
   `doc-id.parse` (the task's own "test files are in scope" rule).
3. O3 — `docs/architecture/concepts/coding-standards.md` § Registries says "adopt in tasks 204/206";
   refresh it in the sweep.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (one wrong API, fixed)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The one critical defect is a wrong API in a plan sketch, corrected against the
real engine and proven by running all three mutation cases; the rest are measured corrections.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous develop-task Step 2)
- **Review Date:** 2026-10-16
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.207.doc-numbering-enforcement-and-sweep/task.207.doc-numbering-enforcement-and-sweep.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md
- **Review Duration:** ~25 min
