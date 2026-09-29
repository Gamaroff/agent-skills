---
id: task.141.plan
title: "Implementation Plan: /qa-next <id> — target a specific registry item"
type: plan
description: "Code-level guide for task 141: the describeRow extraction, cmdItem/cmdRunPath, listRunFiles' sequence-aware sort key, the cmdSet only-a-fail-moves-an-accepted-row rule, the SKILL.md argument grammar, and the fixture-backed test groups."
task-ref: task.141.qa-next-targeted-item.md
created: 2026-09-22
updated: 2026-09-22
---

# Implementation Plan: `/qa-next <id>` — target a specific registry item

> Requirements and success criteria:
> [task.141.qa-next-targeted-item.md](task.141.qa-next-targeted-item.md)

## Overview

All tool work happens in one file, `skills/qa-next/scripts/uat-status.mjs`, and follows that file's
existing idioms exactly: the `OPTIONS` allowlist, the `args.indexOf(flag)` positional, the first-match
`if` ladder in `dispatch`, `updateRow` as the single writer, and `die()`'s throw-don't-exit rule. The
skill work is prose in `SKILL.md`. Nothing here needs a dependency, a network call or a new file in
the skill directory.

Work the phases in order — Phase 2 uses Phase 1's id resolution, Phase 4 quotes Phases 1–3's commands,
and Phase 5's tests assert against all of them.

---

## Phase-by-Phase Implementation Guide

### Phase 1: Resolve a named row

**Files to modify:**

- `skills/qa-next/scripts/uat-status.mjs` — extract the payload builder, add `--item`.

**Exact changes:**

1. **Extract `describeRow`.** `cmdNext` currently builds its payload as an object literal
   (`const out = { id: r.id, function: r.title, … }`). Lift that literal verbatim into a function and
   have `cmdNext` call it. This is the whole point of the phase: one builder, so `--item` and `--next`
   cannot describe the same row differently.

   ```js
   // The one description of a registry row that the skill consumes. `--next` and `--item` differ
   // only in HOW they find the row; what they say about it must be identical, so they say it here.
   function describeRow(opts, cfg, r) {
     const stories = loadStories(opts, cfg);
     const automatedBy = specPaths(r.cells["Automated by"]);
     const uat = new RegExp(cfg.uatSpecPattern);
     return {
       id: r.id,
       function: r.title,
       what: r.cells["What it does"] ?? "",
       entry: r.cells.Entry ?? "",
       surface: r.surface,
       surfaceTitle: r.surfaceTitle,
       stories: storyIds(r.cells.Stories).map((id) => {
         const s = stories.find((x) => x.id === id);
         return s
           ? { id, title: s.title, path: s.path, storyType: s.storyType }
           : { id, title: null, path: null, storyType: null };
       }),
       items: r.cells.Items ?? "",
       automatedBy,
       uatSpecs: automatedBy.filter((p) => uat.test(p)),
       checklists: findChecklists(opts, r.id, r.cells.Items ?? ""),
       // --- new, and on BOTH commands ---
       state: stateKey(r.state),                       // "untested" | "pass" | … | null
       lastRun: (r.run.match(/\]\(([^)]+)\)/) ?? [])[1] ?? null,
       priorRuns: priorRuns(opts, r.id),               // oldest first, relative to the registry dir
       notes: r.notes,                                 // the Notes / bug cell, verbatim
       // The bug link the row already carries, if any — the SAME regex checkRegistry uses, so there
       // is one parser. Step 4's "a repeat failure reuses the open bug" needs a source, and without
       // this the skill would re-read and re-parse the registry by hand: a second reader of the file
       // --item exists to remove.
       bug: (r.notes.match(/\[[^\]]*bug\.[^\]]*\]\(([^)]+)\)/) ?? [])[1] ?? null,
     };
   }
   ```

   Note `r.surfaceTitle`: `nextItem` attaches it (`{ ...r, surfaceTitle: sec.title }`), so the new
   lookup must attach it the same way — see step 2.

2. **`priorRuns`** — the run files already under `runs/<id>/`, oldest first. Reuse `listRunFiles`
   rather than writing a second walker:

   ```js
   function priorRuns(opts, id) {
     const dir = join(opts.root, opts.registryDir, "runs", id);
     if (!existsSync(dir)) return [];
     return listRunFiles(join(opts.root, opts.registryDir, "runs")).filter((p) =>
       p.startsWith(join("runs", id) + "/"),
     );
   }
   ```

   `listRunFiles` returns paths relative to the registry directory, sorted by the sequence-aware key
   below — which is exactly what the run file needs to cite. This is a recursive walk of `runs/` on
   every `--item` *and* `--next`; that cost is accepted deliberately, because the alternative is a
   second comparator, and two sort orders for "oldest run first" would drift in the worst direction.

3. **`itemById`** — the sibling of `nextItem`, same return shape:

   ```js
   export function itemById({ sections }, id) {
     for (const sec of sections) {
       const r = sec.rows.find((row) => row.id === id);
       if (r) return { ...r, surfaceTitle: sec.title };
     }
     return null;
   }
   ```

4. **`cmdItem`** — mirrors `cmdNext`'s two output modes:

   ```js
   const normaliseId = (s) => (s ?? "").trim().toUpperCase();

   function cmdItem(opts) {
     const cfg = requireSurfaces(opts);
     const id = normaliseId(opts.val("--item"));
     const r = itemById(readRegistry(opts), id);
     if (!r) {
       // Exit 4, not the usage family's 2: "you named a row that is not there" is a different
       // answer from "you called me wrongly", and /qa-next stops differently on each.
       console.error(`uat-status: ${id}: no registry row`);
       process.exitCode = 4;
       return;
     }
     const out = describeRow(opts, cfg, r);
     if (opts.has("--json")) console.log(JSON.stringify(out, null, 2));
     else printRow(out);   // the same block cmdNext prints, extracted alongside describeRow
   }
   ```

   Print the human form through one `printRow(out)` used by both commands, for the same reason the
   payload is shared. `cmdNext`'s heading line differs (`next: …` vs `item: …`) — pass a label.

5. **Register**: add `"--item"` to `OPTIONS`, and `if (opts.has("--item")) return cmdItem(opts);` to
   `dispatch` — **before** `--set`, and anywhere before the scoreboard fall-through.

6. **Usage header**: add the `--item` and (Phase 2) `--run-path` lines, and correct the `--accept`
   line, which omits the `--force` the code accepts:

   ```
   //   node uat-status.mjs --item <id> [--json]  one named row, same payload as --next (exit 4 if absent)
   //   node uat-status.mjs --run-path <id> [--env <label>]   next free run file path (creates runs/<id>/)
   //   node uat-status.mjs --accept <id> [--note "..."] [--force]   🟡 pass → ✅ accepted — the owner's command
   ```

---

### Phase 2: A run file path the agent cannot collide

**Files to modify:**

- `skills/qa-next/scripts/uat-status.mjs`

**Exact changes:**

1. **`runPathFor` — pure, and therefore testable without a filesystem:**

   ```js
   // Run files are runs/<id>/<date>-<env>.md. The date and the env label are both fixed within a
   // session, so a second run today would write the same path and take the first run's Findings
   // rows with it — and --findings is DERIVED from those files, so the loss reads as a shorter
   // list nobody can tell is short. Sequence, zero-padded so "-10" does not sort before "-2".
   // Padding is only half of it: run 1 carries NO suffix, and "." sorts after "-", so a plain
   // basename sort puts the day's first run LAST. The other half is listRunFiles' sort key below.
   export function runPathFor(existing, date, env) {
     const base = `${date}-${env}`;
     const taken = new Set(existing.map((f) => basename(f)));
     if (!taken.has(`${base}.md`)) return `${base}.md`;
     for (let n = 2; n < 100; n++) {
       const name = `${base}-${String(n).padStart(2, "0")}.md`;
       if (!taken.has(name)) return name;
     }
     die(`${base}: 99 runs already recorded today`);
   }
   ```

2. **`cmdRunPath`** — resolve the id through `itemById` so an unknown id exits 4 here too, then
   create the directory and print the path relative to the registry directory (the form `--set --run`
   already accepts):

   ```js
   function cmdRunPath(opts) {
     requireSurfaces(opts);
     const id = normaliseId(opts.val("--run-path"));
     if (!itemById(readRegistry(opts), id)) {
       console.error(`uat-status: ${id}: no registry row`);
       process.exitCode = 4;
       return;
     }
     const env = opts.val("--env") ?? "local";
     const dir = join(opts.root, opts.registryDir, "runs", id);
     mkdirSync(dir, { recursive: true });
     const name = runPathFor(readdirSync(dir), today(), env);
     console.log(join("runs", id, name));
   }
   ```

   `mkdirSync`, `readdirSync`, `basename` and `today()` are all already imported or defined.

3. **`listRunFiles` — make the sort key sequence-aware.** This is the half of the scheme that
   actually delivers "oldest run first", and it is not optional:

   ```js
   // A basename with no sequence is run 1 of its day, so compare it as "-01". Without this,
   // ["…-lan.md","…-lan-02.md"].sort() yields ["…-lan-02.md","…-lan.md"] — "." sorts after "-" —
   // and the day's FIRST run reads as its last, in --findings, in priorRuns and in the run file's
   // "previous run" link. Normalising in the comparator (rather than renaming) also fixes run
   // files already on disk, which a rename could not.
   const seq = (p) =>
     basename(p).replace(/^(.*?)(?:-(\d{2}))?\.md$/, (_, base, n) => `${base}-${n ?? "01"}.md`);
   …
   .sort((a, b) => seq(a).localeCompare(seq(b)) || a.localeCompare(b));
   ```

   Write the failing assertion **first** — it goes red against today's comparator — then apply this.

4. **Register** `--run-path` and `--env` in `OPTIONS` and add the `dispatch` line.

---

### Phase 3: The registry state rules for a re-run

**Files to modify:**

- `skills/qa-next/scripts/uat-status.mjs` — `cmdSet` only.

**Exact changes:**

1. **The accepted-row rule.** `cmdSet`'s mutate callback currently opens `row.state = STATES[state];`.
   Guard that one line:

   ```js
   updateRow(opts, id, (row) => {
     // ONLY A FAIL MOVES AN ACCEPTED ROW. ✅ means "this is the feature I wanted" — an owner's
     // judgement. A machine re-pass agrees with it; a "blocked" says the environment could not
     // supply a credential; an "n/a" says the function is gone. None of the three is evidence
     // against the judgement. A FAIL is, and still overrides. Written as one predicate over the
     // verdict rather than a special case for "pass": Step 2's two early exits write blocked and
     // na, so guarding pass alone leaves the same defect reachable through another door — a
     // regression sweep must not replace fifty owner signatures with fifty ⏸.
     const kept = state !== "fail" && stateKey(row.state) === "accepted";
     if (!kept) row.state = STATES[state];
     row.keptAccepted = kept;   // read by updateRow's console line only
     …
   });
   ```

   and make `updateRow`'s report say which branch it took:

   ```js
   console.log(
     `${id}: ${row.state}${row.keptAccepted ? " (kept)" : ""}${row.run ? ` · ${row.run}` : ""}`,
   );
   ```

   A silent branch here is the risk the task document names; the print is the mitigation.

2. **`--clear-note`.** Today the notes block only writes when something was supplied:

   ```js
   const parts = [];
   if (bug) parts.push(linkTo(opts, bug));
   if (note) parts.push(note);
   if (parts.length) row.notes = parts.join(" — ");
   ```

   Add, above it, the explicit clear — and refuse the contradictory combination:

   ```js
   const clear = opts.has("--clear-note");
   if (clear && (bug || note)) die("--clear-note cannot be combined with --note or --bug");
   // Refused on the kept-✅ path too. That cell is where cmdAccept stored the owner's
   // "accepted <date> — <why>", checkRegistry imposes NO note requirement on an accepted row, and
   // so a passing regression re-run would erase the signature's provenance with --check still
   // green. There is no stale bug link to clear on a ✅ anyway. The guard belongs beside the
   // kept rule, in the state machine, for the same reason the kept rule does.
   if (clear && state === "pass" && stateKey(currentRow.state) === "accepted")
     die("--clear-note cannot clear an accepted row's sign-off note");
   …
   if (clear) row.notes = "";
   else if (parts.length) row.notes = parts.join(" — ");
   ```

   The refusal needs the row's current state, which `cmdSet` reads only inside `updateRow`'s
   callback — so raise it there, through `die()` (which throws; `updateRow` has not written yet at
   that point, so nothing is persisted).

   Register `--clear-note` in `OPTIONS`. The protocol passes the note flag **per verdict** (see
   Phase 4 step 5), not as a blanket "always one of `--note` / `--clear-note`" — that blanket is
   unsatisfiable on a `fail`, where `--bug` is mandatory and `--clear-note` is refused beside it.

3. **Check the invariants still hold.** `checkRegistry` requires a resolving `Last run` link for
   `pass`, `fail` and `accepted`, and a resolving bug link for `fail`. The kept-`✅` path writes
   `Last run`, so it stays green; the `❌ → 🟡` path drops a bug link that `🟡` does not require.
   Nothing in `checkRegistry` changes. Note what it does **not** check: an `accepted` row's note.
   That absence is precisely why the `--clear-note` refusal has to be raised in `cmdSet` — there is
   no downstream gate that would notice the loss.

---

### Phase 4: The protocol

**Files to modify:**

- `skills/qa-next/SKILL.md`
- `skills/qa-next/assets/run.template.md`

**Exact changes:**

1. **`## Arguments`**, placed immediately after `## When to Use This Skill`, in the house style of
   `skills/review-code/SKILL.md`, `skills/review-pr/SKILL.md` and `skills/double-check/SKILL.md`:

   ```markdown
   ## Arguments

   Invoke as `/qa-next [id] [--dry-run]`.

   | Arg | Values | Default | Meaning |
   | :--- | :--- | :--- | :--- |
   | `id` | a registry row id — `D.2` (case-insensitive) | the first `⬜ untested` row | Which function to exercise |
   | `--dry-run` | — | off | Report the resolved row and stop. **Read-only** |

   **An explicit id ignores the row's state.** `⬜ 🟡 ❌ ⏸ ✅ ➖` are all re-runnable — that is what the
   argument is for: re-test a `❌` after the fix lands, as many times as it takes, and regression-test
   a `✅` when the code beneath it changes. "First untested" is the *default selection rule*, not an
   eligibility gate.

   **`/loop /qa-next` stays untargeted.** A loop over a fixed id repeats one function forever; the
   registry is the queue.
   ```

   Also update the frontmatter `description`'s invocation sentence, which currently names only
   `/qa-next`, `/qa-next --dry-run` and `/loop /qa-next`.

2. **Step 0.1** — today: *"State file present → resume as above"*. Replace with:

   > State file present → if it names a **different** item and this invocation gave an id, **HALT**
   > `run-in-progress`: finish that run or delete the state file. Otherwise resume as above (or, under
   > `--dry-run`, report the pending run and stop).

   And in `## Run state`, add `"targeted": true` to the example object with one sentence: a resume at
   `phase: selected` re-resolves *that* id with `--item`, rather than falling back to `--next` and
   quietly testing a different function.

   **In the same edit, gate the staleness rule two lines above it.** It currently reads: *"If the
   registry row for `item` is no longer ⬜ and the phase is `selected`, someone else finished it —
   delete the state file and start over."* For a targeted run that premise is false by
   construction — targeting a `❌` or a `✅` is the entire point — so unamended the rule fires on
   **every** targeted resume and throws the run away. Amend it to: *"…someone else finished it —
   delete the state file and start over. **This applies to an untargeted run only**: under
   `"targeted": true` the row's state is not evidence about anyone else, and the resume re-resolves
   the id."* Adding the flag without amending the rule that needs it would leave a field nothing
   reads — which is this repository's config-key failure exactly.

3. **Step 1** — retitle *Select or resolve*:

   ```markdown
   **No id** — the queue picks:

   ```bash
   node .agents/skills/qa-next/scripts/uat-status.mjs --next --json
   ```

   Exit 3 → **STOP** `registry-complete` (print the scoreboard).

   **An id** — resolve it, whatever state it is in:

   ```bash
   node .agents/skills/qa-next/scripts/uat-status.mjs --item D.2 --json
   ```

   Exit 4 → **STOP** `unknown-item` (the id is not a row; print the scoreboard so the owner can see
   the ids that are).
   ```

   Then the existing sentence about the JSON fields, extended with `state`, `lastRun` and `priorRuns`
   — "`priorRuns` is this function's earlier run files, oldest first; a non-empty one means this is a
   re-run and Step 4 says so in the run file."

4. **Step 3** — replace the evidence-path sentence:

   > Evidence goes under `.claude/state/qa-next/<id>/<run-file-basename>/` — the run file's own name
   > without `.md`, so a same-day re-run's screenshots do not overwrite the first run's either.

   and add, at the top of Step 3:

   > The run file's path is **not composed here**. Ask the tool for it once, before executing:
   >
   > ```bash
   > node .agents/skills/qa-next/scripts/uat-status.mjs --run-path <id> --env <envLabel>
   > ```
   >
   > It creates `runs/<id>/` and prints the next free file: `<date>-<env>.md`, then `-02`, `-03`. A
   > filename the tool computes cannot be a filename that collides — and a collision here would
   > silently delete the previous run's `## Findings` rows, which `--findings` is derived from.

5. **Step 4** — four edits:
   - Item 1 gains: the header table's **Run** row — `<n>th run · previous: <link to the previous run
     file, relative to this one>`, or `1st run` when `priorRuns` was empty.
   - New bullet under item 2 (*On fail*):

     > **A repeat failure reuses the open bug.** The payload's `bug` field is the link (`null` when
     > there is none) — read it there; never re-parse the registry. When it is non-null and that bug
     > is not closed, append a dated re-test section to it (what was run,
     > what was observed, which items still fail) and link the same bug again. File a **new** bug only
     > when there is none, or when the existing one is closed — a closed bug failing again is a new
     > fact and deserves its own record. Fixing then re-testing is the main reason this argument
     > exists; filing bug #2, #3 and #4 against one defect is its obvious first-order failure.
   - Item 3 (findings) gains the same rule, one sentence: a finding that matches an open finding on
     this function from an earlier run (`--findings --all --json`, matched on *Where* + *What was
     observed*) reuses that bug's link in its `Filed as` cell instead of filing a duplicate.
   - Item 4 gains the note rule **per verdict** — not a blanket "always `--note` or
     `--clear-note`", which Phase 3's two refusals make unsatisfiable on a `fail` and destructive on
     a kept `✅`:

     | Verdict | Row before | Note flag | Why |
     | :--- | :--- | :--- | :--- |
     | `fail` | any | `--bug` (plus `--note` when there is more to say) | `--bug` is mandatory; `--clear-note` is refused beside it |
     | `blocked` / `na` | any | `--note` | mandatory already |
     | `pass` | `⬜` `🟡` `❌` `⏸` `➖` | `--clear-note` | drops the previous verdict's bug link, which `🟡` does not require and must not keep |
     | `pass` | `✅` | neither | the cell holds the owner's `accepted <date>`; `--clear-note` is refused here |

     And: a `pass`, `blocked` or `na` on an `✅` row leaves `✅` (the tool prints `(kept)`) — the
     skill still never *writes* `✅`, it only declines to remove one on evidence that is not against
     it. Only a `fail` moves it.

6. **Step 5** — commit subject for a targeted re-run:
   `qa(uat): <id> re-run <pass|fail|blocked> — <Function>`.

7. **Step 6** — the report line gains the run number and a link to the previous run.

8. **Stop conditions** — two rows:

   | Condition | Meaning | What the owner does |
   | `unknown-item` | The id given is not a registry row | Check the id against the scoreboard, re-run |
   | `run-in-progress` | A state file names a different function | Finish that run, or delete `.claude/state/qa-next.state.json` |

9. **What this skill never does** — two bullets: *Overwrite a previous run file* (the path comes from
   `--run-path`), and *Re-litigate an `✅` on a pass* (only a failure moves an accepted row).

10. **`assets/run.template.md`** — one row in the header table, after `Function`:

    ```markdown
    | Run | {{1st|2nd|…}} run of this function · previous: {{link to the previous run file, or _none_}} |
    ```

---

### Phase 5: Tests and the doc sweep

**Files to modify:**

- `evals/qa-next/unit/uat-status.test.mjs` — extend; it is already in the `npm test` glob
  (`package.json`). Re-check that glob after adding files: it is hand-maintained and has silently
  orphaned a whole suite before.

**Testing approach:** follow the file's existing fixture pattern — build a registry, a
`uat-surfaces.json` and a story tree under `mkdtempSync(join(tmpdir(), …))`, then call the exported
functions directly for the pure ones and spawn the script for the exit codes.

```js
describe("--item", () => {
  it("describes a named row exactly as --next describes it", () => {
    // Fixture: A.1 is the first ⬜ row, so --next selects it.
    const viaNext = JSON.parse(run(["--next", "--json"]).stdout);
    const viaItem = JSON.parse(run(["--item", "A.1", "--json"]).stdout);
    assert.deepEqual(viaItem, viaNext);   // pins the single describeRow — a source grep would not
  });

  it("resolves a row the selector would never reach", () => {
    const out = JSON.parse(run(["--item", "B.2", "--json"]).stdout);   // B.2 is ✅ accepted
    assert.equal(out.state, "accepted");
    assert.ok(out.lastRun);
  });

  it("accepts a lowercase id", () => { … });

  it("exits 4 on an unknown id and writes nothing", () => {
    const before = readFileSync(registry, "utf8");
    assert.equal(run(["--item", "Z.9"]).status, 4);
    assert.equal(readFileSync(registry, "utf8"), before);
  });
});

describe("runPathFor", () => {
  it("uses the plain name for the first run of a day", () => {
    assert.equal(runPathFor([], "2026-09-22", "lan"), "2026-09-22-lan.md");
  });
  it("sequences, zero-padded", () => {
    let files = [];
    for (let i = 0; i < 10; i++) files.push(runPathFor(files, "2026-09-22", "lan"));
    assert.equal(files[0], "2026-09-22-lan.md");
    assert.equal(files[1], "2026-09-22-lan-02.md");
    assert.equal(files[9], "2026-09-22-lan-10.md");
  });
  it("ignores a different env label", () => { … });
});

describe("listRunFiles ordering", () => {
  // THE assertion the sequencing scheme rests on, and the one that fails against today's
  // comparator: "." sorts after "-", so the unsuffixed first run of the day reads as its last.
  // Write it first, watch it go red, then fix the sort key. Note the existing ordering test at
  // uat-status.test.mjs:581 uses two DIFFERENT dates and passes either way — it is not cover here.
  it("puts the day's unsuffixed first run before its sequenced re-runs", () => {
    // fixture: runs/D.2/{2026-09-22-lan.md, 2026-09-22-lan-02.md, 2026-09-22-lan-10.md}
    assert.deepEqual(listRunFiles(runs).map((p) => path.basename(p)), [
      "2026-09-22-lan.md",
      "2026-09-22-lan-02.md",
      "2026-09-22-lan-10.md",
    ]);
  });
  it("still orders across function directories by date", () => { … });  // the existing property
});

describe("--set on an accepted row", () => {
  it("keeps ✅ on a pass and updates Last run", () => { … });   // and asserts the "(kept)" output
  it("keeps ✅ on a blocked and on an n/a", () => { … });       // the rule is over the verdict set
  it("sets ❌ on a fail — the only verdict that moves it", () => { … });
  it("leaves --check green after each", () => { … });
});

describe("--clear-note", () => {
  it("empties Notes / bug so a ❌'s bug link cannot survive into a 🟡", () => { … });
  it("is a usage error alongside --note or --bug", () => { … });
  it("is a usage error on a pass against ✅, and the accepted note survives byte-identical", () => { … });
});
```

> The sketches above use `describe`/`it`; the existing suite is flat `test()` throughout. `node:test`
> supports both, but follow the file — convert these to `test("…", …)` when writing them in.

**Mutation-prove each group.** For every one: revert the behaviour in the tool (delete the `kept`
guard; narrow it back to `state === "pass"`; drop the `--clear-note` kept-`✅` refusal; restore
`listRunFiles`' plain `basename` comparator; make `runPathFor` return `base + ".md"`
unconditionally; drop the `padStart`; drop `bug` from the payload; return the id instead of exiting
4), confirm the test goes red, restore. Record which assertion caught which
mutation in the implementation notes. A test that passes against both the fixed and the broken tool
is holding nothing.

**Doc sweep — the exact edits:**

| File | Edit |
| :--- | :--- |
| `skills/qa-next/README.md` § Operating modes | add `` `/qa-next <id>` `` and `` `/qa-next <id> --dry-run` `` rows, with the re-test / regression sentence |
| `skills/qa-next/README.md` § The owner's commands | add `--item` and `--run-path` to the cheat-sheet |
| `skills/qa-next/README.md` § Registry states | note that `✅` survives a `pass`, a `blocked` and an `n/a` re-run — only a `fail` moves it |
| `skills/qa-next/README.md` run-history paragraph | note that `ls docs/qa/runs/D.2/` now genuinely holds several files, oldest first |
| `docs/reference/commands.md` | add a `/qa-next <id>` row; rewrite the two existing rows, which still say "resolve the **story**'s ACs" and "the **story** `--next` would select" — stale since the registry was re-indexed by user function |
| `docs/reference/activation-phrases.md` | add "Re-test D.2" / "QA that function again" beside the existing phrase, which still says "the next accepted **story**" |
| `docs/reference/skill-catalog.md` | `npm run generate-catalog` — generated, never hand-edited; `npm run check:generated` guards it |
| `CHANGELOG.md` `[Unreleased]` | the argument, and the `--set pass` behaviour change with its migration line |

---

## Key Patterns and References

- **One definition, not two.** `describeRow` exists so `--item` and `--next` cannot drift; the test
  that compares the two payloads is what makes that structural rather than aspirational. The failure
  mode — two enumerations of the same thing drifting in the worst direction — is written up in
  `docs/reference/anti-patterns.md`.
- **`die()` throws, never exits.** The comment above it explains why: `process.exit()` after a write
  truncates stdout at ~64KB on a pipe. Exit 4 sets `process.exitCode` and returns, like every other
  refusal in the file.
- **`updateRow` is the only writer.** Every state change goes through it; do not add a second path
  that renders a row.
- **`command node`, never bare `node`** in anything you run by hand here.
- **The `.claude/skills → ../skills` symlink is gitignored** and has masked CI failures; move it aside
  before believing a local `npm test` green.

## Testing Approach

```bash
# the suite
npm test                       # includes evals/qa-next/unit/*.test.mjs

# by hand, against a throwaway fixture
FIX=$(mktemp -d)
command node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --item D.2 --json
command node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --item Z.9; echo $?   # 4
command node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --run-path D.2 --env lan
command node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --run-path D.2 --env lan   # -02
command node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --set D.2 pass --run runs/D.2/… --clear-note
command node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --check; echo $?      # 0

# the repo guards
npm run check:generated
npm run bundle -- --check
npx prettier --check <changed files>
```

End to end, in a consumer with a populated registry: `/qa-next D.2 --dry-run` → `/qa-next D.2` on a
fixed `❌` row (→ `🟡`, a second run file beside the first, the old bug re-linked rather than re-filed)
→ `/qa-next D.2` on an `✅` row (→ still `✅`, `Last run` updated, `(kept)` in the tool's output).
