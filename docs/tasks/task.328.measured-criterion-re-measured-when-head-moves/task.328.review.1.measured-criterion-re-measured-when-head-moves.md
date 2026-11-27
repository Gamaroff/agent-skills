# Task Review Report: Task 328 - A measured criterion is re-measured when the head moves

**Reviewed:** 2026-11-27
**reviewed_blob:** b758aeae1a539dc8a1a8874fc54bb31d5f886a62
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 critical + important recommendations implemented — 2026-11-27

---

## Executive Summary

The task is well grounded: every anchor checked resolves, the planned regex does what the plan says, and
both replay commands reproduce the task 320 facts. Two Important gaps were fixed in the document: two
further tests that pin the engine were unnamed, and the planned parity test would have keyed on a
citation that already appears twice in each QA skill.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous develop-task run; no question needed user input)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The run is autonomous (`/develop-next` → `/develop-task --defaults`), and no finding
needed a choice the document could not settle: both fixes are additions to the testing strategy.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter carries `type: task`, `description`, `tags`.
- `github_issue: 953`, body link `[#953](…/issues/953)` matches.
- Card preflight: `No problems found. 3 card blocks resolve`.
- `doc-links.js`: 3 relative links resolve.
- Change Log present and current (a review row is added by this review). Sign-off not enabled.

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Pre-pass agents B and C were not dispatched; both passes were done inline (independence loss recorded).
Architecture alignment: the change stays inside `shared/resources/` engines, skill prose and tests, per
`docs/architecture/concepts/source-tree.md`.

Verified at `c937ce621`:

- `RECORD_WORDS` `finalise-record-preflight.js:46`, `NUMERIC_BOUND` `:54-55`, `isRecordCriterion` `:97`,
  `classify` `:114`, `listed.push` `:128` and `:154`, `check` `:165` — all resolve.
- Header comment at `:17-18` reads `{ criterion, location, state, artifacts }` — resolves.
- `qa-task/SKILL.md:50` (`record_criteria`), `:1089` and `qa-story/SKILL.md:1624` hold the
  measured-criterion parenthesis — resolve.
- `finalise-dod-ac-prompt.md:82` holds the wall-clock rule with `finalise-delta.js docs-only` — resolves.
- `develop-pipeline-step-5-6-qa-loop.md:304` and `:332` — resolve.
- **Check 11 (invariant, run):** the planned alternation added to today's `NUMERIC_BOUND` gives
  `true` for "no test that waits longer than 30 s", "faster than 2 s", "no larger than 200 KB",
  "a heading longer than 80 characters is refused", "greater than 5", and `false` for "the new message
  is longer than the old one" (`command node -e` over the regex, 2026-11-27).
- **Check 31 (plan's own commands, run):** `finalise-record-preflight.js check --doc <task 320>` →
  `listed: [{index: 11, state: ok}]` (criterion 10 absent, as the task says);
  `finalise-delta.js docs-only --base 7cae65a14 --head 5c9044f38` → `code-changed`.
- **Check 18 (runner reach):** `evals/shared/tests/*.test.mjs` and `shared/resources/tests/*.test.mjs`
  are globbed by `package.json` `test:suite`.
- **Check 12:** no compatibility handling; not applicable. **Check 14:** no engine call-site list; not
  applicable.

### Important

- **Check 15/25 — two tests that pin the engine were unnamed.**
  `git grep -ln 'finalise-record-preflight' -- '*.test.*' 'tests/**' 'evals/**'` also lists
  `shared/resources/tests/record-criteria-dispatch.test.mjs` and
  `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`. Read: the first compares the saved listing
  with the engine's own output and asserts `listed.length === 1` on a fixture with no bound phrase; the
  second pins only the call's position. Neither pins the key set, so the change keeps both green — but the
  plan should say so. **Fixed:** named in §8.
- **Check 13 — the parity test's key is shared.** "`finalise-dod-ac-prompt.md` Step 3" already appears
  at `qa-task/SKILL.md:1084`, `:1106` and `qa-story/SKILL.md:1619`, `:1641`. A test keyed on the
  citation stays green when the new sentence loses it. **Fixed:** §8 and plan Phase 2 step 5 now locate
  the paragraph by its own marker (`finalise-delta.js docs-only` + "re-measure") and require a file
  without the paragraph to fail.

### Optional

- **Cite form.** The AC prompt is cited in both QA skills by bare filename ("in the `finalise` skill"),
  which is a citation, not a bundling dependency; only `references/finalise-delta.js` should be written as
  a dependency. Stated in §8 so the bundle closure stays at `finalise-delta.js` + `ci-tree-equivalence.js`.

## 3. Implementation Plan Completeness

**Status:** COMPLETE — three phases, each with files, steps, and the red-first and mutation records named.
Effort 8h is consistent with the rubric (9 criteria, ~12 plan steps, low risk).

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Every success criterion classifies under finalise Step 3: the engine criteria are behaviour criteria
  with planned unit tests; the QA-prose criterion is held by the parity test; the corpus, red-run and
  mutation criteria name the QA report as their record (check 22); CHANGELOG is a documentation criterion.
- Controls (obs #176) are present: a non-timing bound, a size bound, a no-number comparison, a
  no-bound record criterion.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE — risks are low and mitigated by the controls, corpus count and parity test;
rollback is per phase.

---

## Summary of Recommendations

### Should Fix (Important) - 2 issues — both applied

1. Name `record-criteria-dispatch.test.mjs` and `finalise-rerun-scope-blocks.test.mjs` in §8.
2. Key the parity test on the measured-figure paragraph, and fail when it is absent.

### Consider (Optional) - 1 item — applied

1. State the cite form so the AC prompt is not pulled into the QA skills' bundle.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the two Important gaps were additions to the testing strategy
and are applied.

---

## Review Metadata

- **Reviewer:** review-task (Claude, develop-task pipeline Step 2)
- **Review Date:** 2026-11-27
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.328.measured-criterion-re-measured-when-head-moves/task.328.measured-criterion-re-measured-when-head-moves.md
- **Architecture Docs Consulted:** docs/architecture/concepts/source-tree.md, coding-standards.md
- **Pre-pass:** Agents B and C not dispatched; passes performed inline (independence loss)
