# Bug Report: Task 42 - A duplicate current-format block is never collapsed

**Task**: [Link](./task.42.change-log-spec-and-engine.md)
**Bug ID**: TASK-42-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 re-review)
**Date Found**: 2026-08-12

## Description

`collapseOtherLegacyBlocks()` (`shared/resources/change-log.js:436`) iterates
`LEGACY_MARKER_PAIRS` only. The **current** `<!-- change-log-start/end -->` pair is never swept.

So a document holding a legacy block *and* a current block ends with **two Change Logs** — both
in canonical four-column format after the write, but two. The spec states a document ends with
exactly one; this is the remaining path to violating it.

## Steps to Reproduce

```js
const CL = require("./shared/resources/change-log.js");

const doc = [
  "# Story", "",
  "<!-- jira-sync-changelog-start -->",          // legacy, first
  "## Change Log", "",
  "| 2026-01-01 09:00 | Old jira row |",
  "<!-- jira-sync-changelog-end -->", "",
  "## Middle", "",
  "<!-- change-log-start -->",                    // current, second
  "## Change Log", "",
  "| Date | Version | Description | Author |",
  "|------|---------|-------------|--------|",
  "| 2026-05-05 | 1.0 | Current row | create-story |",
  "<!-- change-log-end -->", "",
  "## Dev Agent Record", "",
].join("\n");

CL.upsertChangeLog(doc, { date: "2026-08-12", description: "New", author: "x" },
                   { docType: "story" });
```

## Expected Behavior

One Change Log, holding all three rows in date order.

## Actual Behavior

Two blocks. Positional selection picks the legacy block (it is earlier), migrates it, and sweeps
both sides for *other legacy* pairs — finding none, because the other block wears the **current**
markers. The current block survives untouched with its row still in it.

## Impact

Bounded, and **not a regression** — this is the key context for triaging it:

| Engine | Blocks | Legacy markers left |
|---|---|---|
| Pre-fix (`6aa4320`) | 2 | **yes** — jira pair still live |
| Post-fix (`d3dd716`) | 2 | no — both blocks canonical |

The cycle-1 fix strictly improved this case. It is also **outside the literal Success
Criterion**, which concerns the two legacy pairs and now passes in both orderings (TASK-42-BUG-2,
fixed and tested).

Reachability is real but narrow: it needs a legacy block to appear in a document that already has
a current block. During the task.43–45 rollout, fourteen skills carry vendored copies of the
engine that may be of different vintages, so an older copy writing a legacy block into an
already-migrated document is the plausible route.

Unlike the cycle-1 bugs this failure is **visible** — a reader sees two Change Logs — rather than
silent. That is why it is MEDIUM rather than HIGH.

## Recommendation

Include the current pair in the collapse sweep, so the invariant is unconditional rather than
legacy-only. The primary block cannot be swept by accident: `upsertChangeLog` already scans only
the text on either side of it.

```js
const SWEEP_PAIRS = [
  { start: CL_START, end: CL_END, author: "" },
  ...LEGACY_MARKER_PAIRS,
];
```

Rows from a swept current block are already canonical, so `migrateLegacyEntries` leaves them
untouched (its `cells.length >= 4` early return) — no special-casing needed.

Add a regression test for legacy-before-current and current-before-legacy.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-12

Confirmed as reported, including the triage: the pre-fix engine produced two blocks here as well,
so this is a residual gap rather than a regression from cycle 1.

**Root cause**: the sweep was scoped to "superseded pairs" when the invariant it serves is
"exactly one Change Log". Those are not the same set — a stray block wearing the *current*
markers violates the invariant while matching no legacy pair.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-12

`SWEEP_PAIRS` now prepends the current pair to `LEGACY_MARKER_PAIRS`, and the sweep runs over
that. The primary block cannot be swept by accident — `upsertChangeLog` only ever passes the
text on either side of it. The `alreadyMigrated` skip is guarded on a non-empty author, so the
current pair (author `""`) is never skipped.

Two supporting changes fell out of it:

- The per-pair sweep is now a loop rather than a single find, since one slice can hold more than
  one block of the same pair.
- Rows from a swept current block are already canonical; `migrateLegacyEntries` returns them
  untouched via its `cells.length >= 4` guard, so no special-casing was needed.

**Also fixed (the LOW seam finding)**: removing a block left the blank line before it adjacent to
the one after it, producing up to three consecutive blank lines that accumulated across writes.
`trimSeam()` normalises any run of 3+ newlines, and is applied at both the removal site and the
head/block/tail join.

**Files Modified**:
- `shared/resources/change-log.js` — `SWEEP_PAIRS`, looped sweep, `trimSeam`
- `shared/resources/tests/change-log.test.mjs` — 3 regression tests

**Testing**:
- `D: a legacy block beside a CURRENT block collapses to one` — parameterised over **both**
  orderings (legacy-first, current-first), asserting one block, one opening marker, no legacy
  markers, and all three rows preserved
- `D: collapsing a block leaves no more than one blank line at the seam`
- Verified the new tests **fail against the pre-fix engine** (2 blocks) — they pin the behaviour
- Full suite: 1144 passing, 0 failing

**Verification steps for QA**:
1. `node --test shared/resources/tests/change-log.test.mjs` — 40/40
2. Re-run the reproduction snippet: one block, one opening marker, three rows in date order


---

## QA Verification

**Verified By**: QA Engineer
**Date**: 2026-08-12
**Result**: ✅ **FIXED — bug closed**

Verified against gate 3 ([task.42.gate.3.change-log-spec-and-engine.yml](./task.42.gate.3.change-log-spec-and-engine.yml), PASS 100/100).
The regression test for this bug was confirmed to **fail against the pre-fix engine**, so it pins
the behaviour rather than merely accompanying the fix. Adversarial re-probing of the changed code
found no side effects.

Full re-review: [task.42.qa.2.change-log-spec-and-engine.md](./task.42.qa.2.change-log-spec-and-engine.md).
