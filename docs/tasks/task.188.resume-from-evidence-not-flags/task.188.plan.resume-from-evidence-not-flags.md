---
id: task.188.plan
title: "Implementation Plan: Resume from evidence, not flags"
type: plan
task-ref: task.188.resume-from-evidence-not-flags.md
---

# Implementation Plan: Resume from evidence, not flags

> Requirements and success criteria: [task.188.resume-from-evidence-not-flags.md](task.188.resume-from-evidence-not-flags.md)

## Overview

Change the GitHub merge blocks to read the PR's state after `gh pr merge`, give develop-next
develop-batch's `halted`/`haltKind`/`prNumber` fields, and put a reconciliation block in front of
Step 0.1's routing in both skills. Extend the existing merge-site harness rather than writing a new
one.

## Phase 1: Merge verdict

**develop-next Step 3, GitHub arm** (`skills/develop-next/SKILL.md`, the `else` branch after
`[ "$(printf '%s' "$MERGE_RESULT" | jq -r '.state')" = "MERGED" ] || HALT`). Target shape:

```bash
HEAD_BRANCH=$(gh pr view "$PR_ID" --json headRefName -q .headRefName)
[ -n "$HEAD_BRANCH" ] || { echo "HALT: cannot bind the head branch of PR #$PR_ID"; exit 1; }
if [ -z "$(git status --porcelain)" ]; then
  gh pr merge "$PR_ID" --"$mergeStrategy" --delete-branch
  MERGE_EXIT=$?
else
  gh pr merge "$PR_ID" --"$mergeStrategy"
  MERGE_EXIT=$?
fi
# The exit code covers the local follow-ups too (fast-forward, branch switch, delete); only the
# PR's state says whether the merge happened (obs #197).
STATE=$(gh pr view "$PR_ID" --json state -q .state)
[ "$STATE" = "MERGED" ] || { echo "HALT: PR #$PR_ID is $STATE after merge (exit $MERGE_EXIT)"; exit 1; }
[ "$MERGE_EXIT" -eq 0 ] || echo "⚠️  merged, but gh pr merge exited $MERGE_EXIT — a local follow-up failed; Step 4 re-syncs"
if [ -n "$(git status --porcelain)" ] || [ "$MERGE_EXIT" -ne 0 ]; then
  git push origin --delete "$HEAD_BRANCH" \
    || echo "⚠️  merged, but the remote branch $HEAD_BRANCH was not deleted (already gone?)"
fi
```

Keep the literal `gh pr merge … --delete-branch` on the clean arm: the guard test's population
grep keys on it (`merge-delete-branch-guard.test.mjs`, the `git grep` at the top, floor 2). Read
that grep before editing.

Beside the Bitbucket parsing note, add one sentence: "Both arms judge the merge by the PR's
state, never by the merging command's status: a command can fail after the server merged."
develop-batch Step 3 applies the same block with `<PR#>` and cites it.

**Test** (`shared/resources/tests/merge-delete-branch-guard.test.mjs`): the stub records argv; teach
it `pr view <n> --json state` → `$STUB_PR_STATE` (default `MERGED` so existing cases are unchanged)
and `pr merge` → exit `$STUB_MERGE_EXIT`. The "refused merge" case sets `STUB_PR_STATE=OPEN`.
New cases per site × shell: (1, MERGED) → exit 0; (1, OPEN) → exit 1, no `push --delete` in argv;
(0, OPEN) → exit 1 (control).

## Phase 2: Recorded HALT

- Run-state JSON in `## Run state`: add `"prNumber": null`, `"halted": false`, `"haltKind": null`,
  and the sentence "A field missing from an older file reads as `false`/`null`."
- Step 2, after "If the pipeline HALTs …": "Write `halted: true`, `haltKind: "pipeline-halt"` (and
  `prNumber` when the pipeline reported one) to the run state before stopping."
- Step 0.1 opens with: "**A recorded HALT first.** `halted: true` → surface the item's
  implementation-report escalation block verbatim (fallback:
  `.claude/state/develop-pipeline.last-halt.json`), notify, STOP. Never route a halted run to
  Step 3. To resume after fixing, set `halted: false` (or delete the file to reselect)."

## Phase 3: Reconciliation

Name the PR query `#### Find the item's merged PR` once (lifted from Step 1's guard), and cite it
from Step 1 and Step 0.1. Step 0.1 item 1 becomes: halt check → reconcile → route.

Roadmap row check (fenced, extractable):

```bash
git fetch -q origin <baseBranch>
git show "origin/<baseBranch>:<roadmapPath>" | grep -E "^\s*- \[x\].*\b<item>\b" >/dev/null \
  && echo ticked || echo not-ticked
```

The grep above is a sketch. The selector's parser is the authority on row shape:
`parseRoadmap(text)` is exported from `skills/develop-next/scripts/select-next.mjs`. Prefer
`command node -e` over that export on the `git show` output, reading the item's row by id. Rows are
`- [x]` / `- [ ]` list items (see the roadmap's own header). One edge: a row already archived to
`roadmap-history.md` at a phase close is gone from the roadmap; read it there too, and treat an
archived accepted row as ticked.

develop-batch: for each non-terminal item with `prNumber` and `merged: false`, the same PR-state
query; `MERGED` → `merged: true`, then the existing per-item routing.

## Key Patterns and References

- develop-batch's item fields and HALT table: `skills/develop-batch/SKILL.md` § Run state and
  Step 2's report table.
- Real `exit 1` rather than prose `HALT` inside executed blocks: the comment above `HEAD_BRANCH` in
  develop-next Step 3 (task.147 QA-1, CR-1).
- Merge never chained to the next commit: develop-next Step 4's re-sync paragraph (obs #142).

## Testing Approach

Run the three test files named in the task's § 8, then `npm test`. Record each mutation proof's red
output in the implementation report.
