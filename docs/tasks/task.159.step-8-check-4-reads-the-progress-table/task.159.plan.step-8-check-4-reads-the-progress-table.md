---
id: task.159.plan
title: "Implementation Plan: Step 8 check 4 reads the Pipeline Progress table, not the whole report"
type: plan
task-ref: task.159.step-8-check-4-reads-the-progress-table.md
---

# Implementation Plan: Step 8 check 4 reads the Pipeline Progress table, not the whole report

> Requirements and success criteria: [task.159.step-8-check-4-reads-the-progress-table.md](task.159.step-8-check-4-reads-the-progress-table.md)

## Overview

Tests first, in the existing task.147 harness: four executed cases that go red on today's check 4
where they should. Then replace check 4 with a table-scoped read, re-bundle, and mutation-prove
each of its three branches.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**File**: `shared/resources/tests/step-8-completion-checklist.test.mjs`. Add the cases inside the
existing `describe("executed against fixtures", { concurrency: true }, …)` loop over `SHELLS`, and
reuse `setup()`, `runChecklist()`, `finished()` and `cleanup()`.

**The pause section, from the hook itself.** Cut the append block out of
`shared/resources/develop-pipeline-on-precompact.sh`, from the line after `# Append pause entry to
report` through the `} >> "$REPORT" …` line. Run it with its inputs bound, so the test's fixture
carries whatever the hook writes today:

```js
const HOOK = "shared/resources/develop-pipeline-on-precompact.sh";

function pauseSection() {
  const src = readDoc(HOOK);
  const start = src.indexOf("# Append pause entry to report");
  assert.ok(start >= 0, "hook no longer carries its pause-append block");
  const from = src.indexOf("{", start);
  const to = src.indexOf('>> "$REPORT"', from);
  assert.ok(from > 0 && to > from, "pause-append block shape changed");
  // `{ … }` only; redirect to stdout instead of the report.
  const block = src.slice(from, src.lastIndexOf("}", to) + 1);
  const r = spawnSync("bash", ["-c", block], {
    env: {
      ...process.env,
      NOW: "2026-09-26T20:35:00Z",
      SKILL: "develop-task",
      BRANCH: "feature/task.9.fx",
      CURRENT_STEP: "7",
      PR_URL: "https://example.invalid/pr/1",
      LOCK_TRACKER: "github",
      TRACKER_ISSUE: "1",
    },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}
```

(`spawnSync` comes from `node:child_process`. If `executed-prose.mjs` already exports a run helper
that takes an env, prefer that.)

**The paused-and-resumed report**, plus a non-vacuity guard. The guard proves the fixture carries
the trap, so the passing case cannot pass for the wrong reason:

```js
function pausedAndResumed() {
  const base = finished("Task").replace(
    "## Decisions Log",
    "## Decisions Log\n\n- Resumed: Step 7 was `⏳ Pending` at the pause and re-ran from the start.\n",
  );
  return base + pauseSection();
}

function progressRows(text) {
  const at = text.search(/^## Pipeline Progress\s*$/m);
  const rest = text.slice(at).split("\n").slice(1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return rest.slice(0, end < 0 ? undefined : end).filter((l) => l.startsWith("|"));
}

test("the paused-and-resumed fixture carries the trap outside the table only", () => {
  const t = pausedAndResumed();
  const rows = progressRows(t).join("\n");
  assert.ok(!/⏳ Pending|⏸️ Paused/.test(rows), "table must be clean");
  assert.ok(t.replace(rows, "").includes("⏳ Pending"), "the token must appear outside the table");
});
```

(Check that `"## Decisions Log"` is present in the Task variant. If it is not, use `must()` against
whatever heading it carries.)

**The four executed cases**, in each shell:

| Case | Report | Expect |
| --- | --- | --- |
| paused-and-resumed passes | `pausedAndResumed()` | status 0, `✅ Step 8 post-conditions verified` |
| Pending row fails | `finished("Task")` with the `8. commit-changes` row's `✅ Done` set back to `⏳ Pending` | status 1, the check-4 `❌` line |
| Paused row fails | same, but set to `⏸️ Paused` | status 1, the check-4 `❌` line |
| no table fails | `finished("Task")` with `## Pipeline Progress` through the line before the next `## ` removed | status 1, `no Pipeline Progress table` |

Edit one row by splitting on its step label, not with a global replace. `finished()` already turned
every row into `✅ Done`, and a global `String.replace` would touch more than one row. Build the
edited text with `split`/`join` and assert the split count, per this repo's split/join rule.

Run the file. The paused-and-resumed, Paused-row and no-table cases are red today. The Pending-row
case is green today and must stay green.

### Phase 2: Scope check 4

**File**: `shared/resources/develop-pipeline-step-8-commit.md`, in the `## Step 8 Completion Checklist` block.

Before:

```bash
# 4. Pipeline Progress table has no ⏳ Pending rows
grep -q "⏳ Pending" "$REPORT" && { echo "❌ Step 8 incomplete: Pipeline Progress still has ⏳ Pending rows"; exit 1; } || true
```

After:

```bash
# 4. The Pipeline Progress TABLE has no unfinished row — its `|` rows only. The whole report is
#    not read: the PreCompact hook's pause section names `⏳ Pending` in prose (obs #200).
#    `⏸️ Paused` is unfinished too (resume contract). No table at all is a failure, not a pass.
PROGRESS_ROWS=$(awk '/^## Pipeline Progress[[:space:]]*$/ {f=1; next} f && /^## / {exit} f && /^\|/' "$REPORT")
[ -n "$PROGRESS_ROWS" ] || { echo "❌ Step 8 incomplete: no Pipeline Progress table found in $REPORT"; exit 1; }
printf '%s\n' "$PROGRESS_ROWS" | grep -qE '⏳ Pending|⏸️ Paused' \
  && { echo "❌ Step 8 incomplete: Pipeline Progress still has an unfinished (⏳ Pending / ⏸️ Paused) row"; exit 1; } || true
```

Verified during authoring against task.152's real paused-and-resumed report under bash and zsh: 9
table lines read, 0 unfinished. The old check fails on the same report.

Then run `npm run bundle` and `npm run bundle:check`. Also check the paragraph under the block
("Checks 1–4 (and 2b) address regressions …"), which should need no change.

### Phase 3: Mutation proof, docs, gates

Mutate `shared/resources/develop-pipeline-step-8-commit.md`, not a bundled copy, because the test
reads the source. Run the file after each mutation, then restore it with `git checkout --`:

| Mutation | Case that must go red |
| --- | --- |
| restore the whole-file `grep -q "⏳ Pending" "$REPORT"` | paused-and-resumed passes |
| pattern `'⏳ Pending'` only | Paused row fails |
| delete the `[ -n "$PROGRESS_ROWS" ] \|\| …` line | no table fails |

CHANGELOG `[Unreleased]` → **Fixed**: "Step 8 check 4 reads the Pipeline Progress table rows, not
the whole report, so a paused-and-resumed run passes; a `⏸️ Paused` row and a missing table now fail
it (task 159, obs #200)."

## Key Patterns and References

- Harness: `shared/resources/tests/lib/executed-prose.mjs` (`blockBy`, `bind`, `fixtureRepo`, `ghStub`, `runAsync`, `SHELLS`)
- Template-built reports: `finished(variant)` and `must()` in the test file. Keep fixtures derived from the template, never hand-written
- awk under zsh/BSD: POSIX classes only, no apostrophes inside the single-quoted program (see the qa-task Phase 0 SAFETY_REPROBE awk and its "Transit constraints")

## Testing Approach

```bash
command node --test shared/resources/tests/step-8-completion-checklist.test.mjs
mv .agents/skills .agents/skills.aside && npm run ci:fast; mv .agents/skills.aside .agents/skills
npm run lint:shell && npm run bundle:check && npm run check:generated
```
