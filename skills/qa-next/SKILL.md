---
name: qa-next
description: "UAT loop orchestrator: deterministically selects the next untested story from the owner's UAT tracker (via scripts/uat-status.mjs --next), resolves its acceptance criteria to executable checklist items (authoring them into the surface checklist when none exist), executes them against the configured test environment with browser automation and HTTP probes, writes a per-run results file, records 🟡 pass / ❌ fail / ⏸ blocked in the tracker, files a bug on failure, commits, and reports. It never marks ✅ accepted — that is the owner's command (`--accept`). Crash-safe via a run-state file. Sibling of develop-next: that loop builds the roadmap, this one verifies what it built. Invoke with `/qa-next`, `/qa-next --dry-run`, or `/loop /qa-next`."
invokes: [create-bug-report]
---

# QA Next — UAT Loop Orchestrator

`/develop-next` takes a roadmap item to "merged + `status: accepted`". That acceptance is the pipeline's Definition of Done — an agent signed it. **Nobody has yet signed that the feature is the one the owner wanted.** This skill closes that gap one story at a time: pick the next story nobody has looked at, exercise it in a real environment, write down exactly what was observed, and hand the owner a one-line decision.

One invocation = one story taken from `⬜ untested` to `🟡 pass`, `❌ fail` (with a bug filed) or `⏸ blocked` (with a reason). The owner turns 🟡 into ✅ with `--accept`; this skill never does.

## When to Use This Skill

- User says `/qa-next` (one story) or `/loop /qa-next` (continuous).
- User says "QA the next story", "keep the UAT going", "what hasn't been tested yet — test it".
- `--dry-run`: report which story would be selected, its checklist items and whether the environment is reachable, then stop. **Read-only.**

Not for: story-level QA inside the development pipeline (that is `/qa-story`), code review, or re-running the automated suites. This skill verifies *behaviour in an environment*, from the owner's seat.

## Configuration

Read once per run from the consumer project's `skills-config.yaml` (`qaNext:` block); every key has a default:

| Key                     | Default                                            | Used in |
| ----------------------- | -------------------------------------------------- | ------- |
| `qaNext.trackerPath`    | `docs/qa/uat-tracker.md`                           | all     |
| `qaNext.baseUrl`        | *(required)* — the portal / web app under test     | 0, 3    |
| `qaNext.apiUrl`         | *(optional)* — the API origin, for HTTP probes     | 0, 3    |
| `qaNext.healthPath`     | `/`                                                | 0       |
| `qaNext.envLabel`       | `local`                                            | 4 (run file name) |
| `qaNext.personasDoc`    | *(optional)* — doc listing test accounts + roles   | 2, 3    |
| `qaNext.baseBranch`     | `develop`                                          | 0, 5    |
| `qaNext.commit`         | `true` — commit + push the run file, tracker and bug | 5     |
| `qaNext.maxItemsPerStory` | `12`                                             | 2       |

The story→surface placement lives beside the tracker in `uat-surfaces.json` (scaffolded from `assets/uat-surfaces.template.json` on first `--init`). Tool: `node .agents/skills/qa-next/scripts/uat-status.mjs` — every command below is that script.

Apply any project-wide command conventions from the consumer project's own CLAUDE.md (a required `env` prefix for `gh`, a sequential-test-suite rule, an "always verify on host X" rule).

## Run state

`.claude/state/qa-next.state.json` — written at selection, updated after each step, deleted only in Step 6. Doubles as the single-flight lock.

```json
{ "item": "7.5", "storyPath": "<path>", "surface": "D", "runFile": "<path or null>",
  "phase": "selected|resolved|executed|recorded|committed", "startedAt": "<iso>" }
```

Resume on re-run: `phase: recorded` → Step 5; `executed` → Step 4; `resolved` → Step 3; `selected` → Step 2. If the tracker row for `item` is no longer ⬜ and the phase is `selected`, someone else finished it — delete the state file and start over.

## Step 0 — Preflight

1. State file present → resume as above (or, under `--dry-run`, report the pending run and stop).
2. `git status --porcelain` non-empty → **HALT** `dirty-tree`. This skill commits docs; it must not sweep up someone's work.
3. Check out and fast-forward `baseBranch`.
4. Tracker absent → run `--init`; if that scaffolds `uat-surfaces.json` and stops, **STOP** `surfaces-unmapped` and tell the owner to fill it in. Tracker present → run `--sync` (append rows for newly accepted stories), then `--check`; a non-zero `--check` is **HALT** `tracker-invalid` — never test on top of a tracker that is lying.
5. Environment: `curl -fsS --max-time 10 "$baseUrl$healthPath"` and, if set, `apiUrl`. Either unreachable → **STOP** `env-unreachable`. Under `--dry-run` this is reported, not fatal.
6. Browser automation: prefer the Playwright MCP tools when the session exposes them (`browser_navigate` / `browser_snapshot` / `browser_click` …); otherwise the project's own Playwright (`npx playwright` with a throwaway spec under the OS temp dir). Neither available → **STOP** `no-browser`.

## Step 1 — Select

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --next --json
```

Exit 3 → **STOP** `tracker-complete` (print the scoreboard). Otherwise write the state file (`phase: selected`) and continue with the JSON: `id`, `title`, `surface`, `storyPath`, `storyType`, `verifiedBy`, `checklist`.

## Step 2 — Resolve the story to checklist items

Read the story file: acceptance criteria, the FR it cites, any feature flag it names, `story_type`. Read `personasDoc` for which account exercises this surface.

**Two early exits, both recorded and committed like any other outcome:**

- **n/a** — only when `storyType` is `infra` **and** no AC describes anything observable through the UI or API (a scaffolding, CI or gateway story). `--set <id> na --note "<why>"`. Anything the owner could see is not n/a, however technical the story looks.
- **blocked** — the story needs something the environment cannot provide: a feature flag that is off (build-time flags cannot be toggled at runtime), a real third-party credential, an email inbox, a second device. `--set <id> blocked --note "<what is missing, and where it can be tested>"`. The loop skips ⏸ rows; the owner clears them.

Otherwise, items. If `verifiedBy` is non-empty, read those items from `checklist`. If it is empty (the usual case on a fresh tracker) **author them**:

- Open (or create from `assets/checklist.template.md`) the surface checklist `qa.<letter>.<slug>.md` beside the tracker.
- Append `## <id> — <title>` with one item per AC, in the item format (**Persona · Steps · Expected · Automated by · Result**), numbered `<letter>.<id>.<n>`. *Expected* must be an observation a stranger could confirm (a status code, a visible string, an element state) — never "works correctly". *Automated by* names the spec that already covers it, or `manual only`; look before writing `manual only`.
- Cap at `maxItemsPerStory`; if the ACs need more, the story is too big for one iteration — split the items across the ACs' natural groups and note it.
- `--verified <id> "<letter>.<id>.1–<n>"`.

Update the state file (`phase: resolved`).

## Step 3 — Execute

For each item, in order, against `baseUrl` / `apiUrl` with the item's persona:

- UI steps through the browser tool; capture a snapshot (accessibility tree) or screenshot at the *Expected* moment. API steps through `curl -sS -o body -w '%{http_code}'`.
- Record **observed**, not interpreted: the status code you got, the text you saw, the element that was or was not there.
- One attempt per item. A flaky pass is not a pass — if a second attempt would be needed, the item's result is `fail` with the first observation, and the flake is the finding.
- An item you could not execute (a control not found, a persona that cannot log in) is `blocked` for that item, with the reason.

Story result: **pass** only if every item passed; **fail** if any item failed; **blocked** if none failed but some could not be executed (list them in the note). Do not stop at the first failure — the owner wants the whole picture.

Evidence (screenshots, response bodies) goes under `.claude/state/qa-next/<date>-<envLabel>-<id>/` — never into the repo. The run file names the paths.

Update the state file (`phase: executed`).

## Step 4 — Record

1. Write `runs/<date>-<envLabel>-<id>.md` beside the tracker from `assets/run.template.md`: header (story, environment, commit under test, persona, tester = `qa-next`), then one block per item with its observed result and evidence path, then the story verdict.
2. On **fail**: invoke `/create-bug-report` in **story mode** against `storyPath`, severity from the worst failed item, reproduction steps copied verbatim from the failing item(s). Capture the bug file path.
3. Tracker:
   - pass → `--set <id> pass --run runs/<file>.md`
   - fail → `--set <id> fail --run runs/<file>.md --bug <bug path>`
   - blocked → `--set <id> blocked --run runs/<file>.md --note "<items and reasons>"`
4. `--check` must exit 0. If it does not, fix what it names — never proceed past a red check.

Update the state file (`phase: recorded`).

## Step 5 — Commit

Only if `qaNext.commit` is true. Stage **only** the run file, the tracker, the surface checklist and the bug report (never `git add -A`), then:

```
qa(uat): <id> <pass|fail|blocked> — <title>
```

Push to `baseBranch`. Apply the consumer project's commit-trailer rules. Update the state file (`phase: committed`).

## Step 6 — Report and stop

Delete the state file. Print: the story, its verdict, the run file, the bug (if any), the scoreboard (`uat-status.mjs` with no flags), and — for a 🟡 — the exact command the owner runs to accept it:

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --accept <id> --note "<optional>"
```

## Stop conditions

| Condition           | Meaning                                                | What the owner does                          |
| ------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `tracker-complete`  | No ⬜ rows left                                         | Accept the 🟡s, clear the ⏸s, close the ❌s   |
| `surfaces-unmapped` | `uat-surfaces.json` was just scaffolded                | Fill in the epic → surface map, re-run       |
| `tracker-invalid`   | `--check` failed before selection                      | Fix the row it names                          |
| `env-unreachable`   | `baseUrl` / `apiUrl` did not answer                    | Start the environment, re-run                |
| `no-browser`        | No browser automation available in this session        | Enable the Playwright MCP tools or install Playwright |
| `dirty-tree`        | Uncommitted changes on the base branch                 | Commit or stash them                          |
| bug filing failed   | `/create-bug-report` did not return a path              | The run file is written; file the bug by hand, then `--set … fail --bug …` |

Every stop leaves the tracker consistent (`--check` green) — a stop is never a half-recorded story.

## What this skill never does

- Mark `✅ accepted`. Ever. Acceptance is a human judgement that the feature is the *right* feature; the skill only reports whether it *behaves*.
- Change a story's `status`. A UAT failure is a bug against an accepted story, not a regression of its lifecycle.
- Edit product code, or "quickly fix" what it finds. Findings go in the bug.
- Retry an item until it passes.
- Mark n/a on anything a user could observe.

## Running as a loop

`/loop /qa-next` with no interval: one story per iteration, self-paced. It ends at any stop condition. Because 🟡 rows accumulate without owner action, check the scoreboard between sessions — a loop that has produced forty 🟡s and no ✅s is waiting on you, not on itself.

The tracker is the only queue. There is nothing to "start" or "reset": the next ⬜ row is always the next item, and `--sync` in preflight keeps the queue current as `/develop-next` lands new stories.
