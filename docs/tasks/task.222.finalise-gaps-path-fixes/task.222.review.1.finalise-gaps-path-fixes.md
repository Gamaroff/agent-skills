# Task Review Report: Task 222 - finalise gaps-path fixes

**Reviewed:** 2026-10-21
**reviewed_blob:** b9ff7afff5ff146c4106b2654e91dc7ea305b920
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-10-21

---

## Executive Summary

The task is accurate: every claim checked against the code holds, including the measured gap counts. Three Important gaps were in the plan's reach, not its facts: a test that pins the old count is unlisted, the doc-sweep list and its success-criterion grep miss restatements, and the lock-rule change does not list the resume states it must hold in. All three are fixed in the document by this review.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (develop-task pipeline, autonomous — every finding had one evident fix)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside the `develop-task` pipeline (Step 2). Output format auto-answered "Comprehensive report"; Step 8.5 auto-answered "apply all critical + important fixes"; Step 9 auto-answered "fixes complete". No question point had an ambiguity that needed the user: each finding has one fix the document's own intent dictates.

Pre-pass Agents B and C were **not dispatched**; both passes were done inline (the Explore subagents in this environment have hung before). Independence loss recorded: the architecture and codebase checks were run by the same reader as the rest of the review.

---

## 1. Template Structure Compliance

**Status:** PASS

- Sections 1–11, Change Log, Progress Tracking, References and Notes present; no placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Tracker: `github_issue: 717` exists (OPEN); body link `[#717](…/issues/717)` matches. Board priority already P2.
- Card preflight: `sync-jira-task.js --check-card` — no problems, 3 card blocks resolve.
- Sign-off: not enabled in `skills-config.yaml` — not checked. Change Log: present, current for `planned`.
- `doc-links.js`: 1 relative link, resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Architecture axes from `prepass-axes.js` (`source: architecture`, 10 axes); the change is shell + Markdown + node:test, all in the documented stack.

Verified against the tree:

- `skills/finalise/SKILL.md` Step 8.5: the story/task arm is `GAP_COUNT=$(printf '%s' "$GAP_REPORT_BODY" | grep -c '^[[:space:]]*- \[ \]' || true)`; the bug arm calls `fill-verification-complete.sh … count`. ✅
- Step 8.4's example: 7 list items under `### Missing Criteria:` (1 `- [ ]`, 6 `- ⚠️`) and 7 `- [ ]` Next Steps; today's grep counts 8. ✅
- Measured counts re-run with Step 8.5's awk on the committed reports: task.181 at `d4f96471` → old 5 / Missing-Criteria items 3; task.199 at `bce0ef11` → old 3 / items 1. ✅
- `shared/resources/advance-pipeline-lock.sh`: `finalise)                   NEXT=8 ;;` in the `--skill)` case; header line `finalise        → 8   (Step 7 done)`; `--skill` exits 0 with no lock. ✅
- Finalise `## Pipeline Lock Cooperation` runs `--skill finalise 2>/dev/null || true`. ✅
- `**Final Status:**` lines: story/task Step 7.1 / 8.1; bug mode via `fill-verification-complete.sh` (`LINE='✅ ACCEPTED'`); the unfilled template line `**Final Status:** {✅ ACCEPTED | ❌ …}` does not match `^\*\*Final Status:\*\* ✅ ACCEPTED`, so the planned "unfilled → hold" case is reachable (check 10). ✅
- Bundler discovery: `references/dod-gap-count.sh` named in `skills/finalise/SKILL.md` seeds discovery (`discover_needed`), so the new helper lands in `skills/finalise/references/`. ✅
- Test reach (check 18): `shared/resources/tests/*.test.mjs` is in `package.json`'s `test` glob. ✅

### Issues

#### Important

- **I1 — An unlisted test pins the old count (check 15).** `evals/shared/tests/finalise-bug-mode.test.mjs`, test `"8.5 for a story/task still reads the document body, bounded at the next ## (task.152)"`, runs Step 8.5's extracted block on a gap section with `- [ ]` lines and **no `### Missing Criteria` subsection**, and expects `GAP_COUNT=3`. After Phase 2 the helper HALTs on that fixture. Found by searching tests for the block's literals (`git grep -ln "GAP_REPORT_BODY\|Gaps Identified\|GAP_COUNT" -- '*.test.*'`), not by feature name.
  - **Fix applied:** listed in Phase 4 and Files Summary; its fixture moves to the 8.4 shape. The same file's `gapsCommentBlock()` extractor is named as the harness for the § 8 integration test, so the extraction is not written twice.

- **I2 — The doc-sweep list is recall, and its grep misses token-free restatements (checks 13 and 20).** § 3 lists seven restatements and § 9 checks them with `git grep -n "moves the lock to 8"`. That literal misses `develop-pipeline-on-stop.sh:243` ("advances the lock to 8"), `:252` ("The lock reads 8 from the end of /finalise"), `:266` (`COMPLETION_LINE`: "/finalise moves it there") and `:280` ("/finalise moves it to 8"), and the test comments in `develop-pipeline-on-stop.test.sh:125,129,185` and `step-8-completion-checklist.test.mjs:472,764,862`.
  - **Fix applied:** § 3 records the search that defines the population, and § 9's criterion uses it.

#### Optional

- **O1 — The mapping-floor regex spans more than the `--skill` arm.** `step-8-completion-checklist.test.mjs` matches `/\n {2}--skill\)\n([\s\S]*?)\n {4}esac/`. The first `  --skill)` in the file is the pre-jq `commit-changes` block, so the capture runs from there to the first 4-space `esac`. Keep the new guard out of that span's shape: no 4-space `esac` before the `finalise)` arm. Noted in § 3 Important Clarifications.
- **O2 — Wording the sweep must keep.** `step-8-completion-checklist.test.mjs` test `"the Stop hook and the resume contract describe Step 7's tail in the same words"` and `develop-pipeline-on-stop.test.sh` (greps "at or below Step 7", "Step 7's tail") pin the tail description. Put the "on acceptance" qualifier on the lock clause, not inside the tail list. Noted in Phase 4.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files, checkbox changes, risk level and dependencies. Effort 8h is in line with the rubric (9 success-criteria groups, 4 phases, medium risk).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Control case present (§ 8: Missing Criteria items that are `- ⚠️`/`- [x]` beside Next Steps `- [ ]`). ✅
- Every behaviour criterion names a test; the performance criterion has a bound and a command (`npm test` wall time, ≤ 2%). ✅
- No post-merge criterion. ✅

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND → fixed

#### Important

- **I3 — The lock-rule change lists no reconstruction states (check 19).** The task changes when the lock reaches 8, which the resume contract reads. It must say which states the rule holds in.
  - **Fix applied:** § 3 gains a "Resume states" list: gaps HALT (lock 7, `halt_step` 7, task.170's re-entry path), accepted (8 before Step 7's tail, unchanged), Step 8a fix-and-recheck that accepts on its second pass, a PreCompact pause during Step 7, and a `/finalise` re-run after a gaps halt that writes `dod.{N+1}`.

Rollback (full and per-phase) is adequate; the two fixes are independent.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues (all applied)

1. List `finalise-bug-mode.test.mjs`'s story/task 8.5 test; move its fixture to the 8.4 shape; reuse its extractor.
2. Record the restatement search; use it in § 9.
3. List the resume states the lock rule must hold in.

### Consider (Optional) - 2 items

1. Keep the mapping-floor regex's span in mind when placing the guard.
2. Qualify the lock clause, not the Step 7 tail wording two tests pin.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 7/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No claim was wrong; the three gaps were in the plan's reach and are fixed in the document.

---

## Next Steps

Task is ready for implementation. Follow the phases in order, red tests first.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-10-21
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.222.finalise-gaps-path-fixes/task.222.finalise-gaps-path-fixes.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md (via prepass-axes.js)
