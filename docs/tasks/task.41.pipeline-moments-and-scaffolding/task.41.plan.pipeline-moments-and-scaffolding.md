---
id: task.41.plan
title: "Implementation Plan: new moments, scaffolding, and the develop-bug gap"
type: plan
task-ref: task.41.pipeline-moments-and-scaffolding.md
---

# Implementation Plan: new moments, scaffolding, and the `develop-bug` gap

> Requirements and success criteria: [task.41.pipeline-moments-and-scaffolding.md](task.41.pipeline-moments-and-scaffolding.md)

## Overview

Fire the two moments task.37 declared, get the workflow file onto consumers' disks without ever
overwriting one, add the CI check `jira-sync.js` has been promising since v0.34.0, and close the
`develop-bug` inconsistency.

## Phase-by-Phase Implementation Guide

### Phase 1: `changes-requested`

**File:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, §5b, on entry, before `/qa-fix`.

```bash
node .agents/skills/{develop-story|develop-task|develop-bug}/references/jira-stage.js \
  --issue {TRACKER_ISSUE} --stage changes-requested --json      # TRACKER=jira
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage changes-requested --json      # TRACKER=github
```

**Fires per cycle**, which is the opposite of the rule stated a few lines above for `in-qa` ("run
once, do not repeat per cycle"). Say why, or the next reader will assume it is a mistake:

> Unlike `in-qa`, this fires on **every** fix cycle. `in-qa` marks a phase the card enters once;
> `changes-requested` marks a state it re-enters, and a board that shows it once and then not again
> is telling the team something false.

Default candidates in `tracker-workflow.js`:
`["Changes Requested", "Rework", "Needs Work", "Reopened"]` — deliberately **not** including
"In Progress", which would drag cards backwards on most boards and fight the guard.

`changes-requested` is a **side-state**: unranked, exempt from the guard in both directions, like
`blocked`. In ladder terms that means a consumer names it under `pipeline:` but not under
`statuses:`.

### Phase 2: `pr-merged`

**Files:** `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`.

Fire after `gh pr merge` succeeds and before the roadmap tick.

**The trap**: `develop-batch` merges **serially in a loop** ("develop in parallel, merge serially").
The call must sit inside the per-item merge block, keyed on that item's `TRACKER_ISSUE`:

```bash
# Inside the per-item merge loop — NOT once per batch. Firing once would move
# whichever card happened to be last, or move one card repeatedly.
node .agents/skills/develop-story/references/gh-stage.js \
  --issue "$ITEM_TRACKER_ISSUE" --stage pr-merged --json
```

Assert it with a test that the `--stage pr-merged` literal appears inside the loop body, not before
or after it.

Ordering note for the step file, because it is genuinely confusing: Step 7 moves a card to `done`
**while the PR is still open** — merging happens later. So a board that wants a card to sit in a
merge/showcase queue until the PR actually lands should omit `done:` from `pipeline:` entirely and
let `pr-merged` be the last automated move. This mirrors the note already at
`develop-pipeline-step-5-6-qa-loop.md:260` about `ready-for-merge`.

Default candidates: `["Merged", "Ready for Release", "Awaiting Release", "Ready for Showcase"]`.
Including the user's own column as a *default candidate* is deliberate — the RAPP fixtures confirm
`Ready for Showcase` is a real reachable destination (ids 21 and 151) that no moment has ever
targeted. Still absent from the default `pipeline:` map, so nothing fires without opting in.

### Phase 3: Scaffolding and `--init-workflow`

**`scripts/setup-consumer.sh`** — reuse its own existing pattern verbatim (L307-317):

```bash
write_tracker_workflow() {
  heading "tracker-workflow.yaml"
  if [[ -f "tracker-workflow.yaml" ]]; then
    warn "tracker-workflow.yaml already exists."
    record_step "tracker-workflow" "ok" "kept (existing)"
    return
  fi
  # Prefer the real board over a generic template.
  if probe_available; then
    "$STAGE_CLI" --init-workflow && record_step "tracker-workflow" "ok" "generated from board" && return
  fi
  write_file "tracker-workflow.yaml" "$(cat assets/tracker-workflow.default.yaml)"
  record_step "tracker-workflow" "ok" "template (edit before first run)"
}
```

When falling back to the template, say so **loudly** — a generic ladder that does not match the
board resolves nothing, and the failure is silent:

> ⚠️  Wrote a generic ladder. Your board's real columns are almost certainly different.
>     Run `gh-stage.js --probe-board` (or `--probe-workflow` for Jira) and edit before your first run.

**`--init-workflow [--force]`** on both CLIs:

- Refuse to overwrite without `--force`; print the existing path and exit 0.
- Prefer a live probe; fall back to the template with no credentials.
- **Convert an existing `jira.workflowRecord` JSON** into the YAML ladder: read `stages`, order the
  rungs by `rank`, and emit `pipeline:` entries from each stage's first candidate. Preserve
  `reason:` strings as YAML comments — they are the hand-authored intent, and `buildWorkflowRecord`
  already treats them as sacred (`jira-sync.js:2731`).

### Phase 4: `--check`

Shared validation in `tracker-workflow.js`; each CLI adds the board-facing half.

```js
// --check is the ONE mode in this family that exits non-zero on failure.
// Every other entry point exits 0 on every documented skip, because pipeline
// steps run inside shells and a non-zero exit would kill the run. --check does
// not run inside a pipeline step — it runs in CI, where a green exit on a
// broken file is the whole failure. Do not "harmonise" this.
```

Rules:

1. Parses; every `pipeline:` key is in `MOMENTS`; no duplicate rungs. *(offline)*
2. Every `pipeline:` target is either a rung or a plausible side-state. *(offline)*
3. Every status named by an enabled moment exists on the board. **The real payload** — a renamed
   column (`In Review` → `Code Review`) is the most common way this breaks, and it breaks silently.
4. Every enabled moment resolves to something reachable — Jira: from at least one sampled position;
   GitHub: matches an option.
5. The file's project/site (Jira) or owner/repo/board (GitHub) matches the environment — catches a
   file copied between repos.
6. Drift: re-probe and print a unified diff **plus the exact command that fixes it**.

Exit codes: non-zero on any failure; **0** with a loud skip when credentials are absent, so a fork's
PR does not fail on a secret it cannot have. `--offline` runs rules 1-2 only and is what most
consumer CI will actually use — and what this repo's own CI can run against
`assets/tracker-workflow.default.yaml`.

### Phase 5: `develop-bug` parity, READMEs, docs

**`develop-bug`.** Verified: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` is
skill-native (there is no `shared/resources/develop-bug-step-*`), and it only posts comments. So
`develop-bug` signals four moments (`work-started`, `in-review`, `done` via the shared step files;
`blocked` via `SKILL.md:270`) and never `in-qa` or `ready-for-merge`.

That is an oversight, not a decision: a bug's verify loop **is** the analogue of a QA loop, with an
entry point and a passing exit. Both moments are opt-in, so adding them costs nothing to anyone who
has not opted in — while the current asymmetry would bite exactly the consumer who turns `in-qa` on
and finds it works for stories and tasks but not bugs, with no explanation anywhere. ~10 lines in
one skill-native file, no shared-resource churn.

Add a parity test: every pipeline with a verify/QA loop signals the same moments, or states in prose
why not.

**READMEs.** `skills/develop-story/README.md` (external-touchpoints table ~L25; tracker tables
~L470-478) and `skills/develop-task/README.md` (~L23; ~L455-460):

- Replace `GraphQL project-board mutations (Todo→In Progress→Done + auto-set Priority)` with the
  moment vocabulary and the CLI name.
- Replace `getTransitionsForJiraIssue, transitionJiraIssue (In Progress → In Review → Done)` — the
  pre-v0.34.0 world — with `jira-stage.js --stage …; Atlassian MCP only on the no-credentials
  fallback`.
- Replace the per-event rows (Phase 0c-reg / Step 4 / Step 7) the same way; add rows for the opt-in
  moments marked *off by default*.
- **Add a row to each README's own "Verification Checklist (for diagram maintainers)"**: every
  tracker operation named in these tables must map to a `--stage` invocation or a named script,
  never a raw API verb. That is what makes the staleness self-policing — it is why these two drifted
  for a whole release.

These READMEs are skill-native, not bundled, so no `npm run bundle` is needed for them.
`skills/develop-bug/README.md` is already clean.

**`docs/reference/configuration.md`** — the `project.yml` section that has never existed:

> **`project.yml`** — a second, GitHub-only config file at the repo root, holding board *identity*
> (`github.owner`, `github.repo`, `github.project_board_name`, `github.project_board_number`). The
> pipeline reads only `project_board_number`, by inline `grep`/`awk`. `setup-consumer.sh` does not
> write it. It is deliberately separate from `tracker-workflow.yaml`: identity (which board) and
> vocabulary (which columns) have different lifetimes and different authors.

Cross-link from `docs/concepts/getting-started.md:22,33`, which currently restates it.

## Key Patterns and References

- `setup-consumer.sh:307-317` — the "already exists → `kept (existing)`" pattern to reuse verbatim.
- `buildWorkflowRecord` — `jira-sync.js:2731-2769`. The preserve-hand-authored-intent discipline the
  JSON→YAML conversion must honour.
- `develop-pipeline-step-5-6-qa-loop.md:28-38` (`in-qa`, fires once) and `:250-260`
  (`ready-for-merge`, plus the merge-queue ordering note) — the two shapes Phases 1 and 2 mirror.
- `develop-story/SKILL.md:266-274` — the `blocked` guard rails, and the interruption-vs-blockage
  distinction. `changes-requested` is a side-state in the same sense.
- `jira-sync.js:1812` — the "meant to be `--check`ed in CI" comment this phase finally makes true.

## Testing Approach

- `npm test` after each phase; do not batch.
- Assert both new moments are **absent** from the default `pipeline:` map — the compatibility
  contract for every consumer without the file.
- Assert `--stage pr-merged` appears inside `develop-batch`'s per-item merge loop, not outside it.
- `--check` tests: non-zero on drift, 0 on clean, 0 without credentials, `--offline` issues no
  network call. Run `--check --offline` against `assets/tracker-workflow.default.yaml` in this
  repo's own CI.
- Scaffolding: run the wizard into a scratch dir twice; the second run must report `kept (existing)`
  and leave the file byte-identical.
- End-to-end: a scratch Projects v2 board with a post-merge showcase column; confirm the card lands
  there after `gh pr merge` and not before.
