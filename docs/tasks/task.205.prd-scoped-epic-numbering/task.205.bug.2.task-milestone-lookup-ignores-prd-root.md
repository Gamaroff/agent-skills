---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'The task milestone lookup never resolves PRD_ROOT, so a configured PRD root is ignored'
---

# Bug Report: Task 205 - The task milestone lookup ignores a configured PRD root

**Bug ID**: TASK-205-BUG-2
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-4, gate 1)
**Status**: Closed
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: The block in `ensure-task-github-issue` Step T3 defaults `PRD_ROOT` to `docs/prd` and never sources `references/resolve-paths.sh`.

**Expected Behavior**: The epic is looked up under the configured `prd.prdShardedLocation`.

**Actual Behavior**: In a consumer whose PRD root is configured elsewhere, `find` matches nothing and the task silently falls back to `Technical Tasks (standalone)`.

## Location

`skills/ensure-task-github-issue/SKILL.md:65` — `PRD_ROOT=${PRD_ROOT:-docs/prd}`.

## Recommendation

Source `references/resolve-paths.sh` (already bundled in the skill) inside the block.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Root Cause**: the block defaulted `PRD_ROOT` instead of resolving it; nothing in the skill sourced `resolve-paths.sh`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: the block sources the bundled `references/resolve-paths.sh`, which reads `prd.prdShardedLocation` from `skills-config.yaml` (default `docs/prd`).

**Files Modified**:
- `skills/ensure-task-github-issue/SKILL.md` — the block sources the resolver
- `tests/epic-numbering-retirement.test.js` — a fixture with `prdShardedLocation: specs/prd` (and a misleading `PRD_ROOT=docs/prd` in the environment) resolves the epic

**Testing**: mutation-proven — restoring the `${PRD_ROOT:-docs/prd}` default turns the test red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 1 diff review (CR-4) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix pass |
| 2026-10-15 | Closed | qa-task | Verified by task.205.qa.2.prd-scoped-epic-numbering.md |
