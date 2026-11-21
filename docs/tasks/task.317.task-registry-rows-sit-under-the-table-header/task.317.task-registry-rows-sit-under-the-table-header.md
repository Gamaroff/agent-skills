---
id: task.317
title: "Task registry rows sit under the table header"
type: task
description: "Move the 31 registry rows stranded after the Notes section back under the table header, add a test that holds every row in one contiguous block, and say in the writers' prose where a new row goes, so registry-tick --annotate can find the notes cell again."
tags: [task-registry, registry-tick, develop-next, deferred-work]
category: refactoring
status: planned
priority: Medium
created: 2026-11-21
updated: 2026-11-21
estimated_effort_hours: 2
---

# Task 317: Task registry rows sit under the table header

**Status:** Planned

---

## 1. Overview

`docs/tasks/task-registry.md` holds one table, but its last 31 rows (tasks 286–316) sit after the `## Notes` section, separated from the table header by about 80 lines of prose. `registry-tick.js --annotate` finds a row's notes cell by walking up from the row to its table header, so it answers `no-cell` for every one of those rows and records nothing. It surfaced on task 286: the merge step reported `no-cell` ("no table header above the row") and made no commit.

**Scope**: `docs/tasks/task-registry.md` (move rows), one test under `evals/shared/tests/`, and the prose that tells a writer where a new row goes (`skills/create-task/SKILL.md`, `docs/standards/task-registry.md`).

**Key deliverables**:

1. Rows 286–316 sit directly under row 285, inside the table.
2. A committed test fails when any registry row sits outside the one table block.
3. The writers' prose says a new row goes after the last row of the table, never at the end of the file.

---

## 2. Motivation

### Current Problems

1. **`--annotate` cannot annotate 31 rows.** `findHeader` walks up from the row over table lines only and returns `null` at the first line that is not a table row (`shared/resources/registry-tick.js:1016`, `if (!/^\s*\|/.test(line)) return null;`), and `annotateRow` then answers `no-cell` (`:1080`). Run on task 286's row on 2026-11-21 it returned `reason: no-cell`, `line: 405`, `stageReason: not-attempted`. Every task from 286 on has the same fate, so a merged PR is never recorded on its row.
2. **Nothing catches it.** `evals/shared/tests/task-registry-drift.test.mjs` passes (6 of 6, run 2026-11-21) with the rows stranded: it reads the whole file for rows and compares their status with the documents, and never asks where a row sits. `select-next.mjs` also reads the stranded rows (it selected T290, line 409). So the defect is silent everywhere except the one place it bites.
3. **Writers have no placement rule.** `/create-task` "appends a row" (`skills/create-task/SKILL.md:177`, `docs/standards/task-registry.md:14`) and says nothing of where. Row 285 landed in the table (commit `18c46cd66`), and row 286 at the end of the file (commit `2b5a025da`); every row since followed the last one.

### Benefits

- `develop-next` can record "PR #N merged" on a row again, and `/finalise`'s status tick keeps working as before.
- The next stranded row turns a test red at the commit that strands it, not weeks later in a merge step.

---

## 3. Technical Background

### Current Architecture

Population, measured 2026-11-21 (the test records the count, not this prose):

```bash
awk '/^\| [0-9]+ \|/{split($0,a,"|"); id=a[2]+0; if(NR!=last+1){ if(start) print "rows "sid"-"lid" at lines "start"-"last; start=NR; sid=id } last=NR; lid=id } END{print "rows "sid"-"lid" at lines "start"-"last}' docs/tasks/task-registry.md
```

Output: `rows 10-285 at lines 54-329` and `rows 286-316 at lines 407-437`. The header is at line 43 (`| #  | Title | Status …`), the separator at line 44, `## Notes` at line 345. Rows 1–9 sit at lines 45–53 and the first run starts at 54 only because the awk pattern needs a two-space id match; the block is contiguous. The 31 stranded rows are the second run.

`registry-tick.js` resolves the notes cell from the row's own table header (`findHeader`, `shared/resources/registry-tick.js:1016`), and `annotateRow` returns `no-cell` when it finds none (`:1080`, `has no table header above it — cannot tell which cell is the notes cell`). A test already holds that behaviour for a headerless table (`shared/resources/tests/registry-tick.test.mjs:830`), so the engine is correct and the file is wrong.

### Target Architecture

One contiguous table: header, separator, then every row in number order, then the `---` and `## Notes`. A new test parses the file and asserts that every line matching a registry row lies inside the single block that follows the header and separator, with a non-vacuity floor on the row count. The writers' prose says where the next row goes.

### Important Clarifications

- **Property claimed, then run.** The `no-cell` answer was reproduced on row 286 and the drift test was run green over the stranded layout before either was written down.
- **No engine change.** `registry-tick.js` is correct to refuse; the task does not teach it to guess a header further up.
- **Concurrent edits.** Moving 31 rows touches a file other sessions edit. Phase 2 lands in one commit on `develop` with the tree clean, and an open PR whose branch edits the registry takes the "keep both rows" merge the standard already describes.

---

## 4. Scope

### In Scope

✅ Moving rows 286–316 (and any row stranded by the time Phase 2 runs) under the header, byte for byte.
✅ A test that holds every row in the one table block, and a mutation that strands one.
✅ The placement sentence in `skills/create-task/SKILL.md` and `docs/standards/task-registry.md`, and a bundle run if a `references/` copy changes.

### Out of Scope

❌ An engine that appends a row (a possible later task; the test is the guard this task adds).
❌ Re-annotating the 31 rows with "PR #N merged" notes (the repaired layout lets `--annotate` do it going forward; a back-fill is a separate decision).
❌ Any change to `registry-tick.js`.

---

## 5. Breaking Changes

None. Row content is unchanged; only its position moves.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.317.plan.task-registry-rows-sit-under-the-table-header.md](task.317.plan.task-registry-rows-sit-under-the-table-header.md)

### Phase 1: Measure and decide

**Risk**: Low

- [ ] Re-run the awk measurement and the `--annotate` call on one stranded row, and record both.
- [ ] Decide the placement rule for writers (after the last table row) and confirm no tool reads the file by line position.

### Phase 2: Move the rows

**Risk**: Medium

- [ ] With a clean tree, move every stranded row to directly after the last in-table row, unchanged and in number order.
- [ ] Run `registry-tick.js --annotate` against one moved row in a scratch copy and confirm it answers `annotated`, not `no-cell`.
- [ ] Run `task-registry-drift.test.mjs` and the selector's dry run and confirm both are unchanged.

### Phase 3: Hold it

**Risk**: Low

- [ ] Add a test that every registry row lies inside the one table block under the header, with a floor on the count.
- [ ] Mutation-prove it: move one row after `## Notes` in a scratch copy and confirm the test fails.
- [ ] Write the placement sentence in the two writers' prose and re-run `npm run bundle`.

---

## 7. Files Summary

Core implementation:
1. `docs/tasks/task-registry.md` — move the stranded rows.

Tests:
2. `evals/shared/tests/task-registry-drift.test.mjs` (or a sibling file beside it) — the placement test.

Documentation:
3. `skills/create-task/SKILL.md` — where the new row goes.
4. `docs/standards/task-registry.md` — the same sentence.
5. `CHANGELOG.md` — an `[Unreleased]` entry citing (task 317).

Bundled copies: run `npm run bundle` after the prose change; commit any `references/` copy it touches.

---

## 8. Testing Strategy

### Unit Tests

- Scope: the placement test over the committed registry, plus the mutation above on a scratch copy.
- Command: `CI=true node --test evals/shared/tests/task-registry-drift.test.mjs`
- Target: the test is red on the current file and green after Phase 2.

### Integration Tests

- `command node shared/resources/registry-tick.js --annotate` on a moved row in a scratch copy (answers `annotated`).
- `command node skills/develop-next/scripts/select-next.mjs --dry-run` selects the same item before and after.
- `npm run ci:fast`.

### Performance Tests

None.

### Consumer Tests

- `npm run bundle:check` for bundled copies.

---

## 9. Success Criteria

### Functional

- [ ] Every registry row lies inside the one table block directly under the header, held by a committed test with a non-vacuity floor.
- [ ] `registry-tick.js --annotate` on a formerly stranded row answers `annotated`, recorded in the QA report.
- [ ] The placement test fails when one row is moved after `## Notes`, recorded in the QA report with the test that went red.

### Performance

- [ ] No performance criterion applies. (Not applicable: no bound to meet.)

### Code Quality

- [ ] `task-registry-drift.test.mjs` and `npm run ci:fast` pass.

### Migration

- [ ] CHANGELOG.md has an `[Unreleased]` entry citing (task 317).

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A concurrent edit to the registry conflicts with the move.**
   - Risk: another session's uncommitted row, or an open PR that edits the file, collides.
   - Probability: Medium. Impact: Low.
   - Mitigation: move in one commit on a clean `develop`; resolve an open PR by keeping both rows, as `docs/standards/task-registry.md` already says.
   - Rollback: revert the commit.

### Low Risk Areas

1. **A tool that reads the registry by line number.** Mitigation: Phase 1 greps for one before the move.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: a pipeline reads the registry wrongly after the move.
- Steps: revert the task's commit.
- Validation: `task-registry-drift.test.mjs` passes.

### Partial Rollback (1-2 hours)

- Keep the test, revert the move, and mark the test a known failure until the rows are moved.

### Forward Fix (< 4 hours)

- Fix a mis-moved row in place.

### Rollback Triggers

- Critical: the selector or the drift test reads a different set of rows.
- Non-critical: a prose gap; fix forward.

---

## Change Log

<!-- change-log-start -->
| Date       | Version | Description    | Author      |
| ---------- | ------- | -------------- | ----------- |
| 2026-11-21 | 1.0     | Initial draft — found when `registry-tick --annotate` answered `no-cell` on task 286's row during its merge step | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Measure and decide
- [ ] Phase 2: Move the rows
- [ ] Phase 3: Hold it

---

## References

- [Task registry](../task-registry.md)
- [Task registry standard](../../standards/task-registry.md)
- [Task 286](../task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md) (where the `no-cell` answer surfaced)

---

## Notes

QA artifacts will be created in this directory: `task.317.qa.{N}.*.md`, `task.317.gate.{N}.*.yml`, bug reports `task.317.bug.{N}.*.md`.
