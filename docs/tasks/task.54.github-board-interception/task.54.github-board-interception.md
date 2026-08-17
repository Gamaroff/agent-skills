---
id: task.54
title: '[Task 54] Intercept GitHub board mutations, and give gh-stage.js the credential-free plan its sibling already has'
type: task
description: 'Makes restricted access real for GitHub Projects v2. Injects a recording exec into gh-stage.js and guards the two board-field shell helpers, covering add-to-board, Status, Priority and Estimate. Along the way it closes a real asymmetry: jira-stage.js has --print-plan, which runs deliberately before its auth check and needs no credentials, while gh-stage.js has no equivalent and its --dry-run requires gh auth and a live board read. That asymmetry is a prerequisite here, because a manual-mode consumer has no gh auth and still needs to be told which column to move the card to.'
tags: [restricted-access, github, projects-v2, interception, gh-stage]
category: refactoring
status: planned
priority: High
risk_level: medium
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 8
---

# [Task 54] Intercept GitHub board mutations, and give `gh-stage.js` the credential-free plan its sibling already has

**Task File**: [task.54.github-board-interception.md](./task.54.github-board-interception.md)

## Overview

Fourth of seven (51–57), and independent of
[task.53](../task.53.jira-rest-interception/task.53.jira-rest-interception.md) — either may ship
first. Depends on 51 and 52.

## Motivation

Board drift is the most visible symptom of the problem this sequence addresses: a column that says
`In Progress` for work that merged last week is what a standup actually notices. Covering the board
alone is worth shipping.

### The asymmetry that has to be closed first

`jira-stage.js --print-plan` (`:344-392`) reads the consumer's `tracker-workflow.yaml` and emits the
resolved target and hop route **with no credentials and no network**, deliberately running *before*
the auth check — its own comment says the fallback "exists precisely because credentials are
absent".

`gh-stage.js` has no equivalent, and its `--dry-run` is not a substitute: the `ghAvailable` gate at
`:811` runs before the `args.dryRun` branch at `:1068`, so dry-run needs `gh` auth and a live board
read.

That is fatal here. A `manual`-mode consumer has no `gh` auth by definition, and the checklist must
still say *"move the card to **Ready for Review**"* using the consumer's real column name. Without a
credential-free plan the GitHub path can only emit "move the card somewhere", which is useless.

So `gh-stage.js --print-plan` is a prerequisite, not a nice-to-have — and it is worth having on its
own merits, since it makes the two stage CLIs symmetric and lets `--check` reason about a board
before anyone has authenticated.

## Decisions

| Decision | Why |
| -------- | --- |
| **`--print-plan` on `gh-stage.js`, mirroring the Jira one and placed above the auth gate** | The credential-free plan is what makes a `manual` checklist name the right column. Symmetry between the two CLIs is also its own reward — `finalise` already branches on a shared `reason` vocabulary and the divergence is a trap. |
| **Recording `exec`, not a new parameter** | `makeExec(execImpl)` at `:263` is already injectable and already consumed by `ensureOnBoard:526` and `setOption:572`. The existing test suite stubs `gh` and fails on any write verb (`tests/gh-stage.test.mjs:9`), so the seam is proven, not hoped for. |
| **The two `.sh` board helpers get their own guard** | `set-github-project-priority.sh` and `set-github-project-estimate.sh` call `gh api graphql` directly rather than going through `gh-stage.js`, which deliberately owns only the Status field. Both already exit 0 unconditionally, so a guard is cheap. |
| **`tracker_call_with_retry` becomes `tracker_write`, old name kept as an alias** | It already wraps 15 `gh` mutations with exactly the right contract — variadic argv, passthrough stdout/stderr, the wrapped command's exit code. Prepending a mode check covers all 15 with **zero call-site edits**. Keeping the alias means no skill breaks. |
| **Only sites whose stdout is *not* consumed are wrapped** | `gh issue create` and the sub-issue-link graphql call feed their output into the next command. Wrapping those under a deferring mode returns nothing and the caller's `$( )` captures empty. They are [task.56](../task.56.tracker-issue-cli/task.56.tracker-issue-cli.md)'s problem, handled with a dependency edge rather than a wrapper. |

## Scope

**In scope:** `gh-stage.js --print-plan`; recording `exec`; the two board-field helper guards;
`tracker_write` with its alias; the `deferred` reason in `finalise`'s reason table.

**Out of scope:** GitHub issue lifecycle (create/edit/close/reopen/comment/milestone/sub-issue) —
task.56. PR operations — VCS, out of scope for the sequence.

## Implementation Plan

1. **`gh-stage.js --print-plan`** — mirror `jira-stage.js:344-392`; place it above the `ghAvailable`
   gate; emit `{stage, reason:"plan", targets, from, terminal, source, authored}`.
2. **Recording `exec`** — under a deferring mode, `ensureOnBoard` and `setOption` record instead of
   executing, and the CLI returns `reason: "deferred"`, exit 0.
3. **The two `.sh` helpers** — guard, record, keep exiting 0.
4. **`resolve-platform.sh`** — `tracker_write` with the mode check; `tracker_call_with_retry` aliased.
5. **`skills/finalise/SKILL.md:1176-1192`** — add `deferred` to the reason table. Its existing
   `not-on-board` escalation already posts a PR comment ending "**Action required:** manually move
   the card to Done"; `deferred` reuses that path, pointing at the checklist.
6. Tests, docs, `npm run bundle`.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/gh-stage.js` | `--print-plan`; recording `exec`; `deferred` reason |
| `shared/resources/set-github-project-{priority,estimate}.sh` | guard |
| `shared/resources/resolve-platform.sh` | `tracker_write` + alias |
| `skills/finalise/SKILL.md` | reason table + escalation reuse |
| `shared/resources/tests/gh-stage.test.mjs` | extend |

## Testing Strategy

The existing suite already stubs `gh` and **fails on any write verb** — extend that harness rather
than building a second one.

| Case | Asserted |
| ---- | -------- |
| `full` mode | Byte-identical; existing suite green unchanged |
| `--print-plan` with no `gh` auth and no network | Emits the resolved target and exits 0 |
| `--print-plan` vs `--dry-run` on the same board | Same target — the credential-free path must not disagree with the credentialed one |
| `manual`, each of the 4 board kinds | One record each; no `gh` write verb issued |
| The two `.sh` helpers under `manual` | Record, still exit 0 |
| `tracker_call_with_retry` alias | Still resolves and behaves as before |
| A wrapped call under `full` | Retries 3× as today |
| `finalise` sees `deferred` | Treated as a recorded outcome, not an error; escalation posted |

**Mutation-prove:** place `--print-plan` below the auth gate → the no-auth test → red · let one
graphql mutation through → the no-write test → red · drop the alias → the alias test → red · make
`--print-plan` resolve a different target than `--dry-run` → the agreement test → red · treat
`deferred` as a failure in `finalise` → that test → red.

## Success Criteria

- [ ] `gh-stage.js --print-plan` works with no credentials and no network, and agrees with `--dry-run`
- [ ] Under a deferring mode no `gh` write verb is issued, proven by the existing throwing stub
- [ ] All 4 board kinds record legibly, naming the consumer's real column
- [ ] `tracker_call_with_retry` still works under its old name
- [ ] `finalise` treats `deferred` as a recorded outcome and escalates via the existing path
- [ ] `full` mode byte-identical; existing suite green unchanged
- [ ] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

## Risk Assessment

**Medium** — a well-tested file with a proven injection seam, but `finalise` and Step 0 both depend
on it.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **`--print-plan` disagrees with the live board** | It reads the ladder file; the board is the truth | Assert agreement with `--dry-run` on the same fixture. Where they differ, `--dry-run` wins and the checklist says the target is derived from the ladder file, not observed |
| **An unhandled `reason` treated as success** | `finalise`'s table already warns: never treat an unrecognised reason as success | The `deferred` row is added in the same change as the emitter, and the table's catch-all already handles the ordering hazard |
| **The alias is dropped in a later cleanup** | It looks redundant | A dedicated test, plus a comment at the definition saying why it exists |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. `--print-plan` is additive and could be kept independently
if only the interception needed reverting.

## References

- [`shared/resources/jira-stage.js:344-392`](../../../shared/resources/jira-stage.js) — the `--print-plan` being mirrored
- [`skills/finalise/SKILL.md:1176-1214`](../../../skills/finalise/SKILL.md) — the reason table and escalation format
