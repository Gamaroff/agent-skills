---
type: bug
status: ready-for-qa
severity: Major
priority: Medium
created: 2026-10-16
related: task.207
description: "review-epic report numbering glob still uses the flat epic number"
---

# Bug Report: Task 207 - review-epic report numbering glob still uses the flat epic number

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, finding CR-3)
**Date Found**: 2026-10-16
**Location**: `skills/review-epic/SKILL.md:571`

## Description

The sweep rewrote the example above it to `epic.1.1.review.1.*`, but the executable glob `epic.{epic-number}.review.*.md` (and the save template `epic.[N].review.[n]` at line 561) still name one number. Substituting E gives `epic.1.review.*`, which never matches an `epic.P.E.review.*` report, so `REVIEW_N` is always 1 and an existing `review.1` is overwritten. The §7 population grep did not match `epic.{epic-number}` or `epic.[N]`; other residues remain (`jira-epic-creator/SKILL.md:48`, `review-epic/SKILL.md:143/216/768`, `skills/develop-story/README.md`, `skills/review-story/README.md`).

## Steps to Reproduce

1. Run Step 9's block for epic `epic.1.3.x` in a directory holding `epic.1.3.review.1.x.md`.

## Expected Behavior

`REVIEW_N=2`.

## Actual Behavior

`REVIEW_N=1` — the existing report would be overwritten.

## Impact

The fix or guard this task delivers does not hold on the path named above.

## Recommendation

Rewrite the glob and template to `epic.{P}.{E}`; sweep the other `epic.[N]` / `{epic-number}` / README residues; add a population test that fails on a residual old-scheme placeholder in `skills/**/*.md` and `shared/resources/*.md`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: The §7 grep matched only remembered brace spellings; bracket and other forms (`epic.[N]`, `epic.{epic-number}`, `story.[epic].[story]`, `story.[N].[M]`) and READMEs/templates/hand-authored references were outside it.

**Fix Description**: Rewrote the glob and template to `epic.{P}.{E}` / `epic.[P].[E]`; swept every residue (15 files incl. `prd-structure-guide.md`, whose decimal 'intermediate epic' row is removed, `.github/copilot-instructions.md`, `develop-bug-step-7-close-bug.md`). New §5 in the chokepoint test fails on any old-scheme placeholder in canonical prose (frozen `examples/` snapshots and records exempt, with reasons). `next-numbered.test.mjs` review-epic site updated.

**Files Modified**: skills/review-epic/SKILL.md and 14 other prose files, tests/doc-id-chokepoint.test.js, shared/resources/tests/next-numbered.test.mjs

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: restore `epic.{epic-number}` → §5 red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.1 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
