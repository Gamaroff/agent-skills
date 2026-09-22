# qa-next — setup & operating guide

`/qa-next` takes the next untested **user function** on the owner's UAT registry (`qaNext.registryPath`, default `docs/qa/uat-registry.md`) from `⬜ untested` to `🟡 pass` / `❌ fail` / `⏸ blocked`, with a written run record and (on fail) a filed bug. `/loop /qa-next` chains runs until a stop condition. The owner accepts with `--accept`. See [SKILL.md](SKILL.md) for the step protocol and [scripts/uat-status.mjs](scripts/uat-status.mjs) for the registry tool.

## Why a registry of functions, not a list of stories

`/develop-next` ends at `status: accepted` — the pipeline's Definition of Done. That is an agent's signature. The UAT registry is the **owner's** signature, and it is kept in a separate file precisely so the two never get confused: a story can be `accepted` by the pipeline and the function it built can be `❌ fail` in UAT, and both are true.

It is indexed by **function** — "register an account", "publish a game", "submit a score" — because that is the unit the owner accepts. Stories are the unit the pipeline builds: many stories make one function, and some stories (scaffolding, gateways, CI) make nothing a person can see. Each row names the stories behind it, and `--coverage` lists every accepted story no row names, so a shipped feature cannot silently miss the registry.

## One-time setup

1. **Config** — add to `skills-config.yaml`:
   ```yaml
   qaNext:
     baseUrl: http://<host>:<port>     # the app under test — required
     apiUrl: http://<host>:<port>      # optional, enables HTTP probes
     apiHealthPath: /health            # probed on apiUrl at preflight (default /health)
     envLabel: lan                     # goes into run file names
     personasDoc: docs/development/feature-testing-checklist.md   # test accounts + roles
     uatCommand: npm run test:e2e:uat --workspace=apps/portal --  # optional: the real-stack lane
     uatReportDir: apps/portal/playwright-report-uat              # where that lane writes results.json
   ```
2. **Surface map** — run `node .agents/skills/qa-next/scripts/uat-status.mjs --init`. The first run writes `docs/qa/uat-surfaces.json` from the template and stops; name your surfaces (a surface = an area of the app a user recognises: shell, catalog, studio, play, profile …), map each epic number to a surface letter, list superseded PRD directories under `excludedPrds`, then run `--init` again. It writes the registry **skeleton** — one empty section per surface — and stops again.
3. **Author the registry** — see the next section. This is the owner's job and the one step that is not scaffolded: the rows are the product, as the owner sees it.
4. **The lane** (optional but the point of the exercise) — a Playwright config that runs the project's *real-stack* specs against `baseUrl` with no mocks and no `webServer`, an npm script for it (`uatCommand`), a `json` reporter writing `results.json` into `uatReportDir`, and each spec tagged with the function ids it proves (`test('…', { tag: ['@D.2'] }, …)`). `uatSpecPattern` in `uat-surfaces.json` says which `Automated by` paths belong to that lane.
5. **Browser automation** — the Playwright MCP tools in the session, or Playwright installed in the project. Without one, the skill stops with `no-browser`.
6. **Permission mode** — run loop sessions in **acceptEdits**. The only side effects are docs commits and bug reports; there is no merge, no deploy, no test code written.
7. **Environment** — whatever `baseUrl` points at must be running, seeded, and have its feature flags on. A function whose flag is off is recorded `⏸ blocked`, not skipped silently.

## Authoring the registry

One row per thing a person does with the application, in the order you want them exercised. Sixty to ninety rows is typical for a mid-sized product; a row that needs more than a dozen checklist items is two rows.

| Cell | Write |
| :--- | :--- |
| `#` | `<surface letter>.<n>` — the id every checklist item, spec tag and run file uses |
| **Function** | a verb phrase — *Register an account*, *Publish a game*, not *Registration form* |
| **What it does** | one sentence, actor first — *A visitor creates an account with email and password and lands on Home signed in.* |
| **Entry** | the route, plus `· flag: <NAME>` when a flag gates it |
| **Stories** | the story ids that built it, ` · `-separated (links optional; ids are what the tool reads) |
| **Items** | leave empty — `/qa-next` authors the checklist and fills this with `--items` |
| **Automated by** | the real-stack specs that already exercise it, or `manual only`; `/qa-next` and `uat-automate` update it with `--automated` |
| **UAT** / **Last run** / **Notes / bug** | `⬜ untested` and empty — the tool owns these |

Seeds worth mining: a manual feature checklist, the route table or site map, the epic list. Every accepted story should end up in some row's `Stories` or in `uat-surfaces.json` `storyNa` with a one-line reason (`"7.1": "monorepo scaffolding — nothing observable"`). `--coverage` tells you which are still missing and suggests a surface from the epic map.

## The owner's commands

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs                 # scoreboard + next function + uncovered-story and open-findings counts
node .agents/skills/qa-next/scripts/uat-status.mjs --accept D.2    # 🟡 → ✅ (only from 🟡)
node .agents/skills/qa-next/scripts/uat-status.mjs --check         # is the registry telling the truth?
node .agents/skills/qa-next/scripts/uat-status.mjs --coverage      # accepted stories no function covers
node .agents/skills/qa-next/scripts/uat-status.mjs --findings      # everything the loop has seen that nobody has closed
node .agents/skills/qa-next/scripts/uat-status.mjs --item D.2      # one named row, whatever its state (exit 4 if there is no such row)
node .agents/skills/qa-next/scripts/uat-status.mjs --run-path D.2 --env lan   # the next free run file for D.2 (the skill asks for this; you rarely need to)
node .agents/skills/qa-next/scripts/uat-status.mjs --automated D.2 "apps/portal/e2e/uat/D.2.uat.spec.ts"   # after a spec lands
```

Read the run file before accepting — `runs/<id>/<date>-<env>.md` is the evidence; the 🟡 is only the summary. One directory per function, so `ls docs/qa/runs/D.2/` is that function's whole UAT history, oldest first — and with `/qa-next <id>` it genuinely holds several files: a second run on the same day is written as `<date>-<env>-02.md`, never over the first, because the first run's Findings rows are what `--findings` is derived from. The unsuffixed file is run 1 and sorts first.

## Three layers, and how a manual pass becomes a regression test

| Layer | Proves | Runs |
| :--- | :--- | :--- |
| Unit tests | a code unit behaves | CI, every PR |
| Real-stack E2E (the lane) | *a function works end-to-end*, deterministically | `/qa-next` Step 3a, tagged by function id; CI nightly if you wire it |
| UAT (`/qa-next` Step 3b) | the function is the *right* one, plus what the spec did not encode | once per function, then again whenever the owner asks |

When a function passes with no lane spec, the run file's **Automation candidate** block records the persona, the steps as executed with their selectors, and the assertions — a complete brief for a Playwright spec. `uat-automate <id>` (a separate skill: branch → spec from the candidate → green against the environment → `--automated` → PR) turns it into a regression test, so each UAT pass compounds. `/qa-next` itself never writes test code; that keeps the loop a verdict-recording loop, and keeps test code on the PR path with everything else.

## Findings — what a pass does not tell you

A function's verdict answers one question: did its checklist items hold. Most of what UAT actually turns up is not that — a broken link on the way to the item, a contrast defect, a toast that fires twice, a 500 on a page the function never mentions. Every run file therefore ends with a **Findings** table (where · what was observed · severity · filed as), written on passes as much as fails, and each row is filed as a bug at record time: story mode when one of the function's stories owns it, general mode (`docs/bugs/`) when it belongs elsewhere. A row a stranger could not reproduce stays `note` — the row is the record.

`--findings` walks every run file and lists the open rows: the `note`s, plus those whose bug is not yet `closed` (`--all` includes the closed ones, `--json` for tooling). `--check` fails on a `Filed as` link that does not resolve, so the table can never claim a bug that is not there. There is no separate findings document to maintain — the list is derived from the run files, which is why it cannot drift from them.

## Operating modes

- `/qa-next` — one function: the first `⬜ untested` row.
- `/qa-next <id>` — **that** function, whatever state its row is in. Re-test a `❌` after the fix lands, as many times as it takes; regression-test a `✅` when the code beneath it changes. Each run is a new file in `runs/<id>/`, and a repeat failure re-links the open bug rather than filing a second one.
- `/qa-next <id> --dry-run` — resolve that row and stop. No writes.
- `/qa-next --dry-run` — which function is next, whether it has items and a lane spec, whether the environment answers. No writes.
- `/loop /qa-next` — continuous, one function per iteration, until a stop condition. Always untargeted: a loop over a fixed id would repeat one function forever.
- Re-running after a crash resumes from the recorded phase in `.claude/state/qa-next.state.json`.

## Registry states

| State         | Set by   | Means                                                | Counts as done |
| ------------- | -------- | ---------------------------------------------------- | :---: |
| `⬜ untested`  | owner (on authoring) | nobody has looked                        |   |
| `🟡 pass`     | qa-next  | every item behaved as its *Expected* says            |   |
| `❌ fail`     | qa-next  | at least one item did not; a bug is linked           |   |
| `⏸ blocked`  | qa-next  | could not be exercised here; note says why; loop skips it |   |
| `✅ accepted` | **owner** | the feature is the one that was wanted              | ✅ |
| `➖ n/a`      | qa-next / owner | reachable in no environment (retired, or a seam only) | ✅ |

`✅` is the owner's, and a re-run does not take it back: a `pass`, a `⏸ blocked` or a `➖ n/a` against an accepted row leaves `✅` in place, updates **Last run** when the verdict carried one (`--run` is required for `pass` and `fail` only), and **appends** whatever the verdict has to say to **Notes / bug** rather than replacing it — so the `accepted <date>` sign-off is never lost (the tool prints `(kept)`). `--clear-note` is refused on that row for the same reason. Two things move an accepted row, and only two: a `❌ fail`, from any state, and the owner's explicit `--set <id> untested --note "<why>"` demotion.

`--check` enforces: 🟡/✅/❌ carry a run link that resolves; ❌ carries a bug link that resolves; ⏸/➖ carry a note; every row id matches its section letter and its header's cell count; every `Stories` id is a real story. Uncovered accepted stories and referenced non-accepted stories are warnings, not errors — the loop keeps running while the owner catches the registry up.
