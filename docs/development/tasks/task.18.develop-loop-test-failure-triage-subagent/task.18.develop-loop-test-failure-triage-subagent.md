---
id: task.18
title: "Add develop-loop test-failure triage Explore subagent"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 36
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #3)
---

# Task 18 — Develop-loop test-failure triage subagent

**Status**: Planned

> Detailed implementation guide: [task.18.plan.develop-loop-test-failure-triage-subagent.md](task.18.plan.develop-loop-test-failure-triage-subagent.md)

## 1. Overview

When a develop iteration's test run fails, main context currently parses the entire test log (often 1k+ lines for jest/pytest) and re-reads source files to classify failures. Triage is duplicated work: a subagent can do it once and return ≤10 bullets.

**Scope**: capture test output to a temp file, dispatch read-only Explore subagent to triage failures (real / flaky / unrelated), return short structured summary plus one suggested next file to inspect.

**Key deliverables**:
- Triage Explore prompt
- Output schema (real/flaky/unrelated counts + bullets + next-file hint)
- Wired into `/develop` failure path (or develop-pipeline step 3 caller)

## 2. Motivation

**Current Problems**:
- Full test logs flood main context on failure
- Source files re-read for failure classification
- Re-runs amplify the bloat

**Benefits**:
- Test log never enters main; only the triage summary does
- Classification consistent across runs

## 3. Technical Background

**Current**: develop's test command output streams into main context; assistant reads source files manually.

**Target**: redirect output to `.claude/state/test-output-<ts>.log`, then dispatch Explore: "Read this log, classify failures, return ≤10 bullets and a next-file hint." Main reads only summary.

## 4. Scope

**In**: triage on failure in develop loop.
**Out**: changes to test commands themselves; passing-test handling.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1 — Capture log to temp file (Low)
- [ ] Update develop pipeline to redirect test stdout/stderr to file
- [ ] Define filename convention `.claude/state/test-output-<iter>-<ts>.log`

### Phase 2 — Author triage prompt (Low)
- [ ] Strict output schema (counts + bullets + suggested next-file)
- [ ] Failure-mode bullets capped at 10; longer logs summarised

### Phase 3 — Wire dispatch (Medium)
- [ ] On non-zero exit, dispatch Explore with log path
- [ ] Main consumes summary only; never reads raw log

### Phase 4 — Validation (Low)
- [ ] Real run with intentional test failure
- [ ] Synthetic flaky test scenario

## 7. Files Summary

**Modified**:
1. `skills/develop/SKILL.md` (test failure handling)
2. `skills/develop-story/references/develop-pipeline-step-3-develop-loop.md` (caller wiring)

**New**:
3. `shared/resources/test-failure-triage-prompt.md`

## 8. Testing Strategy

- Inject failing test, verify triage classifies correctly
- Inject 100+ failures, confirm summary stays ≤10 bullets
- Verify temp log file cleaned up after step

## 9. Success Criteria

**Functional**:
- [ ] Test logs never read into main context
- [ ] Triage summary surfaces in implementation report
- [ ] Next-file hint actionable

**Performance**:
- [ ] Main token usage on failed iteration drops ≥70%

**Quality**:
- [ ] Triage accuracy ≥80% on golden examples

**Migration**:
- [ ] None

## 10. Risk Assessment

**Medium**: triage misclassifies real failure as flaky → developer skips fix. Mitigation: bias prompt toward "real" when in doubt; require explicit evidence for "flaky".

**Low**: temp file disk usage. Mitigation: cleanup on step completion.

## 11. Rollback Plan

Revert wiring; develop falls back to streaming output to main. No state migration.
