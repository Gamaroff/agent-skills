# Task Review Report: Task 327 - SubagentHandback replies are extracted, not hand-copied

**Reviewed:** 2026-11-26
**reviewed_blob:** 3caae1dea0fa2f530c35cff97750b3768bacc8c7
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-11-26

---

## Executive Summary

The task is small, well-anchored and test-first. Its one gap: the new `--out` removal would delete the
transcript itself when `--out` names it. The fix is a usage refusal, now in the plan with a fixture and
a criterion.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 (autonomous run inside `/develop-task`; no question needed user input)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. Invoked by `/develop-task` Step 2 with autonomous defaults: comprehensive report, apply all
critical + important fixes, promote on READY TO IMPLEMENT.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking, References and Change Log are present. No placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Tracker: `github_issue: 952` exists (OPEN); body link `[#952]` matches; board Priority self-healed.
- Card preflight: 3 card blocks resolve (`sync-jira-task.js --check-card`, exit 0). Omitted counts: Summary 3, Success Criteria 8, Breaking Changes 3 (information, not a defect).
- `doc-links.js`: 2 relative links resolve.

## 2. Technical Accuracy

**Status:** ACCURATE (one drifted anchor pair)
**Hallucinations Detected:** 0

Verified against the code on `develop` at `3f344ccfa`:

- `agent-reply-block.js`: `function extract` `:170`, `findTranscripts` `:71`, `replyText` `:116`, the `user` reset `:127`, the two `transcript-unreadable` returns `:204`/`:212`, the write `:241`, `extractUsageError` `:279`. All resolve.
- `finalise-rerun-scope.js`: `require` `:43`, the `extract` branch `:1212`, delegation `:1217`, the merge hash check `:1177`–`:1183`. Resolve.
- `skills/finalise/SKILL.md`: probe-plan extract command at `:725` (task said `:724`), AC fallback paragraph at `:1026`–`:1032` (task said `:1027`–`:1033`). **Optional — corrected in the task.**

Architecture pre-pass (Agent B) and codebase pre-pass (Agent C) were **not dispatched**: the review ran inline, so there is no independent read. Axes checked inline: the change is a pure Node module edit within `shared/resources/`, plus bundling via `npm run bundle`, consistent with the repository's coding standards (shared source, bundled copies regenerated, never edited).

#### Important

- **The `--out` removal can delete the transcript (check 10/11 — outcome walked through `extract`).** The plan puts `fs.rmSync(opts.out)` at the top of `extract`, before the transcript is read. When `--out` and `--transcript` name the same file, the removal deletes the input, and the call then answers `transcript-not-found` with the agent's reply gone. Today the same call only overwrites it on `extracted`. **Fix applied:** `extractUsageError` refuses `--out` equal to `--transcript` (a usage error, exit 2, no new `REASONS` entry); a fixture and a success criterion hold it.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

- Phases name the function, line and change; each test is red-first.
- Check 15 (removed literal): the plan rewrites "wrote nothing" in two SKILL.md paragraphs. `git grep -n "wrote nothing\|holds no final assistant text\|hand-copied (unverified)"` over `*.test.*`, `tests/`, `evals/`: no hit pins these paragraphs (6 hits, all other tests' own messages). Pattern pins searched by name: `git grep -n "entity-escaped\|extract wrote\|hand-copied\|probe-plan.json\|AC_SHA256"` over the test trees: none on the fallback text.
- Check 18: both test files already exist and are reached by the runner.
- Check 28: new fixtures use the suite's `withDir` (`mkdtempSync(join(tmpdir(), "arb-"))`, removed in `finally`).
- Effort: `estimated_effort_hours: 8`, consistent with 4 low-risk phases.

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Every behaviour criterion names its fixture in §8; the measured/process criteria (real transcript, red runs, mutation table) name the QA report as their record (check 22).
- `npm test` under `CI=true` is a CI-state criterion.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Three Low risks with mitigations; rollback is a revert plus `npm run bundle`. Partial rollback of Phase 2 stated.

#### Optional

- Phase 2's removal is a refuse-by-default widening only in the sense that it now deletes a file: the new usage refusal is its differential case.

---

## Summary of Recommendations

### Should Fix (Important) - 1 issue

1. Refuse `--out` = `--transcript` in `extractUsageError`, with a fixture and criterion. ✅ applied

### Consider (Optional) - 2 items

1. Correct the two drifted SKILL.md anchors. ✅ applied
2. Record the pre-pass independence loss (done above).

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

**Justification:** No critical issues; the one important gap is fixed in the document.

---

## Review Metadata

- **Reviewer:** Claude (review-task, inside develop-task Step 2)
- **Review Date:** 2026-11-26
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.subagenthandback-replies-are-extracted.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md (inline axes)
