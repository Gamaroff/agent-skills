---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
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
**Status**: ✅ Ready for QA
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

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By        | Notes                                                                    |
| ---------- | ------ | ----------------- | ------------------------------------------------------------------------ |
| 2026-09-12 | New    | repo sweep (Claude) | Filed from the 2026-09-12 sweep; carried as handoff follow-up 3a(1) since 2026-09-07 |
| 2026-09-12 | new | ensure-bug-github-issue | GitHub issue created (#389) |
| 2026-09-12 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-09-12 | Ready for QA | develop-bug | Fix implemented + regression test (block I, mutation-proved); ci:fast 3162/0 |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
