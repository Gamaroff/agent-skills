# Task Review Report: Task 250 - Security-probe tests write no scratch files into the repository

**Reviewed:** 2026-11-02
**reviewed_blob:** 30ce7f4252559b3e0ed7824e34cfd51069213111
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-11-02

---

## Executive Summary

The task is precise and its factual claims hold: all 12 in-tree `mkdtempSync` sites, the `t140Libs` call count, `fenceRoot`, `saRoot` and the fixture constants sit exactly where the document says. Two Important gaps were fixed in place: a `.gitignore` rule the change makes dead was not in scope, and the Performance criteria did not name their measuring command or the leak ratchet.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous run inside `/develop-task` Step 2; every decision took the recommended option)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run autonomously by `/develop-task` (invoked by `/develop-next --defaults`). No question was put to a human.

- **Output format**: Comprehensive report (pipeline default).
- **Dead `.gitignore` rule**: remove it (recommended). Keeping it would hide a regression, which is the opposite of what the guard is for.
- **Step 8.5**: apply all critical + important fixes (pipeline default).
- **Step 9**: promote to Ready for Development (READY TO IMPLEMENT).

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking and References are present. Frontmatter carries `type: task`, `description`, `tags`, `github_issue: 812`. No placeholders. Sign-off is not enabled in `skills-config.yaml`; the Change Log is current. Issue #812 is OPEN and the body link `[#812](…/issues/812)` matches the frontmatter. Card preflight: `3 card blocks resolve` (exit 0). `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Verified by command, not by reading:

- `grep -nE "mkdtempSync\(\s*$|mkdtempSync\(join\(REPO_ROOT" shared/resources/tests/security-probe.test.mjs` → exactly the 12 lines the table lists (737, 854, 884, 1374, 1582, 1699, 1729, 1809, 1951, 2036, 2341, 4348). Every other `mkdtempSync` call in the file is under `tmpdir()`.
- `grep -c "t140Libs(" …` → 16 (15 callers + the definition), as claimed.
- `fenceRoot` at 4410, `saRoot` at 5825, the `probe-dotdot-gh-` precedent at 3953, constants at 1242–1245: all exact.
- Other `REPO_ROOT`-built writes: `symlinkSync` at 1969, 1972, 2053, 2096, 2352 and `cpSync` at 2041, 3957, 3958, 4357. 1972 and 2053 write into an in-tree `dir` (named in the task); 1969/2096/2352 create the link under `tmpdir()` and only read `REPO_ROOT`; the `cpSync` calls read from it. The task's classification is correct.
- Check 13 (single-statement discriminator): the plan's static guard keys on the argument position, so `cpSync(join(REPO_ROOT, …), …)` (a read) is not flagged. Addressed, with a non-vacuity floor.
- Check 15 (removed literal): `git grep` for the scratch prefixes outside this file finds no test that pins them; the CHANGELOG and old task documents only mention them. It also found the `.gitignore` rule — see Important 1.
- Check 18 (runner reach): no new test file; `shared/resources/tests/*.test.mjs` is already in `npm run test:suite`.
- Pre-pass agents B and C were **not dispatched**; both passes ran inline. Independence loss recorded: the architecture-alignment and already-implemented scans were done by the same reviewer as the rest of the review. Architecture: test-only change in an existing `node:test` suite, no new dependency. Implementation status: not implemented (all 12 sites still in-tree).

### Important

1. **A `.gitignore` rule becomes dead and was out of scope.** `.gitignore` ignores `tests/fixtures/shell-fn/.t140-*/` for killed runs. After the change nothing writes there, and the rule would only hide a regression from `git status`. The Files Summary said "No other file changes".
   - **Fix applied:** added to In Scope, Phase 5 and Files Summary.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with files, changes and dependencies; Phase 1 is guard-first with a calibration step and a one-site mutation. The plan file gives per-site before/after. Effort estimate 8h is consistent with the rubric (1 file, 12 sites, Medium risk).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

### Important

2. **The Performance criteria named no command.** "Median of 3 runs" is a wall-clock bound no per-PR test can assert, so finalise grades it as a measured criterion: it needs the command, the load it ran under, and a figure from the PR head. "The suite's existing `tmp-leak` ratchet" named no file.
   - **Fix applied:** the criterion now names `uptime; time command node --test …`, base vs head, back to back, recorded in the QA report; the leak criterion names `scripts/test-tmpdir.mjs`.

### Optional

- Every record-demanding criterion already names the QA report as its location (check 22 passes).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The Medium risk (a containment test passing for the wrong reason) carries a premise control that is a differential oracle: each containment test must fail when given the wrong root. Rollback is a single revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. Remove the dead `.t140-*` `.gitignore` rule (applied).
2. Name the timing command and the leak ratchet in the Performance criteria (applied).

### Consider (Optional) - 1 item

1. When the guard lands, consider whether its static half generalises repository-wide; the task correctly scopes that out and asks for an observation instead.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; both important gaps were one-clause fixes and are applied.

---

## Review Metadata

- **Reviewer:** review-task (Claude, inside `/develop-task` Step 2)
- **Review Date:** 2026-11-02
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.250.security-probe-scratch-out-of-tree/task.250.security-probe-scratch-out-of-tree.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load set)
