# Task Review Report: Task 312 - Allow-list and timing criteria name what they need

**Reviewed:** 2026-11-23
**reviewed_blob:** 50f879c989e17e3ba418394ad6f88875a5d08000
**Review Depth:** Standard
**Task Status:** planned (before review), ready-for-development (after)
**Overall Assessment:** GOOD

> Implementation Status: all 6 recommendations implemented — 2026-11-23

---

## Executive Summary

The task is sound and small. The two gaps are real and the plan puts each rule where its neighbours live. Six defects in the plan itself were found and fixed in this review: stale line anchors, an unreachable test location, a CI-unexecutable fixture criterion, missing companion edits for a new check, a wrong step number for `review-story`, and no tracker linkage.

**Critical Issues:** 0
**Important Issues:** 4
**Optional Improvements:** 2

**User Clarifications:** 0 questions asked (autonomous pipeline run; `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. The pipeline resolved the up-front answers (`develop` base and target) and this review asked nothing.

Pre-pass: both Explore pre-pass agents were run inline by the reviewing session, so independent review did not run for them. Architecture alignment: no conflict found (prose-only change to skills, in the repository's existing check style). Codebase scan: `grep -n -i "deny-list\|operand" skills/review-task/SKILL.md` has no hit, so the task is not already implemented.

---

## 1. Template Structure Compliance

**Status:** PASS (one gap)

- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve; no finding.
- `doc-links.js`: 1 relative link resolves.
- Frontmatter has `type`, `description`, `tags`. Change Log present and current after this review.

### Issues

#### Important
- **No tracker issue is linked** (`github_issue` absent). Tracker sync is opt-in and was not taken in the autonomous run; no remote change was made. Run `/sync-github-task` when wanted.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (all fixed)

#### Important
- **A test location the runner never reaches** (check 18). Phase 1 listed `skills/review-task/tests/`. That directory does not exist, and `package.json` `test:suite` has no glob for it (it reaches `tests/*.test.js`). A suite there passes by not running. Fixed: the test is `tests/review-allow-list-timing-checks.test.js`, beside `tests/review-run-and-parity-checks.test.js`.
- **`review-story`'s technical-accuracy list is Step 4, not Step 3.** `grep -n "^### Step" skills/review-story/SKILL.md` shows Step 3 is "Epic Alignment Verification". Fixed in the task and the plan.

#### Optional
- **Stale line anchors** (check 3). Measured today: check 31 at line 1280 (not 1269), check 22 at 1172 (not 1161) and it is a different rule from the wall-clock note, which sits in Step 6 check 4 at lines 1483-1487; `create-task` bullet at 582 (not 569); check 13 at 1001 (not 990). Fixed, with the grep that finds each.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important
- **A new check needs its three companions.** Task 298 added check 31 with a pattern bullet under "Common Hallucination Patterns to Detect", a clause in Step 3's "Issues to Flag", and rule 15 in the Anti-Hallucination Protocol (`grep -n "check 31" skills/review-task/SKILL.md`). Check 32 listed only the check. Added to Phase 1.

---

## 4. Consistency & Completeness

#### Important
- **A criterion CI cannot execute** (Step 6 check 4). "A fixture task ... is flagged by check 32; a fully tabled one is not" describes a reviewer applying a rule. `tests/review-run-and-parity-checks.test.js` and `tests/review-task-measured-criterion.test.js` both state that no CI layer exercises that. Re-scoped to presence tests, plus one executable probe: a test that runs `uniq in out` in a temp directory and asserts `out` was created.
- Existing tests that read the files being edited: `tests/create-task-authoring-evidence.test.js` and `tests/review-task-measured-criterion.test.js`. Named in Phase 2 to run after the edit. Removed-literal sweep: the plan removes no literal.

---

## 5. Risk & Rollback Assessment

Adequate. Prose and tests only; rollback is a revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues — all applied

1. Move the test to `tests/`.
2. Re-scope the fixture criterion to presence tests plus the executed `uniq` probe.
3. Add check 32's three companion edits.
4. Correct `review-story` to Step 4.

### Consider (Optional) - 2 items — applied

1. Refresh the line anchors.
2. Link a tracker issue (`/sync-github-task`), not done here.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (before fixes)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ READY TO IMPLEMENT

**Justification:** no critical issue; the four Important defects were in the plan's own test placement, scope and routing, and all are corrected in the task and plan documents.

---

## Review Metadata

- **Reviewer:** review-task (run inline by the develop-task pipeline)
- **Review Date:** 2026-11-23
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.312.allow-list-and-timing-criteria-name-what-they-need/task.312.allow-list-and-timing-criteria-name-what-they-need.md
- **Architecture Docs Consulted:** `package.json` test:suite globs, `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`
