---
id: task.183.plan
title: "Implementation Plan: qa-results setext and carry follow-ups"
type: plan
task-ref: task.183.qa-results-setext-and-carry-follow-ups.md
---

# Implementation Plan: qa-results setext and carry follow-ups

> Requirements and success criteria: [task.183.qa-results-setext-and-carry-follow-ups.md](task.183.qa-results-setext-and-carry-follow-ups.md)

## Overview

Five clause-level changes in `shared/resources/qa-results.js`, each with its own test block (`R1`–`R5`
in `shared/resources/tests/qa-results.test.mjs`, after block Q), plus a one-line pre-filter in the
corpus survey. Measure with the corpus survey before committing each rule; the bar is 0 false
refusals.

## Phase-by-Phase Implementation Guide

### Phase 1: setext leans toward refusal (CR5-1)

Replace `RE_NOT_PARAGRAPH` (`shared/resources/qa-results.js:283`) with a function, because two of the
cases need more than one regex:

```js
// A line that certainly is not paragraph text, so an underline below it is not a setext
// heading. Everything else is a heading candidate: the setext check leans toward refusing
// (task 183, CR5-1). CommonMark: an ATX heading needs a space or end of line after the
// hashes; only a bullet or an ordered item starting at 1 can interrupt a paragraph; a
// backtick fence opener's info string holds no backtick.
function notParagraph(line) {
  return (
    /^[ \t]*$/.test(line) ||
    /^ {0,3}#{1,6}(?:[ \t]|$)/.test(line) ||                       // ATX heading
    /^ {0,3}(?:~{3,}|`{3,}(?!.*`))/.test(line) ||                   // fence opener
    /^ {0,3}(?:[-*+]|1[.)])[ \t]/.test(line) ||                     // interrupting list item
    /^ {0,3}>/.test(line) ||                                        // block quote
    /^[ \t]*\|/.test(line) ||                                       // table row
    /^ {0,3}<!--/.test(line)                                        // HTML comment line
  );
}
```

and in `removesStructure` use `!notParagraph(lines[i - 1])` in the setext clause (`:314`).

Test `R1`: for each head in

```js
["#538 Rollout Notes", "<https://example.com/rollout>", "<b>Rollout</b> Notes",
 "``` inline `code` span", "Release\n2026. Notes", "Release\n<b>2026</b>", "Rollout Notes"]
```

and each underline `-----` / `=====`, build `markerDoc(section(1) + "\n\n" + head + "\n" + underline +
"\n\nkeep-me\n\n")`, replace with `section(2)`, and assert `reason === "unbounded"`,
`detail === "structural-line:" + <line above the underline> + " / " + underline` (truncated to 60 by
the engine), and `content === doc`. The task.171 gate-5 probe reproduced the first six shapes as
deletions (`replaced`, `keep-me` gone).

### Phase 2: two false refusals by context (CR-7)

`removesStructure` already walks the lines in order. Track two pieces of context:

- **list continuation**: after a line matching an interrupting list item, a following non-blank line
  indented by at least the item's content offset, with no blank line between, is a continuation
  line, not a paragraph line;
- **closing HTML comment line** — *dropped at the QA escalation (2026-10-05)*. Three QA cycles each
  found a new way the inferred comment context deleted a setext section (CR2-1, CR3-1); the closer
  over `---` stays refused, as on `origin/develop`.

The setext clause skips a line above the underline when either context holds. Test `R2`: each shape
is written (`created` from `markerDoc()`, then `replaced`), and `R1`'s loop runs again unchanged as
the guard that no CR5-1 shape reopened.

### Phase 3: a log table is a table with a Date column (5c CR-1)

In `removesStructure`, replace the `logTable` start condition (`RE_LOG_HEADER.test(l)`, `:305`) with
"a table header row that has a cell reading `Date`, in any position":

```js
const isLogHeader = (l) =>
  /^[ \t]*\|/.test(l) &&
  l.split("|").slice(1, -1).some((c) => /^\s*Date\s*$/i.test(c));
```

A header row is recognised as the first `|` line of a table (the previous line is not a `|` line);
data rows are the `|` lines after its separator row. Replace **both** uses of `RE_LOG_HEADER` in
`removesStructure` with `isLogHeader`: the start condition and the header exclusion in `logRow`
(`!RE_LOG_HEADER.test(l)`). Left on `RE_LOG_HEADER`, the exclusion misses a `| Version | Date | … |`
header, which then counts as a log row and the refusal names the header instead of the first data row
(review 1, I2). Do not `slice(1, -1)` blindly: a row with no trailing pipe would lose its last cell —
drop a trailing empty cell instead (review 1, O2). Keep `isEntryRow` as the second clause, so a
dated row outside a table header still counts. `RE_LOG_HEADER` (`:92`) is still used by
`lastTableStart` and is left alone.

Test `R3`: a misplaced section inside a marker block above
`| Version | Date | Description | Author |` / separator / `| 1.1 | 2026-10-06 | x | y |` is refused
with `structural-line:| 1.1 | 2026-10-06 | x | y |`; a misplaced section quoting `| Phase | Status |`
rows (no Date column) still relocates.

### Phase 4: bold-label boundaries (5c CR-2, CR2-4)

In `collectBlocks`' `stops` (`:191`–`:198`), for a bold-label block (`level === 0`):

- replace `/^#{1,6}[ \t]/.test(l)` with `/^#{1,3}[ \t]/.test(l)`;
- add `QA_LABELS.test(l)` as a stop that applies whatever follows the label, defined beside
  `RE_QA_FIELD`:

```js
// QA-owned bold labels that stand alone on their line. A carried block ends at one even
// when a list follows it (task 183, CR2-4). RE_QA_FIELD matches `**Label**: value` lines;
// this matches the label alone.
const QA_LABELS =
  /^\*\*(?:Recommendations|Key Findings|Issues Found|Next Steps|Code Review Findings|Critical Issues)\*\*:?[ \t]*$/i;
```

Test `R4`: `**Bug Reports**` / `#### From cycle 2` / `- [b](./b.md)` survives three writes with the link
once; `**Bug Reports**` / `- [a](./a.md)` / `**Recommendations**:` / `- stale` is written without
`- stale` after the second write.

### Phase 5: survey pre-filter, timing and docs

`tests/qa-results-corpus.test.js`, in the write survey loop (`:246`): add
`if (!text.includes("QA Testing Results")) continue;` before the `findQaResults` call, as the stacking
test does at `:98`. Record in the implementation report:

```bash
uptime
time command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
```

Mark task.171's `## Deferred Work` items resolved with a link to task.183, and add the CHANGELOG
`[Unreleased]` › Fixed entry.

## Key Patterns and References

- task.171's blocks O–Q in `shared/resources/tests/qa-results.test.mjs` hold the fixtures
  (`markerDoc`, `section`, `replaceThrice`, `count`) and the refusal-assertion shape to copy.
- Mutation proofs: snapshot with `cp`, revert the clause, confirm the named test goes red, restore
  (`references/mutation-proving.md`). task.171's scratch `mut*.js` drivers are the pattern.
- The corpus survey's `allowance()` is the engine-independent instrument; do not measure deletions
  with `findQaResults`.

## Testing Approach

- `command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js tests/deferred-work-placement.test.js`
- `npm run ci:fast` per phase; `npm run ci` once before merge.
