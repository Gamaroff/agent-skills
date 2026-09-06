---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-09-06'
updated: '2026-09-06'
related: 'none — cross-cutting (review-story 9.6 · review-task 8.6 · review-epic)'
description: "bug.11 gave sync-jira-* a --no-transition flag and wired it into finalise's Document-link re-point, but three other body/link-only re-syncs — review-story Step 9.6, review-task Step 8.6 and review-epic — still let the sync's own loadStatusMap re-resolve status after the tracker-workflow ladder has already moved the card. Same defect shape as bug.11, at three more call sites, now with a one-word fix available."
---

**Bug ID**: bug.12
**Related**: none — cross-cutting (`review-story` 9.6 · `review-task` 8.6 · `review-epic`)
**Status**: 🆕 New
**Priority**: Medium
**Severity**: Major
**Created**: 2026-09-06
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: [`bug.11`](../bug.11.finalise-relink-regresses-terminal-status/bug.11.finalise-relink-regresses-terminal-status.md)
established that a `sync-jira-*` run whose *purpose* is re-pointing the Document link is
unavoidably also a **status decision**, resolved by a second resolver (`loadStatusMap`) after the
`tracker-workflow.yaml` ladder has already made the call. It fixed that by adding `--no-transition`
and passing it from `finalise` Step 7.

**Three other body/link-only re-syncs were not given the flag** and still carry the same second
resolver:

| Site | Stated purpose | Command |
|------|----------------|---------|
| `skills/review-story/SKILL.md` Step 9.6 | "Sync Body Changes to Tracker" | `sync-jira-story.js --file … [--doc-branch …]` |
| `skills/review-task/SKILL.md` Step 8.6 | body edits only | `sync-jira-task.js --file …` |
| `skills/review-epic/SKILL.md` | body/description sync | `sync-jira-epic.js --file …` |

**Expected Behavior**: a sync whose documented job is "sync body changes" / "re-point the Document
link" changes the description and the link, and leaves the card's status alone.

**Actual Behavior**: each of the three also resolves frontmatter `status:` through `loadStatusMap`
and transitions the card, with no way for the step to opt out — the exact condition bug.11 removed
from finalise but only from finalise.

## Reproduction Steps

**Environment**: Jira Cloud, any consumer whose `jira.statusMap` maps the document's current
frontmatter status to a status behind the one the ladder has already set.
**Frequency**: Always, given that configuration.
**Reproducible**: Yes

In the `develop-story` / `develop-task` pipelines these review steps run at **Step 2** — *after*
Step 1 has signalled `work-started` through the ladder
(`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`), while the document's frontmatter
is still `draft` / `ready-for-development`:

1. Run `/develop-story` (or `/develop-task`) on a document whose frontmatter is `ready-for-development`.
2. Step 1 signals `work-started` — the ladder moves the card to e.g. `In Progress`.
3. Step 2 runs `/review-story`, which reaches Step 9.6 and re-syncs the body.
4. Re-read the issue.

**Expected**: still `In Progress`.
**Actual**: `loadStatusMap` resolves the *frontmatter* status (`ready-for-development`) and walks the
card back to a to-do-ish column — undoing the ladder's move, on the sync that was meant to carry only
a description change.

## Evidence

- Found by the `/review-code` adversarial pass on [PR #329](https://github.com/Gamaroff/agent-skills/pull/329)
  (the bug.11 durable fix) as finding **CR-1**, while verifying the claim that the new gate "holds for
  every caller". It holds for every caller *of `syncDocumentStatus`* — but only finalise was taught
  to ask for it.
- `skills/review-story/SKILL.md:2060` — `sync-jira-story.js --file "$STORY_FILE_PATH" ${PIN_BRANCH:+--doc-branch "$PIN_BRANCH"}`, no `--no-transition`.
- `skills/review-task/SKILL.md:1481` — `sync-jira-task.js --file "$TASK_FILE_PATH"`, no `--no-transition`.
- `skills/review-epic/SKILL.md:767` — same shape.
- The flag itself already exists and is documented: `shared/resources/jira-sync.js` `syncDocumentStatus({ noTransition })`, and the `Script Options` table in each of the three `sync-jira-*` SKILL.md files.

## Scope & Impact

- **Same class as bug.11, three more sites.** Silent regression of a status the ladder just set.
- **Reachable from the standard pipelines**, not just a manual invocation — Step 2 of both
  `develop-story` and `develop-task`.
- **Lower priority than bug.11** because the status being undone here is an *intermediate* one
  (`In Progress`), not a terminal one, so no resolution is stranded and the pipeline's later steps
  move the card forward again. It is wrong and confusing rather than corrupting.

## Root Cause

`bug.11` scoped its Recommendation item 2 to *"a `--no-transition` flag on `sync-jira-{story,task,epic}`,
**passed by finalise's re-link**"*. The flag was implemented centrally and correctly; the caller
change was scoped to the one caller the bug had observed. The other three were never enumerated.

## Recommendation

1. **Pass `--no-transition`** on the three body/link-only syncs above.
2. **Do not** pass it on `review-story` Step 10 / `review-task` Step 9 — those are the *intentional*
   status pushes, where driving the transition is the point. Confirm each of those two deliberately
   before changing anything near them.
3. Consider a parity test asserting that every `sync-jira-*` invocation in shipped prose either
   passes `--no-transition` or sits in an allowlist of deliberate status pushes — the same shape as
   the `transition-protocol-parity` guard, so the next caller cannot be added silently.

## Developer Fix Cycle

_No iterations yet._

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-06 | New | develop-bug | Filed from `/review-code` finding CR-1 on PR #329, during the bug.11 fix. Kept out of that PR to hold its scope to what bug.11 specified. |

## Resolution Summary

_Not yet resolved._

## Related

- [`bug.11`](../bug.11.finalise-relink-regresses-terminal-status/bug.11.finalise-relink-regresses-terminal-status.md) — the parent defect and the flag this bug asks three more callers to use
- `skills/review-story/SKILL.md` Step 9.6, `skills/review-task/SKILL.md` Step 8.6, `skills/review-epic/SKILL.md`
- `shared/resources/jira-sync.js` — `syncDocumentStatus({ noTransition })`
