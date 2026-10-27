# Task Review Report: Task 237 - Apply 5c doc-only findings on APPROVE

**Reviewed:** 2026-10-27
**reviewed_blob:** 29083e335a34c5896fa8c27ffc759b95d7f93183
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented (3 important, 3 optional) — 2026-10-27. Task promoted to `ready-for-development`.

---

## Executive Summary

The task is accurate. Every line anchor resolves, the classify and stage blocks really are
verdict-agnostic, and the motivating case (`CHANGELOG.md` on task.179) is classified doc-only under
this repository's `ci.docsOnly.patterns`. Two gaps: the guard pins only the verdict row, while the
sentence that actually left `CARRY_FIXED` empty on `APPROVE` is carry prose the test does not read;
and the restatement grep misses `skills/review-pr/SKILL.md:1072`.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 2 questions asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** NEEDS REVISION (minor — all fixes are document edits, no open design question)

---

## User Decisions & Clarifications

### Question Point 2: Technical & Implementation

**Q1: Is `skills/review-pr/SKILL.md:1072` in scope?**
- **User Decision**: In scope.
- **Impact**: Widen the second population grep to `skills/*/SKILL.md`; add the site to § 3's table,
  Phase 2, the Files Summary and Progress Tracking. The plan no longer defers the call to the implementer.

**Q2: Should the guard cover the carry prose as well as the verdict row?**
- **User Decision**: Pin all three.
- **Impact**: The parity test also asserts that the Carry section says "Classify on `APPROVE` or
  `CONCERNS`" and that no sentence pairs `APPROVE` with an empty `CARRY_FIXED`. Each assertion is
  mutation-proved. § 8 and § 10's claim that the row is the only place the rule lives is corrected.

(Question Points 1 and 3 had nothing to ask: no template gaps, and no risk or completeness gap that
needed a decision.)

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 mandatory sections present; no placeholders. OKF: `type: task`, `description` present.
- Stakeholder sign-off: not enabled in `skills-config.yaml` — not checked.
- Change Log: present, one row, status `planned` — current.
- Tracker: `github_issue: 765` resolves to an OPEN issue titled `[Task 237] …`; body link matches.
- Card preflight: exit 0, 3 card blocks resolve (Summary +4 more, Success Criteria +6 more,
  Breaking Changes +3 more — information, not a defect).
- Relative links (`doc-links.js`): task doc and plan, 1 each, both resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE — 0 hallucinations

Verified:

- Every `develop-pipeline-step-5-6-qa-loop.md` anchor (`:1463`, `:1464`, `:1473`, `:1485`, `:1496`,
  `:1511`–`:1595`, `:1602`–`:1603`, `:1605`–`:1650`, `:1652`) resolves to the text quoted.
  `develop-pipeline-step-7-finalise.md:147`, `skills/finalise/SKILL.md:1491`,
  `skills/develop-task/SKILL.md:239`, `skills/develop-story/SKILL.md:252`,
  `skills/review-pr/SKILL.md:703` and `task.173…md:5` likewise.
- **Outcome reachability (check 10).** The motivating finding was on `CHANGELOG.md`. Run against
  this repository's config: `readConfig` → `patterns: ["docs/**","CHANGELOG.md"]`, and
  `isDocsPath("CHANGELOG.md")` → `true`. The consumer default `**/*.md` also matches. So the
  task.179 case would have been fixed under the new rule.
- **Removed-literal sweep (check 15).** Searched `*.test.*`, `evals/**` and `tests/**` for each
  literal the plan removes (`Classify on`, `leave \`CARRY_FIXED\` empty`, `doc-only CONCERNS`,
  `records findings`, `exits to Step 7`, `carry the review into the acceptance commit (below)`).
  The only hit is the assertion *message* at `pr-review-loop-parity.test.mjs:769`, which reads the
  QA-loop doc's `**Do not block.**`, not a SKILL.md, so nothing breaks. The plan does not record
  this search (finding I-3).
- Pre-pass agents B and C were **not dispatched**; both passes were done inline, so the review has
  no independent second read. Architecture alignment: prose-and-test change inside
  `shared/resources/`, edited at source and bundled — aligned. Codebase: the `APPROVE` row still
  lacks the clause — not implemented.

### Important

- **I-1. The guard misses where the rule actually lives.** § 8 and § 10 say the parity test "pins
  the one place the rule lives". It does not: the rule is also at `:1496` ("Classify on
  `CONCERNS`") and `:1602` ("On `APPROVE` … leave `CARRY_FIXED` empty"). The `:1602` sentence is
  the instruction the orchestrator obeyed on task.179. Reverting either sentence leaves the planned
  test green. *Per Q2*: add two assertions on the Carry section and mutation-prove each.
- **I-2. The site list's grep is narrower than the site set (check 20).**
  `grep -n '…' skills/develop-*/SKILL.md` misses `skills/review-pr/SKILL.md:1072`, which states
  the orchestrator's action on each verdict. *Per Q1*: widen to `skills/*/SKILL.md` and add the
  site.
- **I-3. No removed-literal search in the plan (check 15).** Record the search and its result
  (0 test pins at review time) in Phase 2 so the implementer re-runs it.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are concrete, with before/after text for each edit and the exact test body.

### Optional

- **O-1.** The planned develop SKILL.md sentence says doc-only findings "are fixed". They are fixed
  only when the carry's eligibility test clears them (one tracked, clean file; not a report). Say
  "fixed when the carry clears them".

---

## 4. Consistency & Completeness

**Status:** MINOR ISSUES

- **O-2.** Progress Tracking says "Five sites"; § 3's table has seven rows across five files.
  Becomes six files with review-pr. Name the files instead of counting.
- **O-3.** Success criterion "No new pipeline step and no new commit" names no test. It is held by
  `acceptance-commit-carries-5c.test.mjs` (the stage block's HEAD-unmoved HALT). Name it.

Success-criterion classification (finalise kinds): criterion 1 is a behaviour criterion with a named
test; 2–4 are documentation criteria; the bundle, validate and CI criteria are command-held. None
can only be met after merge.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The one Medium risk (a bad doc edit after QA stops looking) is mitigated by the existing stage
block (link-check, restore to `HEAD`) and `/finalise`'s docs agent. Rollback is a `git revert` and
re-bundle. No guard exemption is widened.

---

## Summary of Recommendations

### Should Fix (Important) - 3

1. Extend the parity test to pin `:1496` and `:1602` as well as the row; mutation-prove each; fix
   § 8 and § 10's "one place" claim (I-1, per Q2).
2. Widen the population grep to `skills/*/SKILL.md`; add `skills/review-pr/SKILL.md:1072` as a
   restatement site everywhere sites are listed (I-2, per Q1).
3. Add the removed-literal test search to Phase 2 with its review-time result (I-3).

### Consider (Optional) - 3

1. "fixed when the carry clears them" in the SKILL.md wording (O-1).
2. Name files, not a count, in Progress Tracking (O-2).
3. Name `acceptance-commit-carries-5c.test.mjs` on the no-new-commit criterion (O-3).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Justification:** No critical issues and no open design question. The three Important fixes are
document edits the user has already decided.

---

## Review Metadata

- **Reviewer:** Claude (review-task)
- **Review Date:** 2026-10-27
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.237.carry-doc-only-findings-on-approve/task.237.carry-doc-only-findings-on-approve.md`
- **Sources consulted:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
  `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md`,
  `skills/develop-{task,story}/SKILL.md`, `skills/review-pr/SKILL.md`,
  `evals/shared/tests/pr-review-loop-parity.test.mjs`, `shared/resources/ci-tree-equivalence.js`,
  `skills-config.yaml`
