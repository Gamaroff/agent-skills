# Task Review Report: Task 271 - finalise accepts what the record already shows

**Reviewed:** 2026-11-07
**reviewed_blob:** 14d0cf4ccdc95561ba0eb48d5756539733b8f426
**Review Depth:** Standard
**Task Status:** planned (promoted to ready-for-development by this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well-scoped: three arms, each with an unmatched control, a mutation proof and a rollback. The Phase 1 owner decisions were recorded before this review (plan file, 2026-11-07). The review found stale line anchors, one decision not yet reflected in the task text, and three plan gaps (tests that read the AC prompt, tests that enumerate `shared/resources/`, the source of the owner identity). All were fixed in the document.

**Critical Issues:** 0
**Important Issues:** 3 (all fixed)
**Optional Improvements:** 2 (both fixed)

**User Clarifications:** 0 questions asked in this review. The three Phase 1 semantics were decided by the owner immediately before it.
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Pipeline run: no interactive question points. The owner's Phase 1 answers (plan file, "Answers" block) are the decisions this review applies:

- Arm 1: same code tree by `ci-tree-equivalence.js`; docs-only deltas count.
- Arm 2: exactly one re-run, only outside the diff, only over a docs-only delta.
- Arm 3: mechanical match on case id; the approver must be the repository owner.

Autonomous defaults taken (pipeline): output format "Comprehensive report"; fixes "apply all critical + important"; tracker sync "Skip, leave unlinked" (no `github_issue` on this task, as on its neighbours, and creating a remote issue is outward-facing); status "fixes complete".

---

## 1. Template Structure Compliance

**Status:** PASS

- OKF frontmatter: `type: task`, `description` and `tags` present.
- Tracker card preflight (`sync-jira-task.js --check-card`): exit 0, 3 card blocks resolve.
- Relative links (`doc-links.js`): 1 link resolves.
- Change Log present and current after this review's row.
- Sign-off: not enabled.
- Tracker linkage: no `github_issue`; sync skipped by autonomous default. Run `/sync-github-task` later if a card is wanted.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

Pre-pass Agents B and C were performed inline, not by Explore subagents (no independent review ran; the budget of this run did not justify two dispatches for a documentation-and-prompt task). Architecture axes came from `prepass-axes.js` (`source: architecture`).

- **[Optional, fixed]** `skills/finalise/SKILL.md` anchors had drifted: `:1162` (now the rollup `jq` near `:1238`), `:1261` (now near `:1368`), `:758`/`:742` (now `:811`/`:795`). Measured with `grep -n "TIMED_OUT"`, `grep -n "ci-tree-equivalence"` and `grep -n "Recompute .overall"`. The task now carries the grep beside each anchor so it can be re-found. `:345`–`:353` and `:322` were still correct.
- **[Optional, fixed]** "task 266 if merged" is stale: task 266 is accepted and merged (PR #851), and its run-count clause is already on `finalise-dod-ac-prompt.md:72`.
- Verified true: `ci-tree-equivalence.js` exports at `:1127`; `fixtureRepo` exists in `shared/resources/tests/lib/executed-prose.mjs:131` (temp dir `executed-prose-*`); `finalise-ci-poll.sh` exists; `finalise-deferred-ci.test.mjs` exists and `shared/resources/tests/*.test.mjs` is in the `test:suite` glob (check 18, runner reach).
- Check 15 (removed literal): "taken on the PR's head commit" is pinned by no test by literal (`git grep -n "on the PR's head commit" -- '*.test.*'` returned nothing). Three tests read the AC prompt by file name and are now named in Phase 2: `finalise-dod-prompt-contract.test.mjs`, `finalise-dod-ac-kinds.test.mjs`, `qa-finalise-rules-wiring.test.mjs`.

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- **[Important, fixed]** Arm 3 said "an approver" while the owner decided "the repository owner". The task now states the owner-only rule, and requires the owner identity to come from a named source with a reader and a test; with no source configured, no deferral is accepted (fail closed). The source is chosen in Phase 4.
- **[Important, fixed]** Arm 2 now says "exactly once", matching the decision.
- **[Important, fixed]** Check 25: the new matcher script joins `shared/resources/`, a directory enumerated by tests. Phase 4 now requires naming those tests (the `git grep` is in the task) and running the banned-name pattern over fixture literals (check 26).

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Controls exist per arm (unmatched case, in-diff red, no approver, different case id) and a mutation proof per arm (check 2, control case).
- Performance criterion states a bound and the measuring command (median of five alternating runs, `uptime` beside each).
- Every criterion names where its record lives (the QA report, the DoD), so none is an implementation-report-only record (check 22).

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The task rates "an arm accepts work it should not" as High risk with exact-id match, approver required, one use per run and a revert path. These widen what `/finalise` treats as accepted, so the differential oracle is the set of unmatched controls above; Phase 4 should keep the "different case id stays FAIL" control as its guard.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 3 issues (all applied)

1. Reflect the owner-only approver and its identity source in Arm 3.
2. State "exactly once" in Arm 2.
3. Name the tests that enumerate `shared/resources/` before adding the matcher.

### Consider (Optional) - 2 items (both applied)

1. Re-find the drifted `SKILL.md` anchors.
2. Drop the stale "if merged" for task 266.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Scope, controls and rollback are sound, the owner decisions are recorded, and every gap found is fixed in the document.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; Phase 3 and Phase 4 are High risk and must keep their unmatched controls.

---

## Review Metadata

- **Reviewer:** Claude (pipeline, review-task)
- **Review Date:** 2026-11-07
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.271.finalise-accepts-what-the-record-already-shows/task.271.finalise-accepts-what-the-record-already-shows.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md (axes via `prepass-axes.js`)
