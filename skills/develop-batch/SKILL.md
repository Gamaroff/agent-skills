---
name: develop-batch
description: "Parallel roadmap orchestrator: selects the maximal set of unblocked, write-disjoint roadmap items (via scripts/select-next.mjs --batch), fans each into its own git worktree, runs their pipelines (/develop-story or /develop-task) concurrently and fully autonomously, then merges the green PRs serially — rebasing each on the new base tip — and ticks the roadmap + Change Log per item. Develop in parallel, merge serially. Crash-safe via a batch run-state file; re-running resumes where the last run stopped. Stops at an empty frontier, manual/blocked rows, planning gaps, or any pipeline HALT. Invoke with `/develop-batch`, `/develop-batch --dry-run` (read-only batch preview), or wrap in `/loop /develop-batch` for continuous runs. Sibling of develop-next (single item); this fans out the whole conflict-free frontier."
---

# Develop Batch — Parallel Roadmap Fan-out Orchestrator

Extends single-item `/develop-next` across the **whole conflict-free frontier**. One
invocation = the next batch of dependency-ready, write-disjoint roadmap items taken from
"outstanding" to "merged + ticked": developed **in parallel** in separate git worktrees,
then merged **serially**. Everything per-item (branching, review, develop, QA loop,
finalise, and the merge gate / roadmap tick) is delegated unchanged to the existing
pipelines and reuses `develop-next`'s merge machinery — this skill only adds the
**fan-out** and the **serial finalize lane** on top.

The whole strategy in one line: **develop in parallel, merge serially.**

Policy baseline (inherited from `develop-next`, user-ratified): auto-merge everything
green; auto-answer routine pipeline questions with the recommended option and log them;
stop at manual items, planning gaps, and any hard HALT. The one axis `develop-next` does
not consider — **write-conflict** between concurrent items — is decided here by the
`--batch` selector's `touches:` analysis, never by eye.

## When to Use This Skill

- User says `/develop-batch` (one batch) or `/loop /develop-batch` (continuous).
- User says "action the next batch", "develop the parallel frontier", "fan out the next
  worktrees and merge them".
- `--dry-run`: report which rows the batch would contain, the soft overlaps accepted, the
  rows held back by hard conflicts, and the worktree commands — then stop. **Read-only** —
  no worktrees, no checkout/pull, no state file, no pipeline actions.

For a single item (no worktrees), or to stop at every phase boundary, use `/develop-next`
instead. This skill deliberately relaxes phase discipline to surface the real doable
frontier (see Step 1), so it is a **batch driver**, not a substitute for the strict
single-item loop.

## Configuration

Reads the consumer project's `skills-config.yaml`. The base keys are **shared with
`develop-next`** (same roadmap, base branch, merge gate, and strategy — so single-item and
batch runs never diverge), plus one batch-only key. Every key has a default:

| Key                              | Default                                          | Used in           |
| -------------------------------- | ------------------------------------------------ | ----------------- |
| `developNext.roadmapPath`        | `docs/development/project-completion-roadmap.md` | Steps 0, 1, 3     |
| `developNext.baseBranch`         | `develop`                                        | Steps 0, 2, 3     |
| `developNext.qualityGateCommand` | `npm test`                                       | Step 3 merge gate |
| `developNext.mergeStrategy`      | `merge` (one of `merge` / `squash` / `rebase`)   | Step 3            |
| `developBatch.maxParallel`       | `4`                                              | Step 2            |
| `developBatch.requireTouches`    | `false`                                          | Step 1            |

`maxParallel` caps how many pipelines run concurrently; a larger batch is processed in
waves of that size. `requireTouches` (default off, non-breaking) hardens the write-footprint
assumption: when `true`, the selector is invoked with `--require-touches` so it defers all but
one un-annotated (`+own`-default) row per batch instead of merely warning — for teams that
want write-conflicts impossible by construction rather than caught at merge. Apply any
project-wide command conventions from the consumer
project's own `CLAUDE.md`/`AGENTS.md` when running these (e.g. a required prefix for
`gh`, or a Node version shim) — this skill writes the bare commands.

## Run state (crash safety + single-flight)

`develop-batch` records progress in `.claude/state/develop-batch.state.json` — a
**batch-shaped** array (the single-item analogue is `develop-next`'s
`develop-next.state.json`):

```json
{
  "startedAt": "<iso>",
  "items": [
    {
      "id": "T40",
      "command": "/develop-task",
      "commandArg": "<path>",
      "dir": "../wt-t40",
      "branch": "task/t40",
      "worktreeCreated": false,
      "dispatched": false,
      "prNumber": null,
      "pipelineDone": false,
      "merged": false,
      "ticked": false,
      "worktreeRemoved": false,
      "halted": false
    }
  ]
}
```

Written at batch selection, updated as each item advances, **deleted only in Step 5** once
every item is terminal (`ticked` or `halted`). This makes the parallel-develop →
serial-merge → tick sequence recoverable: a crash between any item's merge and tick can
never cause that item to be re-selected or re-dispatched. Each worktree additionally holds
its **own** `.claude/state/develop-pipeline.lock` (the pipelines write state relative to
their working directory), so concurrent pipelines never collide and each resumes
independently via its own Phase 0b machinery.

## Step 0 — Preflight

1. **Run-state check.** If `.claude/state/develop-batch.state.json` exists, a prior batch
   did not finish — do **not** select a new batch. **Resume**: skip items already
   `ticked`; for each non-terminal item, resume from its recorded flags exactly as the
   per-item lane below would (`merged: true, ticked: false` → tick it; `dispatched: true,
   pipelineDone: false` → re-enter that worktree's pipeline via its own lock/resume;
   `worktreeCreated: true, dispatched: false` → dispatch it). In `--dry-run`: report the
   pending batch and stop.
2. **Dry-run short-circuit.** In `--dry-run` mode, run `git fetch origin <baseBranch>`
   (fetch only — never checkout or pull), then go straight to Step 1's selector call and
   print its JSON verbatim (batch / excluded / softOverlaps / unannotated / worktrees /
   skippedPhases), including any `lint.warnings`.
   Create no worktrees, write no state file, dispatch nothing. Stop.
3. `git status --porcelain` on the main tree — if it is dirty: **HALT**, list the dirty
   paths. Never stash or discard.
4. `git worktree list` — if any `../wt-*` (or otherwise batch-owned) worktrees from a
   previous run are dangling with no matching run-state, **HALT** and report them for the
   operator to `git worktree remove`; never `rm -rf` a worktree directory.
5. `git checkout <baseBranch> && git pull --ff-only origin <baseBranch>` — on non-ff or
   conflict: **HALT** with the git output.

## Step 1 — Select the batch

Run the deterministic selector — **never eyeball the roadmap**:

```bash
node <skillsDir>/develop-next/scripts/select-next.mjs --batch --roadmap <roadmapPath>
# append --require-touches when developBatch.requireTouches is true
```

(`--batch` is implemented by the `develop-next` selector; this skill consumes it.)
When `developBatch.requireTouches` is `true`, append `--require-touches` so the selector
defers un-annotated rows itself; the emitted `batch[]`/`excluded[]`/`worktrees[]` already
reflect the downgrade.
Selection rules, the two batching axes, and marker vocabulary:
[`develop-next/references/roadmap-selection.md`](../develop-next/references/roadmap-selection.md)
§"Parallel batch". Act on the JSON `status`:

- **`halt` with `missing: true`** (no roadmap at `roadmapPath`) → this project has no
  completion roadmap yet. **Do not fabricate one, and do not invent a second generator** —
  reuse `develop-next`'s behaviour: offer to scaffold a starter from the shared
  [`develop-next/assets/project-completion-roadmap.template.md`](../develop-next/assets/project-completion-roadmap.template.md)
  at `roadmapPath` (create parent dirs), then **STOP** for the user to populate it with
  real items. An empty roadmap has nothing to build. Note for the operator: `--batch`
  additionally needs each row to carry a `touches:` annotation — an un-annotated row is
  treated as `+own` (no shared resource) and may over-parallelize; the template's Legend
  documents the `touches:` vocabulary.
- **`batch`** with a non-empty `batch[]` → record `batch[]`, `excluded[]`,
  `softOverlaps[]`, `skippedPhases[]`, and `worktrees[]` for the run report. In
  `--dry-run`: print them and **stop here**. Otherwise write the run-state file with every
  `batch[]` item (a 1-item batch is fine — it degrades to a single worktree). Surface
  `softOverlaps[]` explicitly: these are the `~` tags whose second merger will rebase, and
  `excluded[]`: ready rows held back by a hard `!` conflict, deferred to the next batch.
  Also surface `unannotated[]` (and the matching `lint.warnings` line): rows batched with
  no `touches:` field, whose write-disjointness is **assumed, not verified**. Two or more
  together is a co-scheduling risk — report it in both `--dry-run` and live runs, and advise
  annotating those rows (or enabling `developBatch.requireTouches`). Under `requireTouches`
  the selector has already deferred the extras, so `unannotated[]` holds at most one and no
  warning fires.
- **`batch` with an empty `batch[]`** → the frontier has no dependency-ready,
  conflict-free rows right now (only blocked/gated/manual rows remain). **STOP**: report
  `excluded[]` + `skippedPhases[]` so the operator sees why, send a push notification.
- **`halt`** (no parseable roadmap content, exit 1) → **HALT**: surface `lint.errors`
  verbatim. The selector is deliberately tolerant; a halt means the file could not be
  parsed as a roadmap at all.

The dispatched command and path for each item both come from the selector's
`worktrees[].run` / `batch[].command` — never hand-picked.

## Step 2 — Fan out worktrees and dispatch the pipelines (parallel)

For each item in `batch[]`, in `worktrees[]` order, up to `developBatch.maxParallel` at a
time (process the remainder in waves):

1. **Create the worktree** from the selector's ready-made command (`worktrees[].shell`):

   ```bash
   git worktree add <dir> -b <branch> <baseBranch>
   ```

   Mark `worktreeCreated: true`. This is an isolated checkout on its own scratch branch off
   the base — the pipeline cuts its own `feature/…` branch inside it.

2. **Dispatch one agent per worktree.** Run the item's named command (`worktrees[].run`,
   e.g. `/develop-task <path>`) **with its working directory set to `<dir>`**, prepending
   the directive below (same mechanism as `develop-next` Step 2). Run the agents
   concurrently — one per worktree — and mark each `dispatched: true`.

   > **AUTONOMOUS RUN (develop-batch):** You are running this pipeline inside the git
   > worktree at `<dir>` — set your working directory to `<dir>` for all git and file
   > operations; do not touch the main working tree or any sibling worktree.
   > For the Phase 0d Upfront Setup questions, take the auto-derived recommended option
   > for every question without prompting (Q1 = base branch, `<baseBranch>`; Q2 = base
   > branch, `<baseBranch>`). For the Phase 0b resume prompt, choose "Resume from last
   > completed step". Record every auto-answer in the Decisions Log. Run the pipeline to
   > an open, green, `accepted` PR and report back the PR number and final QA status.
   > Do **not** merge the PR — the batch orchestrator owns merging. All existing HALT
   > conditions remain HALTs.

   Requires the linked-worktree-safe `create-branch` (it must create `feature/…` from the
   base **ref** without checking out the base branch, which is already held in the main
   tree — see `create-branch` SKILL.md §"Exception — linked worktree").

3. **Barrier — wait for all dispatched pipelines.** Record each item's `prNumber` and
   `pipelineDone: true`. If a pipeline **HALTs** (review NO-GO, develop stall, 5 QA cycles
   without PASS, qa-fix with no changes, DoD gaps): mark that item `halted: true`, do
   **not** merge it, leave its worktree in place for inspection, and continue — one item's
   HALT must not sink the rest of the batch. Surface every HALT report verbatim in Step 5.

## Step 3 — Serial finalize lane (merge → tick, one item at a time)

The discipline that makes soft overlaps harmless: **merge one PR at a time.** For each item
with `pipelineDone: true` and not `halted`, in `batch[]` order, reusing `develop-next`'s
merge gate (Step 3) and roadmap tick (Step 4) verbatim per item:

1. **Rebase on the current tip** (for the 2nd and later merges): in the item's worktree,
   `git fetch origin && git rebase origin/<baseBranch>` onto its `feature/…` branch. This
   trivially resolves the `softOverlaps[]` (a new Prisma model, an appended `imports:[]`
   line, another registry row) against whatever earlier items in this batch already landed.
   A non-trivial rebase conflict → mark the item `halted`, report it, and continue with the
   remaining items.
2. **Verify green** (all must hold, else HALT this item and continue):
   - QA gate file decision `PASS` and document frontmatter `accepted` (finalise output).
   - **Head-SHA check:** `gh pr view <PR#> --json headRefOid,state` must match
     `git rev-parse HEAD` on the item's local PR branch after the rebase (never gate one
     commit and merge another).
   - If the PR has CI checks, `gh pr checks <PR#>` all green. Additionally (always, since
     not every project runs CI on PRs), run `<qualityGateCommand>` on the PR branch.
3. **Merge** with the configured strategy:

   ```bash
   gh pr merge <PR#> --<mergeStrategy> --delete-branch
   ```

   On merge failure (conflict, protection): mark the item `halted`, report, continue. Mark
   `merged: true`. Story/task PRs target `<baseBranch>` directly — no epic integration
   branch.
4. **Tick the roadmap immediately**, on `<baseBranch>` in the **main tree** (`git pull`
   first — the merge just advanced the remote):
   - Tick the item `[x]` and rewrite its row in the roadmap's accepted-row convention
     (copy an existing ✅ row's format; if none exists yet, use
     `✅ **accepted + merged** ([PR #N](url), QA PASS S/100)`).
   - Add a Change Log row (next version, same table format, author `Claude`).
   - If an epic completed, update the roadmap's status-snapshot table and the epic's
     section header the way prior completed epics are recorded.
   - Commit and push:
     ```bash
     git add <roadmapPath>
     git commit -m "docs(roadmap): tick <id> [x] — <short summary>"
     git push origin <baseBranch>
     ```
     On non-ff rejection: `git pull --rebase origin <baseBranch>` once and retry; still
     rejected → **HALT** (the run state preserves `merged: true, ticked: false` for
     recovery). Mark `ticked: true`.

The next item's rebase (step 1) then picks up this item's code **and** its tick. Merge +
tick is serial by nature — the roadmap/Change Log edit is a guaranteed conflict point.
**Never parallelize this lane.**

## Step 4 — Clean up worktrees

For each `merged: true, ticked: true` item: remove its worktree (never `rm -rf` — worktrees
share one `.git`):

```bash
git worktree remove <dir>
```

Mark `worktreeRemoved: true`. Then `git worktree prune` and `git worktree list` as a sanity
check. **Leave the worktrees of `halted` items in place** for the operator to inspect and
finish or discard.

## Step 5 — Report + continue/stop

Delete the run-state file **iff** every item is terminal (`ticked` or `halted`); otherwise
retain it for resume. Then end every run with a report:

- Batch composition (the `batch[]` ids + the `phase` it was drawn from, and any
  `skippedPhases[]`).
- Per-item outcome: merged + ticked (PR #, QA score, quality-gate result) or **halted**
  (with the pipeline/gate HALT report verbatim, and its worktree left for inspection).
- The `softOverlaps[]` that were rebased, and the `excluded[]` rows deferred to the next
  batch (with the clashing hard tag + rival id).
- The Decisions Log of auto-answers across all pipelines.
- The next batch preview — re-run the selector with `--batch` (selection only, no side
  effects).

**Stop the loop** (and send a push notification) when any of these hold; otherwise end with
`next batch: <ids> — loop may continue`:

| Stop condition                                     | Why                                                 |
| -------------------------------------------------- | --------------------------------------------------- |
| Selector returned an empty `batch[]`               | No dependency-ready, conflict-free rows right now   |
| Any item `halted` (pipeline / gate / rebase HALT)  | Fail loudly; leave its worktree for the operator    |
| Selector returned `halt` (roadmap parse/lint)      | Don't guess on sequencing                           |
| A tick push failed after rebase-retry              | Roadmap could not be advanced — operator decides    |

## Continuous mode

`/loop /develop-batch` (no interval — self-paced). Each iteration runs one batch; when a
batch finishes clean, the next iteration re-selects the now-unblocked frontier (items that
were `excluded` by a hard conflict, or unblocked by this batch's merges, become eligible).
End the loop when a stop condition fires. One-time setup for unattended runs — permission
allowlist (including `gh pr merge`), pipeline hooks, worktree hygiene — is in
[`README.md`](README.md).
