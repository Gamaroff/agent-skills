# Bug Report: Task 274 - A dash followed by an expansion still classifies runnable

**Task**: [Link](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Bug ID**: TASK-274-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

`variableArgumentToDenyListed` in `shared/resources/qa-execute-snippets.mjs` refuses an argument to a
deny-listed command only when the argument **begins** with an expansion. An argument with a literal
`-` before the expansion is still a flag once the shell expands it, and still classifies `runnable`.

## Steps to Reproduce

Run `isRunnableBlock` on each of:

- `A=delete; find docs -$A`
- `A=delete; find docs "-${A}"`
- `find docs -$(echo delete)`

Controls: `X=-delete; find docs $X` (refused), `find docs -name x` (runnable, correct),
`X=y; find docs/$X -name z` (runnable, correct).

## Expected Behavior

All three hostile blocks are refused (owner decision, Phase 1: refuse variable arguments to
deny-listed commands; no value tracking).

## Actual Behavior

All three classify runnable. The same blocks classify runnable on `develop`, but the task's scope
names the variable-argument shape, so this is an unfinished fix, not someone else's defect. Found by
the diff reviewer (CR-2) and reproduced by QA.

## Impact

A skill doc could hide `find ... -delete` behind a variable and Step 4b would execute it.

## Recommendation

Refuse any argument to these commands that contains an expansion, unless its first literal character
is known not to be `-`. Correct the "literal first character cannot be a flag" comment, which is
false for a `-` prefix. Add the three hostile blocks plus the two controls to the cases and tests;
mutation-prove by restoring the anchored pattern.

## Developer Fix Cycle

### Iteration 1

**Root cause**: the rule tested only for an argument that starts with an expansion, and the segment splitter cut `-$(…)` into a bare `-` before the rule saw it.

**Fix**: `variableArgumentToDenyListed` keeps each delimiter, so a substitution that follows a segment counts as part of its last argument; `couldBeFlag(lead)` refuses an empty prefix or a dash-led prefix with no `=` (`--since="$D"` stays runnable). The doc comment and `qa-runnable-prose-detection.md` now state the real rule.

**Tests**: four hostile blocks added to the base-scan shape table, two controls (`docs/$X`, `"task.${N}.*"`); the existing `--since="$D"` continuation test is a third. Mutation proof: reverting `couldBeFlag` to the empty-prefix test turns three named tests red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-09 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix; regression tests and mutation proofs added |
