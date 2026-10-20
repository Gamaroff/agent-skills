---
type: bug
status: closed
severity: medium
priority: P2
created: 2026-10-13
---

# Bug Report: Task 184 - carried-tail refuses a document the engine itself wrote

**Task**: [task.184.qa-results-carried-block-and-log-residuals.md](./task.184.qa-results-carried-block-and-log-residuals.md)
**Bug ID**: TASK-184-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 1, Step 3b diff review CR-1)
**Date Found**: 2026-10-13

## Description

The Phase 3 tail rule (`collectBlocks`, `shared/resources/qa-results.js:218`) also fires when a bold
`**Bug Reports**` block stops at a **second carried label** — `**Deferred Work**`, or a second
`**Bug Reports**` — whose list follows a lead paragraph. That list is already collected and carried
by the second label's own block, so nothing would be lost. But `mergeCarried` writes the two carried
blocks next to each other, so the engine's own `replaced` write produces this shape, and every
later write refuses it with `carried-tail:`.

## Steps to Reproduce

A task document whose QA section holds:

```markdown
**Bug Reports**

- [a](./a.md)

### Notes

**Deferred Work**

Carried from cycle 3:

- CR-1 thing
```

Run `upsertQaResults` three times (cycles 2–4) with a fresh `## QA Testing Results` render.

## Expected Behavior

`replaced` on every write, as on the base branch (`origin/develop` writes all three).

## Actual Behavior

Cycle 2 `replaced`; cycles 3 and 4 `unbounded`, `carried-tail:- CR-1 thing`. The QA loop's Step 12
would HALT on a document the previous cycle wrote cleanly.

## Impact

Liveness, not content: nothing is deleted, but a QA run halts on its own output and needs a hand
edit. Introduced by this task (base writes all three cycles).

## Recommendation

1. Record no `tail` when the stopping label opens its own carried block (`Bug Reports?` /
   `Deferred Work`) — that block already collects the list.
2. Make the engine unable to write a document its next write refuses: run the tail check on the
   output inside `checked()` and refuse (`unplaceable` / `carried-tail`) rather than write it.
3. Add an R7 case: a bold Bug Reports block followed by a bold Deferred Work block with a lead
   paragraph, across three writes, `replaced` each time, every line once.

## Developer Fix Cycle

### Iteration 1

#### Investigation (Open → In Progress)

**Date**: 2026-10-13

**Root Cause**: the tail look-ahead in `collectBlocks` fired at any bold label that does not
introduce a list, including one that opens a carried block of its own. `mergeCarried` writes carried
blocks side by side, so a `**Deferred Work**` label with a lead paragraph after a `**Bug Reports**`
block — a shape the engine itself produces — was read as a cut list.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- `shared/resources/qa-results.js`: no tail when the stopping label matches `RE_CARRIED_LABEL`
  (built from `CARRIED_PATTERN`). That block collects the list after its lead paragraph; its own stop
  is tail-checked when it is collected. CR-2: the list/row regex hoisted to `RE_LIST_OR_ROW`, used by
  `introducesList` and the tail scan.
- Not taken: a post-write tail check inside `checked()`. With the trigger narrowed, no input in the
  property family reaches it, so it would be a guard no test can hold; the R8 property test holds the
  invariant instead.

**Files Modified**:

- `shared/resources/qa-results.js` (+ bundled copies under `skills/qa-task/references/`, `skills/qa-story/references/`)
- `shared/resources/tests/qa-results.test.mjs` — R7 three-write case; R8 property test

**Testing**:

- R7: the reproduction writes `replaced` ×3, every line once.
- R8: 216 generated carried-block shapes — every first write that succeeds is followed by successful
  writes, nothing a carried block held is lost, and a repeated write is byte-identical (≥ 200 shapes
  exercised). On the pre-fix engine 10 shapes wrote then refused.
- Mutation: dropping the `RE_CARRIED_LABEL` clause → R7 and R8 red.

**Verification Steps for QA**: run `command node --test shared/resources/tests/qa-results.test.mjs`;
re-run the reproduction above.

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-13

**QA Reopening Reason**: gate 2 CR-1 — the Phase 1 union carries a nested `#### Deferred Work` block whose list follows a bold label and a paragraph; the tail rule read that line as cut although the union carries it, so the engine still wrote a document its next write refused. Iteration 1 fixed the shape it was shown, not the class.

**Revised Approach** (qa-fix Step 2.6 — consolidate): one `sectionGuard()` defines "a section this engine refuses to rewrite" and runs on the section a write replaces and on the section it writes (`checked()`), so a write the next write would refuse is refused up front as `unplaceable`. A tail inside a span a kept block carries is not a cut. The tail scan ends at the next carried label (gate 2 CR-3).

#### Fix Implementation (In Progress → Ready for QA)

**Files Modified**: `shared/resources/qa-results.js` (+ bundled copies); `shared/resources/tests/qa-results.test.mjs` (R8 family 216 → 343 shapes with the nested piece; R9; R10); `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` (`unplaceable` hint and paragraph).

**Testing**: the gate 2 reproduction writes `replaced` ×3. Mutations: drop the coverage check → R8 red; drop the written-section guard → R9 red; drop the scan terminator → R10 red (26 s).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-13 | Open | qa-task | Found in task.184.qa.1.qa-results-carried-block-and-log-residuals.md |
| 2026-10-13 | Ready for QA | qa-fix | Fix implemented — QA cycle 1 fix (R7, R8) |
| 2026-10-13 | Reopened | qa-task | Not fixed by task.184.qa.2.qa-results-carried-block-and-log-residuals.md — reproduction passes, class remains (gate 2 CR-1) |
| 2026-10-13 | Ready for QA | qa-fix | Iteration 2 — sectionGuard on input and written section (QA cycle 2 fix) |
| 2026-10-13 | Closed | qa-task | Verified by task.184.qa.3.qa-results-carried-block-and-log-residuals.md |
