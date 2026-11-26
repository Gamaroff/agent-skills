# Task Review Report: Task 325 - The docs-only CI rule can exclude a path

**Reviewed:** 2026-11-26
**reviewed_blob:** b4a7d3c9013154bb6c6d8dae8e7d229e48ad7dd0
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-11-26

---

## Executive Summary

A small, well-scoped task: one predicate change, one configuration refusal, tests and docs. The plan's
predicate was run on every row of § 3's table and gives the stated answers. One clarification in § 3 was
false (a path named `!x.md` is documentation today, not code) and one rule was ambiguous (an empty list
reads as "a list with no inclusion"); both are fixed in the document.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 1 ⚠️ (fixed)
**Optional Improvements:** 3 💡 (applied)

**User Clarifications:** 0 questions asked (autonomous `develop-task` pipeline run; no question needed a human decision)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The review ran as Step 2 of an autonomous `/develop-task --defaults` run. Every finding
had a single correct fix grounded in a command's output, so no decision was taken for the author.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present. OKF `type: task` and
  `description` present. No placeholders.
- Sign-off: `sign-off.enabled` not set — not checked.
- Change Log present; status `planned` with an `Initial draft` row is current (check 4b).
- Tracker: `github_issue: 947` exists (OPEN); body link `[#947]` matches.
- Card preflight (`sync-jira-task.js --check-card`): exit 0, 3 card blocks resolve. `+N more`: Summary 4,
  Success Criteria 2, Breaking Changes 4 (information, not a defect).
- `doc-links.js`: 5 relative links resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Pre-pass B (architecture, `prepass-axes.js` source `architecture`): `drift`, three low findings, axes
checked: What this repo produces, File naming, Status lifecycle, Cross-skill resources, Plan files,
Registries, Validation before commit, Do not. Two are not findings here: `.test.mjs` is the established
suffix under `shared/resources/tests/`, and the predicate's comment names no `shared/resources/` path.
The third (shellcheck on an edited `.test.sh`) is Optional 2 below.

Pre-pass C (codebase): `not-implemented` — `isDocsPath` and the `patterns` check have no `!` handling;
no `!` test exists.

#### Critical (falsified invariant, check 11)

- **§ 3 "A path that itself starts with `!` is code today and stays code" is false.**
  - **Evidence:** `command node -e 'const E=require("./shared/resources/ci-tree-equivalence.js"); console.log(E.isDocsPath("!x.md",["**/*.md","docs/**"]))'` → `true`, at `684b2db38`.
  - **Fix applied:** the clarification now says a path is matched as a name, today and after; only a
    *pattern* starting with `!` changes meaning, and a project that wrote `!x.md` to match a file
    literally so named now excludes `x.md` (Breaking Change 1).

#### Verified (check 11)

The plan's Phase 1 lines, run against the current `isDocsPath` on § 3's rows:

| Patterns | Path | Today | After |
| :-- | :-- | :-- | :-- |
| `docs/**`, `!docs/catalogue.md`, `!docs/guides/**` | `docs/a.md` | true | true |
| same | `docs/catalogue.md` | true | false |
| `!docs/catalogue.md` first | `docs/catalogue.md` | true | false |
| same as row 1 | `docs/guides/x/y.md` | true | false |
| same as row 1 | `src/a.ts` | false | false |
| `!docs/b.md` only | `docs/a.md` | false | false |

All match the task's table.

#### Optional

- **Line anchors drifted** after task 320 landed (`:165`→`:167`, `:674`→`:751`, `:197`→`:199`,
  `:258`→`:260`, `:1140`→`:1217`, `:1374/:1389`→`:1451/:1466`, `finalise-rerun-at-head.js:782`→`:929`).
  Re-measured with `grep -n` and `git grep -nE 'isDocsPath' -- shared/resources`; fixed. The plan
  already warned the numbers would move.

Other checks: check 9 (no new key — `DOCS_ONLY_KEYS` unchanged); check 15 (no literal removed; the
existing usage-error message stays); check 18 (`reenter-qa-after-finalise.test.sh` is listed in
`package.json`); CHANGELOG has `## [Unreleased]` at line 5; `qa-diminishing-returns.js` imports
`matchesAnyGlob` from `glob-match.js` (line 114), which confirms the negation belongs in `isDocsPath`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases, each with files, changes and dependencies; the plan file gives the exact predicate lines.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **"A list with no inclusion is a usage error" contradicted "An empty list keeps its present answer".**
  The plan says "throw when every entry starts with `!`", and `[].every(...)` is `true`, so read
  literally the refusal would also reject `patterns: []`.
  - **Fix applied:** § 3 and Breaking Change 2 now say a **non-empty** list whose every entry is an
    exclusion, and a bare `!`; § 8 gains a `patterns: []` → unchanged row, which holds the length test.

#### Optional

- § 8's `qa.testArtifactGlobs` row said a `!` entry "matches nothing"; it matches a path literally
  named with the `!` (`matchesAnyGlob("!a", ["!a"])` → `true`). Reworded as "unchanged".

Success criteria: each names its record (QA report for mutations) or a runnable command; none can be
met only after merge.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low risk; the change only makes the rule wait more. Rollback is a revert plus re-bundle.

#### Optional

- **shellcheck** (Pre-pass B): the task edits `reenter-qa-after-finalise.test.sh`; `npm run lint:shell`
  added to § 8's commands.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue
1. Correct the `!`-path clarification — ✅ applied.

### Should Fix (Important) - 1 issue
1. Define the usage error as non-empty and add the empty-list row — ✅ applied.

### Consider (Optional) - 3 items
1. Refresh line anchors — ✅ applied.
2. Add `npm run lint:shell` — ✅ applied.
3. Reword the `qa.testArtifactGlobs` row — ✅ applied.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (one falsified clarification, fixed)
- Implementation Clarity: 9/10
- Consistency: 7/10 (empty-list ambiguity, fixed)
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Both defects were in prose beside the plan, not in the plan; the predicate was run and
gives the stated results, and with the fixes applied nothing is left open.

---

## Next Steps

Task is ready for implementation. Follow the three phases; write each § 8 case red first.

---

## Review Metadata

- **Reviewer:** review-task (Claude, develop-task Step 2)
- **Review Date:** 2026-11-26
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md
- **Architecture Docs Consulted:** via Pre-pass B (docs/architecture/concepts/)
- **Review Duration:** (not measured)
