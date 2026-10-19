# Task Review Report: Task 204 - Numbered PRDs in the PRD skills

**Reviewed:** 2026-10-15
**reviewed_blob:** 07ae566ac1b12106acd4eb15da0350dce75a9d55
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-10-15

---

## Executive Summary

The task is well-scoped and every file anchor resolves, but its central mechanism rested on a claim the
shipped engine falsifies: `doc-id next prd` does not bootstrap a missing registry, and the CLI has no
command that writes a registry row. That and seven Important gaps (report name, an unmeetable grep
criterion, a retirement-guard allowlist the change would turn red, the migration payload's blockers,
untested behaviour criteria) were fixed in the task document during this review.

**Critical Issues:** 1 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 asked — autonomous run (develop-task Step 2, invoked by `/develop-next`); each open decision resolved with the recommended option, recorded below
**Implementation Readiness:** 8/10 (after fixes; 5/10 before)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run — no `AskUserQuestion`. Decisions taken with the recommended option:

**D1: How is the PRD registry bootstrapped and a row written, given the CLI does neither?**
- **Decision**: no engine change. `create-prd` writes the row with one `command node -e` call to
  `appendPrdRow` from the bundled `references/doc-id.js` (it bootstraps from `null`). On
  `next prd` → `registry-missing`, `P = 1` only when no `prd.{N}.*` directory exists under
  `${PRD_ROOT}`; otherwise HALT and point at `/review-prd` (migration).
- **Impact**: keeps task.202's engine out of scope, as the task requires; the snippet is testable by the
  slice-the-live-snippet pattern.

**D2: PRD review report name** (task's Author decision 1)
- **Decision**: full stem `prd.{P}.{feature}.review.{n}.{name}.md`, per `docs/standards/file-naming.md:84`
  (task.202's row). The task's own rule was "follow task.202".

**D3: Shard location** (Author decision 2)
- **Decision**: in place, confirmed against task.205's `create-epics-from-shards` (Step 1 reads `index.md`
  from the `prd.{P}.{feature}/` directory, example at its SKILL.md lines 98–104).

**D4: Greenfield `{domain}`** (Author decision 3)
- **Decision**: asked, product slug recommended — the task's stated default, unchanged.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present; OKF `type: task`, `description`,
  `tags` present; no placeholders. Sign-off: not enabled in `skills-config.yaml` (check skipped).
- Change Log present (1.0 Initial draft); a review row and a status row added by this review.
- Tracker linkage: `github_issue: 647`, body link `[#647]` matches; board Priority already P2 Medium.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — 3 card blocks resolve (Summary +4 more,
  Success Criteria +10 more, Breaking Changes +9 more).

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0 (one falsified invariant)

PREPASS_B: `aligned`, axes checked — What this repo produces; SKILL.md authoring; File naming; Status
lifecycle; Cross-skill resources; Platform branching; Plan files; Registries; Validation before commit;
Do not (`prepass-axes.js` source: `architecture`). Low findings: `format:check` missing from the
validation list (O3).

#### Critical

- **C1 — `doc-id next prd` does not bootstrap, and no CLI writes a row (check 11).** The task said
  `next prd --json` "bootstraps the registry when absent" and that the row is "appended in the same
  step". Run on an empty `docs/prd/`:
  `command node shared/resources/doc-id.js next prd --json` → `{"ok":false,"reason":"registry-missing"}`, exit 1.
  The CLI's commands are `parse`, `next prd|epic|story`, `check`, `check --corpus`, `epic-meta`; row
  writing exists only as the library export `appendPrdRow` (which bootstraps from `null`,
  `doc-id.js` `EMPTY_PRD_REGISTRY`). **Fixed** per D1: Phase 1 Step 1c and a new row-write step.

#### Important

- **I1 — Report name disagrees with task.202's row.** `file-naming.md:84` is
  `prd.{P}.{name}.review.{n}.{name}.md` (full stem), not the short id. `doc-id parse` reads both forms as
  kind `prd`, artifact `review`. **Fixed** per D2 throughout (Overview, Motivation, Target Architecture,
  Phase 3, Breaking Change 5.3, test row 7, Success Criteria, Author decisions).
- **I2 — The Functional grep criterion cannot pass as worded (check 20).** Re-running the task's own
  population command returns `.agents/plans/hierarchical-doc-numbering.md:77` and five lines of
  `shared/resources/tests/migrate-doc-numbering.test.mjs` (fixtures for the legacy monolith) besides the
  ten reader sites. **Fixed**: the criterion's command excludes `.agents/plans` and
  `shared/resources/tests`.
- **I3 — Removed literal pinned by a test (check 15).** `tests/epic-numbering-retirement.test.js`
  allowlists `skills/create-prd/SKILL.md` and `skills/review-prd/SKILL.md` ("task.204") for the literal
  `epic-registry.md`, and its second test fails on an allowlisted file that no longer carries one. This
  task removes the literal from both (`create-prd/SKILL.md:516`, `review-prd/SKILL.md:197`, `:819`).
  **Fixed**: Phase 3 drops both ALLOW entries; Files Summary lists the test.
- **I4 — The migration payload, as task.203 ships it (check 21).** `--check` answers `needs-migration`
  *before* it consults `blockers[]` (`migrate-doc-numbering.mjs:1671–1672`), and a monolith
  `docs/prd.md` blocks with `unplaced-prd` unless `--name docs/prd.md=<slug>` is passed (`:425–431`).
  Breaking Change 5.1's precondition **is met** — task.203 discovers the L3 monolith (`:310–322`).
  **Fixed**: review-prd reads `reason`, `blockers[]` and `mapping`, offers apply only with no blockers,
  and asks for the slug of a monolith.

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

- **I5 — Continuation on an unnumbered PRD was unspecified.** Resume / overwrite / Extend / Revise "reuse
  the found PRD's `prd_number`" — a legacy PRD has none, and Step 3.5's check would then halt on the
  skill's own output. **Fixed**: an unnumbered found PRD halts with a pointer at `/review-prd`.
- **I6 — Subtree check mechanism.** `doc-id check <path>` checks one document; `--prd-root <PRD dir>`
  would look for the registry inside the PRD dir and report `registry-missing`. **Fixed**: one
  `doc-id check --corpus --json` over `${PRD_ROOT}`, findings filtered to the PRD directory by path
  prefix — one invocation, satisfying the Performance criterion.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

- **I7 — Behaviour criteria without a planned test (Step 6 check 4).** "Re-running keeps `P`", "all four
  classes Critical" (rows covered two), "applies only on yes and re-checks" (row 6 covered `--check`
  only), and the Performance bound "at most two `command node` calls" (now three — allocate, write row,
  check — and held by no test). **Fixed**: rows 8–11 added; the Performance criterion names the count
  test and the new bound.
- PREPASS_C: `not-implemented` — no allocation, `prd_number` or check in the PRD skills; both engines
  exist; task.202/203 `accepted` (Phase 0 gate passes); `file-naming.md:84` full-stem form (→ I1).
- Test reach (check 18): `evals/shared/tests/*.test.mjs` is in `npm test`'s globs — no runner edit.
- Line anchors: all 32 cited `file:line` anchors were read and resolve. `doc-links.js`: 3 relative links resolve.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Risks and rollback are proportionate; the High risk ("different CLI surface") materialised as C1 and
  is now closed by recording the shipped surface.

#### Optional

- **O1** Target Architecture said "Step 5 completion"; `create-prd`'s last step is *Step 4: Next Steps*. Fixed.
- **O2** Both continuation menus label an option "Start fresh — Create a new PRD"; the incomplete menu's
  overwrites. The complete-menu option is specified as a new, separate PRD. Fixed.
- **O3** Code Quality now names `npm run ci:fast` (`format:check` + `npm test`), which CI runs.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 — fixed
1. C1: specify bootstrap + row write via `appendPrdRow`, HALT on `registry-missing` with numbered PRDs present.

### Should Fix (Important) - 7 — fixed
1. I1 report name full stem. 2. I2 grep exclusions. 3. I3 drop two ALLOW entries. 4. I4 read `blockers[]`, `--name` for a monolith. 5. I5 unnumbered continuation halts. 6. I6 one corpus check filtered by prefix. 7. I7 tests for four criteria.

### Consider (Optional) - 3 — fixed
O1–O3 as above.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (after C1 fix)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ **READY TO IMPLEMENT** — the one falsified claim and the seven gaps are fixed in
the document; what remains is prose-heavy work across ~16 files with a snippet test that executes the
live text.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2, autonomous)
- **Review Date:** 2026-10-15
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.numbered-prds-in-prd-skills.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md (via pre-pass B); docs/standards/file-naming.md
- **Engines run:** `doc-id.js next prd|parse|check --corpus`, `migrate-doc-numbering.mjs --check`, `doc-links.js`, `sync-jira-task.js --check-card`, `prepass-axes.js`
