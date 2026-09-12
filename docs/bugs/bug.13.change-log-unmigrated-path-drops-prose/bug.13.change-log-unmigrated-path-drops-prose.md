---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-12'
updated: '2026-09-12'
related: 'none — cross-cutting (change-log engine; every sync/QA/finalise writer that appends a Change Log row)'
description: "On the un-migrated (hasMarkers:false) path — the path every not-yet-migrated document takes on its first Change Log write — change-log.js regenerates the section from table rows alone, silently discarding prose and any nested ### subsection under the H2 heading."
github_issue: 389
---

**Bug ID**: bug.13
**GitHub**: [#389](https://github.com/Gamaroff/agent-skills/issues/389)
**Related**: none — cross-cutting (`shared/resources/change-log.js`; every writer that calls `upsertChangeLog` — the four `sync-jira-*`, four `sync-github-*`, `qa-*`, `finalise`, `develop`)
**Status**: ✅ Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-09-12
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `upsertChangeLog` in `shared/resources/change-log.js` rebuilds the `## Change Log`
section from the rows it can parse plus any *other* line that starts with `|`. On a document whose
section has **no** `<!-- change-log-start/end -->` markers — which is every document that has not
yet been migrated, i.e. the state of every document on its **first** write — anything under the
heading that is not a pipe-line is dropped: an authoring note, a paragraph explaining a version bump,
and a nested `### …` subsection with its whole body.

**Expected Behavior**: the first write on an un-migrated document inserts the markers, appends the
row, and carries every other line of the section through unchanged. A machine writer's edit is
additive; it never deletes text a human wrote.

**Actual Behavior**: prose and nested `###` blocks inside the `## Change Log` span are discarded.
Table rows survive, the following `## Section` survives, so the loss is easy to miss — the document
still reads as well-formed.

**Impact**: silent, unrecoverable-by-the-writer content loss on a *documented* input. The spec
(`shared/resources/document-change-log.md`) says PRDs keep a nested `### Change Log` and readers
"accept H2 or H3 with optional numbering" — so nested `###` under an H2 log is within the input the
engine claims to handle. Because the migration is "additive and going-forward only", every legacy
document in a consumer repo hits this path exactly once, at a moment nobody is reading the diff (a
sync, a QA cycle, a finalise). First recorded in the 2026-09-07 handoff as carried follow-up 3a(1);
re-confirmed by execution on 2026-09-12; the engine has not been touched since 2026-08-17.

---

## Reproduction Steps

**Environment**: any; `command node` v26. Pure engine call, no tracker or network.

**Steps to Reproduce**:

1. Build a probe document: frontmatter, a `## Overview` section, then

   ```markdown
   ## Change Log

   AUTHORING NOTE prose.

   | Date | Version | Description | Author |
   | --- | --- | --- | --- |
   | 2026-09-01 | 1.0 | Initial | a |
   | 2026-09-02 | 1.1 | Edit | b |

   ### Nested

   Nested body.

   ## Next Section

   Next section body.
   ```

2. Run the engine:

   ```bash
   command node --input-type=module -e '
     import fs from "node:fs";
     const { upsertChangeLog } = await import("./shared/resources/change-log.js");
     const before = fs.readFileSync("probe.md", "utf8");
     const after = upsertChangeLog(before, { date: "2026-09-12", version: "1.2", description: "Probe append", author: "probe" }, { docType: "story" });
     fs.writeFileSync("after.md", after);
   '
   diff probe.md after.md
   ```

3. Observe the diff.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Test Output** (2026-09-12, `develop` @ `6ce3280e`):

```
findChangeLog => {"start":114,"end":422,"level":2,"hasMarkers":false}
LOST   AUTHORING NOTE prose
LOST   ### Nested heading
LOST   Nested body
KEPT   row 2026-09-01
KEPT   row 2026-09-02
KEPT   new row
KEPT   ## Next Section
KEPT   Next section body
```

```diff
9c9
<
---
> <!-- change-log-start -->
12,13d11
< AUTHORING NOTE prose.
<
17a16,17
> | 2026-09-12 | 1.2 | Probe append | probe |
> <!-- change-log-end -->
19,22d18
< ### Nested
<
< Nested body.
<
```

(Run 2026-09-12 from the recipe above, verbatim. The `| --- |` separator is also rewritten to
`|------|` style — cosmetic, expected.)

**Related Files**:

- `shared/resources/change-log.js` — `findChangeLog` (≈339-350) ends an H2 span at the next `#{1,2}`
  heading, so a nested `###` falls **inside** the span; `upsertChangeLog` (≈399-420, 460) regenerates
  the block from `isEntryRow` rows plus `unparsed` lines that start with `|` and nothing else.
- `shared/resources/tests/change-log.test.mjs` — the sibling-`###` cases (≈116-141, 716) all place
  the `###` *outside* the span (an H3 log followed by a sibling H3). No test asserts prose or a nested
  subsection survives a write. The "numbered heading" case (≈77) contains prose but asserts only on
  heading count.
- The source comment near `findChangeLog` describes a fix for a *related* case (an H3 log ending at
  the next `###` or `##`). That fix is real and does not cover this one. Do not read it as closing this.

---

## Scope & Impact

**Reference**: `shared/resources/document-change-log.md` (canonical spec — "readers accept H2 or H3
with optional numbering and preserve the level found"; migration is in place and additive).

**How It Failed**: the engine preserves the *heading level* it found but not the *content* under it.
Cross-cutting because the engine is shared by every machine writer and the input class is "every
document not yet migrated" — no single story or task owns the documents that will lose text.

---

## Recommendation

1. On the `hasMarkers:false` path, carry every non-row line of the span through verbatim, in its
   original position relative to the table (prose above stays above; a nested `###` block after the
   table stays after the new row and **inside** the markers, since the spec's marker pair delimits the
   whole section).
2. Add the missing test: a document with prose + table + nested `###` + following `##`, asserted
   line-by-line for presence after the write (both `hasMarkers:false` and, as a control, `true`).
3. Mutation-prove it: revert the fix and confirm the new test is the one that goes red — not a
   neighbour (obs #41).
4. Re-run the four `sync-jira-*` and four `sync-github-*` suites unchanged; they exercise the marked
   path and must not move.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Developer**: Claude (develop-bug, autonomous via develop-next)

**Reproduction**: ran the report's recipe verbatim against `develop` @ `f8e12200` — `findChangeLog` returns `{"start":72,"end":272,"level":2,"hasMarkers":false}`; the diff drops `AUTHORING NOTE prose.`, `### Nested` and `Nested body.` while keeping both rows, the new row and `## Next Section`. Matches the Evidence section line for line.

**Root Cause Analysis**: `upsertChangeLog` (`shared/resources/change-log.js` ≈399–465) takes the located span `content.slice(found.start, found.end)`, keeps `blockLines.filter(isEntryRow)` plus `unparsed` (lines starting with `|`), and hands only those to `buildChangeLogBlock`, which emits markers + heading + a four-column table. Every line of the span that is not a pipe-line — prose, blank lines, a nested `###` heading and its body — is never read again. On the `hasMarkers:false` path the span is defined by `findChangeLog` as heading → next heading of the same-or-shallower level (≈339–350), so a nested `###` and its body are inside it. The marked path has the same regeneration, but an engine-written block never contains prose, so it only bites when a human adds text between the markers. The test at `change-log.test.mjs:657` (`TASK-42-BUG-1`) documents the drop as a "residual, and correct" — that is the design decision this bug overturns.

**Proposed Fix**: partition the span into regenerated lines (markers, the `Change Log` heading, pipe-lines) and carried lines (everything else); emit carried lines above the table if they preceded it and below the new row if they followed it, inside the markers. Regression tests for both marker states; re-state the TASK-42-BUG-1 assertion to "the fenced heading is preserved *inside its fence*".

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: `upsertChangeLog` regenerated the located span from pipe-lines only (`isEntryRow` rows + `unparsed` pipe-lines), so every non-pipe line in the span — prose, blank lines, a nested `###` heading and its body — was never read again. On the un-migrated path the span is heading → next same-or-shallower heading, so nested content is inside it. The old test for TASK-42-BUG-1 documented the drop as "residual, and correct".

**Fix Description**:

- New `splitCarriedLines(blockLines)` in `shared/resources/change-log.js` partitions the span into lines the rebuild regenerates (any `SWEEP_PAIRS` marker, the first `Change Log` heading, pipe-lines) and lines it carries verbatim (everything else), split by where they sat relative to the table: `before` (above the first pipe-line) and `after` (below the last). Non-pipe lines that sat *between* two table fragments are carried too and emitted after the table, since the rows must be one contiguous table — moving a line loses nothing where dropping it lost text.
- `buildChangeLogBlock` gains optional `before` / `after` line arrays, emitted inside the markers on either side of the table. Both default to empty, so an engine-written block that only ever held a table is emitted exactly as before.
- Behaviour is identical on both marker states — the marked path was regenerating the same way, so a human note added between the markers was equally lost.

**Files Modified**:

- `shared/resources/change-log.js` — `splitCarriedLines` (new), `buildChangeLogBlock` (`before`/`after` options), `upsertChangeLog` (passes the partition through)
- `shared/resources/tests/change-log.test.mjs` — block **I** (bug.13): 7 tests — prose + nested `###` survive on `hasMarkers:false` and `true`; carried lines keep their side of the table and sit inside the markers; a second write neither duplicates nor drops; an H3 log keeps prose and level; a table-only marked block is regenerated byte-for-byte. The `F: … TASK-42-BUG-1` assertion re-stated: the fenced heading is now *preserved inside its fence* (checked via `insideProtected`) rather than dropped.
- 25 × `skills/*/references/change-log.js` — regenerated by `npm run bundle` (byte-identical copies; the copy-parity test requires it).

**Testing**:

- Regression block I fails on the pre-fix engine and passes after the fix — **mutation-proved** by stashing `change-log.js` alone: exactly the 6 block-I tests + the re-stated F test go red (7 fail / 53 pass); restored → 60 / 60.
- The bug report's own probe re-run on the fixed engine: the diff is now only the marker pair, the separator normalisation and the appended row — no `LOST` lines.
- `npm run ci:fast` (prettier + full unit suite incl. the four `sync-jira-*` and four `sync-github-*` suites, which exercise the marked path) — result recorded in the implementation report.

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/change-log.test.mjs` — 60 pass, block I present.
2. Run the report's Reproduction Steps 1–3 against the branch: `diff probe.md after.md` shows no deleted lines (only `>` additions and the `| --- |` → `|------|` separator rewrite).
3. `git stash push -- shared/resources/change-log.js && command node --test shared/resources/tests/change-log.test.mjs; git stash pop` — block I red, then green.
4. `diff -q shared/resources/change-log.js skills/develop-bug/references/change-log.js` — no output (bundled copy matches).

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-09-12
**QA Engineer**: develop-bug (verify cycle 1)

**Verification Result**: ⚠️ Still Failing

**Notes**: Regression block and suites green, but the diff review found three defects in the fix itself (CR-1 marker text substring-stripped without a fence guard; CR-2 table membership ignoring `protectedRanges` and nesting; CR-3 blank lines dropped), each confirmed by probe. The bug's *reported* scenario was gone; the fix introduced adjacent ones.

**Decision**: Reopened → Iteration 2

### Iteration 2

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-12
**Developer**: Claude (develop-bug verify cycle 1)

**Why reopened**: the verify-cycle diff review found three defects in the Iteration 1 fix, each confirmed by a probe against the branch:

- **CR-1** — `splitCarriedLines` strips marker text from *every* carried line by substring (`line.split(marker).join("")`) with no fence / inline-code guard. A prose line ``Wrapped by `<!-- change-log-start -->` markers.`` is rewritten to ``Wrapped by `` markers.`` and a fenced line holding a marker is deleted outright. This is the exact class the module's guard 4 exists for, and it contradicts the fix's own "never deletes text a human wrote" rule.
- **CR-2** — table membership is every `|`-leading line, regardless of `protectedRanges` or nesting. A fenced example inside the section has its entry row promoted into real history and its fence hollowed out to `` ```markdown / ## Change Log / ``` ``. A nested `### Nested` subsection with its own two-column table has that table torn out and merged into the log as unparsed rows, leaving the bare `### Nested` heading below.
- **CR-3** — the `between` filter drops blank lines, so a multi-paragraph note that sat between two table fragments is collapsed into one run when moved below the table.
- **CR-4** (cleanup) — the pipe-line predicate is defined once in `splitCarriedLines` and again inline in the `unparsed` filter, so the two classifications of "what is a table line" can drift.

**Proposed Fix**: make `splitCarriedLines` the single classifier — walk the span with absolute offsets so `protectedRanges` applies per line (a protected line is carried verbatim: never a marker, never a heading, never a table line); drop only a line whose *trimmed* content is exactly a marker; stop table classification at the first unprotected nested heading so a subsection keeps its own table; return the table lines so `upsertChangeLog` derives `existing` / `unparsed` from the same set; keep blank lines inside carried runs and trim only the edges.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: the Iteration 1 `splitCarriedLines` classified lines by their text alone — substring-stripping markers, and calling every `|`-leading line a table line — without the module's `protectedRanges` and without regard to nesting. Fenced or inline-code content inside the section was treated as live structure.

**Fix Description**:

- `splitCarriedLines(content, found)` now walks the span with **absolute offsets** so `protectedRanges` applies per line: a protected line is carried verbatim and is never a marker, never the heading, never a table line — the same rule `findChangeLog` already applies to its own scans (CR-1, CR-2).
- Markers are removed **by position**: the span's boundary lines begin with the start marker and end with the end marker by construction, so those are stripped there; elsewhere only a line whose trimmed content is exactly a marker is dropped. No substring stripping anywhere (CR-1).
- Table classification **stops at the first unprotected nested heading**, so a subsection keeps its own table instead of having it torn out into the log (CR-2).
- The function returns `tableLines`, and `upsertChangeLog` derives both `existing` and `unparsed` from that one set — one classifier, so a line cannot be carried as prose *and* absorbed as history (CR-2, CR-4). `isTableLine` is hoisted to module level (CR-4).
- Between-fragment lines are `trimBlank`-ed at the edges only; interior blank lines survive (CR-3).
- Adversarial pass (qa-fix Step 3.5) closed three residual edges in the same change: a section with prose + nested `###` but no table now splits at the nested heading rather than hoisting the subsection above the new table; boundary markers that share a line with text are handled; `extractEntries` (the read path) reads through the same classifier so a fenced example row is a picture on both sides.

**Files Modified**:

- `shared/resources/change-log.js` — `isTableLine` (new, module-level), `splitCarriedLines` (rewritten: offsets + protected ranges + nested-heading cut-off + `tableLines`), `upsertChangeLog` (reads rows from `tableLines`), `extractEntries` (same classifier)
- `shared/resources/tests/change-log.test.mjs` — 7 more block-I tests: CR-1 (inline-code and fenced marker carried, second write stable), CR-2 (fenced example rows carried not absorbed; nested subsection keeps its table), CR-3 (interior blank lines kept), no-table split, boundary-shared markers, `extractEntries` on a fenced row
- 25 × `skills/*/references/change-log.js` — regenerated by `npm run bundle`

**Testing**:

- 67 / 67 in `change-log.test.mjs`. **Mutation-proved**: the Iteration-1 engine (`a5d18f67`) swapped in → exactly the four CR-1/2/3 tests go red (4 fail / 60 pass); restored → green.
- The four cycle-1 probes re-run: marker mention and fenced marker intact; fenced example carried whole with its row absent from the live table; nested table under its heading; paragraphs keep their blank lines.
- `npm run ci:fast` — result recorded in the implementation report (Verify Cycle 1, Fast gate).

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/change-log.test.mjs` — 67 pass.
2. `git show a5d18f67:shared/resources/change-log.js > shared/resources/change-log.js && command node --test shared/resources/tests/change-log.test.mjs; git checkout shared/resources/change-log.js` — the CR-1/2/3 tests red, then green.

### Iteration 3

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-12
**Developer**: Claude (develop-bug verify cycle 2 — full-branch refute pass)

**Why reopened**: three defects, each confirmed by a probe:

- **CR-1 (high)** — now that a fenced `<!-- change-log-end -->` inside the section survives write 1, write 2's `findMarkerBlock` matches it: its lazy `start[\s\S]*?end` regex checks only the *start* index against `protectedRanges`, so the block ends inside the fence. The real table and end marker are stranded outside the block (`extractEntries` → 0 after write 1), and each write emits one more end marker (2 → 3). The unguarded end-scan pre-dates this bug but was unreachable while fenced content was dropped.
- **CR-2 (low)** — `splitCarriedLines` tests protection at the *line start*, but inline-code ranges begin mid-line, so a boundary line like `` `note`<!-- change-log-end --> `` counts as protected and its end marker is never stripped by position (two end markers after one write).
- **CR-3 (low)** — a nested heading that *precedes* the table (`## Change Log` → `### Notes` → rows) sets the cut-off before any row is classified, demoting every existing row from history to carried prose (`extractEntries` N → 0) — a silent semantic change from pre-diff behaviour, where those rows were absorbed as history.
- **CR-4 (cleanup)** — `collapseOtherLegacyBlocks` still harvests rows from other blocks with a bare `isEntryRow` filter, so a fenced example row in a *second* block is absorbed while the same row in the primary block is not.
- **CR-5 (cleanup)** — `protectedRanges` is recomputed in `splitCarriedLines` after `findChangeLog` computed it. Declined: the engine runs on single documents of a few KB, and exposing `ranges` on `findChangeLog`'s return would widen a public shape for a negligible saving.

**Proposed Fix**: guard the *end* of the marker scan the way the start already is; make whole-line protection come from `fencedRanges` only and test markers/headings at their own offsets against the full `protectedRanges`; let a nested heading close table classification only once a table line has been seen; route `collapseOtherLegacyBlocks` through the classifier; two-write tests for each.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: the Iteration 2 classifier applied protection at the wrong grain (whole-line, at line start, against fences *and* inline spans) and closed table classification on any nested heading; and the marker *locator* — untouched since before this bug — guarded only the start of a marker pair, which became reachable the moment fenced content survived a write.

**Fix Description**:

- `findMarkerBlock` guards **both** ends: after an unprotected start it takes the first *unprotected* end; an unprotected start with no unprotected end is not a block. Rewritten with `indexOf` — the lazy-regex helpers `blockRe` / `escapeRe` are removed (CR-1).
- `splitCarriedLines` uses two grains: `fencedRanges` decides whole-line carry; markers and the heading are each checked at their **own offset** against the full `protectedRanges`, so a boundary line that opens with an inline span still has its marker stripped, and a marker inside an inline span is left alone (CR-2).
- A nested heading closes table classification **only after** the first table line has been seen; a heading that merely precedes the table is carried above it and the rows below it stay history (CR-3).
- `collapseOtherLegacyBlocks` harvests rows through the same classifier (`splitCarriedLines(out, {...found, hasMarkers: true}).tableLines`), so a fenced picture row in a stray block is not absorbed (CR-4).
- CR-5 (recompute `protectedRanges`) declined — negligible cost on single documents; would widen `findChangeLog`'s public return shape.

**Files Modified**:

- `shared/resources/change-log.js` — `findMarkerBlock` (both ends guarded), `splitCarriedLines` (two-grain protection, offset-exact marker/heading checks, seen-table cut-off), `collapseOtherLegacyBlocks` (through the classifier); `blockRe` / `escapeRe` removed
- `shared/resources/tests/change-log.test.mjs` — 5 more block-I tests: fenced end marker over three writes (fixed point), `findMarkerBlock` skips a protected end, inline-code boundary line, nested heading before the table, fenced row in a stray legacy block
- 25 × `skills/*/references/change-log.js` — regenerated

**Testing**:

- 72 / 72. **Mutation-proved** against the cycle-1 engine (`db3ec482`): exactly the five new tests go red (5 fail / 67 pass); restored → green.
- Adversarial pass (qa-fix 3.5) — transitions probed and held: CRLF document; span with no trailing newline; a legacy-marked H3 log with a note under it migrates to current markers, keeps the note, keeps its level and its sibling, and is a fixed point on the third write.
- `npm run ci:fast` — result in the implementation report (Verify Cycle 2, Fast gate).

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/change-log.test.mjs` — 72 pass.
2. `git show db3ec482:shared/resources/change-log.js > shared/resources/change-log.js && command node --test shared/resources/tests/change-log.test.mjs; git checkout shared/resources/change-log.js` — the five cycle-2 tests red, then green.

### Iteration 4

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-12
**Developer**: Claude (develop-bug verify cycle 3 — narrowed review of the cycle-2 diff)

**Why reopened**: two defects in the cycle-2 change, both confirmed by probe:

- **CR-1 (medium)** — `collapseOtherLegacyBlocks` now reads a stray block's rows through `splitCarriedLines(...).tableLines`. The classifier stops the table at a nested heading, so an entry row *after* a nested heading inside that stray block is returned as carried prose — and the sweep discards `before`/`after` and deletes the whole block, so the row is erased (`Row B` absent; 3 entries where cycle 1 gave 4). The sweep's job is to harvest every real row from a block it is about to remove; nesting is irrelevant there.
- **CR-2 (low)** — when the start and end markers share one line, `idx` for the end-marker check is computed on the line *after* the start marker was sliced off, so `at + idx` is short by `start.length` and can land inside an inline span; the end marker then survives as prose (2 end markers after one write).
- **CR-3 (cleanup)** — the `insideProtected` guards on the exact-marker line, the heading line and the start-marker strip can never be true: inline spans begin with a backtick, so a line whose trimmed content is a marker or a `#` heading cannot start inside one, and `found.start` is already known to be unprotected.

**Proposed Fix**: have `splitCarriedLines` also return the block's unfenced lines in order, and let the sweep harvest `isEntryRow` from *those* — every real row, wherever it sat, never a fenced one; track the characters stripped from the front of a boundary line and add them to the end-marker offset; drop the three unreachable guards and say why in a comment.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: the cycle-2 sweep change reused the primary path's *table* classification for a block that is discarded wholesale, so rows the classifier files as prose (after a nested heading) had nowhere to go; and the boundary-marker offset ignored characters already stripped from the front of the line.

**Fix Description**:

- `splitCarriedLines` also returns `unfencedLines` — every unfenced line in order, markers and heading removed. `collapseOtherLegacyBlocks` harvests `isEntryRow` from *that*, so a stray block gives up every real row wherever it sat and still never a fenced one (CR-1).
- A `shift` accumulator records what the start-marker strip removed from the front of a boundary line; the end-marker protection check uses `at + shift + idx` (CR-2).
- The three unreachable `insideProtected` guards (start-marker strip, exact-marker line, heading line) are removed, with a comment stating why they cannot fire (CR-3).

**Files Modified**:

- `shared/resources/change-log.js` — `splitCarriedLines` (`unfencedLines`, `shift`, guards removed), `collapseOtherLegacyBlocks` (harvests from `unfencedLines`)
- `shared/resources/tests/change-log.test.mjs` — 2 more block-I tests: nested row in a swept stray block (with a fenced decoy still excluded); single-line marker pair around an inline span
- 25 × `skills/*/references/change-log.js` — regenerated

**Testing**:

- 74 / 74. **Mutation-proved** against the cycle-2 engine (`9de8b6cd`): exactly the two new tests go red (2 fail / 72 pass); restored → green.
- `npm run ci:fast` — result in the implementation report (Verify Cycle 3, Fast gate).

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/change-log.test.mjs` — 74 pass.
2. `git show 9de8b6cd:shared/resources/change-log.js > shared/resources/change-log.js && command node --test shared/resources/tests/change-log.test.mjs; git checkout shared/resources/change-log.js` — the two cycle-3 tests red, then green.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-09-12
**Verified by**: develop-bug (verify cycle 4 of 5)

**Verification Result**: ✅ Fixed

**Notes**: Regression block I (21 tests) passes — each sub-block was mutation-proved against the engine it corrects (Iteration 1 vs `develop`, 2 vs `a5d18f67`, 3 vs `db3ec482`, 4 vs `9de8b6cd`). Affected suites + lint green (2101 / 0; prettier clean). Diff review clean: no bugs; two cleanups, CR-1 (stale contract comment) applied as `aed6306e`, CR-2 (drop an unreachable guard) declined — no behaviour change, not worth a fifth cycle. The reported failure no longer reproduces: the bug report's own probe yields a diff of markers + separator + new row and nothing removed.

**Decision**: Closed (finalised in Step 7)

---

## Status History

| Date       | Status | Changed By        | Notes                                                                    |
| ---------- | ------ | ----------------- | ------------------------------------------------------------------------ |
| 2026-09-12 | New    | repo sweep (Claude) | Filed from the 2026-09-12 sweep; carried as handoff follow-up 3a(1) since 2026-09-07 |
| 2026-09-12 | new | ensure-bug-github-issue | GitHub issue created (#389) |
| 2026-09-12 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-09-12 | Ready for QA | develop-bug | Fix implemented + regression test (block I, mutation-proved); ci:fast 3162/0 |
| 2026-09-12 | Reopened | develop-bug | Verify cycle 1 FAIL — review-code CR-1/2/3 confirmed by probe; Iteration 2 opened |
| 2026-09-12 | Ready for QA | qa-fix | Iteration 2 fix — CR-1/2/3/4 addressed, 67/67, mutation-proved against a5d18f67 |
| 2026-09-12 | Reopened | develop-bug | Verify cycle 2 FAIL — refute pass CR-1/2/3 confirmed by probe; Iteration 3 opened |
| 2026-09-12 | Ready for QA | qa-fix | Iteration 3 fix — cycle-2 CR-1/2/3/4 addressed (CR-5 declined), 72/72, mutation-proved against db3ec482 |
| 2026-09-12 | Reopened | develop-bug | Verify cycle 3 FAIL — CR-1 (sweep drops nested rows) and CR-2 (one-line marker pair) confirmed; Iteration 4 opened |
| 2026-09-12 | Ready for QA | qa-fix | Iteration 4 fix — cycle-3 CR-1/2/3 addressed, 74/74, mutation-proved against 9de8b6cd |
| 2026-09-12 | Ready for QA | develop-bug | Fix verified — bug scenario gone (verify cycle 4 PASS) |
| 2026-09-12 | Closed | develop-bug | Fix verified and accepted — PR #390, DoD bug.13.dod.1, CI green on aed6306e |

---

## Resolution Summary

**Final Status**: Closed — Fixed
**Total Iterations**: 4 (one initial fix + three verify-loop corrections)
**Time to Resolution**: same day — filed 2026-09-12, closed 2026-09-12 (PR [#390](https://github.com/Gamaroff/agent-skills/pull/390))
**Final Fix Details**: `upsertChangeLog` rebuilt the Change Log section from pipe-lines only, so on a document's first (un-migrated) write every other line of the section — an authoring note, a nested `###` and its body — was silently deleted. The engine now partitions the section through the module's own protected ranges: fenced content and inline spans are carried verbatim, the table is regenerated in place with prose kept on the side of the table it came from, a nested subsection keeps its own table, and a swept duplicate block gives up every real row before it is removed. `findMarkerBlock` now guards both ends of a marker pair, which became reachable the moment fenced content survived a write.
**Lessons Learned**: (1) The first fix was correct in the steady state and wrong in three transitions the suite could not see — fenced content, nested tables, and a *second* write on its own output. Every one was found by the verify loop's adversarial review, not by the tests; the refute pass on cycle 2 (full diff, "find the claim that is false") caught the highest-severity one. (2) A guard that is unreachable today can become reachable when a neighbouring behaviour changes: the unguarded end-scan pre-dated this bug by months and was harmless only because the write dropped the very content that would trigger it. (3) A classifier must be applied at the grain its input has — fences protect lines, inline spans protect characters — and one classifier must feed every reader of the same span, or the readers disagree (cycle 1's "carried as prose *and* absorbed as history").
