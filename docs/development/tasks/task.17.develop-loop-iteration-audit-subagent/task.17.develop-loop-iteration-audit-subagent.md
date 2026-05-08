---
id: task.17
title: "Add develop-loop iteration audit Explore subagent (story status + git log delta)"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 35
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #2)
---

# Task 17 — Develop-loop iteration audit subagent

**Status**: Planned

> Detailed implementation guide: [task.17.plan.develop-loop-iteration-audit-subagent.md](task.17.plan.develop-loop-iteration-audit-subagent.md)

## 1. Overview

Each iteration of the bounded develop loop (`MAX_ITER=5`) re-reads the full story file and inspects `git log` in main context to compute checkbox progress and capture the latest commit hash. This is repeated up to 5×, doubling main-context bloat.

**Scope**: replace inline reads with a single Explore subagent dispatched once per iteration that returns a structured JSON for stall detection. Main context never re-loads the story body during the loop.

**Key deliverables**:

- New Explore prompt in `develop-pipeline-step-3-develop-loop.md`
- Structured response schema: `{status, completed_count, total, last_commit_hash, stalled}`
- Stall detector reads JSON, never the story body

**Expected outcome**: main context flat across loop iterations.

## 2. Motivation

**Current Problems**:
- Story body re-read 5× in worst case
- Git log parsed inline each iteration
- Main context grows linearly with iteration count

**Benefits**:
- Per-iteration main read volume drops to ~0
- Resume contract simpler: stall state lives in JSON not main memory

## 3. Technical Background

**Current** (`skills/develop-story/references/develop-pipeline-step-3-develop-loop.md` lines 84-99):
- Main re-reads story file, counts `[x]` boxes, `git log -1 --format=%H` inline

**Target**:
- Single Explore call: "Read story file at <path>, count completed/total checkboxes from Tasks section; report Status field; run `git log -1 --format=%H`. Return JSON only."
- Response consumed by existing stall detector logic.

## 4. Scope

**In**: develop-loop iteration audit only.
**Out**: changes to MAX_ITER, stall detection logic itself, or `/develop` skill internals.

## 5. Breaking Changes

None — additive. Resume contract artifact format unchanged.

## 6. Implementation Plan

### Phase 1 — Define audit prompt (Low)
- [ ] Author Explore prompt with strict JSON schema
- [ ] Document fallback when JSON malformed (one retry, then halt iteration)

### Phase 2 — Wire into loop (Medium)
- [ ] Replace inline reads in step-3 reference doc
- [ ] Update stall detector pseudocode to consume JSON
- [ ] Preserve `INITIAL_COMPLETED` capture before iteration 1

### Phase 3 — Validation (Low)
- [ ] Dry-run on 5-iteration scenario
- [ ] Inject stall scenario, verify halt fires

## 7. Files Summary

**Modified**:
1. `skills/develop-story/references/develop-pipeline-step-3-develop-loop.md`
2. `skills/develop-story/references/develop-pipeline-resume-contract.md`

## 8. Testing Strategy

- Real story run with 2+ iterations; verify identical halt decisions vs baseline
- Malformed-JSON injection: confirm graceful retry-then-halt

## 9. Success Criteria

**Functional**:
- [ ] Audit dispatched once per iteration
- [ ] JSON consumed by stall detector with no story re-read in main
- [ ] Halt decisions identical to baseline on golden test case

**Performance**:
- [ ] Main reads per iteration: 0 (vs. 1 today)
- [ ] Total tokens for develop loop reduced ≥30% on 3-iter run

**Quality**:
- [ ] Stall detector tests (if any exist) still pass
- [ ] Resume contract validates

**Migration**:
- [ ] None — internal change

## 10. Risk Assessment

**Medium**: malformed JSON → infinite-retry risk. Mitigation: strict 1-retry cap then halt iteration with logged warning.

**Low**: subagent overhead per iteration > inline read. Mitigation: profile; if true, fall back to inline only on iter 1.

## 11. Rollback Plan

**Immediate**: revert step-3 reference changes. Inline read path preserved in git history.

**Trigger**: stall detection regression or repeated JSON parse failures in real runs.
