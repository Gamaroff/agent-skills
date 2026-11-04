---
id: task.253.plan
title: "Implementation Plan: migrate-doc-numbering safety nets"
type: plan
task-ref: task.253.migrate-doc-numbering-safety-nets.md
---

# Implementation Plan: migrate-doc-numbering safety nets

> Requirements and success criteria: [task.253.migrate-doc-numbering-safety-nets.md](task.253.migrate-doc-numbering-safety-nets.md)

## Overview

Reproduce each handoff gap with a failing test, then fix only those that reproduce. One commit per gap so a partial rollback is a single revert.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce

**Files to modify:** `shared/resources/tests/migrate-doc-numbering.test.mjs`

Use `gitRepo(files)` and `l2Tree()`. Fixtures:

| Gap | Fixture |
| --- | --- |
| multi-line link | `[multi\nline](../../epic.1.alpha.md)` in the story body (already reproduced by hand) |
| fenced / inline-code real path | a fence and a code span quoting `../../epic.1.alpha.md` |
| `prd_number` on sub-stories | sub-stories `story.1.1A` and `story.1.1B` under story 1.1 |
| stub link | a legacy `docs/development/epic-registry.md` with a link to a file that moves away; migrate the last epic; scan the stub for links |
| dirty / behind | add an uncommitted edit; add a commit to a bare upstream the clone has not pulled |
| generated file | a committed file under a `*-out/` directory that mentions an old path |
| legacy-name consumer | `scripts/lint.mjs` containing `epic.1`-style patterns outside the PRD root |

If a fixture passes today, the gap does not reproduce: record that and drop its phase.

### Phase 2: Multi-line links

Review found the matcher correct (`extractRelativeLinks` returns the multi-line link, at the line of its `[`) and the likely cause in the migration tool's per-line apply loop (`byLine` / `replaceTargets`, `migrate-doc-numbering.mjs:1513-1530`). Confirm that with the Phase 1 test and fix it there. Only if the test shows the matcher at fault, change `scanLinks` (`shared/resources/doc-links.js:175`); before that run `grep -rn "extractRelativeLinks" shared skills scripts` and read each caller. If any caller is a dead-link checker that would start reporting new links on the tree, measure that first: run it before and after and compare.

### Phase 3: Post-apply scans

After the apply stage, take the rewritten file list and the move map. For each rewritten file, resolve every relative link, including the ones inside fences and code spans that `scanLinks` blanks (a second, warning-only pass). Print `path:line target` for each missing target. For old paths, search tracked files for each moved path as a literal. Print the closing legacy-name line from tracked files outside the PRD root; build patterns through `doc-id.js`, or add a reasoned entry to the chokepoint test's allowlist.

### Phase 4: The rest

- Frontmatter: after `planEdits` (`:1306`), check each migrated story's frontmatter has the fields `doc-id.js` and `docs/standards/story-documents.md` require.
- Stub: change the builder near `:1771-1816` (`MIGRATED_EPICS_HEADING` at `:1671`) to emit plain text for the old registry's links.
- Dirty/behind: `git status --porcelain` and `git rev-list --count HEAD..@{u}`. No upstream: skip and say so. Dry run and `--check` warn, `--apply` blocks.
- Generated: a short list of directory suffixes, each with a reason, reported as `skipped, generated`.

### Phase 5: Mutation proof

For each fix, revert it, run the test, expect red, restore. Record in the QA report.

## Key Patterns and References

- Edit with the Edit tool only.
- `tests/doc-id-chokepoint.test.js` fails on any id regex outside `doc-id.js`.
- Blocker helper: `blocker(code, file, detail)` at `shared/resources/migrate-doc-numbering.mjs:166`.

## Testing Approach

`command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, `npm test`, `npm run bundle:check`, and `CI=true npm test` before any push.
