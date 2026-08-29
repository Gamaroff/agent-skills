---
id: task.65.bug.1
title: 'The task eligibility floor admits `ready-for-review`, which `/develop-task` is contractually guaranteed to refuse'
type: bug
description: 'The registry fallback selects tasks at `ready-for-review`, but develop-task Phase 0c HALTs on that exact status. An unattended /develop-next loop therefore stops on a state that is normal and common — a task awaiting QA or merge — and the run-state file leaves it stuck there.'
tags: [task.65, develop-next, selection, eligibility]
status: ready-for-qa
severity: Major
priority: High
created: 2026-08-29
updated: 2026-08-29
---

# Bug Report: Task 65 — `ready-for-review` is selectable but not dispatchable

**Task**: [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)
**Bug ID**: TASK-65-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA (cycle 1)
**Date Found**: 2026-08-29

## Description

`TASK_ELIGIBLE_STATUSES` in `skills/develop-next/scripts/select-next.mjs` is
`{ready-for-development, in-progress, ready-for-review}`. The last value is the problem.

`develop-task`'s Phase 0c autonomous status table
(`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`) says:

| Status | Action |
| --- | --- |
| `Ready for Review` / `accepted` | **HALT** — task is already past development. |

So the registry frontier can nominate an item that the dispatcher it names is *contractually
guaranteed to refuse*. The two halves of the same feature disagree about what "outstanding" means.

## Steps to Reproduce

Reproduces **live on this branch, right now**, using the task's own document:

```bash
$ node skills/develop-next/scripts/select-next.mjs
{
  "status": "selected",
  "item": {
    "id": "T65",
    "command": "/develop-task",
    "commandArg": "docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md",
    "source": "task-registry",
    "documentStatus": "ready-for-review"
  }
}

$ grep '^status:' docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md
status: ready-for-review
```

`/develop-next` would dispatch `/develop-task <that path>`, and Phase 0c would HALT.

## Expected Behaviour

The frontier should only contain items the named command can actually act on. A task awaiting QA or
merge is not "work the loop should pick up" — it is work already in flight.

## Actual Behaviour

`/develop-next` selects it, dispatches, and the pipeline HALTs with "task is already past
development". Per `develop-next` SKILL.md Step 1: *"If the pipeline HALTs … **STOP** — surface the
pipeline's own HALT report verbatim, send a push notification, do not merge, do not tick. Leave the
run-state file in place so the next invocation resumes here."*

## Impact

**This defeats the purpose of the feature in the case it is most likely to meet.**

- A task sitting at `ready-for-review` is *normal and common* — it is the state of every task between
  development and merge. In this repo, row 58 sat at `ready-for-review` until this very PR corrected
  it, and row 65 sits there now.
- An unattended `/loop /develop-next` or `loop-supervisor` run **stops** on the first such task.
- Because the run-state file is left in place, the next invocation resumes at the same item — so the
  loop does not merely stop once, it **cannot self-recover**.
- The task exists to stop the loop halting for a reason that is not "no work left". This introduces a
  new one.

It is a rung below the original bug in severity only because it halts *loudly*: an operator sees a
HALT report rather than a false "roadmap-complete". It is not silent, so it is Major/HIGH rather than
Critical.

## Root Cause

The eligibility floor was specified in the task document (§ Scope, § Success Criteria 5) as
`ready-for-development`, `in-progress` and `ready-for-review`, and the implementation is faithful to
it. The defect is in the specification: it was written from the *document lifecycle* ("which statuses
mean outstanding?") without checking it against the *dispatcher's* accepted set. Step 2's review did
not catch it either — both looked at `document-status-lifecycle.md` and neither looked at
`develop-pipeline-step-0-resolve-and-prepare.md`.

The bug case is correct and needs no change: `BUG_ELIGIBLE_STATUSES` is `{new, reopened}`, and
`develop-bug` Step 0 accepts `new`, `reopened`, `in-progress` and `ready-for-qa` — a superset, so
every eligible bug is dispatchable.

## Recommendation

Drop `ready-for-review` from `TASK_ELIGIBLE_STATUSES`, leaving
`{ready-for-development, in-progress}` — both of which `develop-task` Phase 0c answers with "Proceed
normally", making the frontier a **subset** of the dispatchable set, as the bug side already is.

Then make the relationship explicit rather than incidental, so it cannot drift back:

1. State in `references/roadmap-selection.md` that the eligibility floor must be a subset of the
   statuses the dispatching pipeline accepts, and name that source.
2. Add a test asserting exactly that — that every value in `TASK_ELIGIBLE_STATUSES` is one
   `develop-task` proceeds on, and every value in `BUG_ELIGIBLE_STATUSES` one `develop-bug` proceeds
   on. Without it this is a comment, not a constraint.
3. Update the task document's § Scope and SC5 to match, so document and code do not disagree.

**Do not** instead widen `develop-task` to accept `Ready for Review` — that gate is load-bearing and
protects against re-developing finished work.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-29

The report's root-cause analysis was confirmed rather than re-derived: `TASK_ELIGIBLE_STATUSES`
carried `ready-for-review`, and `develop-task`'s Phase 0c table answers that status with HALT. What
the investigation added was the *shape of the rule* that had been missing. The bug side was already
correct — `{new, reopened}` is a strict subset of the four statuses `develop-bug` Step 0 proceeds on —
so the defect was not "a wrong value" but "a constraint nobody had written down", which is why it
survived authoring, review and development.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-29

**Fix**: `ready-for-review` removed from `TASK_ELIGIBLE_STATUSES`, leaving
`{ready-for-development, in-progress}`. `develop-task` was **not** widened — that gate is
load-bearing and protects against re-developing finished work.

**The value change is the small half.** The constraint is now *executable*:
`evals/develop-next/unit/select-next.test.mjs` §"eligibility floor ⊆ dispatcher" parses
`develop-task`'s and `develop-bug`'s **own status tables** and asserts every value in each floor is a
status that dispatcher proceeds on. It restates neither table, so it re-checks itself if either
pipeline changes what it accepts — a comment would have decayed the moment someone edited a table two
directories away.

Both source tables are read from **git-tracked** paths (`shared/resources/…` and
`skills/develop-bug/references/…`) rather than through `.agents/skills/`, which is a gitignored
symlink: a test reading through it passes locally and fails in CI, the most expensive shape a defect
can take.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs` — floor narrowed; the rule stated where the sets are defined
- `evals/develop-next/unit/select-next.test.mjs` — 3 new tests (2 structural, 1 behavioural); SC5's floor sweep moved `ready-for-review` to the not-selectable list
- `skills/develop-next/references/roadmap-selection.md` — the rule, not just the values
- `docs/tasks/task.65.registry-aware-selection.md` — § Scope and SC5 corrected

**Mutation-proved** — three separate reverts, each reddening the tests that name it:

| Mutation | Reddened |
| --- | --- |
| `ready-for-review` put back in the floor | 3 — including the structural test, on the exact regression it is named after |
| Floor given `cancelled` (a status *neither* dispatcher accepts) | 2 — proves the parse is live, not hard-coded to one value |
| Dispatcher's table shape changed so its rows stop parsing | 1 — the test **fails** rather than passing on an empty set |

The third matters most: without its `sawRow` guard the structural test would have silently passed
against zero parsed rows, which is the vacuous-coverage failure this repo keeps finding.

**Verification Steps for QA**:

1. `node --test evals/develop-next/unit/select-next.test.mjs` — 113 pass.
2. Re-add `"ready-for-review"` to `TASK_ELIGIBLE_STATUSES` and confirm 3 tests go red.
3. Change `| \`Ready for Development\`` to `| Ready for Development` in
   `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` and confirm the structural test
   goes red rather than passing empty.
4. `node skills/develop-next/scripts/select-next.mjs` — with task 65's own document at
   `in-progress` it is selected; at `ready-for-review` it is not.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----------------------------------------- |
| 2026-08-29 | New | QA | Found in QA cycle 1; reproduces live |
| 2026-08-29 | In Progress | qa-fix | Root cause confirmed; rule identified |
| 2026-08-29 | Ready for QA | qa-fix | Floor narrowed + structural test added; mutation-proved 3× |
