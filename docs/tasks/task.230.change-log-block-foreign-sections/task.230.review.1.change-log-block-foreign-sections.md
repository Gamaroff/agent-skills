# Task Review Report: Task 230 - Keep foreign sections out of the change-log block

**Reviewed:** 2026-10-22
**reviewed_blob:** 9b984d52076b570382e0ec8f807b9c12ddb9f7e5
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-22

---

## Executive Summary

The task is well-sourced: every line anchor resolves, the four affected documents are exactly the ones a corpus scan finds, and the existing sibling mechanism (`qa-results.js` `relocated`) and the obs #104 absorption are both named with a stated relationship. One design gap was found by reading `splitCarriedLines`: the plan split foreign sections *after* table classification, which would absorb a foreign section's own pipe table into the log. Five smaller gaps concerned how success criteria are held at finalise.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (develop-next → develop-task Step 2); each clarification was resolved from the code and is recorded as an assumption below.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked: this review ran inside an unattended `develop-next` pipeline, which forbids prompting. Each point that would have been a question was resolved from the codebase:

- **Where does a before-side foreign section end?** Resolved from `splitCarriedLines` and `RE_ENTRY_ROW` (`change-log.js:80`): at the first change-log entry row (or the header directly above it). A pipe table before that point belongs to the section.
- **How is the "under 5 s on CI" bound held?** Rephrased to a measured bound on the PR head with a stated command and recorded load, since finalise cannot read a CI runner's wall time.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Progress Tracking and References are present. Frontmatter has `type: task`, `description`, `tags`, `github_issue: 734`. No placeholders. Sign-off not enabled. Change Log present (1 row, current for `planned`). Card preflight: 3 card blocks resolve (Summary +6 more, Success Criteria +10 more, Breaking Changes +5 more — information, not a defect). Issue #734 exists (OPEN). `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (1 Important)
**Hallucinations Detected:** 0

Verified:

- Line anchors: `change-log.js:218/274/494/599/607/651/691/780`, `develop-pipeline-step-5-6-qa-loop.md:771`, `document-change-log.md:88`, `finalise/SKILL.md:1367–1369/2551` — each holds what it is cited for.
- **Figure (check 7/11), run:** a scan of `git ls-files '*.md'` through `findChangeLog` (marker blocks only, unfenced headings at or above the log's level, first Change Log heading excluded) found **120 marker blocks** and exactly the four offenders named — task.166, 170, 175, 203, each `## Definition of Done - PASSED ✅`. None of the four DoD bodies holds a pipe table (pipe-lines − 2 = entry rows in each).
- `RE_HEADING` (`change-log.js:73`) has the `m` flag and no `g`, so `RE_HEADING.test(l)` in the planned `splitForeign` is stateless.
- Same-class inventory (check 6): `qa-results.js` `relocated` and the obs #104 absorption are named, each with "sits beside / composes with".
- Test reach (check 18): `evals/shared/tests/*.test.mjs` is in `package.json`'s `test` glob.
- Pre-pass B (architecture): `aligned`; `prepass-axes.js` source `architecture`. Its `axes_checked` listed generic axis names (libraries, patterns, contracts, security) rather than the repo's own standards, so the `aligned` is weaker than it reads.
- Pre-pass C (codebase): `not-implemented` — `foreignSections`, `liftForeignSections` and the corpus test are absent; the Deferred Work rule still reads "before the `## Change Log` heading".

#### Important

- **The partition must run before table classification (check 10/11).** `splitCarriedLines` (`change-log.js:345–359`) takes every unfenced pipe-line from the first one on as the log's table, and `before`/`after` are built through `text()`, which drops the protection flag. A foreign section holding its own pipe table *before* the log table would have its rows absorbed into `tableLines` (today: emitted as unparsed rows inside the log) before the planned `splitForeign` could see them — the heading would move out and its table would stay in. **Fixed:** §3 and the plan now require the split inside `splitCarriedLines` over the `[line, prot]` pairs, with a stated extent; a "foreign table" test case was added.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

Phases have files, checkboxes, risk levels and a red-first order. The plan already anticipated the protection-flag question; the review settled it (see §2).

#### Important

- **Removed literal still in a test (check 15).** `tests/deferred-work-placement.test.js:61` restates the old placement wording in a comment, and no test asserts the new wording. **Fixed:** Phase 2, Files Summary and the plan now update the comment and add an assertion that the statement contains "never between the markers".
- **Caller list without its search (check 20).** §5's Impact list of `upsertChangeLog` callers was hand-written. It matches `git grep -ln upsertChangeLog -- ':!**/references/**' ':!docs/**' ':!*.md'` (jira-sync.js, status-history.js, three sync-jira-* scripts, tracker-reconcile.js, plus four test files). **Fixed:** the search is recorded beside the list.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (3 Important)

#### Important

- **Wall-clock criterion with no command (check 4, obs #206/#268).** "Under 5 s on the CI runner" states a bound no per-PR test can assert and gives no measuring command. **Fixed:** measured on the PR head with `uptime; time command node --test …`, load recorded.
- **"One definition of foreign" named no test (obs #222).** **Fixed:** held by the corpus guard importing `foreignSections` from source, and a unit test asserting `foreignSections(upsertChangeLog(x, row))` is `[]` for every lifting case.
- **"Green on the merged tree" reads as post-merge (obs #222).** **Fixed:** "green on the PR head".

#### Optional

- The Deferred Work placement criterion is a documentation criterion; it is now additionally held by the placement test (above).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks (lifting a legitimate same-level heading; seam whitespace) have mitigations held by named tests (controls, idempotence, byte-identical clean output). Rollback is a revert plus `npm run bundle`; repaired documents stay valid under the old engine. No guard exemption is involved.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 6 issues (all applied)

1. Partition inside `splitCarriedLines` before table classification; add the foreign-table case.
2. Wall-clock bound: command and load on the PR head.
3. Name the two tests that hold "one definition".
4. "Merged tree" → "PR head".
5. Update `tests/deferred-work-placement.test.js` and assert the new wording.
6. Record the caller search beside the Impact list.

### Consider (Optional) - 1 item

1. Treat pre-pass B's `aligned` as weak: its `axes_checked` named generic axes.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the one design gap is now specified in both the task and the plan, and every success criterion names how finalise will see it held.

---

## Next Steps

1. Follow the plan phase by phase, red tests first.
2. Calibrate the corpus guard red on the unrepaired tree before repairing the four documents.
3. Record the mutation proof and the wall-time figure in the implementation report.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, autonomous)
- **Review Date:** 2026-10-22
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.230.change-log-block-foreign-sections/task.230.change-log-block-foreign-sections.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md (via pre-pass B and `prepass-axes.js`)
- **Review Duration:** ~10 minutes
