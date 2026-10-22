---
id: task.230.plan
title: "Implementation Plan: Keep foreign sections out of the change-log block"
type: plan
task-ref: task.230.change-log-block-foreign-sections.md
---

# Implementation Plan: Keep foreign sections out of the change-log block

> Requirements and success criteria: [task.230.change-log-block-foreign-sections.md](task.230.change-log-block-foreign-sections.md)

## Overview

Add one partition step to the marker path of `change-log.js`. It splits `splitCarriedLines`'
`before` / `after` lines into "the log's own" and "foreign" at the first heading at or above the
log's level. `upsertChangeLog` emits the foreign part outside the markers. Two exports expose the
same partition: one to read it (`foreignSections`), one to apply it without appending a row
(`liftForeignSections`). The corpus guard and the tests use those exports, so there is one
definition.

## Phase-by-Phase Implementation Guide

### Phase 1: Engine

**Files to modify:**

- `shared/resources/change-log.js` — `splitCarriedLines` (`:274`), `upsertChangeLog` (`:599`), `module.exports` (`:952`)
- `shared/resources/tests/change-log.test.mjs` — a new section after section I (`:1289`)

**Exact changes:**

1. **The partition.** A helper beside `splitCarriedLines`:

   ```js
   // Split carried lines at the first heading at or above the log's own level that is not a
   // Change Log heading. Everything from that heading to the end of its side is a sibling
   // section written inside the markers (obs #91, obs #229) — it is lifted, never absorbed.
   function splitForeign(lines, level) {
     const isSibling = (l) => {
       const m = l.match(/^(#{1,6})[ \t]/);
       return m && m[1].length <= level && !RE_HEADING.test(l);
     };
     const at = lines.findIndex(isSibling);
     return at < 0 ? { own: lines, foreign: [] } : { own: lines.slice(0, at), foreign: lines.slice(at) };
   }
   ```

   **Do the split inside `splitCarriedLines`, before `flags` is computed** (review 1, verified):
   `before` / `after` are built through `text()`, which drops the protection flag, and table
   classification takes every unfenced pipe-line from the first one on as the log's table — so a
   foreign section holding its own pipe table before the log table would have its rows absorbed
   into `tableLines` before any later split could see them. Run the partition over the
   `[line, prot]` pairs, match headings on unprotected lines only (a fenced `## Example` has
   `prot === true` and must never match), and return `beforeForeign` / `afterForeign` beside
   `before` / `after`. Extent: stated once, in `partitionForeign`'s header comment (QA cycle 1
   replaced the first-entry-row rule with a table chosen at or after the log's heading). Classify
   the table over the remaining own lines.

   `RE_HEADING` must not be restated: import the module's own constant. A `Change Log` heading is
   never foreign; the obs #104 absorption owns the doubled-heading case.

2. **`upsertChangeLog`.** On the `found.hasMarkers` path, after `splitCarriedLines`:

   ```js
   // before:  headContent + block + trailing + tail.content
   // after:   headContent + liftedBefore + block + liftedAfter + trailing + tail.content
   ```

   - `liftedBefore` is `beforeForeign.join("\n") + "\n\n"` when non-empty. It goes **after** the obs #104
     heading pop (`:651`–`:669`), so a hand-authored heading directly above the marker is still
     absorbed, and the lifted section lands between the head and the block.
   - `liftedAfter` is `"\n\n" + afterForeign.join("\n")` when non-empty. It goes after `CL_END`.
   - Pass only `own` lines to `buildChangeLogBlock` as `before` / `after`.
   - `trimSeam` (`:780`) already collapses runs of three or more newlines; keep using it.

3. **Exports.**

   ```js
   // Read-only: what a write would lift. [] when the document has no marker block or nothing to lift.
   function foreignSections(content) { /* findChangeLog → hasMarkers? → splitCarriedLines → splitForeign → [{ side, heading, lines }] */ }

   // Apply the lift without appending a row. Same output shape as the block upsertChangeLog would
   // emit around the existing rows, so a repair and a write agree.
   function liftForeignSections(content) { /* → { content, lifted: [heading, …] } */ }
   ```

   `liftForeignSections` must reuse the `upsertChangeLog` assembly. Factor the block rebuild into
   one internal function taking `newRow | null`, rather than writing a second assembly path: two
   assemblies would drift.

**Tests (red first):**

| Case | Input shape | Expect |
| --- | --- | --- |
| obs #91 | marker, `## Deferred Work` + list, `## Change Log`, table | Deferred Work directly above the marker; block = heading + table |
| task.203 | marker, `## Change Log`, `## Definition of Done - PASSED ✅`, `### QA Report Summary`, body, table | the whole DoD section, `###` included, above the marker |
| after-side | marker, heading, table, `## Notes` + prose | `## Notes` below the end marker |
| two sections | `## A`, `## B` before the table | both above, A then B |
| foreign table | `## Change Log`, `## DoD` + a `| Criterion | Status |` table, then the log table | the DoD section, its table included, above the marker; the log table keeps only its own rows |
| one definition | each lifting case | `foreignSections(upsertChangeLog(x, row))` is `[]` |
| legacy pair | the same inside `<!-- jira-sync-changelog-start/end -->` | lifted on the migrating write |
| H3 log | `### Change Log`, `### Foo`, `#### Bar` | `### Foo` (with its `#### Bar`) lifted. Control: `#### Note` directly under the heading stays |
| control: nested | H2 log, `### Nested` + its table after the log table | unchanged (section I) |
| control: fence | a fenced `## Example` inside the block | unchanged |
| control: clean | heading + table only | byte-identical to today |
| obs #104 compose | `## Change Log` directly above the marker, plus a foreign section inside | one heading; foreign section above the marker |
| idempotent | the output of any case above | a second write changes only the new row |
| no loss | each lifting case | non-blank lines in = non-blank lines out minus the new row (as multisets) |

**Mutation proof:** make `splitForeign` return `{ own: lines, foreign: [] }`, confirm the lifting
cases go red, then restore. Record the red run in the implementation report.

### Phase 2: Placement rule and spec

**Files to modify:**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, "Where the Deferred Work record goes",
  the *Absent → create it* bullet (`:771`). Replace

  > immediately before the change-log block (before the `## Change Log` heading when one sits
  > directly above the marker block)

  with finalise 7.4's wording (`skills/finalise/SKILL.md:1368`):

  > immediately before the change-log block: before a `## Change Log` heading that sits directly
  > above `<!-- change-log-start -->`, else before the marker itself — never between the markers,
  > where every later append would carry it inside the log (obs #91)

- `shared/resources/document-change-log.md`, the Markers section (`:75`). After the "heading lives
  inside the markers" paragraph (`:88`), add one paragraph: only the heading and the table live
  inside the markers; a sibling section found there is lifted out on the next write, above the
  start marker (or below the end marker for one after the table); deeper subsections stay.
  Cite obs #91 and task.230.
- `tests/deferred-work-placement.test.js`: the comment above `place()` (`:61`) restates the old
  wording — reword it to the marker-anchored one, and add an assertion that `statement()` contains
  "never between the markers" (holds the placement-rule success criterion; review 1, check 15).

Then `npm run bundle` and commit the regenerated copies with the sources. The bundler prints each
skill's closure delta; expect no new closure members, since both files are already bundled
wherever they are cited.

### Phase 3: Repair and corpus guard

**Guard** — `evals/shared/tests/change-log-foreign-section-corpus.test.mjs`. Model it on
`evals/shared/tests/doc-numbering-corpus.test.mjs` (its non-vacuity floor, `:50`–`:76`):

```js
// git ls-files '*.md' → read each → findChangeLog → hasMarkers only → foreignSections
// offenders = [`${path}: ${section.heading}`]; assert.deepEqual(offenders, [])
// floor: blocksScanned >= MIN_BLOCKS (set below the count measured now; state the command in a comment)
```

Load the source, never a bundled copy: `shared/resources/change-log.js`, reached through
`pathToFileURL(path.join(REPO_ROOT, "shared", "resources", …))` the way
`doc-numbering-corpus.test.mjs:44` loads `doc-id.js`, or through `createRequire` as
`bug-registry-drift.test.mjs` does.

**Order:**

1. Write the guard and run it on the unrepaired tree. It must fail and name all four documents.
   That is the calibration (a check proves nothing until it reproduces a known failure).
2. Repair each document with a real write:

   ```js
   const CL = require("./shared/resources/change-log.js");
   // per file: content = CL.upsertChangeLog(content, { date: "<today>", version: "",
   //   description: "Change-log block repaired — DoD section moved above the markers (task.230)",
   //   author: "develop-task" }, { docType: "task" });
   // then CL.bumpUpdated(content, "<today>") and write
   ```

   Machine writers leave `Version` blank (`document-change-log.md`, Who writes what).
3. Re-run the guard (green), then `git diff --stat` the four files. Expect the DoD section moved
   and one row added, nothing else. Then run `change-log.js --check-append-only --against develop`
   on each.
4. Mutation: re-plant a `## X` inside one document's block in a scratch copy and confirm the guard
   goes red.

### Phase 4: Documentation and validation

- `CHANGELOG.md` Unreleased: one entry, "`change-log.js` lifts a sibling section out of the
  change-log markers instead of absorbing it; corpus guard added; four task documents repaired
  (task 230, obs #91)".
- Move `.agents/skills` to `.agents/skills.aside`, run `npm run ci`, then restore it.

## Key Patterns and References

- **The obs #104 heading absorption** (`change-log.js:651`): the convergence shape this copies, one
  boundary inward.
- **`collapseOtherLegacyBlocks`** (`:639`): a second example of "repair on write" in the same
  function.
- **`qa-results.js` `relocated`** (`:20`): same canonical position (directly before the block);
  left unchanged.
- **bug.13** (the comment above `splitCarriedLines`): a machine writer never deletes human text.
  The no-loss property test enforces it here.

## Testing Approach

- Unit: `command node --test shared/resources/tests/change-log.test.mjs`.
- Callers: `command node --test skills/sync-jira-task/tests skills/sync-jira-story/tests skills/sync-jira-epic/tests shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`.
- Corpus: `command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs`.
  Wall time: `uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs`
  on the PR head; record figure and load.
- Full: `npm run ci` with the symlink moved aside.
