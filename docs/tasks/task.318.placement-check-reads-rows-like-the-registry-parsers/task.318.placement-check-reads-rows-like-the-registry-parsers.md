---
id: task.318
title: "Placement check reads rows like the registry parsers"
type: task
description: "The task 317 placement test (placementOf) does not trim lines or skip fenced blocks, while the selector's parseRegistry does both, so it can miss an indented stranded row and flag a fenced sample row; make it read rows the way the parsers do, or record why it need not."
tags: [task-registry, drift-test, follow-up, task-317]
category: testing
status: planned
priority: Low
created: 2026-11-22
updated: 2026-11-22
estimated_effort_hours: 2
---

# Technical Task: Placement check reads rows like the registry parsers

**Status:** Planned

---

## 1. Overview

Task 317 added `placementOf` to `evals/shared/tests/task-registry-drift.test.mjs`, a test helper that holds every registry row inside the one table block under the header. Its QA gate 2 filed one advisory item (`recommendations.future`): the helper does not trim lines or skip fenced code blocks, and QA could not make it diverge from the real parsers. This task tries again, with the two divergences below, and either makes the helper match the parsers or records why it need not.

**Scope**: `placementOf` and its synthetic test in the one drift test file. No change to the registry, the selector or `registry-tick.js`.

---

## 2. Motivation

### Current Problems

1. **An indented row is invisible to the helper.** `placementOf` matches rows with `/^\|\s*(\d+)\s*\|/`, anchored at column 0. `parseRegistry` trims each line first (`const t = line.trim(); if (!t.startsWith("|"))`, `skills/develop-next/scripts/select-next.mjs:1387`), so it reads `  | 3 | c |` as a row. A row indented below `## Notes` is therefore read by the selector and missed by the placement test.
2. **A fenced sample row is flagged.** `parseRegistry` skips fenced blocks (`select-next.mjs:1380`, `/^\s*(```|~~~)/`), so a sample table inside a fence is an example, not a row. `placementOf` has no fence handling, so the same sample reads as a stranded row and the test fails on a document that is correct.
3. **A fenced table can hijack the header search.** `placementOf` takes the first line matching `/^\|\s*#\s*\|/` as the header, fenced or not.

### Benefits

1. The placement test and the parsers agree on what a row is, so a row the selector reads cannot slip past the guard.
2. A documentation example in the registry does not turn the suite red.
3. Whichever way the task lands, the reasoning is held by a test or a recorded note, not by one reviewer's recall.

---

## 3. Technical Background

### Current Architecture

- `placementOf(text)` is at `evals/shared/tests/task-registry-drift.test.mjs:367`. The header is the first `^\|\s*#\s*\|` line; the block is the contiguous `^\s*\|` lines after the separator; a row is a line matching `^\|\s*(\d+)\s*\|`.
- `parseRegistry(text, kind, registryPath)` is at `skills/develop-next/scripts/select-next.mjs:1358`. It trims each line and skips fenced blocks.
- `findHeader(parts, rowLine)` in `shared/resources/registry-tick.js:1013` walks up from the row over `^\s*\|` lines (whitespace allowed) to a `|---|` separator.
- The registry has one fenced block today: a `bash` quick-commands block at `docs/tasks/task-registry.md:28-37`, with no table in it.

### Measured divergence (run 2026-11-22, not recalled)

```
node -e 'console.log(/^\|\s*(\d+)\s*\|/.test("  | 3 | c |"))'   # false: placementOf does not see an indented row
```

`parseRegistry` fed a registry with a row inside a fence returned one row (the fenced one skipped), and fed one with an indented row after `## Notes` it returned both rows. The command and inputs are in the plan file. The first is a false negative in the placement test (a stranded row goes unflagged), the second a false positive.

### Target Architecture

`placementOf` reads a line the way `parseRegistry` does: trim before the row test, and skip fenced blocks for both the header search and the row scan. Block membership keeps the `^\s*\|` rule that `registry-tick.js` `findHeader` already uses. If the task finds that one of the two divergences cannot occur in a registry the writers produce, it records that in the test's comment and in this document's Notes instead.

---

## 4. Scope

### In Scope

✅ **`placementOf`**: trim and fence handling, matching the parsers.
✅ **The synthetic test**: one case per divergence, red on the old helper.

### Out of Scope

❌ **`parseRegistry` and `registry-tick.js`**: they are the reference, not the subject.
❌ **Sharing one row parser between the test and the selector**: a larger change, and the selector's parser carries kind-specific column logic. Note it as a future option if the two keep drifting.

---

## 5. Breaking Changes

None - the change is inside one test helper.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.318.plan.placement-check-reads-rows-like-the-registry-parsers.md](task.318.plan.placement-check-reads-rows-like-the-registry-parsers.md)

### Phase 1: Reproduce

**Risk Level**: Low

**Files**:
- `evals/shared/tests/task-registry-drift.test.mjs`

**Changes**:
- [ ] Add two synthetic cases to the placement test: an indented row below `## Notes`, and a sample row inside a fence. Run them against the current helper and record which one fails and which one wrongly passes.
- [ ] Feed the same two inputs to `parseRegistry` and record its answer beside each.

**Dependencies**: none

### Phase 2: Match the parsers

**Risk Level**: Low

**Files**:
- `evals/shared/tests/task-registry-drift.test.mjs`

**Changes**:
- [ ] Trim each line before the row and header tests.
- [ ] Track fenced blocks (` ``` ` and `~~~`) and skip their lines for the header search and the row scan.
- [ ] Re-run the registry as committed: the stranded list stays empty and the row count stays at or above `PLACEMENT_MIN_ROWS`.

**Dependencies**: Depends on Phase 1

### Phase 3: Prove it

**Risk Level**: Low

**Changes**:
- [ ] Mutation-prove each new case: revert the trim, then the fence skip, and confirm the named synthetic case goes red each time.
- [ ] Run `node --test evals/shared/tests/task-registry-drift.test.mjs` and the fast gate.

**Dependencies**: Depends on Phase 2

---

## 7. Files Summary

### Files to Modify (Tests)

1. ✅ `evals/shared/tests/task-registry-drift.test.mjs` - `placementOf` and its synthetic test

### Files to Modify (Documentation)

1. ✅ `CHANGELOG.md` - one `[Unreleased]` line citing (task 318), if the change is user-visible to contributors; omit if the review finds none is warranted

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `placementOf` over synthetic registries.

**Actions**:
- [ ] An indented row below `## Notes` is flagged as stranded.
- [ ] A row inside a fenced block is not counted, and does not make the test fail.
- [ ] A fenced table above the real header does not become the header.
- [ ] A correct registry (no fence, no indent) still reports zero stranded rows, with the non-vacuity floor intact.

**Command**: `node --test evals/shared/tests/task-registry-drift.test.mjs`

**Mutation list**: removing the trim turns only the indented case red; removing the fence skip turns only the fenced cases red.

---

## 9. Success Criteria

### Functional

- [ ] An indented row below `## Notes` is reported stranded by `placementOf`, recorded in the QA report with the test that went red on the old helper.
- [ ] A sample row inside a fenced block is not reported as stranded, recorded in the QA report.
- [ ] `node --test evals/shared/tests/task-registry-drift.test.mjs` passes, including the committed-registry placement test.

### Performance

- [ ] No performance criterion applies: the test reads one file.

### Code Quality

- [ ] `npm run ci:fast` passes (run with `TEST_LOCAL=1 npm run test:remote` while the LAN server is down).
- [ ] Prettier is clean on the changed test file.

### Migration

- [ ] No migration: no consumer reads `placementOf`.
- [ ] If neither divergence is fixed, the reason is recorded in the test comment and the DoD file.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

**1. The fix drifts from the parser again**
- **Risk**: `placementOf` and `parseRegistry` are two readers of one grammar and can diverge later.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the synthetic cases pin today's behaviour; sharing one parser is noted as a future option.
- **Rollback**: revert the test change.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The committed registry's placement test goes red for a reason other than a stranded row.

**Steps**:
1. `git revert` the task's commit.

**Verification**: `node --test evals/shared/tests/task-registry-drift.test.mjs` passes.

---

### Partial Rollback (1-2 hours)

**When to Use**: only one of the two fixes (trim, fence) proves wrong.

**Steps**:
1. Revert that hunk and keep the other, with its synthetic case.

---

### Forward Fix (< 4 hours)

**When to Use**: a synthetic case is wrong, not the helper.

**Approach**: correct the case and re-run the mutation list.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- The drift test fails on the committed registry.

**Non-Critical (Forward Fix)**:
- A comment or message in the test is unclear.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-22 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Reproduce
- [ ] Two synthetic cases added and run against the old helper
- [ ] `parseRegistry` answer recorded for each

### Phase 2: Match the parsers
- [ ] Trim before the row and header tests
- [ ] Skip fenced blocks
- [ ] Committed registry still clean

### Phase 3: Prove it
- [ ] Mutation proof per case
- [ ] Test file and fast gate pass

---

## References

- Cut from: task 317 QA gate 2, `recommendations.future` ([task.317 gate 2](../task.317.task-registry-rows-sit-under-the-table-header/task.317.gate.2.task-registry-rows-sit-under-the-table-header.yml)).
- Parent task: [task.317](../task.317.task-registry-rows-sit-under-the-table-header/task.317.task-registry-rows-sit-under-the-table-header.md), merged as PR #928.

---

## Notes

### Important Reminders

Task 317's QA could not make the helper diverge from the parsers. The two divergences above were found by reading `parseRegistry` and running the regex; the plan's Phase 1 re-runs them as tests before anything is changed, so a divergence that does not hold is dropped, not fixed.

---

**Status:** Planned
