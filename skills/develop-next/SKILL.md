---
name: develop-next
description: 'Roadmap orchestrator: selects the next unblocked item from docs/development/project-completion-roadmap.md, runs its named pipeline (/develop-story or /develop-task) fully autonomously (Upfront Setup auto-answered with the recommended options), merges the green PR (story→epic; epic→develop when the epic completes), ticks the roadmap + Change Log, and reports. Stops at epic boundaries, manual/blocked items, or any pipeline HALT. Invoke with `/develop-next`, `/develop-next --dry-run` (selection only, no execution), or wrap in `/loop /develop-next` for continuous runs.'
---

# Develop Next — Roadmap Loop Orchestrator

Closes the three manual gaps in the roadmap workflow: **item selection**, the pipeline's **Upfront Setup prompt**, and **PR merging**. One invocation = one roadmap item taken from "next outstanding" to "merged + ticked". Everything else (branching, review, develop, QA loop, finalise) is delegated unchanged to `/develop-story` / `/develop-task`.

Policy baseline (user-ratified 2026-07-11): auto-merge everything green; auto-answer routine questions with the recommended option and log them; stop at epic boundaries and `manual` items; hard HALTs always stop the run.

## When to Use This Skill

- User says `/develop-next` (one item) or `/loop /develop-next` (continuous).
- User says "do the next roadmap item", "keep the roadmap rolling", "what's next — build it".
- `--dry-run`: report which item would be selected and why, then stop. No git/pipeline actions.

## Step 0 — Preflight

1. `git status --porcelain` — if the working tree is dirty: **HALT**, list the dirty paths. Never stash or discard.
2. `git checkout develop && git pull --ff-only origin develop` — on non-ff or conflict: **HALT** with the git output.
3. Confirm `.claude/state/develop-pipeline.lock` does not exist. If it does, a prior pipeline run is mid-flight: re-enter that run instead (invoke the locked skill's resume path per its Phase 0b) — do **not** select a new item on top of it.

## Step 1 — Select the next item

Read `docs/development/project-completion-roadmap.md` and apply the selection algorithm in [`references/roadmap-selection.md`](references/roadmap-selection.md). Summary:

- Pick the **first** unticked `[ ]` item, scanning top-to-bottom, in the **earliest phase** that still has outstanding items (phases are hard boundaries).
- All `deps:` must be satisfied (`[x]`, `accepted`, or *(shipped)*).
- Skip items marked `manual`, `⛔ BLOCKED`, or `🚧` (legal/ops-gated), and the Deferred/human-gated ops section — these are never auto-selected.
- `gate:` = ship gate, not a build blocker. `flag:` = never blocking.
- Respect each epic header's `→`/`‖` flow.

Outcomes:
- **Eligible item found** → record the selection rationale (item id, deps checked, siblings skipped and why) for the run report. In `--dry-run` mode: print the rationale and **stop here**.
- **First outstanding item is human-gated** (`manual`, ops, legal) → **STOP**: report "human-gated item reached: <id>", send a push notification, end the loop.
- **Item's row names `/create-story` or `/create-epic`** → run that command instead of a develop pipeline, then **STOP** for user review of the authored document (authoring output should be human-reviewed before it enters the build loop).

## Step 2 — Dispatch the pipeline

Invoke the item's named command (`/develop-story <story-path>` or `/develop-task <task-path>`), prepending this directive to the invocation context (same mechanism as the lite-mode directive in `develop-pipeline-autonomous-defaults.md` — the pipeline's own reference files are AUTO-GENERATED and must not be edited):

> **AUTONOMOUS RUN (develop-next):** For the Phase 0d Upfront Setup questions, take the auto-derived recommended option for every question without prompting (Q1 = parent epic branch, created from develop if missing; Q2 = epic branch for stories / develop for tasks). For the Phase 0b resume prompt, choose "Resume from last completed step". Record every auto-answer in the Decisions Log. All existing HALT conditions remain HALTs.

If the pipeline HALTs (review NO-GO, develop stall, 5 QA cycles without PASS, qa-fix with no changes, DoD gaps, unexpected status): **STOP** — surface the pipeline's own HALT report verbatim, send a push notification, do not merge, do not tick the roadmap.

## Step 3 — Merge the green PR

Runs only after the pipeline completes Step 8 with the PR open and the item `accepted`.

1. **Verify green:**
   - QA gate file decision is `PASS` and the document frontmatter is `accepted` (finalise output).
   - On the PR branch, run the local quality gate — GitHub CI does not yet run on PRs (Task 1 runner unregistered), so this is the merge gate:
     ```bash
     npm run lint && npm run typecheck && npm test
     ```
   - Any failure → **HALT**: report the failing command's output, do not merge, do not tick.
2. **Merge** (merge commits are the repo convention — see #200/#205/#215):
   ```bash
   env gh pr merge <PR#> --merge --delete-branch
   ```
   (`env` prefix required — CLAUDE.md rule.) On merge failure (conflict, protection): **HALT** with the `gh` output.
3. **Epic completion check** (stories only): if every story row in this epic's roadmap section is now ticked/accepted, promote the epic:
   - Open the epic→develop PR (`env gh pr create --base develop --head feature/epic.{n}.{name} …`) if none exists.
   - Re-run the quality gate on the epic branch; merge with `env gh pr merge <PR#> --merge --delete-branch`.
   - Mark this run as an **epic boundary** (stop condition).

## Step 4 — Tick the roadmap

On `develop` (pull first if Step 3 merged into it):

1. Tick the item `[x]` and rewrite its row in the established accepted format — mirror the 15.x rows: `✅ **accepted + merged** ([PR #N](…), QA PASS S/100) · [#issue](…)`.
2. Add a Change Log row (next version number, same table format, author `Claude`) describing what landed.
3. If an epic completed: update the **Status snapshot** table and the epic's section header, matching how Epic 15's completion was recorded.
4. Commit directly to develop and push:
   ```bash
   git add docs/development/project-completion-roadmap.md
   git commit -m "docs(roadmap): tick <id> [x] — <short summary>"
   git push origin develop
   ```

## Step 5 — Report + continue/stop

End every run with a report: item id + title, PR(s) merged, QA score, quality-gate result, the Decisions Log of auto-answers, and the next eligible item.

**Stop the loop** (and send a push notification) when any of these hold; otherwise end with `next item: <id> — loop may continue`:

| Stop condition | Why |
|---|---|
| Epic boundary reached (epic merged to develop) | User's per-epic review checkpoint |
| Next eligible item is `manual` / ops / legal-gated | Requires the operator |
| Next item requires `/create-story` / `/create-epic` | Authoring needs human review |
| Any pipeline HALT or merge/quality-gate failure | Fail loudly, never merge red |
| Roadmap parse ambiguity (deps unresolvable) | Don't guess on sequencing |

## Continuous mode

`/loop /develop-next` (no interval — self-paced). Each iteration runs one item; when a run ends with a stop condition, end the loop (do not schedule another wakeup). One-time setup for unattended runs — permission allowlist, pipeline hooks, CI caveat — is in [`README.md`](README.md).
