# Task Review Report: Task 302 - test:remote from a linked worktree

**Reviewed:** 2026-11-12
**reviewed_blob:** 419ee1b4e842cb3505340647e9355da4d013c7d3
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 important recommendations and 1 optional implemented — 2026-11-12

---

## Executive Summary

A small, well-scoped infrastructure fix. The task's premise holds: git exits 128 with `fatal: not in a git directory` in a directory with no `.git`. The review found no Critical issues. It found three Important gaps (a HEAD-semantics risk in option (a), a stale test count, an unplanned fixture cleanup) and one Optional drift (line anchors). All four were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run under `--defaults`; the open design choice is the task's own Phase 1, so nothing was put to the user)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

**Independence note:** the two pre-pass Explore subagents (architecture alignment, codebase scan) did **not** run. The pass was done inline by the orchestrator. `PREPASS_B` and `PREPASS_C` are therefore unavailable and this review had no independent second reader.

---

## User Decisions & Clarifications

None. No Question Point was raised: every finding had one correct fix traceable to evidence, and the one real decision (option a vs b) is deliberately Phase 1's job.

---

## 1. Template Structure Compliance

**Status:** PASS

- Required sections 1–11, Change Log, Progress Tracking and References are present.
- OKF frontmatter: `type: task`, `description` and `tags` present.
- Tracker card preflight (`sync-jira-task.js --check-card`): Summary, Success Criteria (1 omitted → "+N more") and Breaking Changes all resolve. No findings.
- `doc-links.js`: 0 relative links, none broken.
- No tracker issue is linked (`github_issue` absent). Sync was not offered: the run is autonomous, and the card can be linked later with `/sync-github-task`. Logged as an Important gap by convention, not blocking.
- Estimate `estimated_effort_hours: 4` is present and plausible for 3 phases.

## 2. Technical Accuracy

**Status:** ACCURATE, with one drifted anchor

- **Optional — line anchor drift.** `run.sh:180-188` actually reads `183-191` (`grep -n 'is not a directory' scripts/remote-test/run.sh` → line 191). Fixed, with the grep to re-find it.
- **Check 11 (invariant run).** The 128-exit premise was executed, not reasoned: `git config core.hooksPath x` in an empty `mktemp -d` → `fatal: not in a git directory`, `rc=128`.
- Check 9/14/15/16/18/25/26 not triggered: no config key, engine call-site list, removed literal tested elsewhere (`git grep -n 'linked worktree'` over test trees finds no test pinning the run.sh warning text), replaced region, new test file (it extends an existing one), enumerated-class member or banned-name literal.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

- **Important — option (a) HEAD semantics (Phase 1).** `git rev-parse --git-common-dir` is the main checkout's git dir. Its `HEAD` is the main checkout's, not the worktree's, so a synced common dir can make history-backed tests read the wrong commit and the "same result as the main checkout" criterion pass or fail for the wrong reason. It also carries every other worktree's refs and objects. Phase 1 now records the container's `HEAD` against the worktree's and what the common dir carries.

## 4. Consistency & Completeness

**Status:** CONSISTENT

- **Important — stale figure (Success Criteria).** "the existing 19 guard tests" does not match the file: `grep -cE '^\s*(test|it)\(' tests/test-remote-runner.test.js` reads 21; the "19" survives only in a historical comment at line 79 (`14 of 19`). Replaced with the definition and command, and the QA report records before/after counts.
- **Important — fixture cleanup (Phase 3).** The planned fixture (a repo whose `.git` is a file) is a temp directory. `scripts/test-tmpdir.mjs` is a ratchet that fails `npm test` on a new leaking prefix. The plan now names the `t.after` removal.
- Success criteria classification: each behaviour criterion names its test or its record location (QA report); the live-run and load criteria name the QA report; the CI-state criteria are graded by finalise from CI.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The Medium risk (a shared git directory exposing another worktree's objects) is the same one finding 3 sharpens. Rollback is a single revert with a stated trigger.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 3, all applied

1. Phase 1 records option (a)'s HEAD and other-worktree exposure.
2. Replace the stale "19 tests" figure with its definition and command.
3. Name the Phase 3 fixture's cleanup.

### Consider (Optional) - 1, applied

1. Re-anchor `run.sh:180-188` to `183-191`.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10 (no tracker issue linked)
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the one real design risk (option (a) HEAD) is now an explicit Phase 1 check, and the premise was verified by running it.

---

## Review Metadata

- **Reviewer:** review-task (inline, orchestrator-run)
- **Review Date:** 2026-11-12
- **Task File:** `docs/tasks/task.302.test-remote-from-a-linked-worktree/task.302.test-remote-from-a-linked-worktree.md`
- **Architecture Docs Consulted:** none loaded (pre-pass B did not run)
