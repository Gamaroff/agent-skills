---
id: task.72.plan
title: "Implementation Plan: Pin the bug-axis divergence exactly"
type: plan
task-ref: task.72.pin-bug-axis-divergence.md
---

# Implementation Plan: Pin the bug-axis divergence exactly

> Requirements and success criteria: [task.72.pin-bug-axis-divergence.md](task.72.pin-bug-axis-divergence.md)

## Overview

One assertion changes from a subset loop to an exact comparison on the set difference, and three
comment blocks stop describing the bug axis as "the weaker `⊆`". No source behaviour changes.

## Phase-by-Phase Implementation Guide

### Phase 1: Pin the gap

**File**: `evals/develop-next/unit/select-next.test.mjs` — the bug half of `16/H1`.

**Before** (the subset loop to remove):

```js
  for (const status of BUG_ELIGIBLE_STATUSES) {
    assert.ok(
      proceed.has(status),
      `BUG_ELIGIBLE_STATUSES contains "${status}", which develop-bug does not proceed on`,
    );
  }
```

**After**:

```js
  // The gap is asserted EXACTLY, not as a subset. `⊆` held for every possible
  // widening of the dispatcher, so it was silent about the one change it existed
  // to notice. Both directions now fail:
  //   gap grew   → develop-bug gained a status the floor ignores
  //   gap shrank → someone changed the floor; that is a policy decision, not a
  //                passing side effect
  const gap = [...proceed]
    .filter((v) => !BUG_ELIGIBLE_STATUSES.has(v))
    .sort();

  assert.deepStrictEqual(
    gap,
    ["in-progress", "ready-for-qa"],
    `the bug-axis gap is no longer exactly {in-progress, ready-for-qa}.\n` +
      `  parsed dispatcher set: ${[...proceed].sort().join(", ")}\n` +
      `  eligibility floor:     ${[...BUG_ELIGIBLE_STATUSES].sort().join(", ")}\n` +
      `  gap now:               ${gap.join(", ") || "(empty)"}\n` +
      `  If develop-bug gained a status, decide whether the floor should follow —\n` +
      `  and read the comment above before assuming it should.\n` +
      `  If the floor changed, say why here; closing this gap is deliberate work.`,
  );
```

**Keep unchanged, immediately above** — this is the anti-vacuity guard:

```js
  assert.ok(
    proceed.has("new") && proceed.has("reopened"),
    `parsed proceed-set looks wrong: ${[...proceed].join(", ")}`,
  );
```

It is not redundant with `deepStrictEqual`. An empty parse yields `gap: []` and fails the
comparison, but a parse returning the *wrong* rows could still yield a two-element gap; only this
guard catches that.

**Rename the test**:

```js
// from:
test("16/H1: every bug eligibility status is one develop-bug proceeds on", () => {
// to:
test("16/H1: the bug-axis gap is exactly {in-progress, ready-for-qa}", () => {
```

### Phase 2: Rewrite the rationale to lead with meaning

**File**: `evals/develop-next/unit/select-next.test.mjs` — the comment block above the bug test.

The existing block explains the gap in terms of risk. Replace the leading argument (keep the measured
table, which is still correct):

```js
// The bug axis keeps a divergence the task axis was made to close, and the
// reason is SEMANTIC before it is about risk.
//
// `develop-task` says of its pre-work statuses:
//   Draft → "Proceed — Step 2 (/review-task) will validate and update the
//            status autonomously."
// That is a claim that unstarted work is waiting. Nominating it is right, which
// is why task 71 made the task floor EQUAL that set.
//
// `develop-bug` says of the two statuses in this gap:
//   in-progress  → "Proceed — a prior run may have started; resume-aware."
//   ready-for-qa → "Proceed directly toward verification IF A FIX ALREADY
//                   EXISTS; else re-verify the fix record."
// Those are resume affordances — written so a re-invoked pipeline does not HALT
// on its own half-finished work. They are not a claim that work is available to
// pick up. Selecting on them would hand an unattended loop a bug a human may be
// actively holding, or one whose fix is written and only awaiting verification.
//
//   develop-bug proceeds on : new, reopened, in-progress, ready-for-qa
//   BUG_ELIGIBLE_STATUSES   : new, reopened
//   gap                     : in-progress, ready-for-qa   ← asserted exactly
//
// The gap may still be closed deliberately. This assertion failing is how that
// decision gets recorded, not a reason to avoid making it.
```

**File**: `skills/develop-next/references/roadmap-selection.md` — the eligibility table's bug row.

Current *Relation to dispatcher* cell:

```
`⊆` — diverges by `in-progress`, `ready-for-qa` (deliberate; see below)
```

Replace with:

```
**pinned exactly** — diverges by `in-progress`, `ready-for-qa`; both are resume affordances, not available work
```

Then update the paragraph beginning **"The bug axis keeps `⊆`, and that is measured rather than
assumed"** so it says the gap is now asserted exactly, and gives the resume-affordance reason
rather than only the risk one.

**File**: `skills/develop-next/scripts/select-next.mjs` — two comment blocks task 71 wrote say the
bug axis "keeps the weaker `⊆`". Grep and fix:

```bash
grep -n 'weaker \`⊆\`\|keeps the weaker' skills/develop-next/scripts/select-next.mjs
```

### Phase 3: Verify

```bash
npx prettier --write evals/develop-next/unit/select-next.test.mjs
node --test 'evals/develop-next/unit/*.test.mjs'     # expect 123 pass
npm test                                              # expect 0 failures
```

## Key Patterns and References

- **Reuse `proceedStatuses()`** at `select-next.test.mjs` — it parses the dispatcher table, drops
  HALT rows, splits slash-separated cells and asserts `sawRow`. Do not write a second parser.
- **`STEP0_BUG`** already points at the git-tracked
  `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`. Do not repoint it through
  `.agents/skills/`, which is a gitignored symlink — a test reading through it passes locally and
  fails in CI.
- **The task-axis assertion** (`assert.deepStrictEqual({onlyInFloor, onlyInDispatcher}, …)`) is the
  shape to imitate for the failure message: name the direction, and say what it means.
- **Prettier** runs over this file; use `--write` before committing to avoid a formatting-only diff.

## Testing Approach

Mutation proofs — run each against the real suite, then revert:

```bash
# 1. gap shrinks: add in-progress to the floor  → new assertion must go red
#    (edit BUG_ELIGIBLE_STATUSES in select-next.mjs)

# 2. gap grows: add a proceed-row to develop-bug's status table → must go red
#    e.g. append:  | `awaiting-triage` | Proceed — probe. |
#    to the "Status guards" table in develop-bug-step-0-resolve-bug.md

# 3. guard survives: delete "new" from BUG_ELIGIBLE_STATUSES → must go red
```

Mutation 2 is the one that matters most — it is the exact drift the old `⊆` was blind to, and the
reason this task exists. Restore every mutated file and confirm `git status` is clean before
committing.
