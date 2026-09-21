# qa-next — setup & operating guide

`/qa-next` takes the next untested story on the owner's UAT tracker (`qaNext.trackerPath`, default `docs/qa/uat-tracker.md`) from `⬜ untested` to `🟡 pass` / `❌ fail` / `⏸ blocked`, with a written run record and (on fail) a filed bug. `/loop /qa-next` chains runs until a stop condition. The owner accepts with `--accept`. See [SKILL.md](SKILL.md) for the step protocol and [scripts/uat-status.mjs](scripts/uat-status.mjs) for the tracker tool.

## Why a second loop

`/develop-next` ends at `status: accepted` — the pipeline's Definition of Done. That is an agent's signature. The UAT tracker is the **owner's** signature, per story, and it is kept in a separate file precisely so the two never get confused: a story can be `accepted` by the pipeline and `❌ fail` in UAT, and both are true.

## One-time setup

1. **Config** — add to `skills-config.yaml`:
   ```yaml
   qaNext:
     baseUrl: http://<host>:<port>     # the app under test — required
     apiUrl: http://<host>:<port>      # optional, enables HTTP probes
     apiHealthPath: /health            # probed on apiUrl at preflight (default /health)
     envLabel: lan                     # goes into run file names
     personasDoc: docs/development/feature-testing-checklist.md   # test accounts + roles
   ```
2. **Surface map** — run `node .agents/skills/qa-next/scripts/uat-status.mjs --init`. The first run writes `docs/qa/uat-surfaces.json` from the template and stops; map each epic number to a surface letter (a surface = a section of your manual feature checklist), list any superseded PRD directories under `excludedPrds`, then run `--init` again. It writes one `⬜` row per accepted story.
3. **Browser automation** — the Playwright MCP tools in the session, or Playwright installed in the project. Without one, the skill stops with `no-browser`.
4. **Permission mode** — run loop sessions in **acceptEdits**. The only side effects are docs commits and bug reports; there is no merge, no deploy.
5. **Environment** — whatever `baseUrl` points at must be running, seeded, and have its feature flags on. A story whose flag is off is recorded `⏸ blocked`, not skipped silently.

## The owner's three commands

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs                 # scoreboard + next item + open-findings count
node .agents/skills/qa-next/scripts/uat-status.mjs --accept 7.5    # 🟡 → ✅ (only from 🟡)
node .agents/skills/qa-next/scripts/uat-status.mjs --check         # is the tracker telling the truth?
node .agents/skills/qa-next/scripts/uat-status.mjs --findings      # everything the loop has seen that nobody has closed
```

Read the run file before accepting — `runs/<date>-<env>-<id>.md` is the evidence; the 🟡 is only the summary.

## Findings — what a pass does not tell you

A story's verdict answers one question: did its checklist items hold. Most of what UAT actually turns up is not that — a broken link on the way to the item, a contrast defect, a toast that fires twice, a 500 on a page the story never mentions. Every run file therefore ends with a **Findings** table (where · what was observed · severity · filed as), written on passes as much as fails, and each row is filed as a bug at record time: story mode when it is about the story under test, general mode (`docs/bugs/`) when it belongs elsewhere. A row a stranger could not reproduce stays `note` — the row is the record.

`--findings` walks every run file and lists the open rows: the `note`s, plus those whose bug is not yet `closed` (`--all` includes the closed ones, `--json` for tooling). `--check` fails on a `Filed as` link that does not resolve, so the table can never claim a bug that is not there. There is no separate findings document to maintain — the list is derived from the run files, which is why it cannot drift from them.

## Operating modes

- `/qa-next` — one story.
- `/qa-next --dry-run` — which story is next, whether it has items, whether the environment answers. No writes.
- `/loop /qa-next` — continuous, one story per iteration, until a stop condition.
- Re-running after a crash resumes from the recorded phase in `.claude/state/qa-next.state.json`.

## Tracker states

| State         | Set by   | Means                                                | Counts as done |
| ------------- | -------- | ---------------------------------------------------- | :---: |
| `⬜ untested`  | init/sync | nobody has looked                                   |   |
| `🟡 pass`     | qa-next  | every item behaved as its *Expected* says            |   |
| `❌ fail`     | qa-next  | at least one item did not; a bug is linked           |   |
| `⏸ blocked`  | qa-next  | could not be exercised here; note says why; loop skips it |   |
| `✅ accepted` | **owner** | the feature is the one that was wanted              | ✅ |
| `➖ n/a`      | qa-next / owner | nothing user-observable to accept (infra)     | ✅ |

`--check` enforces: 🟡/✅/❌ carry a run link that resolves; ❌ carries a bug link that resolves; ⏸/➖ carry a note; every accepted story has exactly one row.
