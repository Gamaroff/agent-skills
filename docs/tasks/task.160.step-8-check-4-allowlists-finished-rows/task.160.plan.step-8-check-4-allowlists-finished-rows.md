---
id: task.160.plan
title: "Implementation Plan: Step 8 check 4 allowlists finished rows instead of denying two unfinished ones"
type: plan
task-ref: task.160.step-8-check-4-allowlists-finished-rows.md
---

# Implementation Plan: Step 8 check 4 allowlists finished rows instead of denying two unfinished ones

> Requirements and success criteria: [task.160.step-8-check-4-allowlists-finished-rows.md](task.160.step-8-check-4-allowlists-finished-rows.md)

## Overview

Start with tests in the existing task.147/159 harness, covering every finished and unfinished Status shape plus the Bug variant. Then replace check 4's deny-list `grep` with a header-located awk allowlist. Then remove Step 8's two post-commit report edits. Re-bundle, and mutation-prove each branch.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**File**: `shared/resources/tests/step-8-completion-checklist.test.mjs`. Add cases inside the existing `describe("executed against fixtures", { concurrency: true }, …)` loop over `SHELLS`. Reuse `setup()`, `runChecklist()`, `finished()`, `setRow()`, `setNotes()`, `withoutProgressTable()` and `cleanup()`, all task.159's.

**Setting a Status on the Bug variant.** `setRow(text, label, state)` finds the row by its label prefix and replaces its single `✅ Done`, so it works on any variant. Bug-variant rows are `| 8 | commit-changes | ✅ Done | | |`, so the label is `8 | commit-changes` (check `variantBody("Bug")` for the exact spacing and assert through `setRow`'s own count check).

**Several finished shapes in one report.** Set a different finished shape on several rows of one `finished("Task")` report, so a single case proves the whole allowlist:

```js
const FINISHED_SHAPES = [
  ["1. create-branch", "✅"],
  ["2. review-task", "✅ Complete"],
  ["3. develop", "✅ Done (PASS 100/100)"],
  ["4. create-pr", "✅ Skipped (gate PASS)"],
  ["5–6. qa-task / qa-fix loop", "⏭️ Skipped"],
];
let t = finished("Task");
for (const [label, shape] of FINISHED_SHAPES) t = setRow(t, label, shape);
```

(Check that the Task variant's step labels match these exactly; `setRow` asserts one hit per label.)

**Unfinished shapes**, one case each, on the `8. commit-changes` row: `❌ Failed`, `⚠️ Needs Attention`, `🔄 Cycle 3`, `⏸️ Skipped`, and `""` (empty). Assert status 1 and that stdout contains the row text, since the new message prints the offending row.

**Header-only table.** Keep the heading, the header row and the separator row, and drop every step row:

```js
function headerOnly(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^## Pipeline Progress\s*$/.test(l));
  const next = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  const pipes = lines.slice(at + 1, next).filter((l) => l.startsWith("|"));
  assert.ok(pipes.length >= 3, "fixture: expected header + separator + rows");
  const keep = new Set(pipes.slice(0, 2)); // header, separator
  return lines.filter((l, i) => !(i > at && i < next && l.startsWith("|") && !keep.has(l))).join("\n");
}
```

**No `Status` column.** Rename the header cell `Status` to `State` in the Task variant (split/join on `| Status |` with a count assertion, per this repo's split/join rule).

Run the file. Every new case except the finished-shapes case is red on today's check 4. The finished-shapes case is green today, because the deny-list admits them; it must stay green.

### Phase 2: Allowlist check 4

**File**: `shared/resources/develop-pipeline-step-8-commit.md`, in the `## Step 8 Completion Checklist` block, from `# 4. The Pipeline Progress TABLE has no unfinished row` through the `unfinished (⏳ Pending / ⏸️ Paused) row` line.

Replace with the task's § 3 Target Architecture block. Keep the comment explaining the spaced awk braces from task.159. Keep its `!col { next }` rule and the `|| { … exit 1; }` on the `UNFINISHED` assignment, and say why in the block's comment: without the rule, BSD awk aborts on `$col` when no header cell is `Status`, and without the `||` that abort reads as a pass (review.1). The prototype was run during authoring against every committed report whose `**Final Status**` reads Completed or Accepted, 123 reports, under bash and zsh:

```bash
for f in $(git ls-files '*.implementation.*.md'); do
  grep -qE '^\*\*Final Status(:\*\*|\*\*:) (Completed|Accepted)' "$f" || continue
  REPORT="$f" bash /path/to/check4-prototype.sh >/dev/null 2>&1 || echo "FAIL $f"
done
```

Result: 17 fail. These are the same 17 today's check 4 fails, so 0 are newly refused. 15 are leftover `⏳ Pending` rows (Phase 3's defect; 14 of them the Step 8 row). 2 are eval replay fixtures with no table.

Then `npm run bundle` and `npm run bundle:check`.

### Phase 3: Step 8 edits nothing after its commit

Same file, three edits:

1. **§ Final Implementation Report Update**: the bullet "Ensure the Pipeline Progress table shows ✅ for all steps" becomes "…for all steps, **including Step 8's own row** (written `✅ Done`, the value the Step Transition Protocol's action 2 writes afterwards, so that edit is a no-op). Nothing in the report is edited after `/commit-changes`: check 5 requires a clean tree, and check 4 requires every row finished."
2. **§ Invoke /commit-changes**: remove "Update the Pipeline Progress Notes for Step 8: `Committed in {hash}` …". Replace it with one sentence: the hash goes in the orchestrator's Phase 2 completion output, and `git log` is the record, because a commit cannot record its own hash without a further commit.
3. **§ Final Push**: remove "Update Pipeline Progress: ✅ commit-changes."

Grep the orchestrators' `SKILL.md` files for a restatement of either late edit before closing the phase (`git grep -n "Committed in" -- skills/*/SKILL.md shared/resources`). Correct any restatement in the same commit.

Test: the existing `finished(variant)` cases already model a report whose rows are all ✅ at commit time. Add one case that names the ordering explicitly: set Step 8's row ✅ in the fixture before `setup()` commits it, and assert the checklist passes with a clean tree.

### Phase 4: Mutation proof, docs, gates

Mutate `shared/resources/develop-pipeline-step-8-commit.md`, not a bundled copy, because the test reads the source. Snapshot it with `cp` and restore from the snapshot, never `git checkout --`. Name the case expected to go red before each run.

| Mutation | Case that must go red |
| --- | --- |
| allowlist test → `s ~ /⏳|⏸/` (a deny-list) | `❌ Failed` row fails check 4 |
| `s ~ /^✅/` → `s == "✅ Done"` | finished-shapes report passes |
| drop `\|\| s ~ /^⏭[^\|[:alnum:]]*Skipped$/` | finished-shapes report passes (its `⏭️ Skipped` row) |
| header lookup → `col = 2` | Bug-variant unfinished row fails |
| drop the `else if (!n)` branch | header-only table fails |
| drop `!col { next }` | no-Status-column table fails (message becomes `could not read`) |
| drop `!col { next }` **and** the `\|\| { … exit 1; }` on the assignment | no-Status-column table fails (the check passes) |

CHANGELOG `[Unreleased]` → **Fixed**: "Step 8 check 4 allowlists finished rows (a Status starting with ✅, or ⏭️ Skipped) found by the table header, and refuses everything else — ❌ Failed, ⚠️ Needs Attention, 🔄 …, an empty Status, a header-only table, a table with no Status column; Step 8 no longer edits the report after its own commit (task 160)."

## Key Patterns and References

- Harness: `shared/resources/tests/lib/executed-prose.mjs` (`blockBy`, `bind`, `fixtureRepo`, `ghStub`, `runAsync`, `run`, `SHELLS`)
- `bind()` refuses any `{word}` in the extracted block, so keep awk braces spaced (task.159)
- awk under zsh/BSD: POSIX classes only; no apostrophes inside the single-quoted program; `-F'|'` splits cells, and `$1` / `$NF` are the empty edges of a `| … |` row, so the header scan runs `i = 2 … NF-1`
- The `/finalise` DoD security agent treats check 4 as a boundary. Task.159's one-argument wrapper pattern (a JS export that runs the shipped block on a generated report) is how the probe reached it: `task.159.dod.1.*` § Step 8a. Expect to reuse it, and add cases for the new shapes

## Testing Approach

```bash
command node --test shared/resources/tests/step-8-completion-checklist.test.mjs
mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills
npm run lint:shell && npm run bundle:check && npm run check:generated
for s in develop-story develop-task develop-bug; do npm run validate -- skills/$s/; done
```
