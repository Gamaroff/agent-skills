---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-15'
related: 'task 205'
description: 'sync-github-epic renames whatever milestone the epic issue is on, including a shared one'
---

# Bug Report: Task 205 - sync-github-epic renames whatever milestone the epic issue is on

**Bug ID**: TASK-205-BUG-1
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-1, gate 1)
**Status**: Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: The update path passes the issue's current milestone as `--rename-from` whenever it differs from `MILESTONE_TITLE`.

**Expected Behavior**: Only the epic's own old milestone (`Epic 3 — Foo` or `Epic 1.3 — Old title`) is renamed in place. Any other milestone is left alone, and the epic's milestone is resolved or created as before.

**Actual Behavior**: An epic issue placed on a shared milestone (a sprint, say) has that milestone renamed to `Epic 1.3 — Foo`, which retitles it for every other issue on it.

## Steps to Reproduce

1. An epic issue sits on milestone `Sprint 12`.
2. Run `/sync-github-epic` on the epic.
3. The rename block computes `RENAME_ARGS=(--rename-from "Sprint 12")`, and `tracker-issue.js` renames `Sprint 12`.

## Location

`skills/sync-github-epic/SKILL.md:182` — the `CURRENT_MILESTONE != MILESTONE_TITLE` condition.

## Recommendation

Pass `--rename-from` only when the current title is this epic's own milestone: it starts `Epic <E> — ` (legacy id) or `Epic <P.E> — `. Otherwise resolve or create as before.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Root Cause**: the rename block treated "the current milestone differs from the target" as "the current milestone is the epic's old one". An issue can sit on any milestone.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: the block passes `--rename-from` only when the current milestone is the epic's own — `Epic {EPIC_ID} — …` (retitled) or `Epic {digits/dots} — {EPIC_TITLE}` (id moved, legacy number included). Any other milestone is left alone and the epic's milestone is resolved or created. The block now also re-binds and guards its inputs (`ISSUE_NUM`, `EPIC_ID`, `EPIC_TITLE`, `MILESTONE_TITLE`), which closes the advisory CR-5.

**Files Modified**:
- `skills/sync-github-epic/SKILL.md` — rename condition, input guards, prose
- `tests/epic-numbering-retirement.test.js` — the block runs with a recording `node` over own (`Epic 3 — Foo`, `Epic 163 — Foo`, `Epic 1.3 — Old title`), foreign (`Sprint 12`, `Epic 9 — Other`, `Epic 1.30 — Bar`, `Release — Foo`, `Epic 9x — Foo`) and no-op cases, plus an unbound input

**Testing**: mutation-proven — widening the condition back to any milestone turns the test red.

**Verification Steps for QA**: run `node --test tests/epic-numbering-retirement.test.js`.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 1 diff review (CR-1) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix pass |
| 2026-10-15 | Closed | qa-task | Verified by task.205.qa.2.prd-scoped-epic-numbering.md |
