---
id: task.97
title: '/develop-task Step 2 has no recovery path when review-task Step 9 does not promote'
type: task
description: "A consumer repository predicted a deterministic HALT at /develop-task Step 2 on an already-reviewed task and steered the pipeline around it by hand; the halt itself was never reached. The consumer diagnosed it as two contradictory tables in develop-pipeline-step-2-review.md; measurement against the installed skills contradicts that diagnosis, so the first job here is to establish the real cause. What survives either way is a robustness defect: the skip table keys on status rather than on evidence of review, so whenever Step 9's promotion does not happen the only remedy an operator will reach for — re-running the review — cannot clear the halt."
tags: [develop-task, pipeline, review-gate, status-lifecycle, consumer-report]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-07
updated: 2026-09-08
assignee:
estimated_effort_hours: 4
github_issue: 348
---

# Technical Task: /develop-task Step 2 has no recovery path when review-task Step 9 does not promote

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.97.review.1.develop-task-review-gate-already-reviewed.md` implemented 2026-09-07
**GitHub Issue**: [#348](https://github.com/Gamaroff/agent-skills/issues/348)

---

## 1. Overview

`/develop-task` Step 2 decides whether to run `/review-task`, then judges the result. A consumer
repository (`rebirth-wallet`, card `task.113` / RAPP-728) stopped there on 2026-09-07 on a task
reviewed hours earlier, and an operator had to rule on the deviation before the pipeline could start.
**The HALT itself was never reached** — the operator ruled _"Skip — already reviewed"_ at Phase 0d, so
`/review-task` never re-ran and the post-review table was never evaluated. The halt was predicted from
reading the tables, not observed.

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
| "the halt fired" | **Never observed** — `task.111`'s implementation report records the operator answering _"Skip — already reviewed"_ at Phase 0d; Step 2 was skipped entirely |

So the two tables are consistent as written, and the halt is the *correct* response to Step 9 having
failed to promote. **The bug is not the one that was reported.**

### What is nevertheless defective

The halt is right, and on the evidence available it has never fired. What is defective is narrower:
the pipeline **stopped to ask a human a question it could have answered itself**, and if the halt were
ever reached it would be **irrecoverable** by the obvious remedy.

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
   the worst property a gate can have.** In the reported incident that cost was paid in advance: the
   operator reasoned their way to the same conclusion and skipped the step rather than testing it.
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

**Target state.** `planned` + a *current* review report skips, as `in-progress` + a report already
does — but strictly stricter than it. Unchanged `planned` after a review is a HALT only when no report
was produced and none already existed, and the halt message names which precondition failed.

> **The freshness test applies to the `planned` row only, and that is a decision, not an oversight.**
> The `in-progress` and `ready-for-development` rows skip on report *existence alone*, with no age
> comparison — so "exactly as `in-progress` does" would actually be a *weakening*. They are left alone
> because reaching either status required passing this gate already, which is evidence the `planned`
> row by definition does not have. If that reasoning is ever falsified, extending freshness to those
> two rows is the fix — not relaxing this one.

**Do not make this symmetrical with `/develop-story`.** The story-side post-review table (line 124)
halts on unchanged `Draft`, and that is correct: `/review-story` genuinely promotes, so an unchanged
`Draft` is a promotion that failed. The asymmetry between the two is deliberate and both sides are
right today; only the *recovery path* differs.

---

## 4. Scope

**In scope**: the `develop-task` Step 2 skip/run and post-review tables; a freshness definition for
"current review report", **and a small executable helper that implements it**; the halt message's
diagnostics; a reasoning note in the resource; the `develop-task/SKILL.md` autonomous-defaults rows
that reference Step 9 promotion; and the tests for all of it.

> **The helper is in scope because §8 cannot be satisfied without it.** §8 requires asserting freshness
> "in a clone where every mtime is the checkout time" and asserting on the halt *message text*. Neither
> is possible against prose. The alternative — deleting those requirements — was rejected: §10 ranks a
> wrong skip above a needless halt, and a rule enforced only by prose has no mechanism to fail loudly.
> Measurement settles that this is new ground rather than an extension: **no existing test asserts a row
> of either table, the status, the HALT or its message.** The one Step 2 protocol test asserts that the
> substrings `review` and `skip` appear somewhere in the file, and would pass with both tables deleted.

**Out of scope**: `/develop-story`'s tables (correct as they stand); `/review-task`'s Step 9
behaviour, unless Phase 1 finds it is the actual fault; the status lifecycle itself; and the
**mtime-based freshness rule in `develop-pipeline-resume-contract.md:95–110`**, which Phase 2's
reasoning arguably condemns but which is a separate card (see Phase 2).

---

## 5. Breaking Changes

None. The change makes a currently-halting path proceed under a strictly narrower condition, and adds
detail to a message. No consumer relies on the halt — it is the behaviour this task exists to make
recoverable.

---

## 6. Implementation Plan

**Phase 1 — Establish the actual cause before changing a table (Low risk).**

> **Phase 1 was answered during review (2026-09-07) and this phase is now confirmation, not open
> enquiry.** The original phase asked a binary question — *is the HALT reachable at all?* — and offered
> two branches. **Measurement returns neither.** The HALT is **conditionally reachable**: reachable
> through the pipeline under non-default configuration, unreachable under stock defaults. The
> "if unreachable, narrow the card" branch is therefore falsified and has been removed; the post-review
> table is live for any consumer running blocking enforcement and must not be left untouched.

- [x] **Confirm the two mechanisms that reach the HALT**, both of which run a full review, write a
      report, apply fixes and auto-answer Step 9 "Yes, fixes complete" — and still return `planned`:
      1. **The sign-off gate** — `review-task/SKILL.md` Step 9 §1a: when `sign-off.enabled: true` and
         `sign-off.enforcement: blocking`, an unsigned required row means do **not** promote
         "regardless of the review outcome, **and including the pipeline auto-answer path**". The file
         states the consequence outright: "`develop-task` will HALT at Step 2 until then."
      2. **The change-log gate** — `review-task/SKILL.md` check 4b: under
         `change-log.enforcement: blocking`, a missing or stale log is Critical → NO-GO → do not
         promote out of `planned`.
- [x] **Confirm the two paths that do *not* reach it**, so the fix does not chase them:
      `NEEDS REVISION` / `REQUIRES REWORK` halts *inside* `/review-task` Step 9, short-circuiting ahead
      of the post-review table; and "a review that produced no report" does not halt at all — Step 2
      logs a warning and proceeds.
- [x] **Record that this is why the halt has never been observed here.** Under this repo's defaults
      (sign-off absent, change-log advisory) with a READY outcome, Step 9 promotes and the table is
      never entered. The consumer *predicted* the halt correctly and simply never met its precondition.
      The re-run remedy is genuinely a no-op: both gates re-fire identically on a second pass.
- [x] **On the reported incident specifically**: it occurred in `rebirth-wallet`, which is not
      available from this repository, so the specific cause cannot be evidenced here. Record the
      narrowed candidate list — the two gates above, plus a standalone `/review-task` where Step 9 was
      answered "Partially complete" / "Not yet" — **and record explicitly what could not be
      determined**. The consumer reached a confident wrong diagnosis from these same files; a record
      that distinguishes established fact from inference is what stops the next reader repeating it.
- [x] **Note, do not fix, the documentation asymmetry Phase 1 exposes**: the sign-off gate is written
      as a numbered gate *inside* Step 9, while the change-log gate's identical "do not promote"
      instruction lives only in check 4b's severity table and is never restated in Step 9. An agent
      executing Step 9 linearly may honour one and miss the other. This is a `/review-task` change and
      §5 promises no behaviour change there — file it as a follow-up card.

**Phase 2 — Define "current review report" (Low risk).**

- [x] A report matching `task.{id}.review.*.md` exists, **and** it is not older than the task
      document's last content change. A report from before a rewrite is not evidence about what the
      card now says.
- [x] **Both sides of that comparison must be named, and only one of them was.** The task document's
      side is frontmatter `updated:`. The report's side **does not exist in frontmatter** — measured
      across all 49 tracked `task.{id}.review.*.md` files in this repo:

      | Property of the review report | Count |
      | --- | --- |
      | Carries any YAML frontmatter block | **7 / 49** |
      | Carries frontmatter `updated:` | **6 / 49** |
      | Carries no frontmatter date field at all | **42 / 49** |
      | Carries a body `**Reviewed:** YYYY-MM-DD` line | **49 / 49** |
      | Carries a body `- **Review Date:** YYYY-MM-DD` line | **49 / 49** |

      Nor is there a filename fallback: the canonical name (`task.{n}.review.{N}.{name}.md`)
      deliberately dropped the date that older reports carried.
- [x] **Read the report's date from its body**: `**Reviewed:**` first, falling back to
      `- **Review Date:**`. Both are present in 49/49 reports, and both are file *content*, so they are
      clone-stable in exactly the way this phase requires.
- [x] **Define the unparseable case as `stale`.** If neither line yields a date, run the review. The
      failure this task removes is a needless halt; the failure a wrong skip introduces is developing
      against an unreviewed card, which is worse — so every ambiguity resolves toward running it.
- [x] Derive freshness from document content, **never** filesystem mtime — mtime does not survive a
      fresh clone, which is exactly the environment CI and `/develop-batch` worktrees run in. A gate
      whose input is `stat` output behaves differently on a developer's machine and in the pipeline,
      and that difference is invisible until it matters.
- [x] **Name the rule this diverges from.** `develop-pipeline-resume-contract.md:95–110` performs the
      structurally identical check — is this artifact at least as fresh as the task file? — using
      `_mtime()`, and `pipeline-resume-detector-prompt.md:50,133–148` does likewise. By the argument
      above those are defective in a fresh clone. Fixing them is **out of scope** (see §4), but the
      divergence must be stated in the resource, or the pipeline is left holding two contradictory
      freshness conventions with nothing to tell a reader which governs.
- [x] Where the two disagree, treat the report as **stale** and run the review.

**Phase 3 — Fix the tables and the message (Low risk).**

- [x] Skip table: `Planned` + a **current** report → **Skip**, logged, exactly as `In Progress` +
      report already does. `Planned` with no report, or a stale one, still runs the review.
- [x] Post-review table: unchanged `Planned` is a HALT only when **no** report was produced and none
      already existed. A review that ran, wrote its report and left the status alone is a completed
      review, not a failed one.
- [x] Keep the HALT for the genuine case — a review that produced nothing at all.
- [x] The halt message states which precondition failed: report present or absent, its age against
      `updated:`, and the review outcome if one was recorded. The current message names only the
      symptom, and that is how a consumer with every relevant file installed still misdiagnosed it.
- [x] **The third edit site in the same file**: the Handling Findings bullet at
      `develop-pipeline-step-2-review.md:152` independently restates the rule as "**Blocking issues**
      (… or status still `Planned` after review)". Left alone it contradicts the new table. Three
      sites, one behaviour — change them together.

**Phase 4 — Align the surrounding prose (Low risk).**

- [x] **`develop-task/SKILL.md:248` is an edit, not a check.** It reads "pipeline needs
      `Ready for Development` before Step 3" — an unconditional claim the new skip path falsifies. It
      is also silent about the sign-off and change-log gates, which withhold promotion *on a READY TO
      IMPLEMENT outcome* — the exact case the row presents as safe. Rewrite it to name the report-based
      route past Step 2, and to acknowledge that a READY outcome does not guarantee promotion.
- [x] Re-read rows 247 and 249 beside the new tables; they are expected to stand, but confirm.
- [x] Record the reasoning in the resource, in the shape of the 2026-08-19 `Draft` note in
      `develop-pipeline-step-0-resolve-and-prepare.md` — bold opening sentence naming the change, its
      date and the failure it closes; then the mechanism; then which of the disagreeing parties was
      wrong, with the concrete incident that surfaced it.

---

## 7. Files Summary

| File | Change |
| --- | --- |
| `shared/resources/develop-pipeline-step-2-review.md` | **Modify** — both `develop-task` tables, the Handling Findings bullet at `:152`, the halt message, plus the reasoning note |
| `shared/resources/review-report-freshness.js` | **Add** — the freshness helper: given a task file and its newest review report, return `fresh` / `stale` / `absent` plus the reason the halt message needs. Pure, no network, no `stat` |
| `shared/resources/tests/review-report-freshness.test.mjs` | **Add** — the regression net for §8, including the fresh-clone case |
| `skills/develop-task/SKILL.md` | **Modified** — autonomous-defaults row 248 rewritten; rows 247 and 249 re-read beside the new tables and left unchanged |
| `evals/develop-task/step-isolation/02-review-task/scenario.json` | **Modified** — description rewritten to the new semantics; assertions 1 → 4 |
| `evals/.../02-review-task/replay/.../task.42.example.md` | **Added** — the scenario had no task file at all, so it could not express the status its own description named |
| `evals/.../02-review-task/replay/.../task.42.review.2026-05-11.md` | **Modified** — carried `**Date:**`, a form the rule does not read; now `**Reviewed:**` + `**Review Date:**`, matching the real corpus |
| `CHANGELOG.md` | **Modified** — Unreleased → Changed entry; this alters pipeline behaviour, so it is not an internal refactor |
| `skills/*/references/*` | **Regenerated** — `npm run bundle`, never hand-edited. **Four files**: the step-2 resource into `develop-story` and `develop-task`, plus `review-report-freshness.js` into both. develop-story receives the engine as a **bundling consequence only** — its own tables never call it, and the bundler copies whatever the shared resource references into every skill that carries it |

**Added:** 3 (helper, its test, the eval fixture task file). **Deleted:** none.

> **The eval scenario is improved but still not a discriminating test, and that is inherent.** It runs
> under `EVAL_MODE: replay`, where nothing executes the skill — assertions verify the seeded sandbox.
> Strengthening them further would be theatre. The real net for this behaviour is the unit test; the
> scenario's job here is to stop *misdescribing* the semantics and to carry a fixture that matches the
> corpus. Recorded rather than glossed, because a scenario that looks like a behavioural test and is
> not is exactly the shape §8 warns about.

> `package.json`'s `test` script lists per-skill globs by hand. `shared/resources/tests/*.test.mjs` is
> **already** in that list, so the new test file runs without a `package.json` edit — verify this rather
> than assuming it, because a suite that runs nowhere is the failure mode this repo has already paid for.

---

## 8. Testing Strategy

> **There is no existing net to extend — §8 is the whole net.** Measured across the repository, no test
> asserts a row of either table, the `planned` status, the HALT, its message, or report freshness. The
> Step 2 protocol test (`evals/develop-task/protocol/step-contract.test.mjs:38`) asserts only that the
> substrings `review` and `skip` occur somewhere in the file — **it would pass with both tables
> deleted**. The step-isolation scenario's single `fileExists` assertion cannot distinguish a skip from
> a run. Treat a green suite as no evidence at all on this task, and mutation-prove every case below by
> reverting the behaviour and confirming the test goes red.

1. **Falsify the current behaviour first.** Reproduce the halt before changing anything. A fix for a
   defect nobody has reproduced is a guess — and this task exists because a confident diagnosis was
   already reached without one.
   **The reproduction needs a config, not just a task**: under stock defaults the HALT is unreachable
   (Phase 1). Set `sign-off.enabled: true` + `sign-off.enforcement: blocking` with an unsigned required
   row — or `change-log.enforcement: blocking` with a missing log — then drive a `planned` task through
   Step 2. Without that, "reproduce the halt" is not merely hard, it is impossible, and reporting it as
   unreachable would be an artifact of the fixture rather than a finding.
2. **Both directions.** `planned` + current report → skips Step 2, reaches Step 3. `planned` + no
   report → still runs the review. `planned` + report older than the task's `updated:` → still runs the
   review. `planned` + report whose date cannot be parsed → still runs the review.
3. **The genuine halt must survive.** A review that produces no report at all must still HALT. The fix
   must not buy liveness by removing the gate.
4. **Freshness in a fresh clone.** Assert the freshness rule in a clone where every mtime is the
   checkout time. A test that passes only because mtimes happen to be ordered is not evidence — and,
   conversely, the helper must be shown to consult **no** `stat` output at all, so that a test cannot
   pass for the wrong reason either.
5. **The message.** Assert on the halt text naming the failed precondition, not merely on the halt
   firing. Assert each precondition separately: report absent, report stale (with both dates in the
   message), report date unparseable.
6. **Both bundled copies.** After `npm run bundle`, assert the `develop-task` copy carries the new
   tables and the `develop-story` copy is byte-identical to before apart from its banner and link
   rewrites. §9 promises the story tables are unchanged; assert it rather than trusting the bundler.

---

## 9. Success Criteria

- [x] Phase 1 records the reachability result with evidence — the two gates that reach the HALT, the
      two paths that do not — **and records explicitly what could not be determined about the reported
      incident and why** (it occurred in `rebirth-wallet`, unavailable from here, so the specific cause
      is not evidenceable from this repository; the candidate list is).
- [x] A `planned` task with a current review report reaches Step 3 without an operator ruling.
- [x] A `planned` task with no review report still runs `/review-task`.
- [x] A `planned` task with a review report older than the document's `updated:` still runs it.
- [x] A `planned` task whose review report has no parseable date still runs it.
- [x] A review that produces no report still HALTs.
- [x] The halt message names which precondition failed, and is asserted per-precondition.
- [x] Report freshness derives from document content — the task's frontmatter `updated:` and the
      report's body `**Reviewed:**` / `- **Review Date:**` line — and from no filesystem mtime.
      **Verified by forbidding the input rather than by cloning**: two tests assert the module
      contains zero `require(...)` calls and none of `statSync`/`stat(`/`mtime`/`readFile`/
      `existsSync`/`openSync` in comment-stripped source. A module that cannot reach the filesystem
      cannot vary with mtime, which subsumes the fresh-clone case and holds for every future clone
      rather than for one. *(Original wording claimed a clone was made; none was. The substituted
      evidence is stronger, but the criterion had to say what was actually done.)*
- [x] The resource states how and why this diverges from the mtime rule in
      `develop-pipeline-resume-contract.md:95–110`.
- [x] `/develop-story`'s tables are unchanged — asserted, not assumed.
- [x] The new test file is actually executed by `npm test` (confirm its glob is matched).
- [x] The resource carries a note explaining the defect, in the shape of the 2026-08-19 `Draft` note.
- [x] Every new test is mutation-proved: reverting the behaviour turns it red.

---

## 10. Risk Assessment

**Low.** Table rows, a freshness rule, a message, and one small pure helper with its tests.

> The earlier framing — "a documentation resource with no runtime" — was wrong twice over. The resource
> already embeds shell the orchestrator executes (the gate-check `ls` that finds the review report), and
> §4 now adds a helper deliberately. The risk level is unchanged; the characterisation was understating
> what is being touched, which matters because it is the sentence a reviewer uses to decide how hard to
> look.

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

Revert the resource, delete the helper and its test, `npm run bundle`, re-release. Nothing depends on
the new behaviour; the halt returns, along with the manual override.

The helper is a pure function with no callers outside the step-2 resource, so removing it cannot strand
anything. Reverting the resource alone — leaving the helper in place, unreferenced — is also safe and is
the smaller rollback if only the table behaviour needs undoing.

---

## QA Testing Results

**QA Status**: PASS (cycle 3)
**Testing Date**: 2026-09-08
**Quality Score**: 70/100
**Gate Decision**: cycle 1 FAIL → cycle 2 FAIL → **cycle 3 PASS (95/100)**; all 18 findings closed

### QA Reports

- **Cycle 1**: [qa.1](./task.97.qa.1.develop-task-review-gate-already-reviewed.md) · [gate.1](./task.97.gate.1.develop-task-review-gate-already-reviewed.yml)
- **Cycle 2 (refute)**: [qa.2](./task.97.qa.2.develop-task-review-gate-already-reviewed.md) · [gate.2](./task.97.gate.2.develop-task-review-gate-already-reviewed.yml)
- **Cycle 3 (verification)**: [qa.3](./task.97.qa.3.develop-task-review-gate-already-reviewed.md) · [gate.3](./task.97.gate.3.develop-task-review-gate-already-reviewed.yml) — **PASS**

### Test Coverage Summary

- **Tests Executed**: 2788 (2787 pass, 0 fail)
- **Phases Verified**: 4/4
- **Findings**: cycle 1 — 3 HIGH / 5 MED / 2 LOW; cycle 2 — 2 HIGH / 4 MED / 2 LOW. All closed.
- **NFR Status**: Security PASS, Performance PASS, Reliability FAIL→fixed, Maintainability CONCERNS→fixed

### Key Findings

The freshness rule was defeatable in **seven** distinct ways across two cycles, every one toward
`fresh` — the over-correction §10 names as worse than the halt this task removes. Cycle 2's sharpest
finding is that **two of cycle 1's own fixes cancelled each other out**: comment-stripping ran inside
fenced blocks and its output was re-tested as a delimiter, so a fenced example could close its own
block and leak an illustrative date as the report's. A fix is new code, not the closure of a finding.

Unit tests 27 → 59, every fix mutation-proved. `/develop-story` byte-identical throughout.

---

### QA Fix Cycle 1 — 2026-09-07

All 10 gate findings addressed. Every one was **re-reproduced before fixing and mutation-proved after** —
9 mutations applied, 9 went red.

| ID | Fix |
| --- | --- |
| TASK97-001 | `blankFences` → `blankNonProse`: HTML-comment spans blanked; indented code handled by a CommonMark `^ {0,3}` bound on the matchers rather than block-state tracking (list continuations make that ambiguous, and the ambiguity resolves the wrong way) |
| TASK97-002 | Separators `\s*` → `[ \t]*`, so the `m` flag genuinely confines a match to one line |
| TASK97-003 | Fence tracking stores char **and run length**; a closer must be the same char, ≥ the opener, with no info string |
| TASK97-004 | Frontmatter opener/closer must be lines that are exactly `---` (or `...`), **and** every line in the block must look like YAML — one line of column-0 prose means it is a thematic break. `updated:` is now first-wins |
| TASK97-005 | Calendar range validation (`isRealDate`), including leap years |
| TASK97-006 | `splitLines` on `/\r?\n/` — CRLF no longer silently disables the feature |
| TASK97-007 | Third post-review `Planned` row (stale → HALT); the Handling Findings bullet and blocking condition qualified with **current** |
| TASK97-009 | The two property reads are guarded; new `input-unreadable` reason and message |
| TASK97-010 | `Object.create(null)` + `hasOwnProperty` |
| cleanup | The documented snippet's `require` path now uses the `{develop-story\|develop-task\|develop-bug}` placeholder — this resource is bundled byte-identically to develop-story |

**Found while fixing, and worth recording:** the corpus spells the label's colon **three** ways, not one. The original measurement ("49/49 carry `**Reviewed:**`") counted only the numbered `review.{N}.` files and was wrong about the corpus — three reports use `**Reviewed**:` with the colon outside the bold span and read as undated. That failed *safe* (undated → stale → run the review) but defeated the feature for those documents for no reason. The matcher now accepts all three spellings, and task-report coverage went **65/68 → 68/68**.

**Regression evidence**: 161 tracked documents carry a frontmatter `updated:` date; **0** mis-parse after the stricter frontmatter rules. `/develop-story`'s sections re-verified byte-identical to `origin/develop`.

**TASK97-008 not fixed, and it is not expressible.** The scenario runs under `EVAL_MODE: replay`, where the runner seeds the sandbox from `replay/` and executes assertions — **nothing runs the skill**. An assertion such as "no second review report exists" therefore passes whether or not a skip occurred, because no report is ever created either way. The scenario cannot distinguish skip from run in this mode, and no assertion available in `evals/shared/assertions.mjs` changes that. It is left as the gate filed it (`future`), with the fixture corrected so it at least stops *misdescribing* the semantics. The real net is the unit test.

Tests: 27 → **44**.

---

## Phase 1 Record — why the promotion did not happen

> This section is Phase 1's deliverable. The card exists partly because a confident diagnosis was
> reached without one, so the distinction between *established*, *inferred* and *not determinable*
> is kept explicit throughout.

**Established, with evidence.** The post-review HALT is **conditionally reachable** — not
unconditional as the consumer believed, and not unreachable as this card's original Phase 1 allowed
for. Two supported configurations run a full review, write a report, auto-answer Step 9
"Yes, fixes complete", and still leave the status at `planned`:

| Mechanism | Where | Precondition |
| --- | --- | --- |
| Sign-off gate | `review-task` Step 9 §1a — "do **not** promote the status — regardless of the review outcome, **and including the pipeline auto-answer path**"; "`develop-task` will HALT at Step 2 until then" | `sign-off.enabled: true` **and** `sign-off.enforcement: blocking`, with a required row unsigned |
| Change-log gate | `review-task` check 4b severity table — Critical → NO-GO → "do **not** promote the task out of `planned`" | `change-log.enforcement: blocking`, with a missing or stale log |

Both defaults are `advisory`, and `sign-off` is skipped entirely when `sign-off.enabled` is absent.
**That is why the halt has never been observed in this repository**: under stock defaults with a
READY outcome, Step 9 promotes and the post-review table is never entered. The consumer predicted
the halt correctly and simply never met its precondition.

**Two paths that look like this one and are not:**

- `NEEDS REVISION` / `REQUIRES REWORK` halts *inside* `/review-task` Step 9, short-circuiting ahead
  of the post-review table. The halt is real but it is a different halt, with a correct message.
- A review that produces no report does **not** halt at the locate step — that logs a warning and
  continues. Whether it halts is decided by the post-review table, and only when the status is also
  unchanged.

**Inferred, not established.** For the reported incident specifically, the candidate causes are the
two gates above plus a standalone `/review-task` whose Step 9 was answered "Partially complete" or
"Not yet" (`review-task` Step 9 step 3 keeps `planned` for both).

**Not determinable from here, and deliberately not guessed.** Which of those applied in the
`rebirth-wallet` incident cannot be evidenced from this repository — that repo is not available to
this one. The incident record cited by the card shows the operator ruling "Skip — already reviewed"
at Phase 0d, so `/review-task` never re-ran there and no post-review evaluation happened at all. No
further conclusion about that specific run is supportable, and none is drawn.

**A defect surfaced but deliberately not fixed here.** The sign-off gate is written as a numbered
gate *inside* `review-task` Step 9; the change-log gate's identical "do not promote" instruction
lives only in check 4b's severity table and is never restated in Step 9. An agent executing Step 9
linearly may honour the first and miss the second. Fixing that is a `/review-task` behaviour change,
which §5 of this card promises not to make — **filed as a follow-up**, not actioned.

---

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-07 | 1.0 | Created from a consumer report (`rebirth-wallet` task.113 / RAPP-728), whose `/develop-task` run halted at Step 2 on a card reviewed hours earlier. **The consumer's diagnosis was checked and does not hold** — `/review-task` does promote `planned → ready-for-development` (`review-task/SKILL.md:1569`) and `document-status-lifecycle.md:59` names `review-task` as a setter of that status for tasks. Re-scoped from "two contradictory tables" to "the halt has no recovery path", with Phase 1 required to establish the real cause before any table changes | manual |
| 2026-09-07 | 1.1 | Framing corrected before any work started: the halt was **never observed**. The consumer's own incident record shows the operator ruling "Skip — already reviewed" at Phase 0d, so Step 2 was skipped and the post-review table was never reached — it was predicted from reading the tables. Phase 1 amended from *reproduce the halt* to *establish whether the HALT is reachable at all*, with an explicit branch to narrow the card if it is not. Roadmap row switched to the bare-path form its neighbours use; the markdown-link form failed the repo's link check, which resolves hrefs relative to the file | manual |
| 2026-09-07 | 1.2 | Review (7/10 → 9/10, READY TO IMPLEMENT). **Phase 1 answered by measurement and its branch structure falsified**: the post-review HALT is *conditionally* reachable — through `sign-off.enforcement: blocking` and `change-log.enforcement: blocking`, both of which return `planned` after a full review — and unreachable under stock defaults, which is why it has never been observed here. The "if unreachable, narrow the card" branch was removed as unusable. **Phase 2's freshness rule was unimplementable as written**: it named the task's frontmatter `updated:` but left the report's timestamp undefined, and only 7 of 49 tracked review reports carry frontmatter at all (6 carry `updated:`) — the report's date now comes from its body `**Reviewed:**` / `- **Review Date:**` line, present in 49/49, with unparseable defined as stale. **§8 contradicted §4/§7/§10**: it demanded fresh-clone and message assertions against a scope of two markdown files, and no existing test asserts either table (the Step 2 protocol test would pass with both deleted), so scope widened to a pure helper plus its test rather than deleting the requirement. Also: divergence from the mtime rule in `develop-pipeline-resume-contract.md:95–110` must now be stated rather than left silent; two omitted edit sites added (`:152` prose, the step-isolation scenario); Phase 4 restated as an edit to `SKILL.md:248`; §9's first criterion reframed to what this repo can evidence, since the incident is in another repository | review-task |
| 2026-09-07 |  | Status → ready-for-development | review-task |
| 2026-09-07 |  | Implemented — 8 source files (+4 regenerated bundles), 27 tests | develop |
| 2026-09-07 |  | QA gate FAIL (70/100) — 10 findings; the freshness rule is defeatable 4 ways toward `fresh` | qa-task |
| 2026-09-07 |  | QA findings fixed — all 10 closed, 9 mutations proved red, 1 cycle | qa-fix |
| 2026-09-08 |  | QA cycle 2 refute pass — gate FAIL (70/100), 8 findings; two of cycle 1's fixes cancelled out and the module was still defeatable | qa-task |
| 2026-09-08 |  | Cycle-2 findings fixed — all 8 closed, 12 mutations proved red, tests 27 → 59 | qa-fix |
| 2026-09-08 |  | QA gate PASS (95/100) cycle 3 — 20-input attack corpus, 0 unsafe; 68/68 reports and 161/161 docs still parse | qa-task |
| 2026-09-08 |  | Step 5c `/review-pr` — CONCERNS, 16 findings all addressed: an unmet §9 criterion that had been ticked, wrong corpus figures in the module header and CHANGELOG, three vacuous tests, and two unsafe-direction holes (phantom fence from an inline code span; comment removal shifting the indent bound) | review-pr |

---

## Progress Tracking

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 — Establish the actual cause | ✅ Complete | Conditionally reachable via the sign-off and change-log **blocking** gates; unreachable under stock defaults. "Narrow the card" branch falsified and removed. Written up in **Phase 1 Record** below, including what could not be determined |
| Phase 2 — Define "current review report" | ✅ Complete | `review-report-freshness.js` + 27 tests, all 8 mutations proved red. Task side = frontmatter `updated:`; report side = body `**Reviewed:**` → `**Review Date:**`. No filesystem access at all — asserted, not merely intended |
| Phase 3 — Fix the tables and the message | ✅ Complete | Four sites in the resource: skip table (+ freshness definition), post-review table (now two `Planned` rows), Handling Findings bullet (+ the three-fact halt message), report-locating paragraph (+ the `sort \| tail -1` caveat). Two ⚠️ reasoning notes added |
| Phase 4 — Align the surrounding prose | ✅ Complete | `develop-task/SKILL.md:248` rewritten; eval scenario + fixtures corrected; `npm run bundle` re-run |

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
