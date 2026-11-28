# Task Review Report: Task 321 - finalise's diff fallback is one commit, and its gap body leaks a marker

**Reviewed:** 2026-11-28
**reviewed_blob:** 6a65cd72f00f0ebde8ee89bc34996a5b5926ffde
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-11-28

---

## Executive Summary

The task is accurate: every named file, anchor and contract exists, and its core claims were already run on PR #937. Three gaps would have cost a QA cycle or a finalise halt: two prompts were told to return a status word their contracts do not have, the bug-mode bundled-copy check reads copies the new patch excludes, and eleven tests that pin the touched documents by pattern were not listed.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous run inside `/develop-task`; each fix follows from the code, none needed a decision)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The review ran inside `/develop-next` → `/develop-task` with `--defaults`. Each finding below has one fix the code dictates.

---

## Pre-pass

- **Agent B (architecture):** `aligned`. `axes_checked`: What this repo produces, SKILL.md authoring, File naming, Status lifecycle, Cross-skill resources, Platform branching, Plan files, Registries, Validation before commit, Do not. `prepass-axes.js` source: `architecture`. Four low notes (zsh support, test location, a task-defined exit contract); none raised to a finding.
- **Agent C (codebase):** `not-implemented`. `finalise-diff.sh` and `**PR diff:**` do not exist; `SKILL.md:531` still falls back to `git diff HEAD~1 HEAD`; `dod-gap-count.sh:83` closes only at `## `; Step 3e's `rm -f "$DIFF_FILE"` moved from `:1281` to `:1345`.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Progress Tracking, References and Notes are present. Frontmatter carries `type: task`, `description`, `tags`, `github_issue: 941`; the body links `[#941]`. Change Log present and current for `planned`. Card preflight: 3 card blocks resolve, no findings. `doc-links.js`: 4 relative links resolve. Sign-off not enabled.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Verified: `skills/finalise/SKILL.md:529-531` (the diff block); the three prompts' `<DIFF_FILE>` lines (`ac:56`, `:61`, `docs:59`, `fix-evidence:49`); `pr-read.sh` sets `PR_READ_BASE` / `PR_READ_HEAD`; `change-log.js` exports `CL_START` and `LEGACY_MARKER_PAIRS` (`:1218-1222`); the running summary's Step 2 block holds the `**PR:**` line (`SKILL.md:543`), so the `**PR diff:**` line has a home. Test reach: `shared/resources/tests/*.test.mjs` is in `test:suite` (check 18). `lint:shell` covers every tracked `*.sh` outside `skills/*/references/`, so the new script is shellchecked with no runner edit (check 25). The plan's temp repositories are removed in `t.after` (check 28).

#### Important

- **I1 — A status word the prompts do not have (check 21).** The plan says an empty `<DIFF_FILE>` "is reported as `NEEDS_MANUAL_REVIEW`" in the docs and fix-evidence prompts. Neither contract has that token: `finalise-dod-docs-prompt.md:82-96` allows `PASS | FAIL | NOT_APPLICABLE`, `finalise-dod-fix-evidence-prompt.md:106-127` the same (`grep -rn NEEDS_MANUAL_REVIEW shared/resources/finalise-dod-*-prompt.md` → 0 hits). A token the reader does not parse arrives at Step 3d as an unknown status.
  - **Fix:** each prompt uses its own vocabulary: a check that needs the diff, on an empty `<DIFF_FILE>`, is `FAIL` with the note "the change could not be read". `NOT_APPLICABLE` is wrong: it reads as nothing to check.

- **I2 — The bug-mode bundled-copy check reads the copies the new patch drops.** `finalise-dod-fix-evidence-prompt.md:68-69` check 5 confirms "the bundled `skills/*/references/` copies are in the same diff". After this task the patch excludes exactly those copies, so every bug fix that touches `shared/resources/` would fail check 5 unless it falls back to `bundle:check`. The task's Phase 2 gave that prompt only the empty-diff sentence.
  - **Fix:** Phase 2 points check 5 at `<DIFF_FILE>.names` (where the copies stay), and the Testing table gains the row.

#### Optional

- **O1 — Drifted anchor.** § 3 cites Step 3e at `:1281`; it is at `skills/finalise/SKILL.md:1345`.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Important

- **I3 — Tests that pin the touched documents by pattern are unlisted (check 15, obs #144).** The Files Summary names two tests. A search by file name finds eleven more that read `finalise/SKILL.md`, the three prompts or `dod-gap-count.sh`:

  ```
  git grep -ln 'finalise-dod-ac-prompt\|finalise-dod-docs-prompt\|finalise-dod-fix-evidence-prompt\|dod-gap-count' -- '*.test.*'
  ```

  `evals/shared/tests/finalise-bug-mode.test.mjs`, `finalise-publish-boundary.test.mjs`, `finalise-rerun-scope-blocks.test.mjs`, `qa-measured-figure-parity.test.mjs`; `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `qa-finalise-rules-wiring.test.mjs`, `resolve-pr-number.test.mjs`, `zsh-flag-expansion-guard.test.mjs`; `tests/explore-prompts-no-write.test.js`, `review-plan-shape-checks.test.js`, `review-task-measured-criterion.test.js`. The literal search (`HEAD~1 HEAD`, `gh pr diff`, `pr-diff-`) finds one hit, `skills/review-pr/tests/review-pr.test.js:409`, which pins `review-pr` Step 4 and is not touched. Two pins matter most: `finalise-rerun-scope-blocks.test.mjs` asserts that exactly one bash fence contains each of its needles, so the new Step 3a fence must not contain `finalise-rerun-scope.js scope`; and `explore-prompts-no-write.test.js` refuses a write redirect in an Explore prompt, so the names list is read with `tr '\0' '\n' < …`, never written.
  - **Fix:** list them in § 7 as "read before editing" with these two constraints.

#### Optional

- **O2 — A success criterion names no test.** "The AC prompt fails a criterion over a set when the names list is empty" is held by `finalise-dod-prompt-contract.test.mjs` (Files Summary item 9), but the criterion does not say so. Name it.

Effort: `estimated_effort_hours: 8` is within 2× of the rubric for 4 phases, 12 criteria, low risk.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Overview, phases, Files Summary and Testing Strategy agree. Every criterion fits a finalise kind: the § 8 rows are behaviour criteria held by `finalise-diff.test.mjs` / `finalise-gaps-path.test.mjs`; the mutation criterion names its record (the QA report); `npm run test:remote` is a CI-equivalent run; the CHANGELOG line is a documentation criterion. No criterion waits on the merge. Four phases, one module family; no split needed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The two medium risks (stale base, excluding a real change) have mitigations the script itself carries (fetch first; names list keeps every path). Rollback separates Phase 3 from Phases 1–2. No guard is widened, so no differential oracle is needed.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 3 issues

1. I1 — use each prompt's own status vocabulary (`FAIL`, note "the change could not be read").
2. I2 — fix-evidence check 5 reads copies from `<DIFF_FILE>.names`; add the test row.
3. I3 — list the eleven pattern-pinning tests and the two constraints.

### Consider (Optional) - 2 items

1. O1 — `:1281` → `:1345`.
2. O2 — name the test in the AC-prompt criterion.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no critical issues; the three important ones are one-line plan fixes, applied below.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous within `/develop-task`)
- **Review Date:** 2026-11-28
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.321.finalise-diff-and-gap-body/task.321.finalise-diff-and-gap-body.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `coding-standards.md` (via pre-pass B)
