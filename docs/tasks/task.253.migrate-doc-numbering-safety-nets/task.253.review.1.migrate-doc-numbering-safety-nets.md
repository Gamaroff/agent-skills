# Task Review Report: Task 253 - migrate-doc-numbering: link, frontmatter and downstream safety nets

**Reviewed:** 2026-11-03
**reviewed_blob:** b21cbd938039819559a2d3a46a26cf99b6da2af4
**Review Depth:** Standard
**Task Status:** planned (promoted to ready-for-development by this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-11-03

---

## Executive Summary

The task is well scoped and honest about what is unverified. The review found stale code anchors and an unexamined cause for gap 1, and fixed both in the document. No hallucinated technology was found.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (pipeline run, `--defaults`; every finding was resolvable from the code)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Decisions the review took on its own, per the pipeline defaults:

- "Generated file" is defined by the plan's directory-suffix list, each entry with a reason. A file-header marker is a second signal only if Phase 1 shows it is needed.
- Gap 1 is fixed in the migration tool, not in the shared `doc-links.js`, unless the Phase 1 test shows the matcher at fault.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; no placeholders; file name follows `task.{id}.{name}.md`.
- OKF frontmatter: `type: task` and `description` present.
- Change Log present with the canonical columns; the newest row was stale against `status` before this review and now records the review and the promotion.
- Tracker card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve (Summary, Success Criteria, Breaking Changes). Information only: Summary omits 2 sentences, Success Criteria 6 items, Breaking Changes 3 items behind "+N more" links.
- Relative links (`doc-links.js --file`): 1 link, resolves.
- No `github_issue` / `jira_key`: tracker linkage skipped (no tracker issue; sync is opt-in and not part of this pipeline run).

### Optional

- `estimated_effort_hours: 16` for five phases is plausible; not re-derived.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (all fixed)
**Hallucinations Detected:** 0

### Important

- **Eight line anchors had drifted.** Re-measured against `develop` at `05dc71ad` (all paths were right, all line numbers wrong):

  | Task cited | Actual |
  | --- | --- |
  | rewrite pass reads links `:999` | `linkPass` `:1133` |
  | `planEdits` `:1172` | `:1306` |
  | `prd_number` `:1223`, `:1238`, `:1256` | `:1357`, `:1372`, `:1390` |
  | registry stub `:1650-1690` | `MIGRATED_EPICS_HEADING` `:1671`, builder `:1771-1816` |
  | `dirty-path` `:95`, `:1516` | code list `:98`, emitted `:1657` |

  `doc-links.js:175` and `:204` were correct. Fixed in the task (section 3) and the plan.

- **Gap 1's stated cause was wrong, and the stated fix location with it.** The task said the matcher does not match a link whose text spans a newline. It does: `extractRelativeLinks("a\n[multi\nline](../../epic.1.alpha.md)\n")` returns `[{target:"../../epic.1.alpha.md", line:2}]`. The reported line is the line of the opening `[`; the target is on line 3. The apply loop at `migrate-doc-numbering.mjs:1513-1530` rewrites per line and skips a `from` not found on the reported line (`if (next === s) continue`), which fits the symptom exactly. Evidence: the `node -e` call above, and a read of the loop. Phase 2 now fixes it in the migration tool and leaves `doc-links.js` alone unless the Phase 1 test says otherwise. This also removes the plan's High-risk shared-module change from the likely path.

- **Caller list for `doc-links.js` was missing.** Measured with `grep -rln "doc-links" shared skills scripts tests evals` (bundled `references/` copies excluded): `migrate-doc-numbering.mjs`, `jira-sync.js`, `status-history.js`, `qa-read-back.js`, `finalise-fix-and-recheck.mjs` and the `sync-jira-*` link tests. `tests/lib/markdown-links.js` has its own separate `extractRelativeLinks` and is not a caller. Listed in section 3.

### Optional

- A new blocker or warning code must not reuse `registry-behind` (`:100`), which is about the epic registry, not the git upstream. Noted in section 3.

### Checks that found nothing

- Test reach (check 18): `shared/resources/tests/*.test.mjs` is in the `test:suite` glob in `package.json`, so the planned tests run.
- Removed-literal sweep (check 15): the stub keeps `status: retired` and its heading; the task changes only links in it. Existing tests assert `status` `retired` (`migrate-doc-numbering.test.mjs:721`, `:1931`), which the change leaves alone. Phase 4 should still run the whole file.
- Call-site population (check 14), compatibility handling (12), resume states (19): not applicable.
- Chokepoint: the legacy-name scan is told to use `doc-id.js` or a reasoned allowlist entry; consistent with `tests/doc-id-chokepoint.test.js`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases name files and changes. Phase 1 (reproduce first, drop what does not reproduce) is the right shape for a task where only one gap was reproduced. "Generated" was undefined in the task body; the plan defines it as directory suffixes with reasons, and the task now says so.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Criteria that demand a record name its location (the QA report), none rest on the implementation report.
- The performance criterion names a test (the read counter assertion) rather than a wall-clock bound.
- "Each fix's test goes red when reverted" is held by the Phase 5 mutation proof.
- Dirty/behind: Breaking Changes (warn in dry run and `--check`, block on `--apply`) matches the Risk table (no upstream means skip and say so).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The High-risk `doc-links.js` change is now conditional, which lowers the risk. Per-phase commits make partial rollback a single revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 3 (all applied)

1. Re-measure the stale anchors.
2. Record the verified cause of gap 1 and move its fix to the migration tool.
3. List the callers of `doc-links.js`.

### Consider (Optional) - 1 (applied)

1. Keep new blocker codes distinct from `registry-behind`.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 before fixes, 9/10 after
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues, and the three important findings are corrected in the document.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, pipeline mode)
- **Review Date:** 2026-11-03
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.253.migrate-doc-numbering-safety-nets/task.253.migrate-doc-numbering-safety-nets.md
- **Architecture Docs Consulted:** none loaded; scope is one script and its tests, and the pre-pass subagents were not dispatched (checks run inline against the code)
- **Independence note:** the architecture-alignment and already-implemented pre-passes did not run; check 14/15/18 and the anchors were verified inline.
