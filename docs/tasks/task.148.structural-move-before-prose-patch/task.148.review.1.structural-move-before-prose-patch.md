# Task Review Report: Task 148 - qa-fix and the QA loop: offer a structural move before another prose patch

**Reviewed:** 2026-09-25
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-09-25

---

## Executive Summary

The task is precise and its evidence reproduces: every engine outcome it promises was re-run against
the real task.143 and task.117 gates and matched. Two Important issues: task.146 is described as a
planned sibling but has merged, and the new 5b section was told its inputs are "already bound" when
two of them are bound nowhere in the loop document. Both are fixed in the task document.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — defaults recorded below)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` Step 2 (dispatched by `/develop-next`, item T148). No interactive questions.

- **Step 0 output format**: Comprehensive report (pipeline auto-answer).
- **Step 0a branch setup**: auto-skipped — already on `feature/task.148.structural-move-before-prose-patch`.
- **Step 8.5**: "Yes, apply all critical + important fixes" (pipeline auto-answer). Optional anchor fixes applied too — they are mechanical.
- **Step 9**: "Yes, fixes complete" (pipeline auto-answer) → `Planned → Ready for Development`.
- **Pre-pass test-placement finding**: kept at `tests/` on the task.146 precedent (see Optional 2). No question needed.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present. No placeholders.
- OKF: `type: task`, `description`, `tags` list present.
- Sign-off: `sign-off.enabled` not set in `skills-config.yaml` — not checked.
- Change Log: present and current (1.0, 1.1; this review adds 1.2 and the status row).
- Tracker: `github_issue: 478` — issue exists (OPEN); body link `[#478](…/issues/478)` matches.
- Card preflight (`sync-jira-task.js --check-card`): exit 0, 3 card blocks resolve. Summary omits 4 sentences, Success Criteria 10 items, Breaking Changes 5 — informational.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

Verified by execution, not by reading:

- `countRaised` / `readTopIssues` over task.143 gates 1–7: MEDIUM `2,1,2,0,1,1,0`, HIGH 0 on all seven, `file:`s exactly as the § 3 table states. The proposed predicate's conditions fire at cycles 2, 3 and 6 only.
- task.117 gates 1→2: every MEDIUM in `shared/resources/jira-sync.js` (fires); 2→3: gate 3 adds a task.42 doc → `medium-files-differ`. Rows 9 and 10 are reachable.
- `classifyLoopRoute` on the two proposed `ROWS`: cycle 3 → `continue` / `not-a-pass-gate`; cycle 5 budget-spent with MEDIUM `[2,1,2,0]` → `continue` / `medium-not-falling`. Both pins hold on today's code, which is their purpose.
- Population command: `-e 'who restores'` with `:(glob)` returns exactly the 5 files named. Without `:(glob)`, `-e 'third.strike'` does reach `shared/resources/tests/fixtures/report-lint/green/task.118.md` (and `task.122.md`). Claim holds.
- Anchors: qa-fix `:548 :550 :564 :575 :607 :631 :638` all resolve; engine `:263 :608 :662 :882`, `STATE_FIELDS` `:1165`, `const ROWS` `:78`, the HIGH-counting source guard — all resolve. Relative links: 3, all resolve (`doc-links.js` exit 0).
- Same-class mechanism inventory (check 6): present and justified ("sits beside" `classifyLoopRoute`, does not replace `high_files()`).

### Important

- **I-1 — The 5b offer's inputs are not "already bound".** § 3 said the new section calls the predicate
  with `$CYCLE`, `$HIGH_SEQUENCE_JSON`, `$GATE_N`, `$GATE_N1`, "which the third-strike rule already
  binds". It does not: `$CYCLE` and `$HIGH_SEQUENCE_JSON` are bound in 5a's Diminishing-returns table
  (`:593`), and `$GATE_N` / `$GATE_N1` are *used* at `:810` but bound nowhere in the document. A
  snippet written on that claim would read unbound variables. **Fix applied:** the section binds its
  four inputs in its own `| Variable | Where it comes from |` table, as the 2c section (`:1354`) does;
  Phase 3 and the wiring test now require it.

### Optional

- **O-1 — Two loop-document anchors drifted.** `:1280` → `:1301` (*deliberately no second escalation
  path*); `:1351` → `:1372` (`MEDIUM_N < MEDIUM_{N-1} < MEDIUM_{N-2}`). **Fixed.**

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with files, risk and checkboxes. `estimated_effort_hours: 16` is within 2× of the
rubric for 7 functional criteria, 5 phases and medium risk — no finding.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I-2 — task.146 is merged, not "in flight".** § 3 called task.146 "planned" and Risk 2 planned for
  a merge conflict. task.146 is `accepted` (`6090aea6`, `b6bf41d5`), and the qa-fix anchors in § 3
  were already measured on the tree that carries its table. **Fix applied:** § 3 records it as merged;
  Risk 2 now names the real residual risk — disturbing what `tests/identity-rule-probe.test.js`
  extracts — with "run it after Phase 4" as the mitigation.

### Optional

- **O-2 — Test placement (pre-pass B, low).** `tests/qa-fix-structural-move.test.js` is a qa-fix-only
  test in the top-level `tests/`, which `source-tree.md` reserves for cross-cutting tests. Kept: the
  merged precedent for a qa-fix Step 3.5 test is `tests/identity-rule-probe.test.js`, and a new
  `skills/qa-fix/tests/` directory would run nowhere until `package.json` gains its glob.
- **O-3 — Behavioural evidence.** The Step 2.6 hand run is recorded, not automated; the task says so
  plainly. No change.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Additive, no route change, one-PR revert plus `npm run bundle`. Medium risk 1 (offer firing on a
deliverable-refining loop) has a named move (`patch`) and a fixture row.

---

## Pre-pass Summaries

- **Agent B (architecture):** `drift` — one low finding (test placement, O-2).
- **Agent C (codebase):** `not-implemented` — no symbol exists yet.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 2 (both applied)

1. Bind the 5b offer's four inputs in its own Variable table (I-1).
2. Record task.146 as merged; rewrite Risk 2 (I-2).

### Consider (Optional) - 3

1. Correct anchors `:1301`, `:1372` (applied).
2. Keep the qa-fix test in `tests/` (no change).
3. Hand-run evidence stays manual (no change).

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; both Important issues were document fixes and are applied.
Every outcome the success criteria name was reproduced against the real gates.

---

## Review Metadata

- **Reviewer:** review-task (Claude, develop-task Step 2)
- **Review Date:** 2026-09-25
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.148.structural-move-before-prose-patch/task.148.structural-move-before-prose-patch.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/source-tree.md` (via pre-pass B and direct read)
