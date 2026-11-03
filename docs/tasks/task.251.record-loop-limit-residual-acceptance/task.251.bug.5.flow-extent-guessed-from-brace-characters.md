# Bug Report: Task 251 - The extent of a flow-style gate entry is guessed from brace characters

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 code review CR-1, reproduced)
**Date Found**: 2026-11-03

## Description

The writer edits `top_issues` entries line by line. For a flow-style entry it decides where the mapping
ends by looking for a `}` character: cycle 1 used "any `{` on the line", cycle 2 used "the last `}` on
the dash line is after the opening `{`". Both are the same guess, and the third cycle finds the next
input that defeats it.

## Steps to Reproduce

Call `planGateEdit` on a gate whose open entry is
`  - {id: X, a: {b: 1},` / `     status: open}` or `  - {id: X, # note }` / `     status: open}`.

## Expected Behavior

The writer refuses (`unreadable-gate`) and writes nothing.

## Actual Behavior

`edit` with `ok: true`. `status: waived` is spliced into the nested map (`a: {b: 1, status: waived },`)
or into the comment (`# note, status: waived }`), and `status: open` stays on the later line. The
single-line nested entry (`- {id: X, a: {b: 1}, status: open}`) is edited correctly.

## Impact

The accepted gate still holds an open status. The input is not one this pipeline writes (gates are
block style), so exposure is narrow, but the writer reports success.

## Recommendation

Do not correct the check a fourth time. Define the flow extent once: a scanner that tracks brace depth,
skips quoted strings and stops at a comment, returning the open and close columns or "unbalanced".
`waiveEntry` edits only inside that span, and the planner refuses an unbalanced entry. Add the nested-map
and comment-brace gates as refusal tests; keep the single-line nested control.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-03 (QA cycle 3 fix)

Narrowing residue: the flow-entry detection (trigger: pipeline offer; gates 2 and 3 both name this file at HIGH 0)
Move: consolidate. The extent is defined once instead of being corrected a third time.

**Fix**: a new `flowSpan(dash)` is the only definition of where a flow mapping sits on the dash line: it
tracks nesting depth, skips quoted strings, ends at a comment and rejects trailing junk, and returns the
open and close columns plus the top-level separators, or "unbalanced". `planGateEditRaw` refuses an
unbalanced open entry (`unreadable-gate`, nothing written). `waiveEntry` edits only a top-level
`status:` segment inside the span, so a `status:` inside a nested map or a string is never touched.

**Files**: `shared/resources/accept-qa-residual.js` (+ bundled copies), `shared/resources/tests/accept-qa-residual.test.mjs`.

**Tests**: `flowSpan` table; refusals for nested-map, comment-brace and trailing-junk entries; edits for the
nested single-line entry, a status inside a quoted string and a trailing comment; a nested-only status is
refused by the read-back. Mutation-proven: comment handling off turns two tests red, the top-level split off
turns three red.

**Probe**: the cycle 3 gate cases file now gives `engages` (it gave `present-but-inert`).

## Status History

| Date       | Status       | Changed By | Notes                         |
| ---------- | ------------ | ---------- | ----------------------------- |
| 2026-11-03 | New          | QA         | Found in QA cycle 3           |
| 2026-11-03 | Ready for QA | qa-fix     | Fixed with mutation-proven tests |
