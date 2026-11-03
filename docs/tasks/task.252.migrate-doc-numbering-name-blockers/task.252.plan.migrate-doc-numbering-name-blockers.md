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

Add a seventh case: a tree with nothing left to move (everything already numbered) plus one bad name. It must answer `blocked`, not `already`.

**Measure before code:** the new blocker does not exist in Phase 1, so walk this repository's `docs/prd` with a throwaway read-only script (in the scratchpad, not committed) that applies `docId.parse` / `docId.parseLegacy` to each directory under an `epics/` or `stories/` directory and each loose file in a PRD directory. Record the command and the list of unclassified names here; the allowlist comes from that list. Also record `calls.readDir.length` on the clean `memIo` fixture as the walk-count baseline.

**Measure after Phase 3:** run `command node shared/resources/migrate-doc-numbering.mjs --root docs/prd --check` on this repository and record the command and the skipped count in the QA report. Expected 0. Any hit is either a real bad name to rename or an allowlist entry to justify.

### Phase 2: Discovery

**Files to modify:** `shared/resources/migrate-doc-numbering.mjs`

At the two `continue` sites (`if (!c || c.kind !== "epic" || c.artifact) continue;` and the story twin), push `{ path, reason }` to a new `unclassified` array before continuing, when the directory sits in `epics/` or `stories/`. The reason comes from `docId.parse(base)` / `parseLegacy(base)` results, so no id regex is added here (a chokepoint test, `tests/doc-id-chokepoint.test.js`, fails on one).

For loose files in a PRD directory: files that are `.md` and neither the PRD document, an artifact of it, nor on the allowlist. Keep the allowlist as one frozen array with a reason per entry.

For the suggested spelling, call `docId.format`/`parse` rather than writing a pattern. If doc-id exposes no helper for "nearest valid", state the spelling in prose only for the two known cases, built by string operations on the parsed parts.

### Phase 3: Verify and output

Add the code to the blocker list (`:60` comment and the array near `:95`). Emit one blocker per entry into `planned.blockers` inside `plan()`, **not** from `verify()`: the `already` / `post-check-failed` branch (`:2085`) tests `planned.fileMap.size === 0 && !planned.blockers.length` and returns before `verify()` runs (`verify()` is called near `:2154`), so only a blocker in `planned.blockers` stops a fully migrated tree with one bad name from answering `already`. Add `classified` (`counts.prds + counts.epics + counts.stories`) and `skipped` (`unclassified.length`) to the result object and to `render()` (`:2255`). The Phase 1 control test (nothing left to move, one bad name → `blocked`) holds this.

### Phase 4: Mutation proof

Revert each of the two edits in turn (`git stash` the hunk or comment the push out), run the Phase 1 test, confirm red, restore. Record both runs in the QA report.

## Key Patterns and References

- Blocker shape: `blocker(code, file, detail)` at `:166`.
- Existing blockers that pass a doc-id answer through rather than guess: `bad-slug`, `registry-invalid`.
- Edit with the Edit tool. Never patch the script from a heredoc (global rule).

## Testing Approach

`command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, then `npm test`, then `npm run bundle:check`. Run with `CI=true` before pushing (ci-only guards).

## Measurements (recorded 2026-11-03)

- **Before code**, a read-only walk of `docs/prd` (applying `docId.parse` / `parseLegacy` to every directory under an `epics/` or `stories/` directory and every loose `.md` file in a PRD directory; throwaway script in the session scratchpad) found **0** unclassified names. The allowlist is therefore not driven by this tree; its three files (README.md, index.md, prd-registry.md) and dot-directories come from the incident and the existing fixtures.
- **Walk baseline:** `calls.readDir.length` on the clean `l2Tree()` fixture was **6** on the unmodified engine (one read per directory), pinned as `READDIR_BASELINE_252`.
- **After Phase 3:** `command node shared/resources/migrate-doc-numbering.mjs --root docs/prd --check` → `already`, `22 documents classified, 0 skipped`.
- **Mutations** (each reverted after): removing the `plan()` emission turned 2 of the 7 new tests red; moving the emission into `verify()` only turned the "fully migrated tree with one bad name" control red (and nothing else); removing the `discover()` recording turned 2 red.
- **Existing fixture changed:** the "cycle 2 CR-1/CR-7" revert test used a stray `notes.md` in the PRD directory as its "unrelated dirty file"; the new rule rightly names it, so the fixture now uses `README.md` (allowlisted). Its intent (a tracked file the run neither moves nor rewrites) is unchanged.
