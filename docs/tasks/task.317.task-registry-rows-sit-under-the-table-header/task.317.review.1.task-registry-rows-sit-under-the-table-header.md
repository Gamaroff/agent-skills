# Task Review Report: Task 317 - Task registry rows sit under the table header

**Reviewed:** 2026-11-21
**reviewed_blob:** cea2054db9c8de98eba84799f0ef146781acfee9
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD
> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-11-21

---

## Executive Summary

The task is accurate on its central claim and its plan is concrete. A scratch-copy run reproduced the defect and the fix: `registry-tick.js --annotate` on row 286 answered `no-cell` on the original layout and `annotated` once the stranded rows were moved. The review found stale figures (the registry gained task 317's own row, so 32 rows are stranded, not 31) and an unspecified test floor. Both are fixed in the document and plan.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions (pipeline mode; nothing ambiguous enough to ask)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Pipeline mode runs without questions; no finding needed an author decision.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes. No placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Sign-off: not configured (`sign-off.enabled` absent) — not checked. Change Log: present, with a creation row.
- Tracker linkage: no `github_issue` in frontmatter; tracker sync not offered in pipeline mode (the pipeline signals the tracker only when an issue is linked). Left unlinked, recorded as an Important gap the author may close with `/sync-github-task`.
- Card preflight (`--check-card`): clean — 3 card blocks resolve (the tool also printed a missing-credentials hint, irrelevant offline).
- `doc-links.js`: 4 relative links resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE (figures stale)
**Hallucinations Detected:** 0

Anchors read and confirmed: `registry-tick.js:1016` (`if (!/^\s*\|/.test(line)) return null;`), `:1080` (the `no-cell` message), `registry-tick.test.mjs:830` (the headerless-table test), `skills/create-task/SKILL.md:177`, `docs/standards/task-registry.md:14`.

Pre-pass: run inline (no Explore dispatch; independent review did not run — the task's own plan lists every file, and Explore subagents have hung in this repository). Architecture alignment: the change touches only a registry document, one eval test and two prose lines; no architecture rule applies. Codebase scan: not implemented — the test does not exist and the rows are still stranded.

Check 11 (invariant, run): the plan's regex `/^\| \d+\s*\|/` matches 317 rows; the unbroken table-line run after the separator ends at line 329; 32 rows sit below `## Notes`; no non-row table line sits after `## Notes`. So the test's premise holds and it is red on the current file.

Check 31 (the plan's own command, scratch copy only): `registry-tick.js --annotate --file …task.286… --pr 927 --json` → `no-cell` at line 407 on the original layout; `annotated` at line 330 after moving the stranded rows with an awk-written copy. No repository file was touched.

Check 15 (removed-literal sweep): the task removes no behaviour, command or message. Not applicable.
Check 18: the test lands in an existing file the runner already reaches. Not applicable.
Check 25: no new member of an enumerated class.

### Important

- **Stale figures.** The task and plan said 31 rows (tasks 286–316), lines 407–437 and a total of 307. Measured now: rows 286–317 at lines 407–438 (32 rows), total 317. Task 317's own row is among the stranded ones. — Fixed: prose now says "286 onward", names the date the awk ran, and tells the developer to re-run the measurement; the plan gives the row-count command.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are concrete, with the Edit-tool rule and a before/after row count. The plan's Phase 1 grep for line-position readers ran at review time: no consumer reads the registry by line number (the only line-keyed hits are test fixtures).

### Important

- **The placement test's floor was left to "the parser the sibling tests use".** A floor with no number can be satisfied by a parser that matched nothing. — Fixed: the plan now asserts at least 317 rows.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Success criteria classify cleanly: criterion 1 is a behaviour criterion held by the named placement test; criteria 2 and 3 are record criteria naming the QA report; the performance criterion is stated as not applicable; the quality criterion is a CI-state criterion; the CHANGELOG criterion names its file. Testing, rollback and risk sections agree with the phases. `CHANGELOG.md` has an `## [Unreleased]` heading (line 5) for the planned entry.

### Optional

- The mutation proof moves one row below `## Notes`. A second mutation (delete the header's separator line) would show the test also fails when the table has no separator. Not required.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks are named with mitigations; rollback is a revert. The concurrent-edit risk is real (other sessions append rows) and is handled by the one-commit rule.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 2 issues (applied)

1. Refresh stale row counts and line numbers; point at the measurement.
2. Give the placement test a numeric floor (317).

### Consider (Optional) - 1 item

1. A second mutation: remove the separator line.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 9/10 (no tracker issue linked)
- Technical Accuracy: 9/10 (figures were one stale; claims verified by execution)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ READY TO IMPLEMENT

**Justification:** The defect and the fix are both reproduced on a scratch copy, the anchors resolve, and the only findings were stale figures and an unspecified floor, both now fixed.

---

## Next Steps

Follow the three phases in order; run the awk measurement fresh before moving rows.

---

## Review Metadata

- **Reviewer:** review-task (pipeline mode)
- **Review Date:** 2026-11-21
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.317.task-registry-rows-sit-under-the-table-header/task.317.task-registry-rows-sit-under-the-table-header.md
- **Architecture Docs Consulted:** none needed (registry document, eval test and prose only)
