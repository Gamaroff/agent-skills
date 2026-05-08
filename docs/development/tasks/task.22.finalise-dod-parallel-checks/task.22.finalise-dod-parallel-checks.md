---
id: task.22
title: "Replace finalise serial DoD checklists with 4 parallel Explore subagents"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~1 day
depends_on: —
github_issue: 40
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #7)
---

# Task 22 — `/finalise` DoD parallel checks (4 Explore subagents)

**Status**: Planned

> Detailed implementation guide: [task.22.plan.finalise-dod-parallel-checks.md](task.22.plan.finalise-dod-parallel-checks.md)

## 1. Overview

`/finalise` currently runs four checklists serially in main context (AC traceability, security, compliance, docs/changelog completeness) and writes the running DoD summary incrementally — ~40 writes per run.

**Scope**: dispatch four read-only Explore subagents in parallel; each returns a pass/fail bullet list; main writes DoD running summary in **one** consolidated pass per section.

**Key deliverables**:
- 4 Explore prompts (AC / security / compliance / docs)
- Parallel fan-out wired into `/finalise`
- Single consolidated DoD summary write per section (not per check)

## 2. Motivation

- Biggest single context-saving in the pipeline (per plan analysis)
- ~3-4× wall-clock saving via parallel fan-out
- Reduces incremental file-writes from ~40 to ~5

## 3. Technical Background

**Current**: `skills/finalise/SKILL.md` walks each checklist serially, writing DoD running summary after every check.

**Target**: 4 parallel Explore subagents (single message, multiple tool calls). Each produces structured bullets:
- **AC traceability**: ACs vs PR diff vs tests
- **Security**: per story-type checklist evidence in code
- **Compliance**: GDPR/PCI/WCAG/HIPAA evidence
- **Docs**: changelog + readme updates verified

## 4. Scope

**In**: DoD checklist phase only.
**Out**: PR comment posting, tracker closure, Sprint Review summary (still serial post-DoD).

## 5. Breaking Changes

DoD running summary file content shape may change subtly (consolidated sections vs incremental). Migration: existing DoD readers (humans) unaffected — markdown still scannable.

## 6. Implementation Plan

### Phase 1 — Author 4 prompts (Low)
- [ ] AC traceability prompt
- [ ] Security checklist prompt (story-type-aware)
- [ ] Compliance checklist prompt
- [ ] Docs/changelog prompt

### Phase 2 — Wire parallel dispatch (High)
- [ ] Single-message fan-out in `/finalise`
- [ ] Aggregate results before write
- [ ] Failure handling: any 1 agent fails → that section flagged "needs manual review"; others continue

### Phase 3 — DoD summary writer (Medium)
- [ ] Single consolidated write per section
- [ ] Preserve idempotent marker for re-runs

### Phase 4 — Validation (Medium)
- [ ] Compare DoD output baseline vs new on 3 representative tasks
- [ ] Inject missing-evidence scenario; confirm flagged correctly

## 7. Files Summary

**Modified**:
1. `skills/finalise/SKILL.md`

**New**:
2. `shared/resources/finalise-dod-ac-prompt.md`
3. `shared/resources/finalise-dod-security-prompt.md`
4. `shared/resources/finalise-dod-compliance-prompt.md`
5. `shared/resources/finalise-dod-docs-prompt.md`

## 8. Testing Strategy

- Golden run on completed task with full DoD pass: bullets identical to baseline
- Story with missing changelog: docs subagent flags it
- Failure simulation: kill one subagent, verify partial DoD with manual-review marker

## 9. Success Criteria

**Functional**:
- [ ] 4 subagents dispatched in single parallel block
- [ ] DoD summary content equivalent to baseline
- [ ] Partial-failure path produces actionable output

**Performance**:
- [ ] Wall-clock for DoD phase reduced ≥3×
- [ ] DoD-summary file writes reduced from ~40 to ≤5

**Quality**:
- [ ] No false-pass on missing-evidence test
- [ ] Idempotent re-run produces no duplicate DoD sections

**Migration**:
- [ ] DoD format change documented in finalise skill

## 10. Risk Assessment

**High**: subagent misses evidence and DoD passes wrongly. Mitigation: prompts must require explicit file/line citations for each pass-bullet; "no citation" defaults to fail-flag.

**Medium**: parallel fan-out token spike. Mitigation: net win expected; measure on first 3 runs.

**Low**: idempotent marker collision on re-run. Mitigation: existing marker pattern reused.

## 11. Rollback Plan

Revert `skills/finalise/SKILL.md`; serial path is preserved in git history. DoD summaries from new path remain valid (markdown).

**Trigger**: false-pass detected in real run, or wall-clock not improved after profiling.
