---
id: task.318.plan
title: "Implementation Plan: Placement check reads rows like the registry parsers"
type: plan
task-ref: task.318.placement-check-reads-rows-like-the-registry-parsers.md
---

# Implementation Plan: Placement check reads rows like the registry parsers

> Requirements and success criteria: [task.318.placement-check-reads-rows-like-the-registry-parsers.md](task.318.placement-check-reads-rows-like-the-registry-parsers.md)

## Overview

Reproduce two suspected divergences between `placementOf` and the selector's `parseRegistry` as synthetic tests, then change `placementOf` to trim lines and skip fenced blocks so it agrees with the parser.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce

**Files to modify:**
- `evals/shared/tests/task-registry-drift.test.mjs` - extend the synthetic test at "the placement check flags a row stranded below the Notes section".

**Exact changes:**

Add three inputs next to `tight`:

```js
const indented = `${head}| 1  | a |\n\n## Notes\n\n  | 3 | c |\n`;
const fenced = `${head}| 1  | a |\n\n## Notes\n\n\`\`\`\n| 4 | d |\n\`\`\`\n`;
const fencedHeader = `\`\`\`\n| #  | Sample |\n|----|--------|\n| 9  | x |\n\`\`\`\n\n${head}| 1  | a |\n`;
```

Expected on the current helper: `indented` reports no stranded row (false negative); `fenced` reports row 4 stranded (false positive); `fencedHeader` takes the fenced `| # |` line as the header, so row 1 reads as stranded or the separator check fails (false positive). Run all three through `parseRegistry` (imported at the top of the same file, line 45) with a full eight-column header, every row carrying a `[title](task.N.x/task.N.x.md)` link and at least five cells (a row without them is reported malformed, not read), and record its row ids beside each. Measured 2026-11-22: `parseRegistry` returns rows `[1,3]` for the indented input and `[1]` for the fenced one, with 0 malformed.

### Phase 2: Match the parsers

**Files to modify:**
- `evals/shared/tests/task-registry-drift.test.mjs` - `placementOf` (line 367).

**Exact changes:**

Walk the lines once, tracking `fenced` the way `parseRegistry` does (`/^\s*(```|~~~)/` toggles it). Skip a fenced line for both the header search and the row scan. Test a row and the header on `l.trim()`, not `l`. Keep the block-membership rule `^\s*\|` (the same one `registry-tick.js` `findHeader` uses, `shared/resources/registry-tick.js:1013`).

### Phase 3: Prove it

Revert the trim, run the file, confirm the `indented` case goes red and nothing else does. Restore it, revert the fence skip, confirm only the fenced cases go red (`fenced` and `fencedHeader`). The header search and the row scan each skip fences, so also revert each skip alone and name which case goes red. Restore both.

## Key Patterns and References

- Task 317's synthetic test already carries a non-vacuity assertion (`g.rows.length === 2`); keep it.
- Never lower `PLACEMENT_MIN_ROWS` (317).

## Testing Approach

`node --test evals/shared/tests/task-registry-drift.test.mjs`, then `TEST_LOCAL=1 npm run test:remote` while the LAN server is down. Run with `CI=true` before pushing.
