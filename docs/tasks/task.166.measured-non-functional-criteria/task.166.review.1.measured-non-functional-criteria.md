# Task Review Report: Task 166 - Give measured non-functional criteria a defined path through review and finalise

**Reviewed:** 2026-10-02
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-10-02

---

## Executive Summary

The task is well scoped, its anchors resolve, and its own success criteria already satisfy the rules it adds. One real gap: the AC prompt restates the kind count a second time (the Execution rule, line 95), which neither the task nor the plan touches, so the change would leave the prompt saying "three" in one place and "two" in another. The plan's review-task pin and mutation table also lag the task after observation #222 was folded in.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — pipeline autonomous mode (develop-task Step 2 via develop-next); every decision taken from the codebase and the task's own content, recorded below.
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions asked. Autonomous answers, per the pipeline directive:

- **Output format**: Comprehensive report (auto).
- **Step 8.5**: Yes, apply all critical + important fixes (auto).
- **Step 9**: Yes, fixes complete → promote to Ready for Development (auto, outcome READY TO IMPLEMENT).
- **Tracker sync prompt**: not reached — `github_issue: 510` present and the issue is `OPEN`.

---

## Pre-pass Summaries

- **PREPASS_B** (architecture): `aligned`. `axes_checked`: What this repo produces, SKILL.md authoring, File naming, Cross-skill resources, Validation before commit, Do not (`prepass-axes.js` source: `architecture`). Two low findings: the test homes `shared/resources/tests/` and `tests/` are not named in the architecture docs, and `tech-stack.md` names `.mjs` only for the eval harness. Both are documentation gaps in the architecture docs, not defects in this task — out of scope.
- **PREPASS_C** (codebase): `not-implemented`, no findings. No call sites enumerated, so no population diff.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes.
- Frontmatter: `type: task`, `description`, `tags` list — OKF conformant.
- Sign-off: not enabled in `skills-config.yaml` — not checked.
- Change Log (check 4b): present, four columns, current for `planned`.
- Tracker: `github_issue: 510` exists (`OPEN`); body link `[#510](…/issues/510)` matches. Board Priority already `P2 Medium`.
- Card preflight: exit 0 — Summary, Success Criteria, Breaking Changes resolve (7, 4, 2 omitted behind `+N more` links; information, not a defect).
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Verified against the tree:

- `shared/resources/finalise-dod-ac-prompt.md:44` is the "Two kinds … only these two" heading; `:46`–`:50` the two kinds; `:52` the closing sentence. All as the task says.
- `skills/finalise/references/finalise-dod-ac-prompt.md` differs from the source only by the AUTO-GENERATED header line (`diff`), so the plan's strip-then-compare test is sound.
- `skills/review-task/SKILL.md:1108` is check 4, with exactly the three lines quoted.
- `package.json` `test` globs `tests/*.test.js` and `shared/resources/tests/*.test.mjs` — both new files run. No existing test reads the AC prompt, so nothing currently green turns red.
- `shared/resources/tests/lib/executed-prose.mjs` exports `readDoc` and `ROOT`, as the plan uses.
- Check 11 (invariant): the plan's bullet regex `^- \*\*([^*]+)\*\*` matches the two existing top-level kinds and none of their indented sub-bullets; the heading regex matches the source's Unicode `…`.
- Check 8: the main CI workflow is not path-filtered; the new test homes run.

#### Important

- **The kind count is stated twice, and the task changes only one.** `finalise-dod-ac-prompt.md:95` (Execution rule): "The two `NOT_APPLICABLE` kinds in Step 3 carry `null` here and are judged by their own rules." Neither the task nor the plan names this line. After Phase 1 the prompt would say three kinds in Step 3 and two in the Execution rule — the enumeration class in `docs/reference/anti-patterns.md`, inside one file an agent executes. The planned pin would not see it: it matches only the heading and the closing sentence.
  - **Recommendation:** Phase 1 edits line 95 to drop the count ("The `NOT_APPLICABLE` kinds in Step 3 carry `null` …"), so there is one count in the file; the AC pin asserts no other sentence restates a count of `NOT_APPLICABLE` kinds; add the mutation to Phase 4.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Important

- **The plan's review-task pin and mutation table predate the #222 fold-in.** The task's Phase 3 requires the pin to assert the bound rule, the behaviour-without-test rule and the post-merge rule, each at Important; Phase 4 lists a mutation for each. The plan's concrete pin spec asserts only "numeric bound", "the command that measures it" and "**Important**", and its mutation table has no row for the two #222 rules. A developer following the plan's code would ship a pin that passes with either #222 rule deleted.
  - **Recommendation:** extend the plan's pin spec with a marker for each #222 rule and a per-rule severity check, and add both mutations to the plan's table.

#### Optional

- **Target Architecture's test bullet says the review-task pin checks only "the bound and measurement requirement".** It now checks three rules. Align with Phase 3.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Applied the task's own new check 4 rules to its success criteria: every functional criterion is a documentation criterion with a pin; the Performance criterion states a bound (< 1s) and a command (`time node --test <file>`) — a measured criterion, which this task's own change lets finalise pass; the post-merge observation update is already in Notes, not in Success Criteria. The task dogfoods its rule cleanly.

#### Optional

- **In Scope names observation #206 "marked actioned on merge"; Notes names #206 and #222.** Align In Scope to both, and mark it as post-merge so it is not read as a criterion.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- The back-door risk (testable behaviour passed as "measured") is named, mitigated by the closing sentence and pinned. Rollback is a revert plus `npm run bundle`. Proportionate for prose plus two pins.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. Bring `finalise-dod-ac-prompt.md:95` (Execution rule) into Phase 1 — drop its count — and pin that no second count sentence exists.
2. Update the plan's review-task pin spec and mutation table to cover the two #222 rules.

### Consider (Optional) - 3 items

1. Align Target Architecture's review-task pin description with Phase 3.
2. Align In Scope's post-merge observation line with Notes (#206 and #222).
3. Architecture docs do not name the `shared/resources/tests/` and `tests/` homes (PREPASS_B) — out of scope; not applied.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (second count site missed)
- Implementation Clarity: 8/10 (plan pin lags the task)
- Consistency: 9/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no critical issues; both Important findings are applied to the task and plan in this review.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; run the Phase 4 mutation list, which now includes the Execution-rule count and the two #222 rules.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2)
- **Review Date:** 2026-10-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.166.measured-non-functional-criteria/task.166.measured-non-functional-criteria.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (via PREPASS_B)
