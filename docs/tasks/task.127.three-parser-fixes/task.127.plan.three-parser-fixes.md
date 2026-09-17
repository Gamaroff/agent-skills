---
id: task.127.plan
title: "Implementation Plan: three parser fixes"
type: plan
task-ref: task.127.three-parser-fixes.md
---

# Implementation Plan: three parser fixes

> Requirements and success criteria: [task.127.three-parser-fixes.md](task.127.three-parser-fixes.md)

## Overview

Fixture first for each: reproduce the misreading on the current code, then the one-function change,
then the mutation proof (revert the function, fixture red).

## Phase-by-Phase Implementation Guide

### Phase 1 — `skills/develop-next/scripts/select-next.mjs`

```js
// Dependencies live BEFORE the first ` · `; everything after is a note (obs #74).
function parseDepCell(cell) {
  const depPart = String(cell).split(" · ")[0];
  return [...depPart.matchAll(/\btask\.(\d+)\b/g)].map((m) => Number(m[1]));
}
```

Drop the bare-number branch entirely. Drift test (`evals/shared/tests/task-registry-drift.test.mjs`):
collect all row ids; for each row assert `deps ⊆ ids`; assert at least one row has a non-empty dep
list (non-vacuity), or the test proves nothing about the parser.

Registry header (`docs/tasks/task-registry.md` §How to use): one bullet — "In the last column,
dependencies (`task.N`) come first; notes follow a ` · ` separator and are never parsed."

### Phase 2 — `shared/resources/change-log.js`

In `upsertChangeLog`, after `const { before, after, tableLines } = splitCarriedLines(content, found)`:

```js
// A hand-authored heading immediately above CL_START with no heading inside the
// block is the same section written twice (obs #104, task.120). Absorb it so the
// rebuild's heading replaces rather than duplicates it — the collapseOtherLegacyBlocks
// shape, one line up.
let head = before;
if (!blockHasHeading(tableLines /* or found.inner */)) {
  const lines = head.replace(/\s+$/, "").split("\n");
  const last = lines[lines.length - 1];
  if (RE_HEADING.test(last)) { lines.pop(); head = lines.join("\n") + "\n"; }
}
```

Use the existing `RE_HEADING` (the same matcher `findChangeLog` uses for level/numbering). Fixture:
`git show HEAD:docs/tasks/task.120.hook-idempotence-and-badge-drift/task.120.hook-idempotence-and-badge-drift.md`
as of the two-heading state (find the commit with `git log -S'## Change Log\n## Change Log'` or take
the current file if still doubled). Repair the live document by running the engine, not by hand.

### Phase 3 — `skills/create-skill/scripts/quick_validate.py`

Before line ~118:

```python
desc = fm.get('description')
if not isinstance(desc, str) or not desc.strip():
    errors.append(f"description must be a non-empty string (got {type(desc).__name__})")
    ...return/continue as the surrounding code does for a fatal frontmatter error
```

Then the existing `' '.join(desc.split())`. `grep -rn "str(fm\['description'\])\|str(fm.get('description'" skills/create-skill/scripts/`
for the siblings. Test cases in `tests/skill-frontmatter.test.js`: `description:` (null), `description: ~`,
`description: true`, `description: []` → each fails with the typed message.

## Key Patterns and References

- `collapseOtherLegacyBlocks` in `change-log.js` — the convergence shape to mirror.
- Non-vacuity floors: `docs/reference/anti-patterns.md`, `mutation-proving.md` § instrument rules.

## Testing Approach

`npm test` (all three suites), `npm run validate:all`, `command node skills/develop-next/scripts/select-next.mjs --dry-run` before/after.
