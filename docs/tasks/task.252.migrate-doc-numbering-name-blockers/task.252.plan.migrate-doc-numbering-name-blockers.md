---
id: task.252.plan
title: "Implementation Plan: migrate-doc-numbering name blockers"
type: plan
task-ref: task.252.migrate-doc-numbering-name-blockers.md
---

# Implementation Plan: migrate-doc-numbering name blockers

> Requirements and success criteria: [task.252.migrate-doc-numbering-name-blockers.md](task.252.migrate-doc-numbering-name-blockers.md)

## Overview

Record what discovery skips, turn each skip into a blocker in `verify()`, print the count. Test first, with the fixture from the handoff reproduction.

## Phase-by-Phase Implementation Guide

### Phase 1: Test first

**Files to modify:** `shared/resources/tests/migrate-doc-numbering.test.mjs`

Reuse `gitRepo(files)` and `l2Tree()` (both already in the file). Add to the tree, under `docs/prd/onb/`:

| Path | Defect |
| --- | --- |
| `epics/epic.2.discovery-2.0-thing/epic.2.discovery-2.0-thing.md` | dot in slug |
| `epics/epic.1.alpha/stories/story.1.2-1.dash/story.1.2-1.dash.md` | `-N` suffix |
| `epics/epic.1.alpha/stories/story.1.3a.lower/story.1.3a.lower.md` | lowercase suffix |
| `feature-exploration-2026-07-11.md` | stray file |
| `epics/epic.1.alpha/stories/story.1.4Ab.control/…` | control: a defect the issue never names |
| `epics/epic.1.alpha/stories/story.1.5A.fine/…` | control: valid, must not be flagged |

Pad each file to about 40 lines so git pairs renames (see the comment above the existing apply test).

Assert, through the CLI entry as the existing tests do: exit 1, `reason: "blocked"`, five `unclassified-document` blockers naming the five bad paths, none naming the valid one, and an unchanged `git status --porcelain` after `--apply`.

**Measure:** run `command node shared/resources/migrate-doc-numbering.mjs --root docs/prd --check` on this repository after Phase 3 and record the command and the skipped count in the QA report. Expected 0. Any hit is either a real bad name to rename or an allowlist entry to justify.

### Phase 2: Discovery

**Files to modify:** `shared/resources/migrate-doc-numbering.mjs`

At the two `continue` sites (`if (!c || c.kind !== "epic" || c.artifact) continue;` and the story twin), push `{ path, reason }` to a new `unclassified` array before continuing, when the directory sits in `epics/` or `stories/`. The reason comes from `docId.parse(base)` / `parseLegacy(base)` results, so no id regex is added here (a chokepoint test, `tests/doc-id-chokepoint.test.js`, fails on one).

For loose files in a PRD directory: files that are `.md` and neither the PRD document, an artifact of it, nor on the allowlist. Keep the allowlist as one frozen array with a reason per entry.

For the suggested spelling, call `docId.format`/`parse` rather than writing a pattern. If doc-id exposes no helper for "nearest valid", state the spelling in prose only for the two known cases, built by string operations on the parsed parts.

### Phase 3: Verify and output

Add the code to the blocker list (`:60` comment and the array near `:95`). Emit one blocker per entry from `verify()`. Add `classified` and `skipped` to the result object and to `render()` (`:2255`). `--check`'s `already` branch (`:2085`) is reached only when `fileMap.size === 0 && !blockers.length`, so a blocker already prevents it. Confirm that with a test line rather than assuming.

### Phase 4: Mutation proof

Revert each of the two edits in turn (`git stash` the hunk or comment the push out), run the Phase 1 test, confirm red, restore. Record both runs in the QA report.

## Key Patterns and References

- Blocker shape: `blocker(code, file, detail)` at `:166`.
- Existing blockers that pass a doc-id answer through rather than guess: `bad-slug`, `registry-invalid`.
- Edit with the Edit tool. Never patch the script from a heredoc (global rule).

## Testing Approach

`command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, then `npm test`, then `npm run bundle:check`. Run with `CI=true` before pushing (ci-only guards).
