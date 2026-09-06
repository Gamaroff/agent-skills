---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-09-06'
updated: '2026-09-06'
related: 'none — cross-cutting (review-story 9.6 · review-task 8.6 · review-epic)'
description: "bug.11 gave sync-jira-* a --no-transition flag and wired it into finalise's Document-link re-point, but three other body/link-only re-syncs — review-story Step 9.6, review-task Step 8.6 and review-epic — still let the sync's own loadStatusMap re-resolve status after the tracker-workflow ladder has already moved the card. Same defect shape as bug.11, at three more call sites, now with a one-word fix available."
---

**Bug ID**: bug.12
**Related**: none — cross-cutting (`review-story` 9.6 · `review-task` 8.6 · `review-epic`)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-09-06
**Assigned To**: develop-bug
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
- `skills/review-task/SKILL.md:1482` — `sync-jira-task.js --file "$TASK_FILE_PATH"`, no `--no-transition`.
- `skills/review-epic/SKILL.md:767` — same shape (Step 11.5, "Push Body Changes to Jira").
- The flag itself already exists and is documented: `shared/resources/jira-sync.js` `syncDocumentStatus({ noTransition })`, and the `Script Options` table in each of the three `sync-jira-*` SKILL.md files.

## Scope & Impact

- **Same class as bug.11, three more sites.** Silent regression of a status the ladder just set.
- **Reachable from the standard pipelines**, not just a manual invocation — Step 2 of both
  `develop-story` and `develop-task`.
- **Jira-only.** `syncDocumentStatus` — the second resolver at the heart of this defect — exists only
  on the Jira path (`shared/resources/jira-sync.js` plus the three `sync-jira-*` CLIs). No
  `sync-github-*` script calls it, so the three sites below are the complete enumeration, not a sample.
- **Lower priority than bug.11** because the status being undone here is an *intermediate* one
  (`In Progress`), not a terminal one, so no resolution is stranded and the pipeline's later steps
  move the card forward again. It is wrong and confusing rather than corrupting.

## Root Cause

`bug.11` scoped its Recommendation item 2 to *"a `--no-transition` flag on `sync-jira-{story,task,epic}`,
**passed by finalise's re-link**"*. The flag was implemented centrally and correctly; the caller
change was scoped to the one caller the bug had observed. The other three were never enumerated.

## Recommendation

1. **Pass `--no-transition`** on the three body/link-only syncs above.
2. **Do not** pass it on `review-story` Step 10 (`skills/review-story/SKILL.md:2142`) — that is the
   one genuinely *intentional* status push among these skills, where driving the transition is the
   point. Note that Step 10 currently reuses the same command line as Step 9.6, so the two must be
   edited apart, not together.

   > **Correction (review-bug, 2026-09-06).** This item originally also named `review-task` Step 9 as
   > an intentional status push. It is not one: `review-task` Step 9 ("Update Document Status") edits
   > the local `Status:` field and Change Log only and invokes no tracker sync — `review-task` has
   > exactly **one** `sync-jira-task.js` invocation, the Step 8.6 body sync at line 1482. `review-epic`
   > likewise has no deliberate status-push invocation (Step 11.6 delegates unlinked epics to
   > `ensure-epic-jira-issue`). So `review-story` Step 10 is the *only* site to protect.
   >
   > This matters for scope: because Step 8.6 runs **before** Step 9 promotes the document, the status
   > it pushes today is the *pre-promotion* one. It is not functioning as `review-task`'s status push
   > even accidentally — it pushes a stale value. Adding `--no-transition` there therefore removes a
   > wrong write rather than removing a needed one, and the ladder remains the authority on the card's
   > position (the premise `bug.11` established).
3. Consider a parity test asserting that every `sync-jira-*` invocation in shipped prose either
   passes `--no-transition` or sits in an allowlist of deliberate status pushes — the same shape as
   the `transition-protocol-parity` guard, so the next caller cannot be added silently.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-06

**Reproduction**: A new parity test — `G: every writing sync-jira-* invocation is flagged or
allowlisted`, added to `jira-sync-no-transition.test.mjs` — was written **before** the fix and run
against unmodified `develop`. It went red naming exactly the three sites the report predicted:

```
skills/review-epic/SKILL.md:767  (under "Step 11.5 — Push Body Changes to Jira")
skills/review-story/SKILL.md:2060 (under "Step 9.6: Sync Body Changes to Tracker")
skills/review-task/SKILL.md:1482 (under "Step 8.6: Push Body Changes to Jira")
```

That failing test *is* the reproduction: the defect is a population property (which call sites carry
the flag), so a red population check is a more faithful reproduction than driving one card through a
live board would be.

**Root Cause Analysis**: `shared/resources/jira-sync.js:4194` — `syncDocumentStatus` returns
`{ transitioned: false, reason: "transition-suppressed" }` before `loadStatusMap` resolution and
before any HTTP, but **only when `noTransition` is set**. All three CLIs parse `--no-transition` and
forward it correctly (bug.11's work is sound). The defect is purely one of **enumeration**: bug.11
scoped its Recommendation to the flag *"passed by finalise's re-link"*, so the one caller it had
observed was wired and the other three were never listed. Each call was correct in isolation, which
is why no behavioural test could have caught it.

**Proposed Fix**: pass `--no-transition` at the three body/link-only sites, leave `review-story`
Step 10 (the one deliberate status push) alone, and add a population-level guard so the next caller
cannot be added silently.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-06

**Root Cause**: an incomplete enumeration of `sync-jira-*` callers when bug.11 introduced
`--no-transition`, leaving three body/link-only syncs still re-resolving status through
`loadStatusMap` after the `tracker-workflow.yaml` ladder had already placed the card.

**Fix Description**:
- The three body/link-only syncs now pass `--no-transition`, so each changes the description and the
  doc link and leaves the card's position alone. The ladder becomes the single resolver, which is the
  invariant bug.11 established.
- Each site carries a short note saying *why* the flag is there, so the next reader does not
  "simplify" it away. `review-story` Step 10 carries the mirror-image note explaining why it
  deliberately does **not** take the flag — the two steps ran an identical command line until now, so
  the difference has to be stated to survive.
- A parity guard (test G) now asserts the population invariant: every `sync-jira-*` invocation in
  shipped prose that **writes** must either pass `--no-transition` or be named in an explicit
  deliberate-status-push allowlist. Read-only invocations classify themselves out via `--check-card`,
  `--probe-workflow` or `--dry-run`.

**Files Modified**:
- `skills/review-story/SKILL.md` — Step 9.6 gains `--no-transition` + rationale; Step 10 gains the
  note recording its deliberate omission.
- `skills/review-task/SKILL.md` — Step 8.6 gains `--no-transition` + rationale.
- `skills/review-epic/SKILL.md` — Step 11.5 gains `--no-transition` + rationale.
- `shared/resources/tests/jira-sync-no-transition.test.mjs` — added regression tests **G**, **G2**
  (no stale allowlist entries) and **G3** (the three bug.12 sites pinned by name).

**Testing**:
- Tests G/G3 fail on the pre-fix code naming all three sites, and pass after the fix.
- **Mutation-proved**: reverting the flag at each of the three sites individually turns the G tests
  red each time; restoring returns 22/22 green.
- **Guard-the-guard proved**: adding a *new* un-flagged body-only invocation under a fresh heading
  turns G red (this is the guard's actual purpose — catching the next silent addition, which is the
  failure mode that produced this bug). Renaming an allowlisted heading turns G2 red, so the
  allowlist cannot rot into a set of permanent excuses.
- G carries a floor assertion (`sites.length >= 10`) so a scan that silently stops matching fails
  rather than passing vacuously.
- `npm run ci:fast` — **2504 pass, 0 fail**, Prettier clean.
- `npm run bundle` and `npm run generate-catalog` — exit 0, no drift.

**Verification Steps for QA**:
1. `node --test shared/resources/tests/jira-sync-no-transition.test.mjs` → 22/22 pass.
2. Revert `--no-transition` at any one of the three sites → tests G and G3 go red naming that site.
3. Confirm `skills/review-story/SKILL.md` Step 10 still has **no** `--no-transition` (it is the
   deliberate status push) and that test G2 passes, proving it is allowlisted rather than overlooked.
4. `npm run ci:fast` → green.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-06 | New | develop-bug | Filed from `/review-code` finding CR-1 on PR #329, during the bug.11 fix. Kept out of that PR to hold its scope to what bug.11 specified. |
| 2026-09-06 | New | review-bug | Fix-readiness 9/10 — READY TO FIX. Corrected Recommendation item 2 (`review-task` Step 9 is not a status push; `review-story` Step 10 is the only site to protect), fixed the `review-task` evidence line ref, recorded that the defect is Jira-only. Severity/priority unchanged. |
| 2026-09-06 | In Progress | develop-bug | Reproduced via a new parity test (red on all three sites); investigation started |
| 2026-09-06 | Ready for QA | develop-bug | Fix implemented at all three sites + regression tests G/G2/G3; mutation-proved; ci:fast green |

## Resolution Summary

_Not yet resolved._

## Related

- [`bug.11`](../bug.11.finalise-relink-regresses-terminal-status/bug.11.finalise-relink-regresses-terminal-status.md) — the parent defect and the flag this bug asks three more callers to use
- `skills/review-story/SKILL.md` Step 9.6, `skills/review-task/SKILL.md` Step 8.6, `skills/review-epic/SKILL.md`
- `shared/resources/jira-sync.js` — `syncDocumentStatus({ noTransition })`
