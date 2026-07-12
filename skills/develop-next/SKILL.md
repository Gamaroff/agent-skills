---
name: develop-next
description: 'Roadmap orchestrator: deterministically selects the next unblocked item from the project completion roadmap (via scripts/select-next.mjs), runs its named pipeline (/develop-story or /develop-task) fully autonomously (Upfront Setup auto-answered with the recommended options), merges the green PR (story→epic; epic→develop when the epic completes), ticks the roadmap + Change Log, and reports. Crash-safe via a run-state file; re-running resumes where the last run stopped. Stops at epic boundaries, manual/blocked items, planning gaps (/create-* rows), or any pipeline HALT. Invoke with `/develop-next`, `/develop-next --dry-run` (read-only selection preview), or wrap in `/loop /develop-next` for continuous runs.'
---

# Develop Next — Roadmap Loop Orchestrator

Closes the three manual gaps in the roadmap workflow: **item selection**, the pipeline's **Upfront Setup prompt**, and **PR merging**. One invocation = one roadmap item taken from "next outstanding" to "merged + ticked". Everything else (branching, review, develop, QA loop, finalise) is delegated unchanged to `/develop-story` / `/develop-task`.

Policy baseline (user-ratified 2026-07-11): auto-merge everything green; auto-answer routine questions with the recommended option and log them; stop at epic boundaries, `manual` items, and planning gaps; hard HALTs always stop the run.

## When to Use This Skill

- User says `/develop-next` (one item) or `/loop /develop-next` (continuous).
- User says "do the next roadmap item", "keep the roadmap rolling", "what's next — build it".
- `--dry-run`: report which item would be selected and why, then stop. **Read-only** — no checkout, no pull, no state file, no pipeline actions.

## Configuration

Read once per run from the consumer project's `skills-config.yaml` (`developNext:` block); every key has a default:

| Key | Default | Used in |
|---|---|---|
| `developNext.roadmapPath` | `docs/development/project-completion-roadmap.md` | Steps 1, 3, 4 |
| `developNext.baseBranch` | `develop` | Steps 0, 3, 4 |
| `developNext.qualityGateCommand` | `npm test` | Step 3 merge gate |
| `developNext.mergeStrategy` | `merge` (one of `merge` / `squash` / `rebase`) | Step 3 |

Apply any project-wide command conventions from the consumer project's own CLAUDE.md when running these (e.g. a required `env` prefix for `gh`).

## Run state (crash safety + single-flight)

`develop-next` records its own progress in `.claude/state/develop-next.state.json`:

```json
{ "item": "17.4", "command": "/develop-story", "commandArg": "<path>",
  "dispatched": false, "merged": false, "ticked": false, "startedAt": "<iso>" }
```

Written at selection, updated after each of Steps 2–4, **deleted only in Step 5**. This makes the merge→tick sequence recoverable (a crash between merge and tick can never cause the item to be re-selected and re-dispatched) and acts as develop-next's own single-flight lock.

## Step 0 — Preflight

1. **Run-state check.** If `.claude/state/develop-next.state.json` exists, a prior develop-next run did not finish — do **not** select a new item. Resume from the recorded flags: `merged: true, ticked: false` → go to Step 4; `dispatched: true, merged: false` → go to Step 3 (the pipeline's own lock/resume machinery covers a pipeline that is still mid-flight); otherwise → Step 2. In `--dry-run`: report the pending run and stop.
2. **Pipeline lock check.** If `.claude/state/develop-pipeline.lock` exists, a pipeline run is mid-flight: re-enter that run (invoke the locked skill's resume path per its Phase 0b) — do **not** select a new item on top of it.
3. **Dry-run short-circuit.** In `--dry-run` mode, run `git fetch origin <baseBranch>` (fetch only — never checkout or pull), then go straight to Step 1 against the working tree's roadmap. Skip 4–5.
4. `git status --porcelain` — if the working tree is dirty: **HALT**, list the dirty paths. Never stash or discard.
5. `git checkout <baseBranch> && git pull --ff-only origin <baseBranch>` — on non-ff or conflict: **HALT** with the git output.

## Step 1 — Select the next item

Run the deterministic selector — never eyeball the roadmap:

```bash
node .agents/skills/develop-next/scripts/select-next.mjs --roadmap <roadmapPath>
```

Selection rules, marker vocabulary, and edge-case semantics: [`references/roadmap-selection.md`](references/roadmap-selection.md). The script is the authoritative implementation; if its output looks wrong, fix the roadmap (or the script) — do not hand-pick an item.

Act on the JSON `status`:

- **`halt` with `missing: true`** (no roadmap file at `roadmapPath`) → this project has no completion roadmap yet. **Do not fabricate one.** In an interactive/one-shot run, offer to scaffold a starter from [`assets/project-completion-roadmap.template.md`](assets/project-completion-roadmap.template.md) at `roadmapPath` (create parent dirs), then **STOP** for the user to populate it with real items — an empty roadmap has nothing to build. In a `/loop` run, **STOP** and notify (no one is present to author it). Never auto-create-and-proceed.
- **`selected`** → record the `item`, `rationale`, and `skipped[]` for the run report; write the run-state file. In `--dry-run`: print them and **stop here**.
  - **Already-done guard:** if the item's document frontmatter is already `status: accepted` and its PR is merged (`gh pr list --state merged --head <branch>` or the document's PR link), the roadmap tick was lost — skip straight to **Step 4**.
- **`stop`** → **STOP**: report `stopReason` + `detail`, send a push notification, end the loop. Reasons: `human-gated` (`manual`/🚧 frontier), `planning-gap` (a `/create-story` / `/create-epic` row — authoring is interactive and its output needs human review, so it is never run unattended), `manual-checkpoint` (the next item names no runnable command or no resolvable path — e.g. a "run `/review-prd`" checkpoint), `phase-blocked`, `roadmap-complete`.
- **`halt`** (no parseable roadmap content, exit 1) → **HALT**: surface `lint.errors` verbatim. The selector is deliberately tolerant (archived deps, recap rows, and annotation rows are non-fatal warnings — see [`references/roadmap-selection.md`](references/roadmap-selection.md)); a halt means the file could not be parsed as a roadmap at all. `⏭️`/`SKIP` rows are stepped past automatically and never stop the loop. The dispatched command and its story/task path both come from the selector's `item.command` / `item.commandArg`.

## Step 2 — Dispatch the pipeline

Invoke the item's named command (`/develop-story <path>` or `/develop-task <path>`), prepending this directive to the invocation context (same mechanism as the lite-mode directive in `develop-pipeline-autonomous-defaults.md` — the pipeline's own reference files are AUTO-GENERATED and must not be edited). Mark `dispatched: true` in the run state.

> **AUTONOMOUS RUN (develop-next):** For the Phase 0d Upfront Setup questions, take the auto-derived recommended option for every question without prompting (Q1 = parent epic branch, created from the base branch if missing; Q2 = epic branch for stories / base branch for tasks). For the Phase 0b resume prompt, choose "Resume from last completed step". Record every auto-answer in the Decisions Log. All existing HALT conditions remain HALTs.

If the pipeline HALTs (review NO-GO, develop stall, 5 QA cycles without PASS, qa-fix with no changes, DoD gaps, unexpected status): **STOP** — surface the pipeline's own HALT report verbatim, send a push notification, do not merge, do not tick. Leave the run-state file in place so the next invocation resumes here.

## Step 3 — Merge the green PR

Runs only after the pipeline completes Step 8 with the PR open and the item `accepted`.

1. **Verify green:**
   - QA gate file decision is `PASS` and the document frontmatter is `accepted` (finalise output).
   - **Head-SHA check:** `gh pr view <PR#> --json headRefOid,state` must match `git rev-parse HEAD` on the local PR branch. Mismatch means the branch moved since it was tested → **HALT** (never gate one commit and merge another).
   - If the PR has CI checks, `gh pr checks <PR#>` must be all green. Additionally (and always, since not every project runs CI on PRs), run `<qualityGateCommand>` on the PR branch.
   - Any failure → **HALT**: report the failing command's output, do not merge, do not tick.
2. **Merge** with the configured strategy:
   ```bash
   gh pr merge <PR#> --<mergeStrategy> --delete-branch
   ```
   On merge failure (conflict, protection): **HALT** with the `gh` output. Mark `merged: true` in the run state.
3. **Epic completion check** (stories only) — use the selector so the decision does not depend on tick ordering (the current item is not ticked yet):
   ```bash
   node .agents/skills/develop-next/scripts/select-next.mjs \
     --roadmap <roadmapPath> --epic-status <epicNum> --assume-ticked <item.id>
   ```
   If `complete: true`, promote the epic:
   - Open the epic→base PR (`gh pr create --base <baseBranch> --head feature/epic.{n}.{name} …`) if none exists.
   - Re-run the green verification (head-SHA check + quality gate) on the epic branch; merge with the configured strategy.
   - Mark this run as an **epic boundary** (stop condition).

## Step 4 — Tick the roadmap

On `<baseBranch>` (pull first if Step 3 merged into it):

1. Tick the item `[x]` and rewrite its row in the roadmap's own accepted-row convention — copy the format of an existing ✅ row; if none exists yet, use `✅ **accepted + merged** ([PR #N](url), QA PASS S/100)`.
2. Add a Change Log row (next version number, same table format, author `Claude`) describing what landed.
3. If an epic completed: update the roadmap's status-snapshot table and the epic's section header the same way previously completed epics are recorded.
4. Commit and push:
   ```bash
   git add <roadmapPath>
   git commit -m "docs(roadmap): tick <id> [x] — <short summary>"
   git push origin <baseBranch>
   ```
   If the push is rejected (non-ff): `git pull --rebase origin <baseBranch>` once and retry; if it is still rejected (e.g. branch protection): **HALT** with the git output — the run state preserves `merged: true, ticked: false` for manual recovery.
5. Mark `ticked: true` in the run state.

## Step 5 — Report + continue/stop

Delete the run-state file, then end every run with a report: item id + title, PR(s) merged, QA score, quality-gate result, the Decisions Log of auto-answers, and the next eligible item (re-run the selector with `--dry-run` semantics — selection only).

**Stop the loop** (and send a push notification) when any of these hold; otherwise end with `next item: <id> — loop may continue`:

| Stop condition | Why |
|---|---|
| Epic boundary reached (epic merged to base branch) | User's per-epic review checkpoint |
| Selector returned `human-gated` | Requires the operator |
| Selector returned `planning-gap` (`/create-*` row) | Authoring is attended work; never run it unattended |
| Selector returned `manual-checkpoint` (no command/path) | Item needs an operator action (e.g. a review checkpoint) |
| Selector returned `phase-blocked` | Phases are hard boundaries — operator decides |
| Any pipeline HALT or merge/quality-gate failure | Fail loudly, never merge red |
| Selector returned `halt` (roadmap parse/lint errors) | Don't guess on sequencing |

## Continuous mode

`/loop /develop-next` (no interval — self-paced). Each iteration runs one item; when a run ends with a stop condition, end the loop (do not schedule another wakeup). One-time setup for unattended runs — permission allowlist, pipeline hooks, CI caveat — is in [`README.md`](README.md).
