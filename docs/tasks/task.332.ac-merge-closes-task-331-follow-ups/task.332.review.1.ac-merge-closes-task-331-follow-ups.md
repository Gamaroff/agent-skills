# Task Review Report: Task 332 - The AC merge closes task 331's follow-ups

**Reviewed:** 2026-11-27
**reviewed_blob:** 544d5bf1e4772b947e17b43ba0e2d4c4070a1bb2
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 critical + important recommendations implemented — 2026-11-27

---

## Executive Summary

The task is well grounded. Every line anchor checked resolves to the code it names, and the six
reversed-decision tests are measured, not recalled. One plan gap would have turned an existing test
red: the plan treated "unparseable" as "the parse threw", but the parser returns `{}` for the
existing `result-unparseable` fixture. The task also had no tracker issue. Both are fixed.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️ (both fixed)
**Optional Improvements:** 2 💡

**User Clarifications:** 1 question asked and answered
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

**Q1: Create the missing GitHub issue now?** (tasks 327–331 each carry one)
- **User Decision**: Sync to GitHub.
- **Impact**: Issue #963 created by `ensure-task-github-issue`, added to the board (P2, 8h estimate),
  and written to frontmatter with a body link.

Question Points 2 and 3 raised nothing that needed the user: the one technical gap has a single
correct fix that follows from the code.

---

## 1. Template Structure Compliance

**Status:** PASS (after fix)

- All 11 numbered sections, Change Log, Progress Tracking and References present. No placeholders.
- OKF: `type: task`, `description` and `tags` present.
- Sign-off: not enabled in `skills-config.yaml`, not checked.
- Change Log: present; currency fine at `planned`.
- Card preflight: `sync-jira-task.js --check-card` exit 0 — 3 card blocks resolve (Summary +3 more,
  Success Criteria +3 more, Breaking Changes +9 more).

#### Important
- **No tracker issue** (check 5) — `github_issue` absent. **Fixed**: #963 linked.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (1, fixed)
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment): `aligned`, axes checked: What this repo produces, Cross-skill
resources, File naming, Status lifecycle, Validation before commit, Do not (`prepass-axes.js` source:
`architecture`). One low finding, recorded below as Optional.

Pre-pass C (codebase scan): `not-implemented`. None of `result-document-unnamed`,
`scope-document-missing`, the stem-keyed paths or the exact-path prompt rule exist.

Anchors verified (check 2): `finalise-rerun-scope.js:734` `storyFileOf`, `:751` `sameDocument`,
`:720-727` the misplaced JSDoc, `:1195-1262` the merge branch, `:1037` the `USAGE` line with
`[--doc <document>]`; `skills/finalise/SKILL.md:637`, `:1025`, `:1060`, `:1062` (4 old-path hits,
matching the success criterion's "reads 4"); `finalise-rerun-scope-blocks.test.mjs:305`;
`finalise-dod-ac-prompt.md:122`; the six `"merge",` argv sites at `:1873 :1895 :1982 :2000 :2095
:2303` (`grep -n '"merge",'` → 6); `:2347` "merges as before"; CHANGELOG `[Unreleased]` at line 5.
The extract block already binds and checks `STEM` (`SKILL.md:1018-1022`), so the plan's "bind it if
it does not" branch is not needed.

#### Important
- **`result-document-unnamed` would make `result-unparseable` unreachable for a non-throwing parse**
  (checks 10 and 11). The plan distinguished "unparseable" from "no story_file" only by whether
  `parseYamlSubset` throws. It does not throw on the existing fixture:
  `command node -e 'console.log(JSON.stringify(require("./shared/resources/yaml-subset.js").parseYamlSubset("this is not the YAML you asked for\n")))'`
  → `{}`. `merge()` answers `result-unparseable` for it on its second branch (no `acs` list,
  `finalise-rerun-scope.js:775`). Under the plan as written, `storyFileOf` would read "parsed, no
  story_file" and the new refusal would fire first, so the test at `:1885` would go red.
  **Fixed**: Target Architecture, § 5 and the plan now say the document checks run only on a result
  that parses and has an `ac_traceability.acs` list, which is `merge()`'s own acceptance predicate.
  § 8 gains a row for the case, and § 8 Mutation Tests gains mutation 7.

Removed-literal sweep (check 15), one search per item:

| Literal removed or rewritten | Test hits |
| :-- | :-- |
| `finalise-rerun-scope-${DOD_N}` / `finalise-rerun-scope-1.json` | 1 — `finalise-rerun-scope-blocks.test.mjs:305` (named in the plan) |
| `finalise-ac-extract-${DOD_N}` | 0 |
| "another item's Step 3a overwrote this run's scope" (the `scope-document-mismatch` remedy) | 0 |
| "merges as before" | 2 — `finalise-rerun-scope.test.mjs:2280` (comment), `:2347` (named) |
| `[--doc <document>]` (USAGE) | 0 |

Pattern pins by file name: `finalise-rerun-scope-blocks.test.mjs` finds its blocks by the needles
`finalise-rerun-scope.js scope` and `finalise-rerun-scope.js merge`, which the plan keeps.

Checks 18, 25, 28: no new test file, class member or temp-directory helper is planned (the
symlink test reuses `mergeDocCase`, which already cleans up).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

The four phases have explicit files, ordered checks with messages, and dependencies.
`estimated_effort_hours: 8` is in the rubric's range for 4 phases with 13 criteria at low risk.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Every success criterion is classifiable: § 8 rows are behaviour criteria held by named tests, the
  `git grep -c` line is a documentation/re-run criterion, the mutation record names the QA report,
  and `test:remote` / `bundle:check` are CI-state criteria. The performance criterion is an explicit
  "not applicable".
- The task is one coherent change set (G3-1 changes what G3-2 splits), so no split is recommended.

#### Optional
- **Validation before commit** (Pre-pass B, low): `skills/finalise/SKILL.md` changes, but no
  criterion names `quick_validate.py skills/finalise`. `ci:fast` runs the validator, so this is
  covered by `npm run test:remote`. Not changed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The resume-across-upgrade risk is named and mitigated through the CHANGELOG. Check 19 (resume
states): the plan's CHANGELOG sentence lists four resume points (before 3c, between 3c and 3d, after
3d, a pre-upgrade `result-unparseable` answer) and tells the developer to read Step 3d before writing
it. The refusals are a tightening, not an exemption, so no differential oracle is needed.

#### Optional
- **Rollback for S1 only** is described as a partial revert. Fine as stated.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues (both fixed)

1. Run the document checks only on a result with an `acs` list, and keep the `:1885` fixture as the
   regression case. ✅ Applied.
2. Link a GitHub issue. ✅ #963.

### Consider (Optional) - 2 items

1. Name `quick_validate.py skills/finalise` in Code Quality (covered by `ci:fast` today).
2. None further.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (one reachability gap, fixed)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The only gap that would have broken an existing test is fixed in the document,
and every other claim was checked against the code.

---

## Next Steps

Follow Phases 1–4 in order. Write each § 8 row as a failing test first, and record each mutation's
red test in the QA report.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, autonomous)
- **Review Date:** 2026-11-27
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.332.ac-merge-closes-task-331-follow-ups/task.332.ac-merge-closes-task-331-follow-ups.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via Pre-pass B)
- **Review Duration:** (not measured)
