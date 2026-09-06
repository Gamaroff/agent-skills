---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-06'
related: 'none — cross-cutting (finalise Step 7 · sync-jira-* status drive)'
description: "finalise Step 7 transitions the card to Done and then re-runs sync-jira-* to re-point the Document link. Task 40 justified that order on the premise that the sync would then find the issue already in Done and no-op. On any project whose statusMap deliberately maps accepted to something other than Done — which the pipeline's own guidance recommends — the sync instead moves the card BACKWARDS out of the terminal status, and the resolution it was closed with is left stranded on a non-terminal status."
---

**Bug ID**: bug.11
**Related**: none — cross-cutting (finalise Step 7 · `sync-jira-*` status drive)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-09-06
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `skills/finalise/SKILL.md` Step 7 runs the Jira close-out in two blocks — transition to
Done, then re-run `sync-jira-{story,task}` with `--doc-branch` to re-point the Document link at the
durable branch. The order was set deliberately by task 40, whose QA record states the justification:

> *"now the transition runs first and **the sync no-ops**. Both still run in both orders, so a failure
> in either is still covered by the other."*

**That premise is false whenever the consumer's `jira.statusMap` maps `accepted` to anything other
than `Done`** — and the pipeline's own Step 7 guidance actively recommends exactly that
configuration: *"a board that wants a card to sit in a merge queue until the PR actually lands should
leave `done` to a human."* A project that follows that advice gets a sync which does **not** no-op.
It resolves `accepted` against its own `loadStatusMap`, finds a non-terminal candidate, and
**transitions the card backwards out of Done**.

**Expected Behavior**: the Document-link re-point is link-only. A card the ladder has just moved to a
terminal status stays there.

**Actual Behavior**: the card leaves the terminal status, and — because the backwards transition
carries no resolution change — the `resolution` set when it was closed is **left stranded on a
non-terminal status**. Such a card is invisible to `resolution IS EMPTY` backlog-hygiene queries
while also not appearing as done, so it is missing from both halves of the usual sweep.

## Steps to Reproduce

On a consumer whose `skills-config.yaml` contains a non-`Done` mapping for `accepted` — e.g.

```yaml
jira:
  statusMap:
    accepted:
      - Waiting for merge
      - Waiting for Review
```

1. Finalise a task so its frontmatter reads `status: accepted`.
2. Transition its card to `Done` (Step 7 block 1), supplying whatever `resolution` the workflow
   requires. Verify: status `Done`, resolution `Done`.
3. Run Step 7 block 3 — `sync-jira-task --file <doc> --doc-branch develop`.
4. Re-read the issue.

**Observed** (RAPP-715, rebirth-wallet, 2026-09-05): status came back `Waiting for Review` carrying
`resolution: Done`. Confirmed the mechanism from the transitions API — from `Done` the workflow offers
no self-transition, and offers one literally *named* `Waiting for Review`, which is a candidate in
that project's `accepted` list. It matched by name, on the first rule, without ever reaching the
statusCategory fallback.

## Impact

- **Silent regression of a terminal status.** The pipeline's last act un-does its own close.
- **Stranded resolution.** Neither `resolution IS EMPTY` nor a status-is-Done filter finds the card.
- **Hits precisely the projects that took the pipeline's advice.** A consumer that left `done` to a
  human — which Step 7 recommends, and which `tracker-workflow.yaml`'s `done: ~` exists to express —
  is the consumer this breaks. A consumer that maps `accepted → Done` never sees it.
- Low frequency, high confusion: it presents as the tracker mysteriously reopening a card, and the
  cause is two blocks apart in one step of one skill.

## Root Cause

`sync-jira-*` has **no way to be status-neutral**. `syncDocumentStatus` is invoked unconditionally
whenever frontmatter carries a `status:`:

```js
if (result?.issueKey && !args.dryRun && frontmatter.status) {
  statusOutcome = await lib.syncDocumentStatus({ ... });
}
```

The accepted flag list is `--check-card --doc-branch --dry-run --fail-on-status-skip --file --force
--json --labels --priority --probe-workflow --quiet --summary --write-record` — there is no
`--no-transition`. So a caller that wants only the Document-link re-point cannot ask for only the
Document-link re-point, and finalise's *link* step is unavoidably also a *status* step driven by a
second, independent resolver.

Task 40's reasoning — *make the ladder the single resolver* — is sound and should be kept. The defect
is that the sync's resolver still gets a say afterwards, which is the very thing that reordering was
supposed to prevent.

## Recommendation

Two changes, the first cheap and shipped with this bug, the second the durable fix:

1. **Documentation, in this PR.** Amend the Step 7 ordering block so it no longer asserts the sync
   no-ops, states the configuration under which it does not, and requires the close-out to
   **verify the status after the re-link and re-assert the terminal transition if it moved**.
   Verification is by re-reading the issue, not by trusting the transition call's `204`.

2. **A `--no-transition` flag on `sync-jira-{story,task,epic}`**, passed by finalise's re-link.
   This preserves task 40's benefit in full — the ladder stays the single resolver — and removes the
   second resolver from the path entirely, rather than correcting after the fact. Deferred from this
   PR to keep it one change, and because the doc fix already closes the observed failure.

**Not the fix: reversing the order back to sync-first.** That re-opens what task 40 closed, and the
QA record for that task should be read before anyone proposes it again.

## Related

- `skills/finalise/SKILL.md` — Step 7, "Move Tracker Issue to Done"
- `docs/tasks/task.40.github-pipeline-step-wiring/task.40.qa.1.github-pipeline-step-wiring.md` §72 —
  the ordering decision and the premise this bug falsifies
- `skills/sync-jira-task/scripts/sync-jira-task.js` — the unconditional `syncDocumentStatus` call
