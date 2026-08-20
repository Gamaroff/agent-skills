---
id: task.57
title: '[Task 57] Read-only verification, and /tracker-reconcile so the checklist is a ledger rather than a receipt'
type: task
description: 'Turns a one-shot handover into a loop that converges. Adds the read-only verification pass — read current state, tick what is already satisfied, flag what someone moved somewhere else — and /tracker-reconcile, which re-reads a committed handover days later and reports or applies what is outstanding. Reconcile refuses --apply under read-only, command and manual, because a reconcile that quietly applies under manual makes manual meaningless. Also lands the approve model and makes the accept gap loud in the implementation report and on the PR.'
tags: [restricted-access, verification, reconcile, skill]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-08-17
updated: 2026-08-20
estimated_effort_hours: 12
github_issue: 235
---

# [Task 57] Read-only verification, and `/tracker-reconcile` so the checklist is a ledger rather than a receipt

**Task File**: [task.57.readonly-verification-and-reconcile.md](./task.57.readonly-verification-and-reconcile.md)

**GitHub Issue**: [#235](https://github.com/Gamaroff/agent-skills/issues/235)

**Status**: Ready for Review

**Review**: ✅ All review recommendations from `task.57.review.1.readonly-verification-and-reconcile.md` implemented 2026-08-20

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

## Technical Background

### Current

`handover-render.js` renders the committed checklist from `.claude/state/tracker-actions.jsonl`
write-once, at handover time: it knows `satisfied` (recorded as executed), outstanding, and failures,
but performs no reads against the tracker. Once committed, the checklist never changes — it is a
receipt of what the run wanted, not a ledger of what has since happened. Nothing in the repo can
answer "did someone already do this?" after the fact: `finalise` writes `status: accepted` and moves
on, and the accept gap (board not yet caught up) is invisible unless a human remembers to look.

The reads this task needs already exist as primitives: `gh-stage.js --probe-board` (board kinds),
`jira-stage.js --print-plan` (transition targets), the `sync-jira-* --check-card` offline preflight,
the comment idempotency marker from [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md),
and `git ls-remote` for push verification.

### Target

A verification pass (`shared/resources/handover-verify.js`) reads current tracker state per action
kind and derives one of four states — `satisfied` / `pending` / `divergent` / `unverifiable` — which
the renderer displays as ticks, strike-throughs, and divergence warnings without ever deleting items.
A new `/tracker-reconcile` skill re-runs that pass against a committed handover days later, rewrites
the checklist boxes in place, updates the sidecar, and (only under `access: full`, only with
`--apply`) executes what is still outstanding. The `approve` model batches one confirmation at
handover; the accept gap becomes loud in the implementation report and on the PR.

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
| `skills/tracker-reconcile/scripts/tracker-reconcile.js` | **new** — the reconcile CLI (refusal, tick-back, apply) |
| `skills/tracker-reconcile/tests/tracker-reconcile.test.js` | **new** — 16 tests incl. the refusal matrix |
| `shared/resources/handover-render.js` | four states, ticks/strike-through, divergence guard, `renderersForMode` |
| `shared/resources/handover-verify.js` | **new** — the read pass, recipes, state derivation, read-only allowlist |
| `shared/resources/tests/handover-verify.test.mjs` | **new** — 19 tests incl. the throwing-stub no-mutation proof |
| `shared/resources/tracker-access-record.md` | `verification` field documented; `observed` = pre-action baseline |
| `shared/resources/develop-pipeline-step-7-finalise.md` | accept-gap reporting + `approve` handover prose + checklist item |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | `**Tracker debt:**` line in both report templates |
| `docs/reference/anti-patterns.md`, `docs/reference/faq.md` | amend the Step 7 rule |
| `docs/reference/{commands,activation-phrases,troubleshooting,glossary}.md` | "not shipped" claims flipped to live behaviour |
| `docs/concepts/{restricted-access,which-access}.md`, `docs/runbooks/restricted-access.md` | approve + reconcile now described as shipped |
| `tests/restricted-access-docs.test.js` | accept-gap decision pinned (both-or-red) |
| `package.json` | `skills/tracker-reconcile/tests/*.test.js` added to the test glob |
| `docs/reference/skill-catalog.md` | regenerated |
| `CHANGELOG.md` | Unreleased entry |

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

- [x] `read-only` performs no mutation, proven against a throwing stub
- [x] Four states derived correctly; `unverifiable` never coerced to `satisfied`
- [x] Satisfied actions ticked, not deleted; item count always equals record count
- [x] `/tracker-reconcile` ticks back into the committed checklist and updates the sidecar
- [x] `--apply` refused under every non-`full` model, naming the blocker
- [x] Reconcile is idempotent
- [x] Change Log rows only for executed actions
- [x] `finalise` still accepts locally **and** records the debt loudly
- [x] The anti-patterns and FAQ entries amended so the mode is not read as a violation
- [x] Every invariant watched failing; `npm test`, `validate:all` green; catalog regenerated; bundled

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

## Progress Tracking

- [x] 1. Verification recipes per kind; the read pass; state derivation (`handover-verify.js`)
- [x] 2. Renderer changes — ticks, strike-through, divergence warning, state counts
- [x] 3. `skills/tracker-reconcile/` — check-only default, in-place tick-back, frontmatter `status:`
- [x] 4. `approve` — batched confirmation; non-TTY degrades to `command`
- [x] 5. Accept gap made loud — report section, `**Tracker debt:**` line, PR comment
- [x] 6. Amend the standing rule — `anti-patterns.md` and `faq.md`
- [x] 7. Tests, docs, catalog regeneration, `npm run bundle`

## QA Testing Results

**QA Status**: PASS (cycle 3)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-20
**Quality Score**: 92/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.57.qa.3.readonly-verification-and-reconcile.md](./task.57.qa.3.readonly-verification-and-reconcile.md) (cycles 1–2: [qa.1](./task.57.qa.1.readonly-verification-and-reconcile.md), [qa.2](./task.57.qa.2.readonly-verification-and-reconcile.md))
- **Gate File**: [task.57.gate.3.readonly-verification-and-reconcile.yml](./task.57.gate.3.readonly-verification-and-reconcile.yml) (cycles 1–2: [gate.1](./task.57.gate.1.readonly-verification-and-reconcile.yml), [gate.2](./task.57.gate.2.readonly-verification-and-reconcile.yml))

### Test Coverage Summary
- **Tests Executed**: 1653 (fresh full run, all green; 46 new across the task)
- **Phases Verified**: 7/7
- **Critical Issues**: 0 remaining (19 findings closed across 3 QA cycles)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Three-cycle QA loop with blocking code review: cycle 1 found 8 bugs (highest: step-7 engines not bundled — MODULE_NOT_FOUND for consumers); cycle 2's adversarial pass over the fixes found 3 HIGH defects the fixes introduced (wrong-extension artifacts, tick revoked on silence, ttyConfirm injection); cycle 3 found 4 coherence defects, fixed in-cycle. Final gate PASS 92/100, deployment APPROVED. 10 named mutations proven red across the run.

## Implementation Notes

**Completed**: 2026-08-20 · **Tests**: 36 new (19 `handover-verify.test.mjs` + 16 `tracker-reconcile.test.js` + 1 accept-gap pin), 1643 total green · `validate:all` 116/116 · catalog regenerated · bundled.

### Approach

- **The pre-action baseline lives in the record itself.** `divergent` needs three values — desired, observed, and where the card started — but deferred records carry no `from`. The first verification pass that reads a non-desired value stores it as the baseline (in `observed` / `verification.baseline`); a later pass reading a third value can then say `divergent` instead of guessing. Handover-time verification is therefore what arms divergence detection for reconcile-time.
- **The no-mutation invariant is enforced twice**: `handover-verify.js` checks every argv against a read-only allowlist before exec (fail-closed → `unverifiable`), and the suite drives the pass with a stub that throws on any mutating shape — so weakening either layer goes red.
- **Idempotence is annotation retention, not clock discipline**: a re-read that agrees with the stored `verification` keeps it verbatim (timestamp included), and the checklist frontmatter's `updated:` derives from annotations, not the clock. Reconcile twice → byte-identical, proven.
- **The refusal covers `approve` too** — the Decisions table names read-only/command/manual, but the Success Criteria's "every non-`full` model" governs: under `approve` the human consents at handover via the batched prompt, not via a reconcile side door.
- **`renderersForMode(mode, {tty})`** in `handover-render.js` is where "approve without a tty degrades to `command`" is a testable function rather than prose.
- The `verification` field is an additive, optional record field — documented in `tracker-access-record.md`; schema `v` stays 1.

### What the work found that the plan did not predict

- `jira.backlog.add` and `jira.sprint.move-issues` have no reliable read (no board id in the record; no stable "which sprint now" answer days later), so they resolve `unverifiable` rather than getting recipes that guess.
- The reconcile CLI re-renders the `.sh` only where one already exists — re-creating it on a `manual` handover would widen that mode's renderer selection after the fact.

### Mutation-prove log (all red, then restored green)

ambiguous→satisfied coercion (7 red) · refusal dropped under `manual` (13 red) · satisfied records deleted (5 red) · Change Log row on observation (7 red) · divergent auto-applied (3 red) · finalise re-read as a halt (3 red).

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-20 | 1.1 | Review (9/10) — no critical findings; Technical Background, Progress Tracking and Change Log sections added; body Status line added | review-task |
| 2026-08-20 |  | Status → ready-for-development | review-task |
| 2026-08-20 |  | Implemented — 20+ files, 36 new tests (1643 total green); all mutations proven red | develop |
| 2026-08-20 |  | QA gate FAIL (40/100) — 1 high, 5 medium, 2 low from blocking code review | qa-task |
| 2026-08-20 |  | QA cycle 2 gate FAIL (40/100) — cycle-1 fixes verified; 3 high defects introduced by the fixes (wrong-extension artifacts, tick revoked on unverifiable read, ttyConfirm injection) | qa-task |
| 2026-08-20 |  | QA cycle 3 gate PASS (92/100) — cycle-2 fixes verified; 4 coherence findings fixed in-cycle | qa-task |
| 2026-08-20 |  | QA findings fixed — gate PASS (92/100), 3 iterations, 19 defects closed | qa-fix |

## References

- [`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md) — "rows record events, not attempts"
- [`docs/reference/anti-patterns.md`](../../../docs/reference/anti-patterns.md) — the Step 7 rule being amended
- [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md) — the comment marker verification depends on
