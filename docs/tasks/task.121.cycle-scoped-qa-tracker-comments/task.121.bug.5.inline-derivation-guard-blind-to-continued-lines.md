# Bug Report: Task 121 - The inline-derivation guard is tested per line, so the two-line continued derivation it exists to catch passes it

**Task**: [Link](./task.121.cycle-scoped-qa-tracker-comments.md)
**Bug ID**: TASK-121-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 4 — reviewer CR-1, verified)
**Date Found**: 2026-09-18

## Description

`tests/qa-cycle.test.js` — `no shipped skill carries an inline gate-number derivation any more` —
applies `INLINE_DERIVATION` line by line. The exact derivation task.121's cycle 1 shipped was two
lines joined by a backslash continuation:

```
FIX_CYCLE=$(ls -t "$DOC_DIR"/*.gate.*.yml 2>/dev/null | head -1 \
  | sed -nE 's/.*\.gate\.([0-9]+)\..*/\1/p')
```

Line 1 has `=$(` and `.gate.` but no digit class; line 2 has the digit class but no `=$(`. Neither
matches; the joined text does (verified). The guard therefore passes on the very regression it was
written to prevent — a re-introduction in the original spelling.

## Expected Behavior

Backslash-continued lines are joined (or the fenced block's text is scanned with a pattern that
spans `\\\n`) before the guard tests, and the original two-line form is a mutation fixture.

## Recommendation

Join `\\\n` continuations in `fencedBlocks()` (or scan block text with `[\s\S]*?`), and add the
two-line form as a fixture the test asserts is caught; mutation-prove by inserting it in a skill.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-18 · **Developer**: qa-fix (QA cycle 4)

**Root Cause**: the guard tested physical lines; the derivation it targets spans two.

**Fix Description**: `fencedBlocks()` now joins backslash continuations (`\\\n\s*` → space)
before any guard reads a block; the inline-derivation guard scans the joined block text; a new
test carries the exact two-line cycle-1 spelling as a fixture and asserts that neither line alone
matches while the joined text does.

**Files Modified**: `tests/qa-cycle.test.js`.

**Testing**: 23/23. Mutation proof: the two-line form inserted into qa-fix's PR-lead block → three
guards red (same-block, root-form, inline-derivation); restored → green.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-18 | New | QA Engineer | Cycle 4 (CR-1) |
| 2026-09-18 | Ready for QA | qa-fix | Continuations joined; fixture added |
| 2026-09-18 | Closed | QA Engineer | Verified in cycle 5 — continuations joined in fencedBlocks(); two-line fixture in place; inserting the two-line form → guard red |
