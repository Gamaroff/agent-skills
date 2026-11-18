# Task Review Report: Task 282 - review-task resolves the right task and reports every review

**Reviewed:** 2026-11-18
**reviewed_blob:** 07e86a4ff61d71b7caa70dc4b045780769f7990c
**Review Depth:** Standard
**Task Status:** planned (promoted to ready-for-development after the fixes below)
**Overall Assessment:** GOOD
> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-11-18

---

## Executive Summary

The two defects are real and the target design is sound: both stage lists take the new members, and the first review keeps its existing marker. The task needs five edits before development: pin the review-1 key, name the sibling sites, name the tests that enumerate the stage list, fix a skip-rule grep that matches nothing, and settle review-bug. All five were applied in Step 8.5.

**Critical Issues:** 0 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions (pipeline run, autonomous defaults; decisions recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked: `develop-next --defaults` run. Autonomous decisions, each applied to the task:

| # | Decision | Basis |
| - | -------- | ----- |
| D1 | Review 1 keeps the bare stage key (`review-task`); review N≥2 posts `review-task-N`. | Keeps an existing marker on a live issue reading `already` for review 1. A uniform `-N` suffix would re-post review 1 once across the deploy boundary. |
| D2 | `review-bug` joins the fix. | Same defect (`skills/review-bug/SKILL.md:201`, `--stage review-bug`); one list entry per list. |
| D3 | Tracker sync: skip, leave unlinked. | Tasks 279–281 ran unlinked; creating a GitHub issue is outward-facing and not durably authorised. |
| D4 | Bare-number task-id-first applies to `review-task` and `develop-task` Step 0a only. | See finding I3. |

---

## 1. Template Structure Compliance

**Status:** PASS (one finding)

- `type: task`, `description`, tags present. No placeholders. Card preflight: 3 card blocks resolve (`--check-card`, exit 0; Summary, Success Criteria and Breaking Changes each carry a `+N more` link, information only).
- `doc-links.js`: 1 relative link, resolves.
- Sign-off and Change Log: both present as required (Change Log has the one `1.0` row).

#### Important
- **I7 Tracker linkage.** No `github_issue`. Sync offered; skipped by decision D3. Run `/sync-github-task` later if a card is wanted.

---

## 2. Technical Accuracy

**Status:** ACCURATE (no hallucinations)

Verified, not recalled:

- **Line anchors.** `tracker-comment.js:100`–`:111` holds the `CYCLE_SCOPED_STAGES` doc comment and list (list at `:116`–`:121`, `COMMENT_STAGES` at `:123`). The range is close; the task now cites the symbols. `skills/review-task/SKILL.md:80` (Input Resolution) and `:141` (`# Bare number: 297`) resolve.
- **Population (check 14/20).** `call-sites.js --engine tracker-comment.js` returned 24 sites. The `--stage review-task` sites are `skills/review-task/SKILL.md:2319` (Jira arm) and `:2390` (GitHub arm); `--stage review-story` is `skills/review-story/SKILL.md:2624`; `--stage review-bug` is `skills/review-bug/SKILL.md:201`. `review-epic` has no review comment stage.
- **Marker safety.** A bare marker does not match a suffixed one (the marker ends at `-->`; the prefix-collision test at `tracker-comment.test.mjs:740` holds that shape), so `review-task-2` cannot hit review 1's `review-task` marker.
- **Invariant (check 11).** `isKnownStage` (`tracker-comment.js:262`) accepts `<member>-<n>` only for `CYCLE_SCOPED_STAGES` members, with `n > 0`; adding a member to that list is sufficient. `stripCycleSuffix` in `stakeholder-summary.js:328` strips only members of `CYCLE_SCOPED_LEAD_STAGES`, so both lists need the entries or the lead falls through.

#### Important
- **I1 Unverified claim left in §3.** "Whether `review-story`, `review-bug` and `review-epic` have the same defect is `(unverified: …)`". Now verified: story and bug have the stage use; epic has none. Fixed in the document.
- **I2 Review-1 key unspecified (check 12 shape).** The Breaking Changes line says "the plan checks" the existing marker. A rule is needed, not a check: see D1. Fixed.
- **I3 "Siblings that share the wording" is a list nobody wrote (check 20).** Search that defines it: `git grep -n -i "bare issue number\|all digits" -- shared/resources skills ':!*/references/*'`. Hits: `skills/review-task/SKILL.md:91`; `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:25` (story) and `:99` (task); `skills/review-story/SKILL.md:121`; `skills/review-epic/SKILL.md:72` (refuses a bare number); `skills/review-pr/SKILL.md:204` (a bare number is a PR). In scope: `review-task`, and `develop-task` Step 0a (`:99`), which has the identical wording and the same defect. Out of scope with reason: story (ids are `P.E.S`, no flat number), epic (already refuses), PR (a PR number by contract). Fixed.
- **I4 Skip-rule file and grep.** The plan's grep `reported .posted. or .already.` matches nothing. The rule is in `shared/resources/develop-pipeline-step-2-review.md` (paragraph at `:473`–`:477`, "read `posted` or `already` in this run"); `develop-bug` keeps its own Step 2 doc (grep `Review outcome comment skipped`: only the shared one). Edit the shared source only; bundled copies follow from `npm run bundle`. Fixed.
- **I5 Tests that enumerate the stage list are not named (checks 15, 25).** `tracker-comment.test.mjs:1623`–`:1642` (`isKnownStage`, and `:1642` asserts the exact `CYCLE_SCOPED_STAGES` list, so it goes red on the new members), `stakeholder-summary.test.mjs:594`–`:606` (two lists, one rule), `comment-slot-coverage.test.mjs:82`/`:186`/`:214` (derives its expectations from the list), `evals/shared/tests/transition-protocol-parity.test.mjs:807` (marker helper parity). Prose that states the old rule and must change: `tracker-comment.js:108` ("Every other stage fires at most once per run"), `tracker-comment-contract.md:98` (table row: "the bare name; a suffix is exit 2"). Fixed.
- **I6 Report number source in action-plan-only mode.** The suffix is the report number (`next_numbered` in Step 8). With no report written there is no number. Rule added: a standalone action-plan review passes the bare key; the second such review dedupes, which is acceptable because no durable review exists.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- Phases name files, risk and dependencies. Phase 2 now names the skip-rule file, the `develop-task` Step 0a site and the resolution order.
- Test reach (check 18): the new tests live under `shared/resources/tests/` and `skills/review-task/tests/`; the first is globbed by `test:suite` (`shared/resources/tests/*.test.mjs`). `skills/review-task/tests/*.test.js` is **not** in the `test:suite` list, so a suite there would run nowhere. The task now places the resolution test under `shared/resources/tests/`.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Success criteria name their location (the QA report) and, for the 10% runtime bound, a measuring command (`uptime` beside each of five alternating runs). Behavioural evidence has controls (`#243` and a URL stay issue forms; review 1's re-run reads `already`).
- Effort: `estimated_effort_hours: 8` against the rubric: within 2×.

#### Optional
- O1 Phase 3 could say which phase owns the `develop-task` Step 0a edit; assigned to Phase 2 in the fix.
- O2 `review-story` is named in the stage fix but its tests are the same files; no separate suite needed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Duplicate-comment risk is now mitigated by D1 (review 1 unchanged) in addition to the report-number suffix. Rollback (revert Phase 1, re-bundle) covers all phases.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 7 (all applied)

1. Pin the review-1 key and the N≥2 form (I2, D1).
2. Name the sibling sites and their exclusions (I3).
3. Correct the skip-rule file and grep (I4).
4. Name the tests and prose that change (I5).
5. Settle `review-bug` and remove the unverified claim (I1, D2).
6. Specify action-plan-only behaviour (I6).
7. Tracker linkage left open by decision (I7, D3).

### Consider (Optional) - 2

1. O1, O2 above.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; every important finding was a missing statement in the document, and each is now written down.

---

## Next Steps

Develop phase by phase: write the two-reviews test first and watch it fail (the plan's Phase 1), then the stage lists, call sites and prose, then the resolution rule, then `command npm run bundle` and `CI=true command npm test`.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline run)
- **Review Date:** 2026-11-18
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.282.review-task-resolves-the-right-task-and-reports-every-review/task.282.review-task-resolves-the-right-task-and-reports-every-review.md`
- **Architecture Docs Consulted:** `prepass-axes.js` source `architecture`; pre-pass agents not dispatched, passes done inline (independent review did not run)
- **Tracker:** no issue linked (decision D3); Step 10 comment skipped
