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

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-16

**QA Reopening Reason**: §5 was a deny-list of remembered spellings and missed `<epic>`, `<N>`, `{N}.{M}`, `{epicNum}`, `[N+1]`, `[n-1]` and more.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: Structural move (consolidate — allow-list, Step 2.6, obs #276): §5 now requires the FIRST placeholder after `story.` / `epic.` / `epic/` to name the PRD (`P`, `prd`, `prdNum`, …) and refuses everything else. It surfaced 30 more lines in 15 files; all rewritten (qa-findings-ingester-prompt, develop, qa-gate, shard-doc, sync-github-*, sync-jira-*, README, epic templates, prd-structure-guide — decimal-epic block removed, day-4 runbook), with the PRD directory added to the sync/shard paths. `create-parallel-stories` is exempt by name as deferred work.

**Files Modified**: tests/doc-id-chokepoint.test.js and 15 prose files (+ bundled copies)

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: allow-list accepts any head → §5 control red; restore `story.<epic>.<story>` in the ingester prompt → §5 red.

### Iteration 3

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: §5's key covered filename heads only; uppercase and title spellings (`EPIC-[N]`, `Epic {N}`, `[Epic [N+1]]`, `Story [epic].[story]`, `{{epic_number}}`) were outside it.

**Fix Description**: §5 adds a title-head check: after `EPIC-`, `Epic `, `[Epic `, `Story `, `[Story `, a single-level number name (`N`, `N±k`, `E`, `epic`, `epicNum`, `epic_number`) is refused; non-id placeholders (`Story [prev]`, `epic <path>`) are not judged. It surfaced 32 lines in 16 files, all rewritten (epic/story/task templates, prd-structure-guide roadmap names, create-epic and sync-github-epic milestone, create-prd, create-bug-report, prd-template, qa-story, review-epic, review-story). Header comment rewritten for the allow-list (CR-8); dead lookbehinds dropped (CR-7). Dropped-level check (CR3-4) deferred — it would refuse legitimate truncations such as `story.{P}.{E}.*`.

**Files Modified**: tests/doc-id-chokepoint.test.js and 16 prose files

**Testing**: `tests/doc-id-chokepoint.test.js` 12/12. Mutation: restore `Epic {N} — {title}` in sync-github-epic → §5 red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.1 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
| 2026-10-16 | Reopened | qa-task | Not fixed — same mechanism survives (task.207.qa.2 CR-1) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 2 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 2 |
| 2026-10-16 | Reopened | qa-task | Not fixed — §5 misses uppercase and title spellings (task.207.qa.3 CR-2) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 3 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 3 |
