---
id: task.21
title: "Add pre-qa-fix QA findings ingester Explore subagent"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 39
source_plan: .agents/plans/purrfect-whisper.md (Section A #6)
---

# Task 21 — Pre-`/qa-fix` findings ingester subagent

**Status**: Planned

> Detailed implementation guide: [task.21.plan.qa-fix-findings-ingester-subagent.md](task.21.plan.qa-fix-findings-ingester-subagent.md)

## 1. Overview

`/qa-fix` Step 1 currently loads the full QA gate YAML, the full QA report markdown, and every co-located bug report into main context before triage.

**Scope**: insert a read-only Explore subagent that ingests all QA artifacts and returns a Findings Summary (≤200 words, risk-sorted). Main context starts triage from the summary.

## 2. Motivation

- 3+ artifacts loaded inline; multiple bug reports compound bloat
- Risk-sort happens twice (once by ingester, once by `/qa-fix` triage) — collapse

## 3. Technical Background

**Current**: `skills/qa-fix/SKILL.md` Step 1 reads gate, report, bug reports.

**Target**: dispatch Explore: "Read gate YAML, QA report, all bug reports under <task-dir>. Return Findings Summary risk-sorted: each finding = {id, severity, file, one-line description, suggested fix path}. Cap 20 findings."

## 4. Scope

**In**: artifact ingestion.
**Out**: actual fix application (still in main); bug-report status updates.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1 — Findings Summary schema (Low)
- [ ] Compact JSON or markdown table format
- [ ] Severity sort + cap

### Phase 2 — Explore prompt (Low)
- [ ] Discovery globs co-located with story/task
- [ ] Truncation rule when >20 findings

### Phase 3 — Wire into qa-fix Step 1 (Medium)
- [ ] Replace inline reads with summary consumption
- [ ] Preserve existing Step 3 codebase Explore

### Phase 4 — Validation (Low)
- [ ] Run on QA cycle with 3+ bug reports
- [ ] Verify fix prioritisation matches baseline

## 7. Files Summary

**Modified**:
1. `skills/qa-fix/SKILL.md`

**New**:
2. `shared/resources/qa-findings-ingester-prompt.md`

## 8. Testing Strategy

- QA cycle with 5 findings (mix of high/med/low) → priority order matches manual review
- Empty bug-report scenario → ingester returns empty summary cleanly

## 9. Success Criteria

**Functional**:
- [ ] QA artifacts not loaded inline in qa-fix Step 1
- [ ] Findings Summary risk-sorted
- [ ] Fix order matches baseline within tolerance

**Performance**:
- [ ] Main tokens for qa-fix Step 1 reduced ≥70%

**Quality**:
- [ ] Findings cap respected; truncation logged

**Migration**:
- [ ] None

## 10. Risk Assessment

**High**: ingester drops a critical finding → developer skips fix. Mitigation: cap is 20 but findings >20 trigger explicit "TRUNCATED — N additional findings not shown" warning that halts qa-fix until user confirms.

**Medium**: severity mis-sort. Mitigation: include raw severity field; main can re-sort if needed.

## 11. Rollback Plan

Revert `skills/qa-fix/SKILL.md`; inline reads restored.
