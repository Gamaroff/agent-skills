---
id: task.54
title: '[Task 54] Intercept GitHub board mutations, and give gh-stage.js the credential-free plan its sibling already has'
type: task
description: 'Makes restricted access real for GitHub Projects v2. Task 53 already gated add-to-board and Status inside gh-stage.js; this task closes two gaps in that gate and guards the two board-field shell helpers, so Priority and Estimate are covered too. Along the way it closes a real asymmetry: jira-stage.js has --print-plan, which runs deliberately before its auth check and needs no credentials, while gh-stage.js has no equivalent and its --dry-run requires gh auth and a live board read. That asymmetry is a prerequisite here, because a manual-mode consumer has no gh auth and still needs to be told which column to move the card to.'
tags: [restricted-access, github, projects-v2, interception, gh-stage]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-08-17
updated: 2026-08-19
estimated_effort_hours: 8
github_issue: 232
---

# [Task 54] Intercept GitHub board mutations, and give `gh-stage.js` the credential-free plan its sibling already has

**Task File**: [task.54.github-board-interception.md](./task.54.github-board-interception.md)

**GitHub Issue**: [#232](https://github.com/Gamaroff/agent-skills/issues/232)

**Status**: Ready for Review

**Review**: ✅ All review recommendations from `task.54.review.1.github-board-interception.md` implemented 2026-08-19

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

`gh-stage.js` has no equivalent, and its `--dry-run` is not a substitute: the `ghAvailable` call at
`:955` runs before the `args.dryRun` branch at `:1212`, so dry-run needs `gh` auth and a live board
read. This is not only a `manual`-mode problem: the deferred records task.53's gate already writes
carry `verify.cmd` pointing at `--dry-run`, so today they hand the operator a verification step that
cannot run on the machine that produced them.

That is fatal here. A `manual`-mode consumer has no `gh` auth by definition, and the checklist must
still say *"move the card to **Ready for Review**"* using the consumer's real column name. Without a
credential-free plan the GitHub path can only emit "move the card somewhere", which is useless.

So `gh-stage.js --print-plan` is a prerequisite, not a nice-to-have — and it is worth having on its
own merits, since it makes the two stage CLIs symmetric and lets `--check` reason about a board
before anyone has authenticated.

## Technical Background

### Current architecture

Four distinct things write to a GitHub Projects v2 board, and they do not share a path:

| Board write | Owner | Gated today? |
| ----------- | ----- | ------------ |
| Board membership (`gh project item-add`) | `gh-stage.js` `ensureOnBoard:527`, under `--add-to-board` | ✅ task.53's gate |
| Status field | `gh-stage.js` `setOption:573` | ✅ task.53's gate |
| Priority field | `set-github-project-priority.sh` → `gh api graphql` directly | ❌ |
| Estimate field | `set-github-project-estimate.sh` → `gh api graphql` directly | ❌ |

`gh-stage.js` deliberately owns the Status field and nothing else, which is why the other two fields
have their own scripts and why those scripts need their own guard.

Separately, ~38 non-blocking `gh` mutations across the skill corpus run through
`tracker_call_with_retry` (`resolve-platform.sh:505`), a variadic retry wrapper with no notion of
access mode.

### Target architecture

The same four writes, all four gated; the retry wrapper renamed to say what it does and given a mode
check that covers every call site at once; and a credential-free `--print-plan` on `gh-stage.js` so a
`manual`-mode consumer — who by definition has no `gh` auth — can still be told the consumer's real
column name rather than "move the card somewhere".

## Decisions

| Decision | Why |
| -------- | --- |
| **`--print-plan` on `gh-stage.js`, mirroring the Jira one and placed above the auth gate** | The credential-free plan is what makes a `manual` checklist name the right column. Symmetry between the two CLIs is also its own reward — `finalise` already branches on a shared `reason` vocabulary and the divergence is a trap. |
| **~~Recording `exec`, not a new parameter~~ — superseded by task.53; the gate already exists** | This task was authored on 2026-08-17, two days before [task.53](../task.53.jira-rest-interception/task.53.jira-rest-interception.md) merged. Its commit `bfbebc8` landed an **access gate** at `gh-stage.js:828-940`, placed between arg-parsing and `ghAvailable`, that records a `github.board.field-set` and returns `reason: "deferred"`, exit 0. Because it returns *before* the first credential read, it covers the whole invocation — `--add-to-board` included — which is strictly broader than a recording `exec` at two call sites. The original reasoning still holds and is kept for the reader: `makeExec(execImpl)` at `:264` **is** an injectable seam, consumed by `ensureOnBoard:527` and `setOption:573`, and the suite's throwing `gh` stub (`tests/gh-stage.test.mjs:8-12`) does prove it. It is simply no longer the cheapest route, and building it now would duplicate a shipped, tested gate. |
| **The remaining `gh-stage.js` work is two gaps in that gate, not a second layer** | The gate records the field-set but says nothing about board **membership** — under `--add-to-board` an unrestricted run would also `gh project item-add`, so a human following the checklist on an issue not yet on the board is told to set a field on an item that is not there. And its `verify.cmd` is `--dry-run --json`, which sits *below* `ghAvailable` — so on the very `manual`-mode machine that wrote the record, the verify command cannot run. `--print-plan` is the correct verify command, which is a second and independent argument for it. |
| **The two `.sh` board helpers get their own guard** | `set-github-project-priority.sh` and `set-github-project-estimate.sh` call `gh api graphql` directly rather than going through `gh-stage.js`, which deliberately owns only the Status field. Both already exit 0 unconditionally, so a guard is cheap. |
| **`tracker_call_with_retry` becomes `tracker_write`, old name kept as an alias** | It already wraps **38 `gh` mutations across 11 files** with exactly the right contract — variadic argv, passthrough stdout/stderr, the wrapped command's exit code. (Heaviest: `develop-pipeline-step-7-finalise.md` ×9, `qa-story/SKILL.md` ×7, `qa-task/SKILL.md` ×5.) Prepending a mode check covers all 38 with **zero call-site edits**. Keeping the alias means no skill breaks. |
| **The two `.sh` guards reuse `jira-sprint-lib.sh`'s shape rather than inventing one** | `jira-sprint-lib.sh:27-140` already solved this in task.53: source the resolver **in a subshell** (so it cannot clobber the caller's platform state), read both env tiers most-restrictive-wins (`ACCESS_TRACKER` from the resolver *and* the operator's `AGENT_SKILLS_ACCESS_TRACKER`), and locate `defer-mutation.js` via `$(dirname "${BASH_SOURCE[0]}")` so it resolves in-tree and in an installed skill alike. That file's own comments warn that open-coding the mode table made it "a FOURTH copy of a contract that already had three". Do not write the fifth. |
| **Only sites whose stdout is *not* consumed are wrapped** | `gh issue create` and the sub-issue-link graphql call feed their output into the next command. Wrapping those under a deferring mode returns nothing and the caller's `$( )` captures empty. They are [task.56](../task.56.tracker-issue-cli/task.56.tracker-issue-cli.md)'s problem, handled with a dependency edge rather than a wrapper. |

## Scope

**In scope:** `gh-stage.js --print-plan`; closing the two gaps in the existing `gh-stage.js` access
gate (board membership in the record; a credential-free `verify.cmd`); the two board-field helper
guards; `tracker_write` with its alias; the `resolve-platform.sh` coverage banner; the `deferred`
reason in `finalise`'s reason table.

**Out of scope (already done):** the `gh-stage.js` interception itself — task.53 landed it at
`gh-stage.js:828-940`. This task verifies and extends it; it does not rebuild it.

**Out of scope:** GitHub issue lifecycle (create/edit/close/reopen/comment/milestone/sub-issue) —
task.56. PR operations — VCS, out of scope for the sequence.

## Implementation Plan

**Do item 1 first** — items 2 and 3 both want a credential-free verify path, and it is item 1 that
provides one.

1. **`gh-stage.js --print-plan`** — mirror `jira-stage.js:344-392`; place it above the `ghAvailable`
   call (`gh-stage.js:955`), which is the first credential read; emit
   `{stage, reason:"plan", targets, from, terminal, source, authored}`.
2. **Close the two gaps in the existing access gate** (`gh-stage.js:828-940` — verify before editing;
   do **not** rebuild it):
   a. the deferred record must name the board **add** as well as the field-set when `--add-to-board`
      was passed, so the checklist does not tell a human to set a field on an item that is not on the
      board;
   b. `verify.cmd` must use `--print-plan`, not `--dry-run` — the latter sits below `ghAvailable` and
      so cannot run on the machine that produced the record.
3. **The two `.sh` helpers** — guard, record, keep exiting 0. Follow `jira-sprint-lib.sh:27-140`
   (subshell-sourced resolver, two env tiers most-restrictive-wins, `defer-mutation.js` located via
   `$(dirname "${BASH_SOURCE[0]}")`). Do not open-code the mode table.
4. **`resolve-platform.sh`** — `tracker_write` with the mode check; `tracker_call_with_retry` aliased.
   **In the same change**, update the coverage comment block and runtime banner at `:465-479`: it
   names this task by number and currently asserts "all GitHub issue and PR writes still proceed
   normally", which the `.sh` guards falsify for board-field writes. Its own instruction is "Keep this
   notice accurate as each one lands; a warning that overstates coverage is worse than none."
5. **`skills/finalise/SKILL.md:1178-1187`** — add `deferred` to the reason table. Its existing
   `not-on-board` escalation (`:1193`) already posts a PR comment ending "**Action required:**
   manually move the card to Done"; `deferred` reuses that path, pointing at the checklist.
6. Tests, docs, `npm run bundle`.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/gh-stage.js` | `--print-plan` (now `:844-894`); close the two gaps in the task.53 access gate (`:828-940` before this change, `:896-1046` after) |
| `shared/resources/set-github-project-{priority,estimate}.sh` | guard, per the `jira-sprint-lib.sh` shape |
| `shared/resources/resolve-platform.sh` | `tracker_write` + alias; the coverage banner; `_RP_SELF_DIR` for call-time path resolution |
| `shared/resources/defer-mutation.js` | `--resolve-access` (so the shell guards reuse the one mode table); `EXPECTED_KIND_COUNT` 21 → 22 |
| `shared/resources/tracker-access-record.md` | new `github.unknown-mutation` kind; totals 21 → 22 |
| `skills/finalise/SKILL.md` | reason table (`:1178-1187`) + escalation reuse (`:1193`) |
| `shared/resources/tests/stage-access-gate.test.mjs` | extend — `--print-plan` (incl. source-order), the two gate gaps, `--resolve-access`. This suite, not `gh-stage.test.mjs`: it already owns the access-gate harness (`explode("gh")`, `underAccess`, journal readback) that every one of these tests needs |
| `shared/resources/tracker-access.test.sh` | extend — `tracker_write`, the alias, the retry ladder and both `.sh` guards (§47) |
| `shared/resources/handover-render.js` | `KIND_PRESENTATION` entry for `github.unknown-mutation` — without it the renderers omit it from every checklist |
| `shared/resources/tests/handover-render.test.mjs` | roster totality counts 21 → 22 |
| `shared/resources/tests/fixtures/handover-all-kinds.jsonl` | 22nd record, for the new kind |
| `shared/resources/tests/jira-interception.test.mjs` | §10 banner wording; §12 bundled-copy pins 21 → 22 |
| `CHANGELOG.md` | `--print-plan`, the GitHub interception, the `deferred` reason |
| `docs/reference/tracker-workflow.md` | `--print-plan` on the GitHub path; the `deferred` reason |
| `shared/resources/platform-detection.md` | `tracker_write` and its alias |
| `docs/reference/troubleshooting.md` | new "the board column did not change" section — the full `reason` table with what to do about each |
| `docs/reference/configuration.md` | the `access.tracker` row understated coverage once GitHub was gated |

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
| A deferred record made with `--add-to-board` | Names the board **add** as well as the field-set |
| The `verify.cmd` on any deferred record | Runs to completion with no `gh` auth (i.e. uses `--print-plan`) |
| `tracker_call_with_retry` alias | Still resolves and behaves as before |
| A wrapped call under `full` | Retries 3× as today |
| `finalise` sees `deferred` | Treated as a recorded outcome, not an error; escalation posted |

**Mutation-prove:** place `--print-plan` below the auth gate → the no-auth test → red · let one
graphql mutation through → the no-write test → red · drop the alias → the alias test → red · make
`--print-plan` resolve a different target than `--dry-run` → the agreement test → red · treat
`deferred` as a failure in `finalise` → that test → red.

## Success Criteria

- [x] `gh-stage.js --print-plan` works with no credentials and no network, and agrees with `--dry-run`
- [x] Under a deferring mode no `gh` write verb is issued, proven by the existing throwing stub
- [x] All 4 board kinds record legibly, naming the consumer's real column
- [x] A record made with `--add-to-board` names the board add, not only the field-set
- [x] Every deferred record's `verify.cmd` runs with no `gh` auth
- [x] The `resolve-platform.sh` coverage banner names what is now gated and what still is not
- [x] `tracker_call_with_retry` still works under its old name
- [x] `finalise` treats `deferred` as a recorded outcome and escalates via the existing path
- [x] `full` mode behaviour unchanged; existing suite green (one banner assertion updated — see note)
- [x] `--print-plan` is documented alongside the Jira one, so the two CLIs read as siblings
- [x] `tracker_write` is documented in the canonical resolver spec, with the alias's reason
- [x] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

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

## Progress Tracking

- [x] 1. `gh-stage.js --print-plan` (credential-free, above the `ghAvailable` call)
- [x] 2a. Deferred record names the board add under `--add-to-board`
- [x] 2b. `verify.cmd` switched from `--dry-run` to `--print-plan`
- [x] 3. `set-github-project-priority.sh` guarded
- [x] 3. `set-github-project-estimate.sh` guarded
- [x] 4. `tracker_write` + `tracker_call_with_retry` alias
- [x] 4. `resolve-platform.sh` coverage banner updated
- [x] 5. `deferred` row in `finalise`'s reason table, reusing the `not-on-board` escalation
- [x] 6. Tests extended (25 new) and each invariant watched failing (6 mutations)
- [x] 6. Docs updated (`tracker-workflow.md`, `platform-detection.md`, `troubleshooting.md`)
- [x] 6. `npm test` + `npm run validate:all` green; `npm run bundle` committed

## References

- [`shared/resources/jira-stage.js:344-392`](../../../shared/resources/jira-stage.js) — the `--print-plan` being mirrored
- [`shared/resources/gh-stage.js:828-940`](../../../shared/resources/gh-stage.js) — the access gate task.53 already landed; verify before editing. **Post-implementation it sits at `:896-1046`**, displaced by `--print-plan` at `:844-894`

> **Line anchors in the Implementation Plan and Decisions above are as-of-authoring**, i.e. before
> this task's own edits. They were correct when the implementer read them and are left as the record
> of what was inspected. Anchors that name the *current* file are marked as such.
- [`shared/resources/jira-sprint-lib.sh:27-140`](../../../shared/resources/jira-sprint-lib.sh) — the shell-guard shape the two `.sh` helpers must reuse
- [`shared/resources/resolve-platform.sh:465-479`](../../../shared/resources/resolve-platform.sh) — the coverage banner that names this task by number
- [`skills/finalise/SKILL.md:1178-1193`](../../../skills/finalise/SKILL.md) — the reason table and escalation format

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-19 | 1.1 | Review (7/10 → 9/10) — item 2 re-scoped: task.53 already landed the `gh-stage.js` access gate, so the recording-`exec` design is superseded and the remaining work is two gaps in that gate (board membership in the record; credential-free `verify.cmd`). Added the `resolve-platform.sh` coverage banner and two test files to scope, pointed the `.sh` guards at the `jira-sprint-lib.sh` precedent, corrected six drifted line anchors and the "15 mutations" count (actual 38), and added the missing Technical Background, Progress Tracking and Change Log sections. | review-task |
| 2026-08-19 |  | Status → ready-for-development | review-task |
| 2026-08-19 |  | Implemented — 13 files, 25 new tests (11 JS, 14 shell), 6 invariants mutation-proved | develop |
