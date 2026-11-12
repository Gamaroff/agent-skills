# Task Review Report: Task 303 - Pause commits restart CI and block the docs-only shortcut

**Reviewed:** 2026-11-12
**reviewed_blob:** 9a72bc618216d749e9d9f983b515a66186997632
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and honest about what it has not verified. The review read the ancestor walk and found that the task's Option (a), as worded, is already how the engine behaves, so Phase 1's real question is a different one: what does a cancelled run's rollup reduce to. The task document was corrected for that, and for three criteria that named no holding test.

**Critical Issues:** 0
**Important Issues:** 3 (all fixed in the task document)
**Optional Improvements:** 2

**User Clarifications:** 0 questions asked (autonomous pipeline run; `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## Independence note

The two pre-pass Explore subagents (architecture alignment, codebase scan) were **not dispatched**. Both passes were done inline by the reviewing session, which also wrote the Phase 0 setup. Independent review did not run. `prepass-axes.js` was not run either, so no `axes_checked` is recorded: an "aligned" claim here is the reviewer's reading of `ci-tree-equivalence.js` and `develop-pipeline-on-precompact.sh`, not a measured pre-pass.

---

## User Decisions & Clarifications

None. The pipeline answered Step 0, Step 8.5 and Step 9 by the defaults in `develop-pipeline-autonomous-defaults.md`.

---

## 1. Template Structure Compliance

**Status:** PASS

- All eleven numbered sections present; OKF frontmatter has `type: task` and `description`.
- Tracker card preflight (`sync-jira-task.js --check-card`): exit 0, 3 card blocks resolve.
- `doc-links.js`: 0 relative links, none dead.
- No tracker issue is linked (`github_issue` absent). Not flagged: tasks are often purely technical, and the sync offer is opt-in.
- Change Log present with one row; a row is added by this review.

#### Optional
- `estimated_effort_hours: 4` against three phases, one of them Medium risk, is plausible. No divergence flag.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (1 Important, fixed)
**Hallucinations Detected:** 0

Verified by reading the code:

- `ci-tree-equivalence.js` header lines 38-40 say what the task quotes. Confirmed.
- `classifyTreeEquivalence` (about lines 185-270): a `CANCELLED` ancestor is **walked past**, and `undecided` is set; a `FAILURE` ancestor stops the walk with `no-green-ancestor`.
- `reduceChecks` (about lines 282-316): `conclusion === "cancelled"` maps to `CANCELLED`; **every other non-success conclusion maps to `FAILURE`**, and one `FAILURE` among several checks makes the whole rollup `FAILURE`.
- `develop-pipeline-on-precompact.sh` lines 387-406: the pause commit push is held only for a dangling report link. `PUSH_HELD` exists, so Option (b) has a seam to extend.
- Test files exist and are reached: `shared/resources/tests/ci-tree-equivalence.test.mjs` (a `CANCELLED` ancestor case at line 1086 and a `reduceChecks` cancelled case at line 422) and `shared/resources/develop-pipeline-on-precompact.test.sh`.

#### Important (fixed)

- **I-1. Option (a) is already the engine's behaviour at the classify level, and a green successor is already a nearer ancestor.** The task says "a cancelled run superseded by a green run of a later commit on the same branch is skipped, never counted red". At classify level a `CANCELLED` ancestor is already skipped (test at line 1086 holds it). A green successor of a cancelled run is by definition a nearer first-parent ancestor of the head, so the walk meets it first and returns `tree-equivalent` before it ever reads the cancelled one. So (a) as worded cannot change any answer.
  - **The real gap is one layer down, in `reduceChecks`.** A cancelled workflow run can leave one check concluded `cancelled` and its `if: always()` aggregator (`ci-ok`) concluded `failure`. `reduceChecks` then returns `FAILURE`, the walk stops at that ancestor ("the head inherits that red"), and the shortcut never applies. That matches the consumer symptom ("the cancelled `ci-ok` read as a failure"). It is not proven: `docs/runbooks/ci-docs-only-skip.md` says the aggregator "fails only when a job failed", which is the opposite, and the consumer's real check conclusions were not captured anywhere in the tree.
  - **Fix applied:** Section 3, Phase 1 and the Testing Strategy now name `reduceChecks` and the mixed-conclusion case, and make the reproduction use the check shapes the API returns, not the abstract `CANCELLED` rollup.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

#### Important (fixed)

- **I-2. Option (a)'s guard is vague on a mixed rollup.** "Only when its own successor on the same branch is green" cannot be evaluated inside `reduceChecks`, which sees one commit's checks. The plan must say where the successor test lives (the walk, which has the ancestor list) and what a cancelled-plus-failed rollup does when **no** green successor exists. Fix applied in Phase 2: any change to `reduceChecks` treats a run as superseded only when **every** non-success check is `cancelled`, or when the aggregator's `failure` is shown by the Phase 1 capture to be caused by the cancel; a run with a real `failure` check stays `FAILURE`.

#### Optional
- Phase 1 asks to "record why" for the choice; the Decisions Log of the implementation report is the place, and the task's Progress Tracking has no row for it.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (1 Important, fixed)

#### Important (fixed)

- **I-3. Two success criteria name no holding test.** "The consumer case ... no longer waits for full CI" and the Performance criterion ("no extra API calls per poll: the fixture counts the calls") are behaviour and non-functional criteria. The first names a fixture but not which file; the second names no bound. `/finalise` classifies a behaviour criterion by the test that holds it and a bound by its measured value. Fix applied: the criteria now name the test file (`shared/resources/tests/ci-tree-equivalence.test.mjs` for option (a), `shared/resources/develop-pipeline-on-precompact.test.sh` for option (b)) and state the bound: `reads.rollups` and `reads.diffs` in the result are equal before and after the change on the same fixture. The engine already returns that `reads` counter, so no new instrument is needed.

Checks run and passed without a finding:

- Check 10 (outcome reachability): the stated outcome `tree-equivalent` for "cancelled head with a docs-only successor that is green" is reachable today by the green-successor path; see I-1.
- Check 11 (invariant): not run. No property of an existing function is asserted for new inputs beyond I-1, which was read from the code.
- Check 15 (removed-literal sweep): the plan removes no literal.
- Check 18 (test file reached): both named test files already exist and are run by the project's tests.
- Check 25 (new member of an enumerated class): none added.
- Control case: present in the Testing Strategy (cancelled ancestor with no green successor must still answer `no-green-ancestor`). Kept and extended with the real-failure case.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The High risk (hiding a real failure) is named with a mitigation and a control test. The exemption-to-a-refuse-by-default guard rule (Step 7 check 1) applies to Option (a): it widens what the guard treats as not red, so the differential oracle is the real-failure control case now added to Phase 3. Rollback is a revert plus `npm run bundle`. No finding.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 3, all applied

1. Re-state Option (a)'s premise: the walk already skips cancelled ancestors; the gap is in `reduceChecks`' mixed conclusions. (I-1)
2. Say where the successor test lives and what a mixed cancelled-plus-failed rollup does. (I-2)
3. Name the test files and the bound for the two criteria. (I-3)

### Consider (Optional) - 2

1. Record the Phase 1 choice in the Decisions Log of the implementation report.
2. If the capture shows the aggregator concludes `failure` only on a cancel, the cheaper fix may be in the consumer's snippet in `docs/runbooks/ci-docs-only-skip.md` (the aggregator should report `cancelled`), with a one-line engine change. That is a Phase 1 decision.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (premise corrected; consumer evidence still unverified)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** READY TO IMPLEMENT

**Justification:** No Critical issues; the three Important issues are fixed in the document, and the remaining uncertainty (what the consumer's cancelled run actually reported) is a Phase 1 reproduction the task already schedules.

---

## Next Steps

Developer follows the three phases. Phase 1 must capture or construct the check shapes a cancelled run returns before choosing (a) or (b).

---

## Review Metadata

- **Reviewer:** review-task (pipeline run, `develop-task`)
- **Review Date:** 2026-11-12
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.303.pause-commits-restart-ci-and-block-docs-only-shortcut/task.303.pause-commits-restart-ci-and-block-docs-only-shortcut.md
- **Sources consulted:** `shared/resources/ci-tree-equivalence.js`, `shared/resources/tests/ci-tree-equivalence.test.mjs`, `shared/resources/develop-pipeline-on-precompact.sh`, `docs/runbooks/ci-docs-only-skip.md`
