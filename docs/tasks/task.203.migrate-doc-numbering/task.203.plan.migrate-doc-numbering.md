---
id: task.203.plan
title: "Implementation Plan: Migrate documents to hierarchical numbering"
type: plan
task-ref: task.203.migrate-doc-numbering.md
---

# Implementation Plan: Migrate documents to hierarchical numbering

> Requirements and success criteria: [task.203.migrate-doc-numbering.md](task.203.migrate-doc-numbering.md)

## Overview

This plan builds one ES module, `shared/resources/migrate-doc-numbering.mjs`. It has a pure core
(`discover` → `plan` → `verify`) and a thin I/O shell (`apply`, `main`), and runs it once on this
repository. Every identifier goes through task.202's `doc-id.js`, so this module defines no
regex of its own for `story` or `epic`.

Line numbers below are as of `develop` at `a0f1f97d`. Re-grep them before editing.

## Phase-by-Phase Implementation Guide

### Phase 0: Dependency gate

```bash
git log --oneline develop -- shared/resources/doc-id.js | head -1   # must be non-empty
command node -e 'import("./shared/resources/doc-id.js").then(m=>console.log(Object.keys(m)))'
```

- HALT if either check is empty.
- task.202 plans the module as CommonJS (the `card-preflight.js` style). Its planned exports are
  `parse`, `parseLegacy`, `format`, `matchesEpic`, `nextNumber(kind, entries, registryText)` and
  `checkCorpus(prdRoot)`. `parseLegacy` is exported for this task. Confirm the merged names and
  amend the calls below if they differ.
- task.202 plans no registry **row writer**. Add `appendPrdRow(registryText, row)` to `doc-id.js`
  in this task, beside `nextNumber`, so the registry format has one owner. Do not write a second
  writer here.

### Phase 1: Discover and plan

**Module skeleton** (an ESM `.mjs`, the same layout as `generate-prd-epic-index.mjs`, importing the CommonJS engine):

```js
// shared/resources/migrate-doc-numbering.mjs
import { createRequire } from "node:module";
const { parse, parseLegacy, format, nextNumber, checkCorpus } = createRequire(import.meta.url)("./doc-id.js");

export function discover(root, { readDir, readFile }) { /* returns { prds, epics, stories, files } */ }
export function plan(discovery, registry, opts) { /* returns { renames: Map<old,new>, edits: Edit[], mapping: Row[] } */ }
export function verify(planned, linkIndex, opts) { /* returns { blockers: Blocker[] } */ }
export async function apply(planned, io) { /* moves, rewrites, registries */ }
export async function main(argv) { /* flags → { reason, exitCode, ... } */ }
```

Inject the I/O (`readDir`, `readFile` and so on) so the unit tests feed in-memory trees. The
change-log engine is tested the same way.

**Discovery: how each PRD shape is recognised**

| Shape | Recognised by | PRD stem → feature |
|---|---|---|
| L1 | `{root}/{domain}/prd.{f}/prd.{f}.md` and dir == stem | `f` |
| L2 | `{root}/{domain}/prd.{f}.md` with sibling `epics/` | `f` |
| L3 | `docs/prd.md` or `{root}/index.md` | none → `unplaced-prd` unless `--name <path>=<slug>` |
| numbered | `parse(stem)` succeeds (the new shape) | keep |
| legacy | `parse` fails and `parseLegacy(stem).legacy === true` | migrate |

- **Epics** are the directories `epics/epic.*` under a PRD's directory. For L2, `epics/` is a
  sibling of the PRD file.
- **Stories** are the directories `stories/story.*` under each epic.
- **Artifacts** are every file inside a story or epic directory.

**Plan: numbering rules**

1. **PRDs.** A numbered PRD keeps its number. For the unnumbered ones, sort by path and assign
   `nextNumber("prd", entries, registryText)` once, then increment locally for each further PRD.
   A `registry-behind` result is surfaced as a blocker rather than overridden.
2. **Epics.** Within each PRD, an epic that is already `epic.P.E` keeps E. The unnumbered ones are
   sorted by their old global number and assigned `max(kept E) + 1…`.
3. **Stories.** S is unchanged. The new stem is `format({kind:"story", prd:P, epic:E, story:S, slug})`.
4. **Artifacts.**
   - A basename that starts with the old short id plus a dot (`story.1.1.`) gets the new short id
     (`story.1.1.1.`).
   - A basename that starts with the old full stem (`story.3.1.before-you-start-anchor-runbooks.validate…`)
     gets the new full stem.
   - Anything else (`sprint-review-summary.md`) keeps its basename.
5. **New PRD location.**
   - L1: `{root}/{domain}/prd.P.{f}/prd.P.{f}.md`.
   - L2: a new directory is inserted, `{root}/{domain}/prd.P.{f}/`, which holds both the file and
     the old `epics/`.

**Frontmatter edits** (one `Edit` per file):

| Doc | Field | New value |
|---|---|---|
| PRD | `name` | `prd.P.{f}` |
| PRD | `prd_number` | `P` (insert after `name`) |
| epic | `prd_number` | `P` (insert before `epic_number`) |
| epic | `epic_number` | `E` |
| epic | `prd_source` | new PRD repo-relative path, keeping the old quoting style |
| story | `id` | new stem |
| story | `prd_number` | `P` (insert after `id`) |
| story | `epic` | new epic dir stem (replaces an integer or an old stem) |
| story | `epic_file` | new relative path from the story dir to the epic file |
| story | `prd_source` | new PRD path |
| gate `.yml` | `story` | `'P.E.S'`, keeping the quote character found |

Edit frontmatter with a line-level replace inside the `---` fence only. Use the split/join idiom,
never `String.replace` with a replacement string: `$'` in a body once spliced 3,389 lines into
`finalise/SKILL.md`. Assert that each split count is exactly 2.

### Phase 2: Verification

**The link index.** For every tracked `*.md` repo-wide (`git ls-files '*.md'`), extract the relative
links with the same pattern `doc-links.test.mjs` uses, skipping fenced code. For each link:

```
oldAbs   = resolve(dir(oldFile), href)
liveNow  = exists(oldAbs)
newFile  = renames.get(oldFile) ?? oldFile
newTarget= renames.get(oldAbs)  ?? oldAbs          // target may itself move
newHref  = relative(dir(newFile), newTarget)
```

- `liveNow` and `newHref` resolves in the simulated tree: emit a rewrite `href → newHref` when they differ.
- `liveNow` and it does not resolve: `link-would-break` blocker.
- Not `liveNow`: leave the text untouched, and record whether it would now resolve (`would-heal`,
  which is reported but is not a blocker).

**Path literals.** Outside the history set (`docs/tasks/**`, `docs/bugs/**`, `.agents/**`,
`CHANGELOG.md`), find every exact occurrence of each old repo-relative path from the rename map in
tracked text files (`*.md`, `*.yml`, `*.mjs`, `*.js`) and replace it with the new path. Longest
paths go first, so a directory prefix never replaces part of a longer file path.

**Blockers** (all collected, then returned together):

| Code | Check |
|---|---|
| `prd-less-epic` | The epic is not under any PRD dir, or its `prd_source` is `brownfield-enhancement` or unresolvable |
| `unplaced-prd` | An L3 shape with no `--name` |
| `in-flight` | A story main doc's `status` is not in `{accepted, cancelled}` and `--allow-in-flight` is absent |
| `target-exists` | Any new path exists and is not the same file |
| `dirty-path` | `git status --porcelain -- <old>` is non-empty for any path to be moved |
| `link-would-break` | See above |

### Phase 3: Apply and the CLI

**Order inside `apply`:**

1. `mkdir -p` each new directory.
2. For each rename, run `git mv -- old new` if the file is tracked (`git ls-files --error-unmatch`),
   otherwise `fs.renameSync`.
3. Remove the old directories deepest-first, only when empty.
4. Apply the frontmatter edits, link rewrites and literal rewrites to the files at their **new** paths.
5. Write the PRD registry rows (`appendPrdRow`, added in Phase 0) and the epic-registry pointer.
6. Run `checkCorpus(root)`. Any finding returns `post-check-failed` with the revert command.

**The epic-registry pointer** (written only when `docs/development/epic-registry.md` exists):

```markdown
---
name: epic-registry
description: Retired — epic numbers now count within their parent PRD.
type: registry
status: retired
---

# Epic Registry (retired)

Epic numbers count within their PRD (`epic.{P}.{E}`). Allocate a PRD number from
[`docs/prd/prd-registry.md`](../prd/prd-registry.md); the epics of a PRD are listed in that PRD's
epics-index block. `create-epic` and `epic-registry-manager` are rewired in task.205.

## Historical mapping

| Old epic # | New id | Folder | Tracker key |
| …rows from the old table… |
```

**CLI flags:**

`--apply`, `--check`, `--json`, `--root <dir>` (default: `PRD_ROOT` read like `resolve-paths.sh`),
`--name <path>=<slug>` (repeatable), `--allow-in-flight`.

- `--apply` and `--check` are mutually exclusive. Passing both returns `usage`.
- Run the CLI only when the module is executed directly, never on import, so the test file can
  import `discover`, `plan` and `verify` without side effects.
- End through a `main()` wrapper that sets `process.exitCode` and returns. Never call
  `process.exit()`. This is the idiom at `generate-prd-epic-index.mjs:185` (*"never `process.exit()`.
  Node's stdio is ASYNCHRONOUS on a pipe"*), and bug.3 is the 64 KB truncation it prevents.

### Phase 4: Migrate this repository

```bash
command node shared/resources/migrate-doc-numbering.mjs --json > "${TMPDIR:-/tmp}/migrate-dry.json"   # review mapping
command node shared/resources/migrate-doc-numbering.mjs --apply --json
command node shared/resources/migrate-doc-numbering.mjs --apply --json   # expect reason: already
git status --short | grep -v '^R ' | head                                 # only expected M lines
```

Expected mapping (the epic E is the identity here):

| Old | New |
|---|---|
| `docs/prd/onboarding/prd.onboarding.md` | `docs/prd/onboarding/prd.1.onboarding/prd.1.onboarding.md` |
| `…/epics/epic.N.<slug>/` (N = 1..4) | `…/prd.1.onboarding/epics/epic.1.N.<slug>/` |
| `…/stories/story.N.S.<slug>/` (17 stories) | `…/stories/story.1.N.S.<slug>/` |

Then re-key `doc-links.test.mjs` `KNOWN_ARTIFACT_LINKS` (`:405`) and `KNOWN_ARTIFACT_FENCES` (`:418`).
The literal pass does this automatically, because the keys are exact old paths. Confirm that the
test reports no new and no healed entries.

## Key Patterns and References

- **Idempotent in-place migration**: `shared/resources/change-log.js` `migrateLegacyRow` (`:416`).
  A row already in the new shape is returned untouched.
- **Peer CLI contract**: `shared/resources/tracker-comment.js`, for the `--json` `{reason, exitCode}`
  shape and the 0/1/2 exit families.
- **PRD root**: `shared/resources/resolve-paths.sh:55` (`prd.prdShardedLocation`, default `docs/prd`).
- **Relative link extraction**: mirror `shared/resources/tests/doc-links.test.mjs`, so the
  migration and the ratchet agree on what counts as a link.
- **Bundling**: this file is not cited from any `SKILL.md` until task.204, so it bundles nowhere in
  this task. Do not add a skill citation here.

## Testing Approach

`shared/resources/tests/migrate-doc-numbering.test.mjs` (picked up by the existing
`shared/resources/tests/*.test.mjs` glob):

| Test | Asserts |
|---|---|
| L1 tree | the PRD dir is renamed; epics and stories are prefixed |
| L2 tree (this repo's shape) | a new `prd.1.{f}/` dir is inserted; `epics/` moves under it |
| L3 without `--name` | `blocked`, `unplaced-prd`, zero writes |
| integer `epic: 1` | becomes the epic dir stem |
| two PRDs, old epics 3, 7, 9 under A and 5 under B | A → 1, 2, 3; B → 1 |
| partially migrated | the numbered PRD and epic keep their numbers; the new ones are appended |
| title/prose tokens | `[Story 1.1]`, `Epic 1:` and `story.1.1` without a slug are unchanged |
| both artifact infix forms, plus `sprint-review-summary.md` | renamed, renamed, unchanged |
| a live escaping link | gains one `../`; still resolves |
| a dead link | byte-identical; a `would-heal` report entry when it would resolve |
| a `link-would-break` fixture | blocked |
| each blocker | its code; mutation-proven by disabling the check |
| fixture `--apply` in a temp git repo | renames are recorded as `R` in `git status`; a second run is `already` with an empty `git diff` |

Mutation-prove the idempotence rule as well: force the renumbering of an already-numbered epic,
and the partially-migrated test must go red.
