---
id: task.57
title: '[Task 57] Read-only verification, and /tracker-reconcile so the checklist is a ledger rather than a receipt'
type: task
description: 'Turns a one-shot handover into a loop that converges. Adds the read-only verification pass — read current state, tick what is already satisfied, flag what someone moved somewhere else — and /tracker-reconcile, which re-reads a committed handover days later and reports or applies what is outstanding. Reconcile refuses --apply under read-only, command and manual, because a reconcile that quietly applies under manual makes manual meaningless. Also lands the approve model and makes the accept gap loud in the implementation report and on the PR.'
tags: [restricted-access, verification, reconcile, skill]
category: infrastructure
status: planned
priority: Medium
risk_level: medium
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 12
---

# [Task 57] Read-only verification, and `/tracker-reconcile` so the checklist is a ledger rather than a receipt

**Task File**: [task.57.readonly-verification-and-reconcile.md](./task.57.readonly-verification-and-reconcile.md)

## Overview

Last of seven (51–57). Depends on 52 and on whichever interception tasks have landed — it degrades
cleanly, verifying only the kinds that exist.

## Motivation

### The checklist can only ever say "outstanding"

A committed handover records what was wanted at 14:04. It can never record what happened at 09:00
the next morning. The requirement driving this whole sequence is that drift be **visible** — and a
checklist that cannot represent being half-done stops being informative the moment someone starts
working it.

### Only something later can close the accept gap

`finalise` writes `status: accepted` and moves on, by design. Something has to be able to say, later,
"the board caught up". That something needs the *artifact* as its input, not the run — which is why
it is a separate skill and not a `--reconcile` flag on `finalise`. Reconcile happens days later, by a
human, possibly on a different branch, with no work item in flight.

### Read-only is the only restricted model that can answer "did someone already do this?"

It holds a credential. That turns "do these six things" into "these two are still outstanding",
which is the difference between a checklist people use and one they skip.

## Decisions

| Decision | Why |
| -------- | --- |
| **`divergent` is a first-class state, not a flavour of `pending`** | Someone moved the card somewhere neither the pipeline's plan nor its starting point expected. `gh-stage.js` and `jira-stage.js` already treat exactly this as `would-regress` — informational, "the board is ahead of the pipeline". A script that silently drags a card *backwards* because the plan is stale is the same class of bug as the "picked To Do because it was first" incident. |
| **An ambiguous match resolves to `unverifiable`, never `satisfied`** | Same lineage. On two or more candidate matches, do not guess. `unverifiable` must never be coerced to `satisfied`. |
| **A satisfied action is ticked, not deleted** | Deleting it makes the checklist lie about what the run wanted. Item count always equals record count. Drift visible, never silent. |
| **Reconcile **refuses** `--apply` under `read-only`, `command` and `manual`** | The load-bearing decision. A reconcile that quietly applies under `manual` is a back door around the policy the consumer configured, and makes `manual` meaningless. It refuses, names the blocking system, and re-renders. |
| **Change Log: deferral writes no row; a reconcile-executed mutation does** | `document-change-log.md` states that rows record *events*, not attempts. A deferred transition is a non-event, and a row claiming `Status → Done` would assert history that did not happen — unfalsifiable, and contradicted by the board forever. Observing something already satisfied is also not an event: the tracker's own history has it, with the real actor. Only an action reconcile *performed* earns a row. |
| **`git push` verification is credential-free** | `git ls-remote origin <branch>` compared against the local sha. No API, no token — worth noting because it is the one verification that works in every access model. |

## Scope

**In scope:** the verification pass and its reads; the four states; the `/tracker-reconcile` skill
including its refusal; the `approve` model's batched confirmation; the accept-gap reporting; the
amendments to the "never skip Step 7" rule.

**Out of scope:** a CI gate ("no item may sit accepted with drift older than N days"). Recorded as a
follow-up, not built.

## The four states

| State | Condition | Checklist | Script |
| ----- | --------- | --------- | ------ |
| `satisfied` | Read matched the desired value | Ticked, struck through, observed value and time | Short-circuited |
| `pending` | Read did not match, or no read is defined | Unticked | Runs |
| `divergent` | Observed a value that is neither desired nor the pre-action value | Unticked, `⚠️ observed X, wanted Y` | Skipped with a warning unless `--all` |
| `unverifiable` | Read failed, was ambiguous, or the kind has no reliable read | Unticked, "cannot verify — check by hand" | Runs, unguarded |

Most reads reuse things the repo already ships: `gh-stage.js --probe-board` covers all four board
kinds, `jira-stage.js --print-plan` supplies the transition targets, and the `sync-jira-*
--check-card` offline preflight already exists.

**Comment idempotency is the one genuinely hard read** and is solved by the marker from
[task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md). Where the marker is absent
— a human retyped the comment — a coarse heuristic may match, and on more than one match the answer
is `unverifiable`.

## Implementation Plan

1. **Verification recipes** per kind; the read pass; state derivation.
2. **Renderer changes** — ticks, strike-through, the divergence warning, the state counts.
3. **`skills/tracker-reconcile/`** — `/tracker-reconcile [<work-item-dir> | <handover.json> | --all]
   [--apply] [--json]`. Default is check-only and mutates nothing remote. Rewrites the checklist's
   boxes in place, updates the sidecar, sets frontmatter `status:` to
   `outstanding` | `partial` | `complete`, prints the summary. Exit 0 with a `reason`, per the
   established convention.
4. **`approve`** — one batched confirmation at handover via `AskUserQuestion`; approved records
   execute. Non-TTY degrades to `command` output rather than hanging or assuming consent.
5. **The accept gap made loud** — the `## Tracker Actions Required` section populated, a
   `**Tracker debt:**` line in the report's Completion block, and a PR comment carrying the checklist
   via the existing `not-on-board` escalation path.
6. **Amend the standing rule** — `docs/reference/anti-patterns.md:61` and `docs/reference/faq.md:19`
   say `finalise` must always run its side-effects. That rule's stated harm is *silent* drift.
   Deferring with a loud, committed, reviewable record is not the skip it prohibits, and both
   documents need one paragraph saying so. Without it the next reader reads this mode as a violation
   and "fixes" it.
7. Tests, docs, catalog regeneration, `npm run bundle`.

## Files Summary

| File | Change |
| ---- | ------ |
| `skills/tracker-reconcile/SKILL.md` | **new** skill |
| `shared/resources/handover-render.js` | states, ticks, divergence |
| `shared/resources/handover-verify.js` | **new** — the read pass |
| `shared/resources/develop-pipeline-step-7-finalise.md` | accept-gap reporting |
| `docs/reference/anti-patterns.md`, `docs/reference/faq.md` | amend the Step 7 rule |
| `docs/reference/skill-catalog.md` | regenerate |

## Testing Strategy

| Case | Asserted |
| ---- | -------- |
| `read-only` full run | **No mutation reaches the network** — driven against a stub that throws on any mutating argv |
| Already-done action | `satisfied`; ticked, not deleted; item count unchanged |
| Card moved elsewhere | `divergent`; not auto-applied without `--all` |
| Two marker matches | `unverifiable` — never `satisfied` |
| Read fails | `unverifiable`; the run does not abort |
| `--apply` under `manual` / `command` / `read-only` | **Refused**, naming the blocking system |
| `--apply` under `full` | Executes the outstanding actions |
| Reconcile twice | Byte-identical artifacts — idempotent |
| Change Log | A row **only** for actions reconcile executed; none for deferral or observation |
| `finalise` under `manual` | Writes `accepted` **and** the debt section is non-empty — both, or red |
| `approve`, non-TTY | Degrades to `command` output; never assumes consent |

**Mutation-prove:** let a mutation through in `read-only` → red · delete satisfied items → the count
test → red · coerce `unverifiable` to `satisfied` → red · allow `--apply` under `manual` → the
refusal test → red · write a Change Log row on observation → red · make `finalise` refuse to accept →
that test → red.

The `finalise` test is worth naming: the accept gap is a **decision**, so it is pinned so a future
reader cannot quietly "fix" it into a halt.

## Success Criteria

- [ ] `read-only` performs no mutation, proven against a throwing stub
- [ ] Four states derived correctly; `unverifiable` never coerced to `satisfied`
- [ ] Satisfied actions ticked, not deleted; item count always equals record count
- [ ] `/tracker-reconcile` ticks back into the committed checklist and updates the sidecar
- [ ] `--apply` refused under every non-`full` model, naming the blocker
- [ ] Reconcile is idempotent
- [ ] Change Log rows only for executed actions
- [ ] `finalise` still accepts locally **and** records the debt loudly
- [ ] The anti-patterns and FAQ entries amended so the mode is not read as a violation
- [ ] Every invariant watched failing; `npm test`, `validate:all` green; catalog regenerated; bundled

## Risk Assessment

**Medium** — a new skill plus renderer changes; nothing on the critical path of an unrestricted run.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **Reconcile becomes a policy back door** | `--apply` is the obvious convenience | The refusal is the load-bearing behaviour and is mutation-proven; it names the blocking system rather than failing vaguely |
| **A false `satisfied` hides real drift** | Heuristic comment matching | Ambiguity resolves to `unverifiable`; the marker is the primary mechanism and the heuristic only a fallback |
| **Dragging a card backwards** | A stale plan meets a board someone advanced | `divergent` is a distinct state and is not applied without `--all` |
| **The amended Step 7 rule is read as licence to skip** | Loosening an anti-pattern is delicate | The amendment states the distinction explicitly — deferral with a committed record is not a skip — and points at the artifact that proves it |

## Rollback Plan

`git revert <sha>` then `npm run bundle` and regenerate the catalog. Handover artifacts from earlier
tasks remain valid and readable; only the tick-back loop is lost.

## References

- [`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md) — "rows record events, not attempts"
- [`docs/reference/anti-patterns.md`](../../../docs/reference/anti-patterns.md) — the Step 7 rule being amended
- [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md) — the comment marker verification depends on
