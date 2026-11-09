# Task Review Report: Task 274 - QA engines stop passing what they cannot see

**Reviewed:** 2026-11-09
**reviewed_blob:** ab3e81e9ede19ce440e5cda8e0f0177aca6b3689
**Review Depth:** Standard
**Task Status:** Planned (before this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-11-09

---

## Executive Summary

The task is well scoped and its numbers check out against the tree. Four things were wrong or open: the shared-fixture work was aimed at the wrong file, two decisions (shape 4, row width) were still open, the test files were unnamed, and the plan's temp directory had no removal. All are fixed in the document and plan.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions (autonomous pipeline run; the Phase 1 owner decisions were recorded in the task on 2026-11-09 and not re-asked)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

> Pre-pass: the two Explore pre-pass agents did **not** run. Their checks were done inline by the orchestrator, so this review had no independent second reader.

---

## User Decisions & Clarifications

Phase 1 owner decisions (2026-11-09, task document): refuse variable arguments to deny-listed commands (no value tracking); shared fixtures via `--fixture-copy`, copied once per run. Every recommendation below follows them.

---

## 1. Template Structure Compliance

**Status:** PASS

- OKF frontmatter: `type: task`, `description` present.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, exit 0.
- Change Log present with four columns.
- `doc-links.js`: 1 relative link resolves.
- `sign-off` and `change-log` enforcement are not set to blocking in `skills-config.yaml`.

#### Optional
- The Overview says "Five scripts" but names three engines and the Scope says "three engines". Wording only.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

#### Important
- **Wrong file for shared fixtures (obs #52).** The task listed `security-probe.mjs` and "the security-probe suite". `--cases-base` and the numbered cases file live in `shared/resources/security-probe-plan.mjs` (header lines 13–35; `git grep -n "cases-base" -- shared`). `security-probe.mjs` only owns `--record`, `--name`, `--entry`, `--sink`. Fixed: the file, its test (`security-probe-plan-cases-file.test.mjs`) and the `--fixture-copy` flag now sit on `security-probe-plan.mjs` in Phase 3, the Files Summary and the plan.
- **Line anchor drift.** `skills/finalise/SKILL.md:661`–`:662` was cited for the probe flags; those lines hold the `boundary: true` prose. Fixed: replaced with the real header lines.
- **Test files unnamed.** The task said "(unverified: the plan lists them)". Named now, all under `shared/resources/tests/`: `qa-execute-snippets.test.mjs`, `security-probe.test.mjs`, `security-probe-plan-cases-file.test.mjs`, `status-history-cli.test.mjs`. Test-reach (check 18): the `package.json` `test:suite` glob `shared/resources/tests/*.test.mjs` reaches all four.

Verified as true: `classifyBlock`, `classifyInternal`, `stripNonCode`, `stripProse`, `commandInvocations`, `collapseQuotedSpans` and `DENY_PATTERNS` exist in `qa-execute-snippets.mjs`; `RE_ENTRY_ROW` at `status-history.js:46` and `HEADER_ROW` at `:40`. The task cites `:48` for `RE_ENTRY_ROW`; it is at `:46` (Optional, corrected by the plan's range `:40`–`:55`).

#### Optional
- **Invariant not run (check 11).** "`stripProse` made idempotent" is a property of an existing function. Not run in review (the function is not exported); develop must run it on the heredoc inputs before relying on it. Recorded as unverified.
- **Precedent figure.** The 20,132-byte precedent is not re-measured here; the task.205 cases file measured 1,588,414 bytes (`wc -c`), consistent with the 0.8–1.6 MB the task reports.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important
- **Two decisions left open.** Phase 4 said "refuse, or write in the header's shape" and Phase 1 no longer covered it. Fixed: refuse with exit 2 (the success criterion "a width mismatch is refused" already requires it).
- **Shape 4 absent from tests and criteria.** The criteria said "four shapes as decided in Phase 1" but the tests listed three. Fixed: shape 4 (`X=-delete; find docs $X`) is a named test, with a control (a variable argument to a command that is not deny-listed stays runnable). Out of Scope and Future Improvements reworded, since "if Phase 1 decides" is now settled.
- **Removed-literal sweep (check 15).** The refusals reclassify blocks that tests may pin as `runnable` (155 lines name `runnable` in `qa-execute-snippets.test.mjs`). Fixed: Phase 2 now reads them before running the suite.
- **Temp directory with no removal (check 28).** The syntax check uses `mktemp -d`. Fixed: a `finally` removes it; `scripts/test-tmpdir.mjs` rejects a leaking prefix.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

- Criteria classification (check 4): the Performance criterion has a stated bound and a measuring command (median of five alternating runs, `uptime` beside each), so it is a measured criterion; the rest name tests or a measured byte count (`wc -c`) recorded in the QA report.
- Check 24 (refusal in a self-rewriting writer): `status-history.js` appends rows built from its own `HEADER_ROW`, which has four columns, so its own output passes the new width check. Develop adds one test that a freshly written table is accepted by the next write (Optional).
- Task size: five phases, one sprint-or-less. No split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- The High risk (base-scan refusals break real doc examples) has a measured re-run mitigation and a revert rollback. Shape 4's refuse-all rule widens that risk: a legitimately safe block with a variable argument to a deny-listed command now refuses. Mitigation is already in the task: annotate in Phase 2. Differential oracle (check 7.1): the Phase 2 measured re-run compares before and after over every executed doc, which is the head-versus-base comparison asked for.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 6 (all applied)

1. Move shared-fixture work to `security-probe-plan.mjs` and its test.
2. Name the four test files.
3. Settle the Phase 4 row-width behaviour (refuse).
4. Add shape 4 to tests and criteria.
5. Add the removed-literal sweep over the 155 `runnable` test lines.
6. Name the removal for the syntax-check temp directory.

### Consider (Optional) - 3

1. Fix the "Five scripts" wording; correct the `:48` anchor to `:46`.
2. Run the `stripProse` idempotence property in develop.
3. Test that a freshly written status table passes the next write.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (before fixes; wrong file for one phase)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the six important issues were all document fixes, now applied. Develop should start from Phase 2.

---

## Review Metadata

- **Reviewer:** review-task (autonomous pipeline run, Claude)
- **Review Date:** 2026-11-09
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.274.qa-engines-stop-passing-what-they-cannot-see/task.274.qa-engines-stop-passing-what-they-cannot-see.md
- **Architecture Docs Consulted:** none read in full (pre-pass B did not run); alignment checked against the tree directly
- **Tracker:** no `github_issue` / `jira_key` in frontmatter; tracker sync was not offered (autonomous run, nobody to answer) and no issue was created
