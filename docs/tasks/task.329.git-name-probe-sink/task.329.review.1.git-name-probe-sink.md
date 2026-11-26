# Task Review Report: Task 329 - A git-name sink for classifiers of repository names

**Reviewed:** 2026-11-26
**reviewed_blob:** e2171088ec8d6eac3cabdc08658e9679e8b86448
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-11-26

---

## Executive Summary

The task is small, measured and well-scoped. Every current-state claim carries a citation, and the
mutation table was run, not reasoned. Two Important gaps were fixed in place: a success criterion that
only a manual `git diff` could check now has a test, and the tests that enumerate `SINKS` are named.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️ (both fixed)
**Optional Improvements:** 1 💡

**User Clarifications:** 0. This was a pipeline run (develop-task Step 2), and nothing needed the author.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The review is a pipeline auto-run: Step 8.5 applied all critical and important fixes, and
Step 9 promoted the task.

---

## Review Method

- **Pre-pass agents B and C did not run.** The pass was done inline, so there is no independent read of
  this document.
- `doc-links.js`: 4 relative links resolve.
- Card preflight (`sync-jira-task.js --check-card`): no problems, 3 card blocks resolve.
- Claims in § 3 were re-run against `isDocsPath`, at HEAD and against scratch copies with refusal lines
  removed. The results match the two tables (check 11).

---

## 1. Template Structure Compliance

**Status:** PASS. All 11 sections are present, frontmatter is OKF-conformant (`type: task`,
`description`), and `github_issue: 955` resolves with a body link.

## 2. Technical Accuracy

**Status:** ACCURATE. Hallucinations detected: 0.

These anchors were spot-checked: `security-input-corpus.mjs:29` (`SINKS`), `:98`, `:1081`, `:1174`;
`ci-tree-equivalence.js:167`; `security-probe.mjs:484`; `security-review-prompt.md:87`;
`security-input-corpus.test.mjs:56` and `:580`; `security-input-corpus.md:86` and `:387`.

#### Important
- **Check 25: a new member of an enumerated class.** Tests that enumerate `SINKS` were not named.
  `git grep -n "SINKS" -- '*.test.*'` finds `security-probe.test.mjs:7289` (`validateCases` over every
  sink's cases) and `review-security.test.js:117`, beside the corpus test. **Fixed**: § 8 names each,
  and what each requires.

## 3. Implementation Plan Completeness

**Status:** COMPLETE. The plan gives the case table, blurb text, routing sentences and mutation anchors.

#### Optional
- U+0001 has no glyph in `renderInput`'s `CONTROL` map, so it renders raw in the generated table. The
  plan already says to check the output. No change.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND, and fixed.

#### Important
- **Check 4: a behaviour criterion with no per-PR test.** "`corpusFor("path")` is unchanged" was graded
  by a `git diff` command that no test runs. **Fixed**: the criterion now names a test that pins the
  `path` ids and directions, and the plan's Phase 1 adds it.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The change adds a sink and narrows nothing. Rollback is a revert plus a bundle.

---

## Summary of Recommendations

### Should Fix (Important): 2, both applied

1. Pin `corpusFor("path")` with a test.
2. Name the `SINKS`-enumerating tests in § 8.

### Consider (Optional): 1

1. Check how U+0001 renders in the regenerated table.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ READY TO IMPLEMENT

---

## Review Metadata

- **Reviewer:** review-task (inline, pipeline Step 2)
- **Review Date:** 2026-11-26
- **Task File:** docs/tasks/task.329.git-name-probe-sink/task.329.git-name-probe-sink.md
- **Architecture Docs Consulted:** the always-load trio (coding standards, tech stack, source tree)
