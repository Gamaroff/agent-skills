---
id: task.148.plan
title: "Implementation Plan: qa-fix and the QA loop — offer a structural move before another prose patch"
type: plan
task-ref: task.148.structural-move-before-prose-patch.md
---

# Implementation Plan: structural move before another prose patch

> Requirements and success criteria: [task.148.structural-move-before-prose-patch.md](task.148.structural-move-before-prose-patch.md)

## Overview

The work adds one pure predicate to the QA-loop engine and one wiring subsection that passes its result
to `/qa-fix` as an offer. On the qa-fix side it adds one new step that holds the offer's menu, and it
rewrites one Step 3.5 probe row. Build and test the engine first. Then wire the loop, so that the loop
document's snippet has a real export to call. Then write the qa-fix step that the snippet's prompt cites.

## Phase-by-Phase Implementation Guide

### Phase 1: `classifyNarrowingResidue` (engine)

**File**: `shared/resources/qa-diminishing-returns.js`. Add the predicate after `classifyLoopRoute`
(`:662`) and before `describeLoopRoute`. Add both new names to `module.exports` (`:882`) under
`// classify` and `// report`.

```js
const NARROWING_WINDOW = 2; // gates compared: this cycle's and the previous one (Open Question 3)

/**
 * The narrowing-residue signal (obs #172). An OFFER to qa-fix, never a route:
 * classifyLoopRoute does not call this, and nothing here decides where the loop goes.
 * HIGH is an input (engine property 2): it is read from highCounts, never from the gates.
 * @returns {{signal: boolean, reason: string, detail: string, file: string|null,
 *            ids: string[], cycles: number[]}}
 */
function classifyNarrowingResidue(input) {
  // 1. cycle >= 2                      else below-cycle-floor
  // 2. allInts(highCounts, cycle)      else high-counts-missing
  //    highCounts[cycle-1] === 0 && highCounts[cycle-2] === 0   else high-findings-remain
  // 3. readTopIssues(latest) / readTopIssues(previous) not null  else gate-unreadable
  //    each has >= 1 entry with severity === "medium" (closed included)  else no-medium
  // 4. every MEDIUM entry has a non-empty file   else medium-file-missing
  //    new Set(files).size === 1                 else medium-files-differ
  // → signal true, reason "narrowing-residue", file, ids (MEDIUM ids, gate order, previous first)
}
```

Follow the existing `route()` / `no()` helper style: one object shape on every return and no throw
(wrap input reads in `try`, as `classifyLoopRoute` does). **Do not** write `severity === "high"`
anywhere. The group 7 source guard in `qa-diminishing-returns.test.mjs` (*"the module source contains
no HIGH-counting logic"*) rejects it, and that guard is the reason HIGH is an input.

`describeNarrowingResidue(r)` returns one line, so the prompt block and the implementation report can
quote it:

```
Narrowing residue — every MEDIUM on gates {N-1} and {N} names {file} ({ids}); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
```

For a declined result it returns `Narrowing residue: not signalled ({reason}) — {detail}.`

**Fixtures**: `shared/resources/tests/fixtures/qa-narrowing-residue/`. Copy the real gates byte for byte:

```bash
D=shared/resources/tests/fixtures/qa-narrowing-residue; mkdir -p "$D"
for n in 1 2 3 4 5 6 7; do cp docs/tasks/task.143.qa-next-state-file-owned-by-the-tool/task.143.gate.$n.*.yml "$D/task143-gate-$n.yml"; done
for n in 1 2 3; do cp docs/tasks/task.117.card-preflight-heading-only/task.117.gate.$n.*.yml "$D/task117-gate-$n.yml"; done
```

Also write three synthetic gates in the minimal shape used by `fixtures/qa-diminishing-returns/`:

- `medium-no-file.yml`: one MEDIUM entry with no `file:` key.
- `medium-closed.yml`: two MEDIUM entries, both on one file, both `status: closed`.
- `medium-two-files.yml`: two MEDIUM entries on two different files.

Add a `README.md` that names each file's provenance, following the existing fixtures directory's README.

### Phase 2: route-table pins

**File**: `shared/resources/tests/qa-loop-route.test.mjs`. Append two rows to `ROWS` (`const ROWS = [`),
before the closing `];`. `FIXTURES` points at `fixtures/qa-diminishing-returns`, so add a second reader
for the new fixtures directory:

```js
const NR = join(__dirname, "fixtures", "qa-narrowing-residue");
const nr = (name) => readFileSync(join(NR, name), "utf8");
// …
{
  label: "task.143 cycle 3 — narrowing residue on a CONCERNS gate still routes continue (obs #172: an offer, not a route)",
  input: { cycle: 3, highCounts: [0, 0, 0], latestGateContent: nr("task143-gate-3.yml"), testArtifactGlobs: GLOBS },
  route: ROUTES.CONTINUE,
  reason: "not-a-pass-gate",
},
{
  label: "task.143 cycle 5 at the budget — the real run's route 2c decline",
  input: { cycle: 5, highCounts: [0, 0, 0, 0, 0], mediumCounts: [2, 1, 2, 0],
           latestGateContent: nr("task143-gate-5.yml"), budgetSpent: true, lastCycleAction: FIX },
  route: ROUTES.CONTINUE,
  reason: "medium-not-falling",
},
```

`FIX` is already `"Running qa-fix (cycle 5 of 5)"`. Mutation to record: add a `narrowing-residue` route
to `classifyLoopRoute` that fires on row 1 → the first new row goes red.

### Phase 3: loop wiring

**File**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`. Insert a new `####` subsection
after the paragraph *"Why the trigger is `file:` and not a judgement field"* (`:859`) and before
`#### Where the gate and QA report get committed`. Draft:

````markdown
#### Narrowing-residue offer — a structural move before another patch (obs #172)

The third strike above is HIGH-only, and so is its pre-strike shape. A loop can also spend its budget
at **HIGH 0**, with each cycle's MEDIUM narrowing one mechanism. task.143 did this: 7 cycles, MEDIUM
2, 1, 2, 0, 1, 1, 0, every MEDIUM from cycle 2 in one legacy-migration derivation. No guard fires on
that shape. This check does not stop the loop. It tells `/qa-fix` that the shape is present:

```bash
NARROWING_JSON=$(command node -e '
  const fs = require("fs");
  const { classifyNarrowingResidue, describeNarrowingResidue } =
    require("./.agents/skills/{develop-story|develop-task}/references/qa-diminishing-returns.js");
  const read = (p) => (p && fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
  const r = classifyNarrowingResidue({
    cycle:               Number(process.argv[1]),
    highCounts:          JSON.parse(process.argv[2]),
    latestGateContent:   read(process.argv[3]),
    previousGateContent: read(process.argv[4]),
  });
  console.log(JSON.stringify({ ...r, message: describeNarrowingResidue(r) }));
' "$CYCLE" "$HIGH_SEQUENCE_JSON" "$GATE_N" "$GATE_N1")
```

When `.signal` is `true`, append this to the `/qa-fix` prompt:

```
Narrowing residue: {message}
Apply qa-fix Step 2.6 before patching {file} again, and record the move in the fix summary.
```

The offer is **not a route and not an escalation**. The loop continues exactly as it would without
it. It changes one thing: what 5b tells the fixer. The move menu lives in `qa-fix` Step 2.6 and is
not restated here.
````

The inputs are `$CYCLE` and `$HIGH_SEQUENCE_JSON`, which the Diminishing-returns exit binds, and
`$GATE_N` and `$GATE_N1`, which the third-strike rule binds. No new binding is introduced. Run
`npm run bundle` afterwards, so that `skills/develop-{task,story}/references/` pick up both the engine
and this document.

### Phase 4: qa-fix

**File**: `skills/qa-fix/SKILL.md` (canonical; qa-fix has no bundled copy of its own SKILL.md).

**Step 2.6**: insert a new `### Step 2.6: Offer the structural move before another patch` between the
end of Step 2.5 (after its fenced fix-summary block) and `### Step 3: Apply Changes` (`:587`). Its
content:

1. **Why** (two sentences, citing obs #167 and #172). task.141 cycles 10–12 corrected a state-file
   contract kept in prose one sentence at a time. task.143 cycles 2–7 narrowed one best-effort
   derivation at HIGH 0. Both ended on a change of shape, not on a further correction.
2. **Triggers**: (a) the pipeline's *Narrowing residue* prompt block; (b) the Findings Summary shows a
   finding whose subject the previous cycle's fix edited (a bug that cites the prior bug's fix, or a
   gate entry on the same function or section). Trigger (b) is the fixer's judgement. It is allowed
   because this step *offers* and exits nothing.
3. **The four-move table** exactly as in the task document § 3 *Target Architecture*.
4. **The fixed fix-summary block**:

   ```
   Narrowing residue: {subject} ({trigger: pipeline offer | repeat subject})
   Move: consolidate | scope the claim | waive | patch — {one sentence why}
   ```

5. **The line that separates it from Step 2.5**: a third strike *forbids* the patch, and this step only
   *asks why*. When both apply, Step 2.5 wins. They cannot both come from the pipeline, because the
   predicate requires HIGH 0 and the strike requires HIGH.

**Step 3.5.** Make two edits in the documentation-deliverable block (`:631`–`:644`):

- Lead paragraph: change *"the transition that breaks is not a lifecycle but a *sentence elsewhere in
  the same file*"* to *"…a *sentence elsewhere, in this file or in another file that restates it*"*.
- Row 1: change the *Ask* cell to: *"Find every executed document that restates the subject (population
  command below), and check each one against the new text. Record the population size in the fix
  summary. A population above 1 is Step 2.6's **consolidate** move (obs #174)."* Directly under the
  table, add:

  ```bash
  # Population for row 1: every executed document that restates the subject. `:(glob)` keeps `*`
  # from crossing `/` (without it, shared/resources/tests/fixtures/** joins the population);
  # generated skills/*/references/ copies and docs/ history are excluded by construction.
  git grep -l -F -i -e '<subject phrase>' -- ':(glob)skills/*/SKILL.md' ':(glob)shared/resources/*.md'
  ```

Keep the citation `(obs #21)` in place. task.146 appends its identity-rule table after this block;
if it has already landed, place nothing between the two tables.

### Phase 5: docs and validation

- CHANGELOG `[Unreleased]` › Changed: one entry citing `(task 148)` and obs #167, #172 and #174.
- Run `npm run bundle`, then `npm run bundle:check`, `npm run ci:fast`,
  `npm run validate -- skills/qa-fix`, `npm run validate -- skills/develop-task` and
  `npm run validate -- skills/develop-story`.
- Before trusting a local green, move the gitignored `.agents/skills` symlink aside, because it masks
  CI failures.

## Key Patterns and References

- Row-table test shape: `shared/resources/tests/qa-loop-route.test.mjs`, where `ROWS` is the spec and
  each rule has a comment naming the mutation it guards.
- Single-statement test shape: `shared/resources/tests/who-restores-single-statement.test.mjs`, which
  finds sites by anchor and never by line number.
- Section extraction by heading: task.145's plan and `tests/outcome-reachability-check.test.js` once it
  lands. Take the text from the heading to the next same-level heading, skipping fences.
- Snippet execution from a consumer-shaped cwd: build `.agents/skills/develop-task/references/` in a
  temporary directory and copy the engine in. Never rely on the repository's `.agents/skills` symlink.
- Always `command node`, never bare `node`. The shell function prints nvm help to stdout and corrupts
  captured JSON.

## Testing Approach

| Test file                                                     | What it holds                                                                            | Mutation that must turn it red                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `shared/resources/tests/qa-narrowing-residue.test.mjs`        | 13 rows (task doc § 8) + never-throws + describer                                         | drop the HIGH condition (row 8); count open only (row 12); allow >1 file (row 10); window 3 (row 5) |
| `shared/resources/tests/qa-loop-route.test.mjs`               | 2 new `ROWS`: task.143's shape still routes `continue`                                   | add a narrowing route to `classifyLoopRoute`                                                      |
| `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`       | subsection present; cites Step 2.6; no menu restated; snippet returns `signal: true`      | delete the subsection; paste the menu into the loop doc; call a misspelled export                 |
| `tests/qa-fix-structural-move.test.js`                        | Step 2.6 elements; Step 3.5 row 1 wording; population command returns exactly 3 paths     | delete Step 2.6; restore `Grep the file`; drop `:(glob)` (count becomes 4)                        |

Commands:

```bash
command node --test shared/resources/tests/qa-narrowing-residue.test.mjs shared/resources/tests/qa-loop-route.test.mjs
command node --test evals/shared/tests/qa-narrowing-offer-wiring.test.mjs tests/qa-fix-structural-move.test.js
```
