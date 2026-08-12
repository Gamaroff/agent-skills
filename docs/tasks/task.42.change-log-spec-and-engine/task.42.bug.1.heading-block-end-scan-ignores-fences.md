# Bug Report: Task 42 - Heading-block end scan ignores fences, corrupting the document

**Task**: [Link](./task.42.change-log-spec-and-engine.md)
**Bug ID**: TASK-42-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-12

## Description

`findChangeLog()` applies the fence guard when **locating** a Change Log heading
(`shared/resources/change-log.js:296` — `insideFence(ranges, start)`), but **not** when
computing where that block **ends**:

```js
// shared/resources/change-log.js:305-309
const after = content.slice(start + m[0].length);
const nextRe = new RegExp(`^#{1,${level}}[ \\t]`, "m");
const next = after.match(nextRe);
const end = next ? start + m[0].length + next.index : content.length;
```

`nextRe` is matched against raw text with no `protectedRanges()` filter. A fenced code block
inside the Change Log section that contains any `##`/`###` line therefore **terminates the
block early**, at a line that is not a heading at all.

This is the same defect class the task's own Breaking Change 3 was added to remove. The guard
was applied to one of the two places that needed it.

## Steps to Reproduce

```js
const CL = require("./shared/resources/change-log.js");

const doc = [
  "# Doc", "",
  "## Change Log", "",
  "| Date | Version | Description | Author |",
  "|------|---------|-------------|--------|",
  "| 2026-01-01 | 1.0 | First | create-task |", "",
  "```markdown",
  "## Example heading in a fence",
  "```", "",
  "| 2026-02-02 |  | Second — MUST SURVIVE | qa-task |", "",
].join("\n");

CL.extractEntries(doc);                                   // → 1 row, not 2
CL.upsertChangeLog(doc, { date: "2026-08-12", description: "Third", author: "x" },
                   { docType: "task" });
```

## Expected Behavior

The fenced `## Example heading in a fence` is inside a code fence, so it is not a heading. The
block should extend past it, `extractEntries` should return **2** rows, and the rewrite should
preserve both plus the new one (3 rows), leaving the fence intact.

## Actual Behavior

The block ends at the fenced line. The rewrite replaces everything from the block start to that
point — **consuming the opening ```` ```markdown ```` fence** — and emits:

```markdown
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-01 | 1.0 | First | create-task |
| 2026-08-12 |  | Third | x |
<!-- change-log-end -->

## Example heading in a fence
```

| 2026-02-02 |  | Second — MUST SURVIVE | qa-task |
```

Three things are wrong:

1. **The document is structurally corrupt.** The opening fence was eaten; a closing ```` ``` ````
   is left orphaned, so every subsequent fence in the file is now mis-paired.
2. **A Change Log row is detached from the Change Log.** `| 2026-02-02 | … |` now sits outside
   the block. `extractEntries` on the result returns 2, not 3 — the row is still in the file but
   no longer part of the log, and the next write will not carry it.
3. The former heading text is promoted to a real heading in the output.

## Impact

Silent document corruption plus effective history loss — precisely the outcome §10 Risk 2 of the
task names as the worst case: *"under-matching loses history, which is the thing this whole
effort is meant to preserve."* Nothing errors and nothing warns.

Exposure is narrower than Bug 2's (a Change Log section is normally just a table, so a fence
inside one is unusual) but the failure is silent and the blast radius is the whole document's
fence pairing.

## Recommendation

Filter the end-scan through the same guard the start-scan already uses. Compute
`protectedRanges(content)` once in `findChangeLog` (it is already computed at :266) and advance
past any `nextRe` match that falls inside a protected range:

```js
const after = content.slice(start + m[0].length);
const nextRe = new RegExp(`^#{1,${level}}[ \\t]`, "gm");
let end = content.length;
for (const nm of after.matchAll(nextRe)) {
  const abs = start + m[0].length + nm.index;
  if (!insideFence(ranges, abs)) { end = abs; break; }
}
```

Add a regression test asserting that a fenced heading inside a Change Log section does not
terminate the block, and that all rows survive a rewrite.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-12

Confirmed the report exactly. `findChangeLog` computed `protectedRanges(content)` at `:268`
and used it for the heading start-scan, then computed the block end with a plain
`after.match(nextRe)` that never consulted it. The two scans disagreed about what a heading is.

**Root cause**: the guard was written as a property of *finding the heading* rather than a
property of *reading the document*. Once framed the second way, both scans must use it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-12

**Fix description**: the end-scan now iterates `after.matchAll(nextRe)` (global flag) and skips
any candidate whose absolute offset falls inside a protected range, falling through to
end-of-content when every candidate is protected. The `ranges` already computed for the
start-scan are reused — no extra pass.

**Files Modified**:
- `shared/resources/change-log.js` — fence-aware end-scan; header comment updated to record
  that guarding one end of a block guards neither
- `shared/resources/tests/change-log.test.mjs` — 2 regression tests

**Testing**:
- `F: a fenced heading INSIDE the Change Log does not end the block (TASK-42-BUG-1)` — asserts
  all rows survive, fences stay balanced, and the fenced line is not promoted to a heading
- `F: an H3 log with a fenced heading inside still ends at the next real sibling` — asserts the
  guard did not over-reach and swallow a genuine sibling heading
- Full suite: 1141 passing, 0 failing

**One correction to the report's expectation.** The report expected the opening fence to survive.
It does not, and should not: regenerating a block replaces everything between its bounds with
markers + heading + table, which has always been true and is what a Change Log section *is*. The
defect was never that the fence is rewritten — it was that the block **ended** at the fence,
stranding the rows below it outside the log and leaving the closing fence orphaned. Both are
fixed and asserted; the residual behaviour is documented in the test so it is not later mistaken
for a regression.

**Verification steps for QA**:
1. `node --test shared/resources/tests/change-log.test.mjs` — 37/37
2. Re-run the reproduction snippet in this report: `extractEntries` returns 2 before the write
   and 3 after; output contains no orphaned ``` fence.
