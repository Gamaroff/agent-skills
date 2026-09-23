---
name: qa-next
description: "UAT loop orchestrator: selects the next untested user function from the owner's UAT registry (scripts/uat-status.mjs --next) — one row per thing a person does with the app — resolves it to checklist items (authoring them when none exist), runs the function's tagged real-stack Playwright spec when one exists, walks the rest with browser automation and HTTP probes, writes a per-run results file, records 🟡 pass / ❌ fail / ⏸ blocked, files a bug on failure, records every incidental finding in the run file's Findings table and files those too (`--findings` lists open ones), leaves an automation candidate for every pass no spec covers, commits, and reports. `--coverage` names the accepted stories no function covers. Never marks ✅ accepted — that is the owner's `--accept`. Crash-safe via a run-state file. Sibling of develop-next: that loop builds, this one verifies. Invoke with `/qa-next`, `/qa-next D.2` (re-test or regression-test one named row, any state), `/qa-next --dry-run`, or `/loop /qa-next`."
invokes: [create-bug-report]
---

# QA Next — UAT Loop Orchestrator

`/develop-next` takes a roadmap item to "merged + `status: accepted`". That acceptance is the pipeline's Definition of Done — an agent signed it. **Nobody has yet signed that the feature is the one the owner wanted.** This skill closes that gap one **user function** at a time: pick the next function nobody has looked at, exercise it end-to-end in a real environment, write down exactly what was observed, and hand the owner a one-line decision.

The queue is the **UAT registry** (`docs/qa/uat-registry.md`): one row per thing a person does with the application — "register an account", "submit a score" — stated in one sentence, grouped by surface, in the order the owner wants them exercised. Stories are the *development* unit and are referenced from each function's `Stories` cell; they are never the queue, because many stories build one function and some stories build nothing a user can see.

One invocation = one function taken from `⬜ untested` to `🟡 pass`, `❌ fail` (with a bug filed) or `⏸ blocked` (with a reason). The owner turns 🟡 into ✅ with `--accept`; this skill never does.

## When to Use This Skill

- User says `/qa-next` (one function) or `/loop /qa-next` (continuous).
- User says "QA the next function", "keep the UAT going", "what hasn't been tested yet — test it".
- `--dry-run`: report which function would be selected, its items, whether a lane spec exists and whether the environment is reachable, then stop. **Read-only.**

Not for: story-level QA inside the development pipeline (that is `/qa-story`), code review, or re-running the automated suites. This skill verifies *behaviour in an environment*, from the owner's seat.

## Arguments

Invoke as `/qa-next [id] [--dry-run]`.

| Arg | Values | Default | Meaning |
| --- | --- | --- | --- |
| `id` | a registry row id — `D.2` (case-insensitive) | the first `⬜ untested` row | Which function to exercise |
| `--dry-run` | flag | off | Report the resolved row and stop. **Read-only** |

**An explicit id ignores the row's state.** `⬜ 🟡 ❌ ⏸ ✅ ➖` are all re-runnable — that is what the argument is for: re-test a `❌` after the fix lands, as many times as it takes, and regression-test a `✅` when the code beneath it changes. "First untested" is the *default selection rule*, not an eligibility gate.

**`/loop /qa-next` stays untargeted.** A loop over a fixed id repeats one function forever; the registry is the queue.

## Three layers, one index

| Layer | Proves | Where |
| :--- | :--- | :--- |
| Unit tests | a code unit behaves | CI — not this skill's concern |
| **Real-stack E2E** (Playwright, no mocks) | *a function works end-to-end*, deterministically | the consumer's UAT lane (`qaNext.uatCommand`), specs tagged `@<function id>` |
| **UAT** (this skill) | the function is the *right* one, plus everything the spec did not encode | the registry, the surface checklists, `runs/` |

The registry row is the index all three hang off: its `Automated by` cell names the specs, its `Items` cell names the checklist, its `UAT` cell is the owner's verdict. A pass with no lane spec leaves an **automation candidate** in the run file so a later `uat-automate <id>` can turn it into a regression test.

## Configuration

Read once per run from the consumer project's `skills-config.yaml` (`qaNext:` block); every key has a default:

| Key                          | Default                                                                       | Used in |
| ---------------------------- | ----------------------------------------------------------------------------- | ------- |
| `qaNext.registryPath`        | `docs/qa/uat-registry.md`                                                     | all     |
| `qaNext.baseUrl`             | *(required)* — the portal / web app under test                                | 0, 3    |
| `qaNext.apiUrl`              | *(optional)* — the API origin, for HTTP probes                                | 0, 3    |
| `qaNext.healthPath`          | `/`                                                                           | 0       |
| `qaNext.apiHealthPath`       | `/health` — probed on `apiUrl`; an API root is usually a 404                  | 0       |
| `qaNext.envLabel`            | `local`                                                                       | 4 (run file name) |
| `qaNext.personasDoc`         | *(optional)* — doc listing test accounts + roles                              | 2, 3    |
| `qaNext.uatCommand`          | *(optional)* — runs the real-stack lane against `baseUrl`, e.g. `npm run test:e2e:uat --workspace=apps/portal --`; unset → no lane, every item is walked | 3 |
| `qaNext.uatReportDir`        | `apps/portal/playwright-report-uat` — where the lane writes `results.json`    | 3, 4    |
| `qaNext.baseBranch`          | `develop`                                                                     | 0, 5    |
| `qaNext.commit`              | `true` — commit + push the run file, registry, checklist and bugs             | 5       |
| `qaNext.maxItemsPerFunction` | `12`                                                                          | 2       |

The surface map lives beside the registry in `uat-surfaces.json` (scaffolded from `assets/uat-surfaces.template.json` on first `--init`): surfaces, epic→surface placement (for `--coverage` suggestions), `storyNa` (accepted stories with nothing to accept), `excludedPrds`, and `uatSpecPattern` (which `Automated by` paths are the lane). Tool: `node .agents/skills/qa-next/scripts/uat-status.mjs` — every command below is that script.

Apply any project-wide command conventions from the consumer project's own CLAUDE.md (a required `env` prefix for `gh`, a sequential-test-suite rule, an "always verify on host X" rule).

## Run state

`.claude/state/qa-next.state.json` — written at selection, updated after each step, deleted only in Step 6. Doubles as the single-flight lock.

```json
{ "item": "D.2", "function": "Submit a score", "surface": "D", "stories": ["7.5", "31.1"],
  "uatSpecs": ["apps/portal/e2e/smoke/play-score.smoke.spec.ts"], "lane": null, "targeted": true,
  "runFile": "<path or null>", "phase": "selected|resolved|executed|recorded|committed", "startedAt": "<iso>" }
```

`targeted` is true when the invocation named an id. A resume at `phase: selected` then re-resolves *that* id with `--item`, rather than falling back to `--next` and quietly testing a different function.

Resume on re-run: `phase: recorded` → Step 5; `executed` → Step 4; `resolved` → Step 3; `selected` → Step 2. If the registry row for `item` is no longer ⬜ and the phase is `selected`, someone else finished it — delete the state file and start over. **This applies to an untargeted run only**: under `"targeted": true` a non-⬜ row is the premise, not evidence about anyone else, so the resume re-resolves the id instead.

## Step 0 — Preflight

1. State file present → if it names a **different** item and this invocation gave an id, **HALT** `run-in-progress`: finish that run or delete the state file. Otherwise resume as above (or, under `--dry-run`, report the pending run and stop).
2. `git status --porcelain` non-empty → **HALT** `dirty-tree`. This skill commits docs; it must not sweep up someone's work.
3. Check out and fast-forward `baseBranch`.
4. Registry absent → run `--init`; if that scaffolds `uat-surfaces.json` and stops, **STOP** `surfaces-unmapped` and tell the owner to fill it in. If `--init` wrote the skeleton, **STOP** `registry-empty` — the rows are the owner's to author (one per user function; see README "Authoring the registry"). Registry present → `--check`; a non-zero `--check` is **HALT** `registry-invalid` — never test on top of a registry that is lying. Then `--coverage`: report how many accepted stories no function covers (non-fatal — the owner adds rows or `storyNa` entries in their own time).
5. Environment: `curl -fsS --max-time 10 "$baseUrl$healthPath"` and, if `apiUrl` is set, `curl -fsS --max-time 10 "$apiUrl$apiHealthPath"` — never the bare API origin, whose root is a 404 on most frameworks and would read as down while the service is up. Either unreachable → **STOP** `env-unreachable`. Under `--dry-run` this is reported, not fatal.
6. Browser automation: prefer the Playwright MCP tools when the session exposes them (`browser_navigate` / `browser_snapshot` / `browser_click` …); otherwise the project's own Playwright (`npx playwright` with a throwaway spec under the OS temp dir). Neither available → **STOP** `no-browser`.

## Step 1 — Select or resolve

**No id** — the queue picks:

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --next --json
```

Exit 3 → **STOP** `registry-complete` (print the scoreboard).

**An id** — resolve it, whatever state it is in:

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --item D.2 --json
```

Exit 4 → **STOP** `unknown-item` — the id is not a row; print the scoreboard so the owner can see the ids that are.

Either way, write the state file (`phase: selected`, `targeted` set accordingly) and continue with the JSON, which is **identical for both commands**: `id`, `function`, `what`, `entry`, `surface`, `stories[]` (each with `path`, `storyType`), `items`, `automatedBy[]`, `uatSpecs[]` (the subset matching `uatSpecPattern`), `checklists[]` (the `qa.*.md` files that already hold this function's items), plus `state` (the row's current verdict), `lastRun` (the link in its `Last run` cell, or `null`), `priorRuns` (this function's earlier run files, oldest first), `notes` (the `Notes / bug` cell verbatim) and `bug` (the path of the newest bug link that cell carries, `#fragment` removed — exactly the path `--check` verified exists — or `null`). A non-empty `priorRuns` means this is a re-run, and Step 4 says so in the run file.

## Step 2 — Resolve the function to checklist items

Read the registry row (*What it does*, *Entry* — including any `flag:`), then every story in `stories[]` for its acceptance criteria, and `personasDoc` for which account exercises this surface. `docs/site-map.md` § Surface detail (or the consumer's equivalent) names the components on the `Entry` route.

**Two early exits, both recorded and committed like any other outcome:**

- **n/a** — only when the function is reachable in **no** environment (it was retired, or it exists only as a seam). `--set <id> na --note "<why>"`. A function the owner could exercise anywhere is never n/a — that is what `⏸ blocked` is for.
- **blocked** — the environment cannot provide what the function needs: its `Entry` flag is off (build-time flags cannot be toggled at runtime), a real third-party credential, an email inbox, a second device. `--set <id> blocked --note "<what is missing, and where it can be tested>"`. The loop skips ⏸ rows; the owner clears them.

Otherwise, items. If `items` is non-empty, read them from `checklists[]`. If it is empty (the usual case on a fresh registry) **author them**:

- Open (or create from `assets/checklist.template.md`) the surface checklist `qa.<letter>.<slug>.md` beside the registry.
- Append `## <id> — <Function>` with the items, in the item format (**Persona · Steps · Expected · Automated by · Result**), numbered `<letter>.<n>.<k>`. One item per distinct observable outcome: the happy path, each documented refusal or edge from the stories' ACs, and the signed-out / wrong-role case when the function has one. *Expected* must be an observation a stranger could confirm (a status code, a visible string, an element state) — never "works correctly". *Automated by* names the spec that already covers it, or `manual only`; look before writing `manual only` — the lane specs' test titles are the first place.
- Cap at `maxItemsPerFunction`; if the function needs more, it is really two functions — say so in the report and author only the first group.
- `--items <id> "<letter>.<n>.1–<k>"`.

Update the state file (`phase: resolved`).

## Step 3 — Execute

The run file's path is **not composed here**. Ask the tool for it once, before executing:

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --run-path <id> --env <envLabel>
```

It creates `runs/<id>/` and prints the next free file: `<date>-<env>.md`, then `-02`, `-03`. A filename the tool computes cannot be a filename that collides — and a collision here would silently take the previous run's `## Findings` rows with it, which `--findings` is derived from. Keep the printed path in the state file as `runFile`.

**3a — the lane, when `uatSpecs` is non-empty and `uatCommand` is set.** From the repo root:

```bash
<uatCommand> --grep "@<id>\b"
```

Record the exit code and copy `uatReportDir` (with its `results.json`) into the evidence directory. Every test in `results.json` maps to the item(s) whose *Automated by* names its spec: a passed test makes those items `pass` with evidence `lane: <test title>`; a failed test makes them `fail` with the assertion message as *Observed*. A lane that lists **no** test for the tag (the spec exists but is not tagged, or `--grep` matched nothing) is not a pass — it is a finding against the harness, and every item is walked. Store `{exit, report}` in the state file as `lane`.

**3b — the walkthrough.** For every item the lane did not cover (all of them when there was no lane, or on a function's first pass — the owner wants to have seen it once), in order, against `baseUrl` / `apiUrl` with the item's persona:

- UI steps through the browser tool; capture a snapshot (accessibility tree) or screenshot at the *Expected* moment. API steps through `curl -sS -o body -w '%{http_code}'`.
- Record **observed**, not interpreted: the status code you got, the text you saw, the element that was or was not there.
- One attempt per item. A flaky pass is not a pass — if a second attempt would be needed, the item's result is `fail` with the first observation, and the flake is the finding.
- An item you could not execute (a control not found, a persona that cannot log in) is `blocked` for that item, with the reason.
- Anything else you notice along the way — a defect on this function that no item covers, a broken control on another surface, a contrast or copy error, a fault in the environment or in this harness — goes on a **findings list** as you go: where (route, element or endpoint), what was observed, severity (`Blocker` / `Major` / `Minor` / `Trivial`). It never changes an item's result and it is never dropped because the item passed.

**3c — the automation candidate.** When the function has no lane spec and the walkthrough passed, keep the selectors, inputs and assertions you actually used — they become the run file's *Automation candidate* block, the input to `uat-automate <id>`. Nothing is authored into the codebase here.

Function result: **pass** only if every item passed; **fail** if any item failed; **blocked** if none failed but some could not be executed (list them in the note). Do not stop at the first failure — the owner wants the whole picture. Findings do not affect the result: a function with three findings and no failed item is still **pass**.

Evidence (screenshots, response bodies, the lane report) goes under `.claude/state/qa-next/<id>/<run-file-basename>/` — the run file's own name without `.md`, so a same-day re-run's screenshots do not overwrite the first run's either. Never into the repo. The run file names the paths.

Update the state file (`phase: executed`).

## Step 4 — Record

1. Write the run file at the path Step 3 obtained from `--run-path` (the tool has already created `runs/<id>/` — one directory per function, so a function's whole history is one listing) from `assets/run.template.md`: header (function, the **Run** row — `<n>th run · previous: <link to the previous run file, relative to this one>`, or `1st run` when `priorRuns` was empty — what it does, stories, environment, commit under test, personas, tester = `qa-next`), the **Automated run** block (command, exit code, report path, one line per test — or `_None_`), one block per item with its observed result and evidence, the verdict, the **Findings** table (one row per Step 3 finding, `_None._` when there were none — written on every run, pass or fail; it is the only place an observation that failed no item survives), and the **Automation candidate** block (`_None — covered by <spec>_` when the lane ran).
2. On **fail**: invoke `/create-bug-report` in **story mode** against the story in `stories[]` whose AC the failed item exercises (the first story when it is unclear; **general mode** when the function's stories are all `storyNa`-grade infra), severity from the worst failed item, reproduction steps copied verbatim from the failing item(s). Capture the bug file path.

   **A repeat failure reuses the open bug.** The payload's `bug` field is the path of the bug the row already links, the same path `--check` verified (`null` when there is none) — read it there; never re-parse the registry. When it is non-null and that bug is not closed, append a dated re-test section to it (what was run, what was observed, which items still fail) and link the same bug again. File a **new** bug only when there is none, or when the existing one is closed — a closed bug failing again is a new fact and deserves its own record. Fixing then re-testing is the main reason the `id` argument exists; filing bug #2, #3 and #4 against one defect is its obvious first-order failure.
3. File the findings, independently of the verdict. For each row: **story mode** against the story it concerns when one of this function's stories owns it; **general mode** (`docs/bugs/`, no parent) when it belongs to another surface, to the environment or to this harness — never file a foreign defect against the story you happened to be testing. Severity as recorded; reproduction from the row. File only what a stranger could reproduce from the row alone; otherwise `Filed as` stays `note` and the row itself is the record. Put each bug's link (relative to the run file) in its row's `Filed as` cell. A finding that matches an **open** finding on this function from an earlier run (`--findings --all --json`, matched on *Where* + *What was observed*) reuses that bug's link in its `Filed as` cell instead of filing a duplicate.
4. Registry:
   - pass → `--set <id> pass --run runs/<id>/<file>.md`
   - fail → `--set <id> fail --run runs/<id>/<file>.md --bug <bug path>`
   - blocked → `--set <id> blocked --run runs/<id>/<file>.md --note "<items and reasons>"`

   The note flag is **per verdict**, not a blanket "always pass one":

   | Verdict | Row before | Note flag | Why |
   | :--- | :--- | :--- | :--- |
   | `fail` | any | `--bug` (plus `--note` when there is more to say) | `--bug` is mandatory; `--clear-note` is refused beside it |
   | `blocked` / `na` | any | `--note` | mandatory already |
   | `pass` | `⬜` `🟡` `❌` `⏸` `➖` | `--clear-note` | drops the previous verdict's bug link, which `🟡` does not require and must not keep |
   | `pass` | `✅` | neither | the note cell is appended to, never replaced, so nothing needs dropping; `--clear-note` is refused here — clearing is the one thing append cannot express |

   A `pass`, `blocked` or `na` against an `✅` row **leaves `✅`**, updates `Last run` **when the verdict carried one** (`--run` is required for `pass` and `fail` only), and **appends** whatever the verdict has to say to `Notes / bug` rather than replacing it — so the owner's `accepted <date>` sign-off is never lost, whichever flag wrote the cell. The tool prints `(kept)`. The skill still never *writes* `✅`; it only declines to remove one on evidence that is not against it. Two things move it, and only two: a `fail`, which moves it from any state, and an explicit `--set <id> untested` — the owner's deliberate demotion, which is not a verdict at all and which this skill never sends.
5. `--check` must exit 0. It also proves every `Filed as` link in every run file resolves. If it does not, fix what it names — never proceed past a red check.

Update the state file (`phase: recorded`).

## Step 5 — Commit

Only if `qaNext.commit` is true. Stage **only** the run file, the registry, the surface checklist and the bug reports — the function's and any filed from the Findings table, plus `docs/bugs/bug-registry.md` when a general bug was filed (never `git add -A`, never `uat-surfaces.json` — that file is the owner's), then:

```
qa(uat): <id> <pass|fail|blocked> — <Function>
```

For a targeted re-run (`priorRuns` was non-empty):

```
qa(uat): <id> re-run <pass|fail|blocked> — <Function>
```

Push to `baseBranch`. Apply the consumer project's commit-trailer rules. Update the state file (`phase: committed`).

## Step 6 — Report and stop

Delete the state file. Print: the function, its verdict, the run file — with which run of this function it is and a link to the previous one when there was one — the bug (if any), whether the lane ran and how it went, this run's findings with what each was filed as, the scoreboard (`uat-status.mjs` with no flags — it ends with the uncovered-story and open-findings counts), and — for a 🟡 — the exact command the owner runs to accept it:

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --accept <id> --note "<optional>"
```

For a 🟡 with no lane spec, also print the hand-off: `uat-automate <id>` (or, until that skill exists in the consumer, "the run file's Automation candidate block is the spec's brief; when the spec lands, `--automated <id> "<path>"`").

## Stop conditions

| Condition           | Meaning                                                | What the owner does                          |
| ------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `registry-complete` | No ⬜ rows left                                         | Accept the 🟡s, clear the ⏸s, close the ❌s   |
| `registry-empty`    | `--init` just wrote the skeleton                       | Author one row per user function, re-run     |
| `surfaces-unmapped` | `uat-surfaces.json` was just scaffolded                | Fill in the surfaces, re-run                 |
| `registry-invalid`  | `--check` failed before selection                      | Fix the row it names                          |
| `env-unreachable`   | `baseUrl` / `apiUrl` did not answer                    | Start the environment, re-run                |
| `no-browser`        | No browser automation available in this session        | Enable the Playwright MCP tools or install Playwright |
| `dirty-tree`        | Uncommitted changes on the base branch                 | Commit or stash them                          |
| `unknown-item`      | The id given is not a registry row                     | Check it against the scoreboard, re-run       |
| `run-in-progress`   | A state file names a different function                | Finish that run, or delete `.claude/state/qa-next.state.json` |
| bug filing failed   | `/create-bug-report` did not return a path              | The run file is written; file the bug by hand, then `--set … fail --bug …` (for a finding: file it, then put the link in its `Filed as` cell) |

Every stop leaves the registry consistent (`--check` green) — a stop is never a half-recorded function.

## What this skill never does

- Mark `✅ accepted`. Ever. Acceptance is a human judgement that the feature is the *right* feature; the skill only reports whether it *behaves*.
- Change a story's `status`. A UAT failure is a bug against an accepted story, not a regression of its lifecycle.
- Edit product code — or test code. A pass with no spec leaves an automation candidate; writing the spec is `uat-automate`'s job, through a branch and a PR like any other code.
- Add, remove or reorder registry rows. The registry is the owner's; the tool fills cells.
- Retry an item until it passes.
- Mark n/a on anything a user could exercise somewhere.
- Drop an observation because it failed no item. It goes in the run file's Findings table, filed or `note`.
- Overwrite a previous run file. The path comes from `--run-path`, which returns the next free one.
- Re-litigate an `✅` on a pass. The only things that move an accepted row are a failure and the owner's explicit `--set <id> untested` demotion — and this skill never sends the latter.

## Running as a loop

`/loop /qa-next` with no interval: one function per iteration, self-paced. It ends at any stop condition. Because 🟡 rows accumulate without owner action, check the scoreboard between sessions — a loop that has produced forty 🟡s and no ✅s is waiting on you, not on itself. The same goes for findings (`--findings` is the consolidated list of what the loop has seen and nobody has closed) and for coverage (`--coverage` is the list of shipped stories the registry does not yet know about).

The registry is the only queue. There is nothing to "start" or "reset": the next ⬜ row is always the next function, and the owner keeps the queue current by adding a row when `--coverage` names a story that built something new.
