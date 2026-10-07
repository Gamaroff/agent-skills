---
id: task.184.plan
title: "Implementation Plan: qa-results carried-block and log residuals"
type: plan
task-ref: task.184.qa-results-carried-block-and-log-residuals.md
---

# Implementation Plan: qa-results carried-block and log residuals

> Requirements and success criteria: [task.184.qa-results-carried-block-and-log-residuals.md](task.184.qa-results-carried-block-and-log-residuals.md)

## Overview

Three edits to `shared/resources/qa-results.js`, each with one test, then documentation. Phases 1
and 2 were simulated on a scratch copy of the engine on 2026-10-05 (results in the task's § 3); the
snippets below are those simulated edits, tidied. Phase 3 is new code and gets its own proof.

## Phase-by-Phase Implementation Guide

### Phase 1: keep a nested block's tail (5c CR-1)

**File:** `shared/resources/qa-results.js`, `carriedBlocks` (`:231`).

Today (`:236-240`):

```js
for (const b of all) {
  const outer = kept[kept.length - 1];
  if (outer && b.start < outer.start + outer.whole.length) continue;
  kept.push(b);
}
```

After:

```js
for (const b of all) {
  const outer = kept[kept.length - 1];
  if (outer && b.start < outer.start + outer.whole.length) {
    // A nested block that runs past its outer block (a bold label inside a `####`
    // block that ends at a later `####`) would lose its tail: extend the outer block
    // to cover it (task 184, 5c CR-1). A union of two spans already found — no inference.
    const end = b.start + b.whole.length;
    if (end > outer.start + outer.whole.length) {
      const headLen = outer.whole.length - outer.body.length; // label + blank lines
      outer.whole = text.slice(outer.start, end).trimEnd();
      outer.body = outer.whole.slice(headLen).replace(/^(?:\r?\n)+/, "");
    }
    continue;
  }
  kept.push(b);
}
```

Check `headLen` against how `collectBlocks` builds `body`
(`whole.slice(m[0].length).replace(/^(?:\r?\n)+/, "")`): if the outer block's body had leading blank
lines stripped, `whole.length - body.length` includes them, so slicing at `headLen` and stripping
again is equivalent. Prefer storing `labelLen = m[0].length` on each block in `collectBlocks` and
using it here, which removes the arithmetic.

**Test R5** (after R4 in `shared/resources/tests/qa-results.test.mjs`):

```js
test("R5 5c CR-1: a bold Bug Reports block nested in a #### block keeps its tail", () => {
  const nested = "#### Bug Reports\n\n- [a](./a.md)\n\n**Bug Reports**\n\n#### From cycle 2\n\n- [b](./b.md)";
  const out = replaceThrice(markerDoc(`${section(1)}\n\n${nested}\n\n`));
  assert.equal(count(out, "(./a.md)"), 1);
  assert.equal(count(out, "(./b.md)"), 1);
  assert.equal(count(out, "**Bug Reports**"), 1);
});
```

### Phase 2: refuse under an ambiguous marker-less log (5c CR-2)

**File:** `qa-results.js`, `findQaResults` (`:520`), at the cut condition (`:581`).

Before `if ((block && !logAbove) || underTablelessLog) {` add:

```js
// A marker-less log whose last Date-column table above the section is not Date-first
// is ambiguous: a Version-first log (5c CR-2) and a quoted `| Reviewer | Date |`
// table (CR3-2) look the same. Neither cut nor relocate — keep the span under the
// dated-row guard so the write is refused (task 184; operator decision 2026-10-05).
const aboveTbl =
  !block && changeLog && !changeLog.hasMarkers && changeLog.end === start
    ? lastTableStart(content, changeLog.start, start, ranges)
    : -1;
const ambiguousAbove = aboveTbl !== -1 && !dateFirstAt(content, aboveTbl);
```

and change the condition to `if ((block && !logAbove) || (underTablelessLog && !ambiguousAbove)) {`
and `underLog:` to `!!block || !!underTablelessLog || insideChangeLog || ambiguousAbove`.

Rewrite the comment at `:307-314` so its "a Version-first log is seen and the write refused" clause
says: inside a marker block, and — since task 184 — under a marker-less log too, where any
non-Date-first Date table above the section makes the log ambiguous and the write is refused.

**Test R6:**

```js
test("R6 5c CR-2: a section under a marker-less Version-first log is refused, not relocated", () => {
  const head = `${FM}## Body\n\ntext\n\n## Change Log\n\n| Version | Date | Change |\n| --- | --- | --- |\n| 1.0 | 2026-01-02 | synced |\n\n${section(1)}\n\n`;
  for (const quoted of [
    "| Date | Note |\n| --- | --- |\n| 2026-01-03 | quoted |",
    "| Date | Version | Description | Author |\n| --- | --- | --- | --- |\n| 2026-01-03 | 1.1 | quoted | z |",
  ]) {
    const doc = `${head}${quoted}\n`;
    const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
    assert.equal(r.reason, "unbounded");
    assert.match(r.detail, /^structural-line:\| 2026-01-03 \|/);
    assert.equal(r.content, doc);
  }
});
```

**R3 update** (`qa-results.test.mjs`, the `reviewer` case, today `assert.equal(rr.reason, "relocated")`
at `:1212`): assert `unbounded`, `detail` equal to
`structural-line:| 2026-09-25 | 1.0 | log-row | y |`, and `rr.content === reviewer`. Update the
comment above it to say why the outcome changed.

### Phase 3: refuse a carried list behind a label and a paragraph (gate 6 CR6-1)

**File:** `qa-results.js`, `collectBlocks` (`:168`) and `upsertQaResults` (`:716`).

In `collectBlocks`, where the loop finds the stop line `i` for a bold-label block (`level === 0`),
when that line is a bold label (not a heading, not a QA field), look ahead:

```js
// The block stopped at a bold label that does not introduce a list. If a list or table
// still follows before the next `#{1,3}` heading or QA field, the block's content may
// continue there (gate 6 CR6-1: `**Critical Issues**` / paragraph / `- [b]`). Refuse
// rather than guess which lines are the block's (task 184; operator decision).
let tail = null;
for (let j = i + 1; j < lines.length; j++) {
  const t = bare(j);
  if (/^#{1,3}[ \t]/.test(t) || RE_QA_FIELD.test(t)) break;
  if (/^[ \t]*(?:[-*+][ \t]|\d+[.)][ \t]|\|)/.test(t)) { tail = t.trim().slice(0, 60); break; }
}
```

Skip lines inside protected ranges the same way the stop loop does. Store `tail` on the block.
In `upsertQaResults`, beside the `removesStructure` check, refuse when any
`carriedBlocks(content.slice(s.start, s.end))` block carries a `tail`:

```js
return { content, reason: "unbounded", detail: `carried-tail:${tail}` };
```

Add to the vocabulary comment (`:29-38`):
`//   carried-tail:<line>      a carried block's list continues past a label and a paragraph`.

In `skills/qa-task/SKILL.md` (`:1395`) and `skills/qa-story/SKILL.md` (`:1905`), extend the
`unbounded` hint: "…or a carried Bug Reports / Deferred Work list continues past a label and a
paragraph (`carried-tail:`)…". Keep the two strings identical.

**Test R7:**

```js
test("R7 gate 6 CR6-1: a carried list behind a label and a paragraph is refused", () => {
  const shape = "**Bug Reports**\n\n- [a](./a.md)\n\n**Critical Issues**\n\nFound in cycle 2:\n\n- [b](./b.md)";
  const doc = markerDoc(`${section(1)}\n\n${shape}\n\n`);
  const r = QR.upsertQaResults(doc, section(2), { docType: "task" });
  assert.equal(r.reason, "unbounded");
  assert.equal(r.detail, "carried-tail:- [b](./b.md)");
  assert.equal(r.content, doc);
});
```

### Phase 4: wording, hygiene, CHANGELOG

- `qa-results.test.mjs:1157` — delete the trailing `assertCr51Refused();` in R2.
- R4 title (`:1234`) → `"R4 5c CR-2: a bold Bug Reports block keeps its #### groups and every bug list directly under a sub-label"`.
- task.183: the seven passages in the task's § 4 table; one Change Log row through `change-log.js`
  (`upsertChangeLog`, version blank, author `develop`): "Note: the gate 4 FAIL row was written after
  the cycle 5 rows above it; rows are left in written order (append-only) — task.184".
- CHANGELOG `[Unreleased]` › Fixed: edit the task 183 bullet ("every bug list grouped under a
  sub-label" → "every bug list grouped directly under a sub-label"); add a `(task 184)` bullet.
- `npm run bundle`, `npm run bundle:check`, `npm run validate -- skills/qa-task/`, `skills/qa-story/`.

## Key Patterns and References

- Mutation proofs: snapshot with `cp`, one split/join edit asserted to apply once, run the engine
  suite, restore and `cmp` (task.183's implementation report has the worked runs).
- Refusals report through `reason: "unbounded"` and a `detail`; never add a reason.
- `count`, `markerDoc`, `section`, `replaceThrice`, `FM` are the test file's helpers (`:25-37`, `:717`).

## Testing Approach

Run `command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js`
after each phase. The corpus survey (`tests/qa-results-corpus.test.js`) is the check that the two new
refusals fire on no tracked document.
