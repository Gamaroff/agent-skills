# Task Review Report: Task 284 - Migrate shipped payload heredocs to the file tool

**Reviewed:** 2026-11-20
**reviewed_blob:** 773966824cf3829b97a2337b71e58bbc77ea5e2b
**Review Depth:** Standard (run inside the develop-task pipeline; Phase 1.5 pre-pass agents not dispatched, checks done inline)
**Task Status:** planned (promoted to ready-for-development)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its structure passes. The review found one missed site, two scope errors, a missing removed-literal sweep and an unmeasured performance criterion. All were fixed in the document. No question was asked: the pipeline runs on defaults.

**Critical Issues:** 0
**Important Issues:** 5 (all fixed)
**Optional Improvements:** 1
**User Clarifications:** 0 (pipeline autonomous run)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Step 0 output format, Step 8.5 and Step 9 were auto-answered per the develop-task defaults.

---

## 1. Template Structure Compliance

**Status:** PASS

- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no findings.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Change Log present and now current. No tracker issue is linked (`github_issue` absent): tracker sync was not offered, since the pipeline asks nothing. Run `/sync-github-task` later if a card is wanted.
- Relative links: `doc-links.js` reports the one link resolves.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

- **[Important] Missed site.** Phase 1 omitted `shared/resources/develop-pipeline-resume-contract.md`, which holds an allowlist row (`DETECTOR_EOF`). Evidence: the ALLOWLIST in `shared/resources/tests/payload-heredoc-ratchet.test.mjs` lines 67-71. Fixed in Phase 1.
- **[Important] Scope error: `qa-fix`.** Phase 2 lists `skills/qa-fix/SKILL.md`, which has no allowlist row. Its one `<<` (line 894) is a `read -d ''` here-document. Fixed: named as verify-and-leave.
- **[Important] Scope error: `ensure-task-github-issue`.** Phase 4 listed it, but only bug, epic and story carry rows. Fixed: moved to the citation sweep.
- **[Important] Figures that decay.** The document said 32 heredocs and 31 posting files. The ratchet test measures 31 heredoc sites (22 rows) and `git grep -l -e '--body-file'` returns 32 files. Fixed: the document now cites the commands and dated readings.
- **[Important] Removed-literal sweep (check 15).** The plan deleted heredoc lines and listed no tests that pin them. Eight test files mention heredoc payload literals (command: `git grep -lE "comment-body\.md <<|<<'EOF'|…" -- '*.test.*' 'tests/**' 'evals/**'`). Fixed: sweep added to Testing Strategy with the file list and a pattern-pin search by file name.
- **[Optional] Unquoted lock heredoc.** The step 1 lock heredoc expands `$(date -u …)`. The migrated text must say where the timestamp comes from. Folded into Phase 1.

Checks that passed: test runner reach (the ratchet test is already in the runner; `CI=true node --test shared/resources/tests/payload-heredoc-ratchet.test.mjs` passes 7 of 7), enumerated-class tests (the ratchet itself), site list carries its search (population commands present).

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Each phase names files, changes and dependencies. The per-site procedure is in the plan file.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

- **[Important] Performance criterion** named no measuring command or load record. Fixed: `uptime; time CI=true npm test` on head and `develop` on the LAN server, both figures and the load recorded in the QA report Findings.
- The migration criterion for citation sites names the QA report as the record location. Good.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Per-axis commits make the rollback a single revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 5, all applied

1. Add the resume-contract site to Phase 1.
2. Correct the qa-fix and ensure-task scope.
3. Replace decaying counts with commands and dated readings.
4. Add the removed-literal sweep.
5. Make the wall-time criterion measurable.

### Consider (Optional) - 1, applied

1. State how the migrated lock text obtains its timestamp.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** READY TO IMPLEMENT

**Justification:** No critical issue; the five important findings were corrected in the document.

---

## Review Metadata

- **Reviewer:** Claude (develop-task pipeline Step 2)
- **Review Date:** 2026-11-20
- **Task File:** docs/tasks/task.284.migrate-payload-heredocs-to-file-tool/task.284.migrate-payload-heredocs-to-file-tool.md
