---
name: develop-next
description: "Roadmap orchestrator: deterministically selects the next unblocked item from the project completion roadmap (via scripts/select-next.mjs), runs its named pipeline (/develop-story or /develop-task) fully autonomously (Upfront Setup auto-answered with the recommended options), merges the green PR (story/task → develop), ticks the roadmap + Change Log, and reports. Crash-safe via a run-state file; re-running resumes where the last run stopped. Stops at manual/blocked items, planning gaps (/create-* rows), or any pipeline HALT. Invoke with `/develop-next`, `/develop-next --dry-run` (read-only selection preview), or wrap in `/loop /develop-next` for continuous runs."
---

# Develop Next — Roadmap Loop Orchestrator

Closes the three manual gaps in the roadmap workflow: **item selection**, the pipeline's **Upfront Setup prompt**, and **PR merging**. One invocation = one roadmap item taken from "next outstanding" to "merged + ticked". Everything else (branching, review, develop, QA loop, finalise) is delegated unchanged to `/develop-story` / `/develop-task`.

Policy baseline (user-ratified 2026-07-11): auto-merge everything green; auto-answer routine questions with the recommended option and log them; stop at epic boundaries, `manual` items, and planning gaps; hard HALTs always stop the run.

## When to Use This Skill

- User says `/develop-next` (one item) or `/loop /develop-next` (continuous).
- User says "do the next roadmap item", "keep the roadmap rolling", "what's next — build it".
- `--dry-run`: report which item would be selected and why, then stop. **Read-only** — no checkout, no pull, no state file, no pipeline actions.
- `--batch` (planning aid, not a loop mode): `node .agents/skills/develop-next/scripts/select-next.mjs --batch` prints a **maximal set of ready rows that can be developed concurrently in separate git worktrees** — dependency-ready (same predicate as selection) **and** write-disjoint (no two share a `touches:` tag either marks `!`). Emits the batch, the soft overlaps accepted, rows held back by hard conflicts, and `git worktree add … develop` commands. Requires rows to carry `touches:` annotations (see [references/roadmap-selection.md](references/roadmap-selection.md) §Parallel batch). Advisory — runs nothing; the operator fans out worktrees and **merges to `develop` serially**.

## Configuration

Read once per run from the consumer project's `skills-config.yaml` (`developNext:` block); every key has a default:

| Key                              | Default                                          | Used in           |
| -------------------------------- | ------------------------------------------------ | ----------------- |
| `developNext.roadmapPath`        | `docs/development/project-completion-roadmap.md` | Steps 1, 3, 4     |
| `developNext.baseBranch`         | `develop`                                        | Steps 0, 3, 4     |
| `developNext.qualityGateCommand` | `npm test`                                       | Step 3 merge gate |
| `developNext.mergeStrategy`      | `merge` (one of `merge` / `squash` / `rebase`)   | Step 3            |

`mergeStrategy` is always written in `gh` vocabulary regardless of host; Step 3 translates it for Bitbucket (`merge` → `merge_commit`, `rebase` → `fast_forward`). Do not put Bitbucket strategy names in `skills-config.yaml`.

Apply any project-wide command conventions from the consumer project's own CLAUDE.md when running these (e.g. a required `env` prefix for `gh`).

**Hosting platform.** Steps 1 and 3 support **GitHub** (via `gh`) and **Bitbucket** (via the REST API), resolved per-run by `references/resolve-platform.sh` in Step 0. Bitbucket requires `BITBUCKET_USERNAME` and `BITBUCKET_APP_PASSWORD` in the environment, plus `curl` and `jq`.

## Run state (crash safety + single-flight)

`develop-next` records its own progress in `.claude/state/develop-next.state.json`:

```json
{
  "item": "17.4",
  "command": "/develop-story",
  "commandArg": "<path>",
  "dispatched": false,
  "merged": false,
  "ticked": false,
  "startedAt": "<iso>"
}
```

Written at selection, updated after each of Steps 2–4, **deleted only in Step 5**. This makes the merge→tick sequence recoverable (a crash between merge and tick can never cause the item to be re-selected and re-dispatched) and acts as develop-next's own single-flight lock.

## Step 0 — Preflight

1. **Run-state check.** If `.claude/state/develop-next.state.json` exists, a prior develop-next run did not finish — do **not** select a new item. Resume from the recorded flags: `merged: true, ticked: false` → go to Step 4; `dispatched: true, merged: false` → go to Step 3 (the pipeline's own lock/resume machinery covers a pipeline that is still mid-flight); otherwise → Step 2. In `--dry-run`: report the pending run and stop.
2. **Pipeline lock check.** If `.claude/state/develop-pipeline.lock` exists, a pipeline run is mid-flight: re-enter that run (invoke the locked skill's resume path per its Phase 0b) — do **not** select a new item on top of it.
3. **Dry-run short-circuit.** In `--dry-run` mode, run `git fetch origin <baseBranch>` (fetch only — never checkout or pull), then go straight to Step 1 against the working tree's roadmap. Skip 4–5.
4. `git status --porcelain` — if the working tree is dirty: **HALT**, list the dirty paths. Never stash or discard.
5. `git checkout <baseBranch> && git pull --ff-only origin <baseBranch>` — on non-ff or conflict: **HALT** with the git output.
6. **Resolve the platform.** Steps 1 and 3 talk to the hosting service; resolve `VCS` once here so both branch on the same value. See `references/platform-detection.md` for the full resolver spec.

   ```bash
   source references/resolve-platform.sh
   # VCS = github | bitbucket; TRACKER = jira | github

   if [ "$VCS" = "bitbucket" ]; then
     # Portable across GNU and BSD sed — strip the host prefix and the .git
     # suffix in two passes rather than one lazy-quantified capture (`[^/]+?`
     # is a GNU extension; BSD sed rejects it with "repetition-operator
     # operand invalid").
     BB_PATH=$(git remote get-url origin | sed -E 's|.*bitbucket\.org[:/]||; s|\.git$||')
     BB_WORKSPACE=${BB_PATH%%/*}
     BB_REPO=${BB_PATH##*/}
     BB_API="https://api.bitbucket.org/2.0"
     [ -n "$BITBUCKET_USERNAME" ] && [ -n "$BITBUCKET_APP_PASSWORD" ] || {
       echo "BITBUCKET_USERNAME / BITBUCKET_APP_PASSWORD not set — Step 3 cannot merge"; HALT; }
   fi
   ```

   > **Do not verify Bitbucket credentials with `GET /2.0/user`.** That endpoint requires the `read:user` scope, which app passwords scoped for PR work commonly lack — it returns 403 while PR and repository calls succeed. Verify against the repository instead (`GET ${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}` → 200) if a preflight check is wanted at all.

## Step 1 — Select the next item

Run the deterministic selector — never eyeball the roadmap:

```bash
node .agents/skills/develop-next/scripts/select-next.mjs --roadmap <roadmapPath>
```

Selection rules, marker vocabulary, and edge-case semantics: [`references/roadmap-selection.md`](references/roadmap-selection.md). The script is the authoritative implementation; if its output looks wrong, fix the roadmap (or the script) — do not hand-pick an item.

Act on the JSON `status`:

- **`halt` with `missing: true`** (no roadmap file at `roadmapPath`) → this project has no completion roadmap yet. **Do not fabricate one.** In an interactive/one-shot run, offer to scaffold a starter from [`assets/project-completion-roadmap.template.md`](assets/project-completion-roadmap.template.md) at `roadmapPath` (create parent dirs), then **STOP** for the user to populate it with real items — an empty roadmap has nothing to build. In a `/loop` run, **STOP** and notify (no one is present to author it). Never auto-create-and-proceed.
- **`selected`** → record the `item`, `rationale`, and `skipped[]` for the run report; write the run-state file. In `--dry-run`: print them and **stop here**.
  - **Already-done guard:** if the item's document frontmatter is already `status: accepted` and its PR is merged, the roadmap tick was lost — skip straight to **Step 4**. Query per `VCS` (resolved in Step 0), or fall back to the document's own PR link:

    ```bash
    if [ "$VCS" = "bitbucket" ]; then
      curl -sf -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" --get \
        --data-urlencode 'q=source.branch.name="<branch>" AND state="MERGED"' \
        "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests" | jq -r '.values[0].id // empty'
    else
      gh pr list --state merged --head "<branch>" --json number --jq '.[0].number // empty'
    fi
    ```
- **`stop`** → **STOP**: report `stopReason` + `detail`, send a push notification, end the loop. Reasons: `human-gated` (`manual`/🚧 frontier), `planning-gap` (a `/create-story` / `/create-epic` row — authoring is interactive and its output needs human review, so it is never run unattended), `manual-checkpoint` (the next item names no runnable command or no resolvable path — e.g. a "run `/review-prd`" checkpoint), `phase-blocked`, `roadmap-complete`.
- **`halt`** (no parseable roadmap content, exit 1) → **HALT**: surface `lint.errors` verbatim. The selector is deliberately tolerant (archived deps, recap rows, and annotation rows are non-fatal warnings — see [`references/roadmap-selection.md`](references/roadmap-selection.md)); a halt means the file could not be parsed as a roadmap at all. `⏭️`/`SKIP` rows are stepped past automatically and never stop the loop. The dispatched command and its story/task path both come from the selector's `item.command` / `item.commandArg`.

## Step 2 — Dispatch the pipeline

Invoke the item's named command (`/develop-story <path>` or `/develop-task <path>`), prepending this directive to the invocation context (same mechanism as the lite-mode directive in `develop-pipeline-autonomous-defaults.md` — the pipeline's own reference files are AUTO-GENERATED and must not be edited). Mark `dispatched: true` in the run state.

> **AUTONOMOUS RUN (develop-next):** For the Phase 0d Upfront Setup questions, take the auto-derived recommended option for every question without prompting (Q1 = base branch, `develop`; Q2 = base branch, `develop`). For the Phase 0b resume prompt, choose "Resume from last completed step". Record every auto-answer in the Decisions Log. All existing HALT conditions remain HALTs.

If the pipeline HALTs (review NO-GO, develop stall, 5 QA cycles without PASS, qa-fix with no changes, DoD gaps, unexpected status): **STOP** — surface the pipeline's own HALT report verbatim, send a push notification, do not merge, do not tick. Leave the run-state file in place so the next invocation resumes here.

## Step 3 — Merge the green PR

Runs only after the pipeline completes Step 8 with the PR open and the item `accepted`.

Every command below branches on `VCS` (resolved in Step 0). The GitHub path is unchanged; the Bitbucket path uses the REST API because `gh` cannot address a Bitbucket remote at all (`gh repo view` fails outright — it is not a fallback, it is inoperable).

1. **Verify green:**
   - QA gate file decision is `PASS` and the document frontmatter is `accepted` (finalise output).
   - **Head-SHA check** — the PR's source commit must equal `git rev-parse HEAD` on the local PR branch. Mismatch means the branch moved since it was tested → **HALT** (never gate one commit and merge another).

     ```bash
     if [ "$VCS" = "bitbucket" ]; then
       PR_HEAD=$(curl -sf -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
         "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_ID}" \
         | jq -r '.source.commit.hash')
       PR_STATE=$(curl -sf -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
         "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_ID}" \
         | jq -r '.state')
     else
       PR_HEAD=$(gh pr view "$PR_ID" --json headRefOid --jq '.headRefOid')
       PR_STATE=$(gh pr view "$PR_ID" --json state --jq '.state')
     fi
     # Bitbucket returns the full 40-char hash; compare on the common prefix.
     [ "${PR_HEAD:0:12}" = "$(git rev-parse HEAD | cut -c1-12)" ] || HALT
     ```

   - **CI checks** — if the PR has them, all must be green.
     - **GitHub:** `gh pr checks <PR#>`.
     - **Bitbucket:** `GET ${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/commit/${PR_HEAD}/statuses` — every `values[].state` must be `SUCCESSFUL`. An **empty** `values[]` means no CI reported (Pipelines disabled, or the run has not posted yet) → treat as _no checks_, not as failure.
     - **Best-effort on Bitbucket:** this call needs the app password's `read:pipeline` scope. A `403 "Your credentials lack one or more required privilege scopes"` is **not** a merge blocker — log a warning and continue to the quality gate. Bitbucket app passwords are commonly scoped to PR + repository access only, and failing the merge on a _missing read permission_ would block every merge on an otherwise-green PR.
   - **Always**, on both platforms and regardless of CI: run `<qualityGateCommand>` on the PR branch. This is the real gate — not every project runs CI on PRs, and on Bitbucket the CI read may be unavailable per the note above.
   - Any failure other than the tolerated 403 → **HALT**: report the failing command's output, do not merge, do not tick.

2. **Merge** with the configured strategy.

   `mergeStrategy` is expressed in `gh` vocabulary (`merge` / `squash` / `rebase`) and **must be translated** for Bitbucket, whose API accepts a different, non-overlapping set. Passing `merge` straight through is rejected:

   | `developNext.mergeStrategy` | GitHub (`gh pr merge`) | Bitbucket (`merge_strategy`) |
   | --------------------------- | ---------------------- | ---------------------------- |
   | `merge` (default)           | `--merge`              | `merge_commit`               |
   | `squash`                    | `--squash`             | `squash`                     |
   | `rebase`                    | `--rebase`             | `fast_forward`               |

   ```bash
   if [ "$VCS" = "bitbucket" ]; then
     case "$mergeStrategy" in
       merge)  BB_STRATEGY=merge_commit ;;
       squash) BB_STRATEGY=squash ;;
       rebase) BB_STRATEGY=fast_forward ;;
       *)      echo "unknown mergeStrategy: $mergeStrategy" && HALT ;;
     esac
     # close_source_branch is Bitbucket's equivalent of gh's --delete-branch.
     jq -n --arg m "Merge PR #${PR_ID}: ${PR_TITLE}" --arg s "$BB_STRATEGY" \
       '{type:"pullrequest",message:$m,merge_strategy:$s,close_source_branch:true}' \
       > /tmp/dn-merge.json
     MERGE_RESULT=$(curl -s -X POST \
       -H "Content-Type: application/json" \
       -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
       --data-binary @/tmp/dn-merge.json \
       "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_ID}/merge")
     rm -f /tmp/dn-merge.json
     # MERGED is the only success state; anything else (conflict, protection,
     # scope error) carries an `error.message` — surface it verbatim.
     [ "$(echo "$MERGE_RESULT" | jq -r '.state')" = "MERGED" ] || HALT
   else
     gh pr merge "$PR_ID" --"$mergeStrategy" --delete-branch
   fi
   ```

   On merge failure (conflict, protection): **HALT** with the platform's output verbatim. Mark `merged: true` in the run state only on success.

   > **Parsing note (Bitbucket):** the merge response embeds rendered HTML that can contain raw control characters, which makes some `jq` invocations fail on the _response_ even though the merge itself succeeded. **Never retry a merge on a parse error** — re-query `GET …/pullrequests/${PR_ID}` and check `.state` first, or you risk a duplicate merge attempt against an already-merged PR.

   Story PRs normally target `<baseBranch>` (default `develop`) directly, and nothing special happens when an epic's last story merges.

   > **Epics using an integration branch are only partly automated.** If a story's epic declares
   > `branch_model: epic-integration`, `/develop-story` bases that story on the epic's integration branch
   > and its PR targets that branch. The merge here is correct without changes — the platform merges each
   > PR into the base the PR itself declares, not into `<baseBranch>`.
   >
   > **But nothing promotes the integration branch to `<baseBranch>`.** There is no epic-completion check
   > and no epic→base promotion step (both were removed in v0.24.0 along with the mandatory epic-branch
   > model, and reinstating them is not part of the opt-in feature). So for such an epic:
   >
   > - Step 4 still ticks the roadmap on `<baseBranch>` as each story merges — correct, the roadmap tracks
   >   stories, not branches.
   > - The epic's work accumulates on the integration branch and **stays there**. Raise and merge the final
   >   `epic/{n}.{name}` → `<baseBranch>` PR **by hand** once every story is in.
   > - Do not read "all this epic's rows are ticked" as "the epic has landed on `<baseBranch>`". It has not.

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

| Stop condition                                          | Why                                                      |
| ------------------------------------------------------- | -------------------------------------------------------- |
| Selector returned `human-gated`                         | Requires the operator                                    |
| Selector returned `planning-gap` (`/create-*` row)      | Authoring is attended work; never run it unattended      |
| Selector returned `manual-checkpoint` (no command/path) | Item needs an operator action (e.g. a review checkpoint) |
| Selector returned `phase-blocked`                       | Phases are hard boundaries — operator decides            |
| Any pipeline HALT or merge/quality-gate failure         | Fail loudly, never merge red                             |
| Selector returned `halt` (roadmap parse/lint errors)    | Don't guess on sequencing                                |

## Continuous mode

`/loop /develop-next` (no interval — self-paced). Each iteration runs one item; when a run ends with a stop condition, end the loop (do not schedule another wakeup). One-time setup for unattended runs — permission allowlist, pipeline hooks, CI caveat — is in [`README.md`](README.md).
