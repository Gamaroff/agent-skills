---
id: task.202.plan
title: "Implementation Plan: Doc-id engine and PRD registry"
type: plan
task-ref: task.202.doc-id-engine-and-prd-registry.md
---

# Implementation Plan: Doc-id engine and PRD registry

> Requirements and success criteria: [task.202.doc-id-engine-and-prd-registry.md](task.202.doc-id-engine-and-prd-registry.md)

## Overview

Build `shared/resources/doc-id.js` as a pure CommonJS library with a thin CLI, in the same shape as
`shared/resources/card-preflight.js` (`"use strict"`, `require`, `module.exports`, and a
`require.main === module` CLI). Add a `prd` kind to `parseRegistry`, then rewrite the standards. No
caller is migrated.

## Phase-by-Phase Implementation Guide

### Phase 1: Grammar and pure functions

**File:** `shared/resources/doc-id.js`

```js
"use strict";
const NUM = "[1-9][0-9]*";
const SLUG = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";      // a hierarchical slug starts with a letter
const LOOSE_SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";     // task / bug: today's grammar
const SUB = "[A-Z]";                               // sub-story suffix: story.1.2.3A

// The ONE artifact vocabulary. Until task 206, a contract test pins it equal to
// WORK_ITEM_ARTIFACT_RE in finalise-fix-and-recheck.mjs.
const ARTIFACTS = Object.freeze([
  "qa", "gate", "bug", "implementation", "review", "dod", "plan", "handover",
  "handoff", "pr-review", "risk", "test-design", "sprint-review-summary",
]);

const ID_RE = {
  prd:   new RegExp(`^prd\\.(?<prd>${NUM})`),
  epic:  new RegExp(`^epic\\.(?<prd>${NUM})\\.(?<epic>${NUM})`),
  story: new RegExp(`^story\\.(?<prd>${NUM})\\.(?<epic>${NUM})\\.(?<story>${NUM})(?<sub>${SUB})?`),
  task:  new RegExp(`^task\\.(?<n>${NUM})`),
  bug:   new RegExp(`^bug\\.(?<n>${NUM})`),
};
```

`parse(name)`:

1. Strip any directory and the `.md` / `.yml` / `.json` / `.sh` extension.
2. Match the leading kind word, then that kind's `ID_RE`.
3. The remainder must be one of:
   - `.{slug}`, which is the document itself
   - `.{artifact}.{seq}.{slug}`, an artifact
   - `.plan.{slug}`, the plan, which has no seq
   - `sprint-review-summary`, which is unprefixed and handled by the caller
   - any other remainder holding an `ARTIFACTS` keyword as a whole dot-segment (dated review,
     slug before the keyword, seq-less DoD sidecar): an artifact with `seq: null`, `canonical: false`.
     A single-segment remainder is always the document slug, even when it equals an artifact word.
4. Return a frozen object, or `{ ok: false, reason }` where `reason` is one of `unknown-kind`,
   `bad-number`, `bad-slug` or `bad-artifact`.

`parseLegacy(name)` accepts `prd.{slug}`, `epic.{E}.{slug}` and `story.{E}.{S}{sub?}.{slug}`, and
returns `{ legacy: true, … }`. It is exported for task 203 only, and the JSDoc says so.

`format({ kind, prd, epic, story, sub, n, slug, artifact, seq })` is the exact inverse.
**Property test:** generate every kind × (with or without sub) × (document, artifact or plan), and
assert that `parse(format(x))` deep-equals `x`.

`matchesEpic(name, P, E)` is `const p = parse(name); return !!p && (p.kind === "epic" || p.kind ===
"story") && p.prd === P && p.epic === E;`. It throws `TypeError` when P or E is not a positive
integer, so a caller cannot pass E alone.

`nextNumber(kind, entries, registryText)`:

- `prd`: parse `/\*\*Next Available PRD Number:\*\*\s*\*\*(\d+)\*\*/` from `registryText`, the same
  bold-in-bold form as `task-registry.md` line 5. The registry's counter is authoritative: if it is
  lower than the highest P found in `entries`, return `{ ok: false, reason: "registry-behind" }`.
- `epic` / `story`: take the highest number among `entries`, the directory basenames that `parse` to
  that kind, and add 1. With no entries, return 1.

### Phase 2: Checks and CLI

`check(docPath, { prdRoot, readFile, readDir })`. Filesystem access is injected so the unit tests stay
pure, and the CLI passes `fs`. It runs these checks in order and collects every finding instead of
stopping at the first:

| Order | Check | `reason` |
| --- | --- | --- |
| 1 | `parse(basename)` ok and not an artifact | `bad-shape` |
| 2 | `basename(dirname)` === stem | `dir-stem-mismatch` |
| 3 | frontmatter `prd_number` (+ `epic_number` for an epic, `epic` stem for a story) equals the parsed numbers | `frontmatter-mismatch` |
| 4 | the parent exists: an epic's PRD is two levels up (`…/prd.P.x/epics/epic.P.E.y/`), and a story's epic is two levels up (`…/epic.P.E.y/stories/story.P.E.S.z/`) | `parent-missing` |
| 5 | the parent's parsed P (and E) equal the child's | `parent-number-mismatch` |
| 6 | for a PRD, a registry row exists whose `n` is P | `unregistered` / `registry-missing` |

Frontmatter is read with the minimal scalar reader pattern already used by `frontmatterField` in
`shared/resources/generate-prd-epic-index.mjs`. Copy the approach, not the module: that file runs its
CLI at import.

`checkCorpus(prdRoot)` walks `prdRoot` recursively and considers only directories whose name parses
as `prd`, `epic` or `story`. It skips `prd-registry.md` and shard files with no kind prefix. It runs
`check` on each `{dir}/{dir}.md`, then adds `duplicate-id` for any two documents with the same
`(kind, P[, E[, S]])`. With no documents it returns `reason: "empty"`, exit 0.

`resolvePrdRoot(argv, cwd)` checks `--prd-root`, then the `prd.prdShardedLocation` line-scan of
`skills-config.yaml` (the same approach as `prdRootFromConfig`), then `"docs/prd"`.

**CLI** (`if (require.main === module)`):

- Subcommands: `parse`, `next`, `check`. The JSON payload is `{ reason, exitCode, … }`.
- Write output with `process.stdout.write` and **set `process.exitCode`; do not call `process.exit()`**.
  The select-next pipe-truncation defect came from calling `process.exit()` after an async stdout
  write.
- A test spawns the CLI and reads a large `check --corpus` payload through a pipe.

### Phase 3: Registry parser and standards

**File:** `skills/develop-next/scripts/select-next.mjs`

- Add `prd: { n: 0, title: 1, status: 3 }` to `DEFAULT_COLUMNS`. The documented order is
  `| PRD # | Title | Folder | Status | Created |`.
- Add `"prd #": "n"` to `COLUMN_ALIASES`.
- In `parseRegistry`, replace `.find(isWorkItemHref)` with
  `.find(kind === "prd" ? isPrdHref : isWorkItemHref)`, where
  `isPrdHref = (h) => /(?:^|\/)prd\.[^/]*\.md$/i.test(h)`. **Do not widen `isWorkItemHref`.** The
  roadmap reader at `if (isWorkItemHref(m[1])) return m[1];` shares it.
- The malformed-row message says `story|task|bug`. When `kind === "prd"` it should name `prd`
  instead.

**Standards**

- `docs/standards/prd-registry.md`: copy the structure of `docs/standards/task-registry.md` (purpose,
  location, counter, row format, never-reuse rule, merge-conflict rule), with `${PRD_ROOT}/prd-registry.md`
  as the location. The registry file carries frontmatter `type: registry`, like
  `docs/development/epic-registry.md`.
- `file-naming.md`:
  - In the Core documents table, change the PRD, Epic and Story rows.
  - In the Story artifacts table, change `story.{epic}.{story}` to `story.{P}.{E}.{S}`.
  - In the Epic and PRD artifacts table, change `epic.{n}.review` to `epic.{P}.{E}.review` and `prd.{name}.review` to `prd.{P}.{name}.review`.
  - Rewrite the closing uniqueness paragraph: P is global and never reused; E is unique within P; S is unique within E.
- `prd-documents.md`: change the directory layout and the File naming section, and add `prd_number`
  to the frontmatter schema.
- `epic-documents.md`:
  - `epic_number` becomes "unique within its PRD".
  - Add `prd_number`.
  - `prd_source` becomes **Required**.
- `story-documents.md`: change the pattern, use `epic.1.2.feature-ui` as the `epic:` example, and add
  `prd_number`.
- Each of these gets the dated interim note from task §5.

## Key Patterns and References

| Need | Pattern to follow |
| --- | --- |
| CJS engine shape with a CLI | `shared/resources/card-preflight.js` |
| Exit-code and `reason` contract | `shared/resources/tracker-comment.js` (header comment "Exit codes") |
| Registry document shape | `docs/tasks/task-registry.md`, `docs/development/epic-registry.md` |
| Frontmatter scalar reading | `frontmatterField` in `shared/resources/generate-prd-epic-index.mjs` |
| Corpus-style test | `shared/resources/tests/card-preflight-corpus.test.mjs` |

## Testing Approach

- **`shared/resources/tests/doc-id.test.mjs`** (`node:test`, ESM):
  - load the engine with `createRequire(import.meta.url)`, the `card-preflight.test.mjs` precedent
  - cover the grammar table, the round-trip property, `matchesEpic`, `nextNumber`, each `check`
    reason against an in-memory fs, and the CLI via `spawnSync` with `{ encoding: "utf8" }`
- **Fixture tree** `shared/resources/tests/fixtures/doc-id/`:
  - `docs/prd/web/prd.1.home/prd.1.home.md`
  - `…/epics/epic.1.1.hero/epic.1.1.hero.md`
  - `…/stories/story.1.1.1.anim/story.1.1.1.anim.md`
  - a `prd-registry.md`
  - one sibling tree per defect reason
  - Fixtures are git-tracked. Check that `.gitignore` does not swallow them, as it did the eval replay fixtures.
- **Contract test:** `ARTIFACTS` deep-equals the alternation inside `WORK_ITEM_ARTIFACT_RE`, imported
  from `../finalise-fix-and-recheck.mjs`.
- **Registry test:** in `evals/develop-next/unit/select-next.test.mjs`, a `prd` table row parses into
  `rows`, and a roadmap line linking `prd.1.x.md` yields no work item.
- **Mutation proof:** delete each `check` branch in turn and confirm a test goes red. Record each
  mutation in the implementation report.
- Before trusting a local green, run `npm test` with `.agents/skills` moved aside.
