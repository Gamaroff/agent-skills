---
type: bug
status: ready-for-qa
severity: Critical
priority: High
created: 2026-10-16
related: task.207
description: "qa-findings-ingester-prompt globs were renamed to <P>.<E>.<S> but its callers still substitute <epic> and <story>"
---

# Bug Report: Task 207 - Ingester prompt globs renamed without their substitution contract

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 3, finding CR-1)
**Date Found**: 2026-10-16
**Location**: `shared/resources/qa-findings-ingester-prompt.md:16`

## Description

QA fix cycle 2 rewrote the ingester's story-mode discovery globs from `story.<epic>.<story>.*` to `story.<P>.<E>.<S>.*`. The prompt's own substitution list (`qa-findings-ingester-prompt.md:198`) and `/qa-fix` Step 1a (`skills/qa-fix/SKILL.md:376`) still tell the caller to substitute `<epic>` and `<story>`. `<P>`, `<E>` and `<S>` are never bound, so every story-mode glob is a literal that matches nothing, and an ingester that could not look reports the same empty findings as one that found nothing. The prose sweep changed a placeholder that a contract outside the line defines.

## Steps to Reproduce

1. Substitute the prompt as `/qa-fix` Step 1a says: `<epic>` and `<story>` only.
2. The glob reads `story.<P>.<E>.<S>.gate.*.yml`.

## Expected Behavior

Every placeholder in the globs is one the callers bind.

## Actual Behavior

`<P>`, `<E>`, `<S>` stay literal; the story-mode globs match nothing.

## Impact

`/qa-fix` on any story would ingest no gate, report, or bug, and fix nothing — silently.

## Recommendation

Rename the substitution lists to `<P>`, `<E>`, `<S>` in both places (bundled copies follow), or bind one `<story-stem>`; and find every other placeholder the sweep renamed whose binding list lives elsewhere.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: The cycle-2 sweep renamed placeholders in the ingester's globs; the list of placeholders a caller substitutes lives in two other places (the prompt's Usage section and `/qa-fix` Step 1a) and was not renamed.

**Fix Description**: Both binding lists now name `<P>`, `<E>`, `<S>` (story mode, from `doc-id.js parse`; a sub-story's `<S>` carries its letter). New `tests/ingester-prompt-placeholders.test.js` holds the contract: every placeholder the discovery section uses must be in both binding lists. Probe: no other binding list names `<epic>`/`<story>` or `{epic}`/`{story}` alone (the remaining hits are `edit-story` display text and the deferred `create-parallel-stories`).

**Files Modified**: shared/resources/qa-findings-ingester-prompt.md, skills/qa-fix/SKILL.md, tests/ingester-prompt-placeholders.test.js (new) (+ bundled copies)

**Testing**: `tests/ingester-prompt-placeholders.test.js` 3/3. Mutation: restore `<epic>`, `<story>` in qa-fix Step 1a → the binding-list test red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.3 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 3 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 3 |
