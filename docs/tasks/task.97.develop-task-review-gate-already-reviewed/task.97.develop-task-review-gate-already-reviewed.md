---
id: task.97
title: '/develop-task Step 2 has no recovery path when review-task Step 9 does not promote'
type: task
description: "A consumer repository hit a deterministic HALT at /develop-task Step 2 on an already-reviewed task and had to override it by hand. The consumer diagnosed it as two contradictory tables in develop-pipeline-step-2-review.md; measurement against the installed skills contradicts that diagnosis, so the first job here is to establish the real cause. What survives either way is a robustness defect: the skip table keys on status rather than on evidence of review, so whenever Step 9's promotion does not happen the only remedy an operator will reach for — re-running the review — cannot clear the halt."
tags: [develop-task, pipeline, review-gate, status-lifecycle, consumer-report]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-07
updated: 2026-09-07
assignee:
estimated_effort_hours: 4
github_issue: 348
---

# Technical Task: /develop-task Step 2 has no recovery path when review-task Step 9 does not promote

**Status:** Planned
**GitHub Issue**: [#348](https://github.com/Gamaroff/agent-skills/issues/348)

---

## 1. Overview

`/develop-task` Step 2 decides whether to run `/review-task`, then judges the result. A consumer
repository (`rebirth-wallet`, card `task.113` / RAPP-728) hit a **deterministic HALT** there on
2026-09-07, on a task that had been reviewed hours earlier, and the operator had to rule on the
deviation before the pipeline could start.

**Scope**: establish why the halt was unrecoverable, then make Step 2's skip decision key on
evidence of review rather than on status alone — without weakening the gate that stops development
against an unreviewed card.

---

## 2. Motivation

### The consumer's diagnosis, and why it does not survive measurement

The consumer card asserts that the two Step 2 tables contradict each other:

- `develop-pipeline-step-2-review.md:44` — `Planned` + **either** → run `/review-task`
- `develop-pipeline-step-2-review.md:133` — `Planned` unchanged after review → **HALT**

and reasons that because `/review-task` never promotes a task out of `planned`, the first table
guarantees the input to the second, and the halt is unconditional for every already-reviewed task.

**That premise is false against the installed skills.** Measured 2026-09-07 in the consumer's own
vendored copy:

| Claim | Measurement |
| --- | --- |
| "`/review-task` does not promote out of `planned`" | `.agents/skills/review-task/SKILL.md:1569` — `Planned` → `Ready for Development` (after successful review and fixes) |
| "`ready-for-development` is the *story* enum" | `shared/resources/document-status-lifecycle.md:59` — set by **`review-story`, `review-task`**; not story-only |
| "the spec is not available to the consumer" | `document-status-lifecycle.md` is vendored **17 times** into that repo |

So the two tables are consistent as written, and the halt is the *correct* response to Step 9 having
failed to promote. **The bug is not the one that was reported.**

### What is nevertheless defective

The halt is right; its **irrecoverability** is not.

1. **The skip decision keys on the wrong fact.** Lines 45 and 47 skip on *status* (`Ready for
   Development` / `In Progress`) plus a report. Status is a downstream consequence; the **report** is
   the fact that answers "has this been reviewed?". Any path that leaves a reviewed task at `planned`
   — Step 9 skipped, a standalone `/review-task` where the operator declined the promotion, a manual
   status edit, a crash between the report write and the frontmatter write — produces a card that is
   demonstrably reviewed and permanently unstartable.
2. **The obvious remedy provably cannot work.** The halt lands *before any work exists*, which is the
   point at which an operator is most likely to resolve it by re-running the review rather than by
   questioning the gate. A re-review costs a full pass and, if whatever suppressed the promotion is
   still in play, the second table halts again. **A gate whose intuitive fix is a no-op is close to
   the worst property a gate can have** — and it is what actually consumed the operator's time here.
3. **Nothing reports which of the three voices disagreed.** `develop-task/SKILL.md:248` expects
   promotion, the post-review table demands it, `review-task` Step 9 performs it. When the halt
   fires, the message names only the symptom (*"review-task left it Planned"*). It does not say
   whether a report exists, whether Step 9 ran, or whether the outcome was `NEEDS REVISION` — which
   is why a consumer with all three files installed still reached a wrong diagnosis.

**This is a near-relative of a defect already fixed once in this same skill.** Phase 0c carries:

> ⚠️ **`Draft` added 2026-08-19, closing a three-way disagreement that made a legitimately-authored
> task undeliverable.** This table previously omitted `draft`, so it fell through to *"Any other
> status → HALT"* …

Same shape: a status the rest of the system treats as ordinary, read by one table as an error state,
with no diagnostic to distinguish the two. That note is the reason this was diagnosable at all, and
the fix here deserves the same treatment.

---

## 3. Technical Background

**Current state** — `shared/resources/develop-pipeline-step-2-review.md`, the `develop-task` halves:

Skip/Run decision table (lines 44–48):

| Pre-review status | Report exists? | Action |
| --- | --- | --- |
| `Planned` | Either | Run `/review-task` |
| `Ready for Development` | Yes | **Skip** |
| `In Progress` | Yes | **Skip** |

Post-review status table (line 133):

| Post-review status | Action |
| --- | --- |
| `Planned` (unchanged) | **HALT** |

**Target state.** `planned` + a *current* review report skips, exactly as `in-progress` + a report
already does. Unchanged `planned` after a review is a HALT only when no report was produced and none
already existed — and the halt message names which precondition failed.

**Do not make this symmetrical with `/develop-story`.** The story-side post-review table (line 124)
halts on unchanged `Draft`, and that is correct: `/review-story` genuinely promotes, so an unchanged
`Draft` is a promotion that failed. The asymmetry between the two is deliberate and both sides are
right today; only the *recovery path* differs.

---

## 4. Scope

**In scope**: the `develop-task` Step 2 skip/run and post-review tables; a freshness definition for
"current review report"; the halt message's diagnostics; a reasoning note in the resource; and the
`develop-task/SKILL.md` autonomous-defaults rows that reference Step 9 promotion.

**Out of scope**: `/develop-story`'s tables (correct as they stand); `/review-task`'s Step 9
behaviour, unless Phase 1 finds it is the actual fault; the status lifecycle itself.

---

## 5. Breaking Changes

None. The change makes a currently-halting path proceed under a strictly narrower condition, and adds
detail to a message. No consumer relies on the halt — it is the behaviour this task exists to make
recoverable.

---

## 6. Implementation Plan

**Phase 1 — Establish the actual cause before changing a table (Low risk).**

- [ ] Reproduce the consumer's halt: a `planned` task with a current review report, run through
      `/develop-task` Step 2. Confirm the halt fires.
- [ ] Determine why Step 9 did not promote in the reported incident. Candidates, in order of
      likelihood: the review ran standalone rather than through the pipeline and the promotion
      question was answered "no"; the outcome was `NEEDS REVISION`, making the halt correct; the
      promotion was written and later reverted by a sync (compare `bug.12`, where an unflagged sync
      walked a card back).
- [ ] **If Phase 1 finds Step 9 genuinely broken, stop and re-scope.** The tables would then be
      innocent and this card is the wrong fix. Record the finding either way — the consumer reached a
      confident wrong diagnosis from the same files, and the record is what stops the next reader
      repeating it.

**Phase 2 — Define "current review report" (Low risk).**

- [ ] A report matching `task.{id}.review.*.md` exists, **and** it is not older than the task
      document's last content change. A report from before a rewrite is not evidence about what the
      card now says.
- [ ] Derive freshness from frontmatter `updated:`, **never** filesystem mtime — mtime does not
      survive a fresh clone, which is exactly the environment CI and `/develop-batch` worktrees run
      in. A gate whose input is `stat` output behaves differently on a developer's machine and in the
      pipeline, and that difference is invisible until it matters.
- [ ] Where the two disagree, treat the report as **stale** and run the review. The failure this task
      removes is a needless halt; the failure a wrong skip would introduce is developing against an
      unreviewed card, which is worse.

**Phase 3 — Fix the tables and the message (Low risk).**

- [ ] Skip table: `Planned` + a **current** report → **Skip**, logged, exactly as `In Progress` +
      report already does. `Planned` with no report, or a stale one, still runs the review.
- [ ] Post-review table: unchanged `Planned` is a HALT only when **no** report was produced and none
      already existed. A review that ran, wrote its report and left the status alone is a completed
      review, not a failed one.
- [ ] Keep the HALT for the genuine case — a review that produced nothing at all.
- [ ] The halt message states which precondition failed: report present or absent, its age against
      `updated:`, and the review outcome if one was recorded. The current message names only the
      symptom, and that is how a consumer with every relevant file installed still misdiagnosed it.

**Phase 4 — Align the surrounding prose (Low risk).**

- [ ] `develop-task/SKILL.md:247–249` — confirm the Step 8.5 / Step 9 rows still read correctly beside
      the new tables, and that no row implies promotion is the *only* route past Step 2.
- [ ] Record the reasoning in the resource, in the shape of the 2026-08-19 `Draft` note.

---

## 7. Files Summary

| File | Change |
| --- | --- |
| `shared/resources/develop-pipeline-step-2-review.md` | **Modify** — both `develop-task` tables, the halt message, plus the reasoning note |
| `skills/develop-task/SKILL.md` | **Verify / modify** — autonomous-defaults rows 247–249 |
| `skills/*/references/*` | **Regenerated** — `npm run bundle`, never hand-edited |

**Added / deleted:** none.

---

## 8. Testing Strategy

1. **Falsify the current behaviour first.** Reproduce the halt before changing anything. A fix for a
   defect nobody has reproduced is a guess — and this task exists because a confident diagnosis was
   already reached without one.
2. **Both directions.** `planned` + current report → skips Step 2, reaches Step 3. `planned` + no
   report → still runs the review. `planned` + report older than `updated:` → still runs the review.
3. **The genuine halt must survive.** A review that produces no report at all must still HALT. The fix
   must not buy liveness by removing the gate.
4. **Freshness in a fresh clone.** Assert the freshness rule in a clone where every mtime is the
   checkout time. A test that passes only because mtimes happen to be ordered is not evidence.
5. **The message.** Assert on the halt text naming the failed precondition, not merely on the halt
   firing.

---

## 9. Success Criteria

- [ ] Phase 1 records, with evidence, why Step 9 did not promote in the reported incident.
- [ ] A `planned` task with a current review report reaches Step 3 without an operator ruling.
- [ ] A `planned` task with no review report still runs `/review-task`.
- [ ] A `planned` task with a review report older than the document's `updated:` still runs it.
- [ ] A review that produces no report still HALTs.
- [ ] The halt message names which precondition failed.
- [ ] Report freshness derives from frontmatter, not filesystem mtime — verified in a fresh clone.
- [ ] `/develop-story`'s tables are unchanged.
- [ ] The resource carries a note explaining the defect, in the shape of the 2026-08-19 `Draft` note.

---

## 10. Risk Assessment

**Low.** Table rows, a freshness rule and a message, in a documentation resource with no runtime.

The risk worth naming is **over-correction**: a skip rule that is too permissive develops against an
unreviewed card, which is a worse failure than the halt. That is why staleness is its own phase
rather than an afterthought, and why "no report at all" keeps its HALT.

The second risk is **fixing the wrong thing**. The consumer's diagnosis was confident, specific,
internally coherent and contradicted by the files it cited. Phase 1 exists to stop this card
inheriting that.

The **inaction** risk is that the workaround becomes the convention — each operator rules on the
deviation individually, nobody records it, and the gate quietly stops meaning anything.

---

## 11. Rollback Plan

Revert the resource, `npm run bundle`, re-release. Nothing depends on the new behaviour; the halt
returns, along with the manual override.

---

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-07 | 1.0 | Created from a consumer report (`rebirth-wallet` task.113 / RAPP-728), whose `/develop-task` run halted at Step 2 on a card reviewed hours earlier. **The consumer's diagnosis was checked and does not hold** — `/review-task` does promote `planned → ready-for-development` (`review-task/SKILL.md:1569`) and `document-status-lifecycle.md:59` names `review-task` as a setter of that status for tasks. Re-scoped from "two contradictory tables" to "the halt has no recovery path", with Phase 1 required to establish the real cause before any table changes | manual |

---

## Progress Tracking

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 — Establish the actual cause | ⏳ Not started | Gates the rest; may re-scope the card |
| Phase 2 — Define "current review report" | ⏳ Not started | Freshness from frontmatter, not mtime |
| Phase 3 — Fix the tables and the message | ⏳ Not started | |
| Phase 4 — Align the surrounding prose | ⏳ Not started | |

---

## References

- `shared/resources/develop-pipeline-step-2-review.md` — lines 44–48 (skip/run) and 133 (post-review)
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:311` — the 2026-08-19 `Draft` note,
  the same defect class one step earlier
- `shared/resources/document-status-lifecycle.md:59` — `ready-for-development` is set by
  `review-story` **and** `review-task`
- `skills/review-task/SKILL.md` Step 9 — the promotion the post-review table depends on
- `skills/develop-task/SKILL.md:247–249` — the autonomous-defaults rows for Step 8.5 / Step 9
- Consumer report: `rebirth-wallet` `docs/tasks/task.113.develop-task-review-gate-already-reviewed/`
  (RAPP-728), and the `task.111` implementation report that records the operator ruling

---

## Notes

The consumer card also records an alternative it rejected: adopting `ready-for-development` in its own
task vocabulary. That alternative was rejected on the grounds that it "changes a repository's
vocabulary to route around a tool defect" — but the measurement above shows the value is already
canonical for tasks, so for that repository this is not an adoption at all. **That is a consumer-side
correction, not upstream work**, and is noted here only so this card is not later read as having
endorsed the rejection.
