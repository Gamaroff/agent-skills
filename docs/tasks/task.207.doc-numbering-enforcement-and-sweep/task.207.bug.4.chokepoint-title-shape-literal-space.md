---
type: bug
status: ready-for-qa
severity: Major
priority: Medium
created: 2026-10-16
related: task.207
description: "Chokepoint title shape misses parsers written with a literal space"
---

# Bug Report: Task 207 - Chokepoint title shape misses parsers written with a literal space

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, finding CR-4)
**Date Found**: 2026-10-16
**Location**: `tests/doc-id-chokepoint.test.js:66`

## Description

The `title` shape only matches an escaped `\s` between `Epic`/`Story` and the digit class, so a parser written with a literal space or `[[:space:]]` is invisible. This PR's own `.agents/scripts/backfill-story-issues.sh:52` and `:56` (`sed -E "s/^Epic [0-9]+…"`, `s/^Story [0-9]+\.[0-9]+…`) are exactly the summary parsers the shape is meant to catch, and are neither flagged nor allowlisted.

## Steps to Reproduce

1. Run the chokepoint scan over `.agents/scripts/backfill-story-issues.sh`.

## Expected Behavior

Lines 52 and 56 reported as `title` (or allowlisted with a reason).

## Actual Behavior

No hit; §1 passes.

## Impact

The fix or guard this task delivers does not hold on the path named above.

## Recommendation

Widen the title shape to accept a literal space or `[[:space:]]`; route or allowlist the backfill parsers; add a MUST_HIT row for the sed form.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: The title shape required an escaped `\s`.

**Fix Description**: Accept an escaped `\s`, a literal space or `[[:space:]]`. The backfill script's two sed parsers now call `doc-id.stripIdPrefix` (also fixes CR-5). MUST_HIT rows for the sed and literal-space forms.

**Files Modified**: tests/doc-id-chokepoint.test.js, .agents/scripts/backfill-story-issues.sh

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: revert the shape to escaped-only → §3 MUST_HIT red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.1 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
