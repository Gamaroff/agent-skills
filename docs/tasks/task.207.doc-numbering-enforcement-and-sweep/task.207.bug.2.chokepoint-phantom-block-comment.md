---
type: bug
status: ready-for-qa
severity: Major
priority: Medium
created: 2026-10-16
related: task.207
description: "Chokepoint comment stripper opens a phantom block comment on a `//` line that quotes a glob"
---

# Bug Report: Task 207 - Chokepoint comment stripper opens a phantom block comment on a `//` line that quotes a glob

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, finding CR-2)
**Date Found**: 2026-10-16
**Location**: `tests/doc-id-chokepoint.test.js:91`

## Description

`stripCodeComment` looks for `/*` before it handles a `//` line comment, so `// Top-level shared/resources/*.md` opens a block comment that swallows every following line until the next `*/`. Today it silently drops `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` lines 16-108, `tests/bundled-links.test.js` lines 51-74, `tests/executable-instructions.test.js` lines 155-162 and `tests/gh-labels.test.js` line 203 from the scan.

## Steps to Reproduce

1. A file whose line 1 is `// Top-level shared/resources/*.md` and line 2 is `const R = /story\.(\d+)\.(\d+)/;`.

## Expected Behavior

Line 2 is reported (`id-regex`).

## Actual Behavior

Line 2 is swallowed by the phantom block comment and the guard passes.

## Impact

The fix or guard this task delivers does not hold on the path named above.

## Recommendation

Strip a `//` line comment before searching for `/*` (or lift the quote-aware stripper from `tests/test-harness-concurrency.test.js` into `tests/lib`); add a MUST_HIT row for the shape.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: `stripCodeComment` searched for `/*` before handling a `//` line comment.

**Fix Description**: Handle a leading `//` and strip a trailing ` // …` before looking for `/*`. MUST_HIT row: an id regex on the line after `// Top-level shared/resources/*.md`.

**Files Modified**: tests/doc-id-chokepoint.test.js

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: restore the old order → §1 and §3 red.

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-16

**QA Reopening Reason**: A `/*` inside a regex literal was still read as a block comment: the cycle-1 fix reordered a line-based stripper, which cannot tell a regex from a comment.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: Structural move (consolidate, Step 2.6): the quote-, template- and regex-aware tokenizer from `tests/test-harness-concurrency.test.js` is lifted into `tests/lib/strip-js-comments.js` (keeping line breaks inside block comments) and both tests import it; the chokepoint test's own JS stripping is deleted. MUST_HIT row: an id regex on the line after a regex literal containing `/*`.

**Files Modified**: tests/lib/strip-js-comments.js (new), tests/doc-id-chokepoint.test.js, tests/test-harness-concurrency.test.js

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: stop stripping JS comments → §1 and §3 red; HEAD's stripper plus the new row → §3 red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.1 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
| 2026-10-16 | Reopened | qa-task | Not fixed — same mechanism survives (task.207.qa.2 CR-2) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 2 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 2 |
