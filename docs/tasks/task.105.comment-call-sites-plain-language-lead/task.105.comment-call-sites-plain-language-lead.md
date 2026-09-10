---
id: task.105
title: "[Task 105] Every tracker-comment call site feeds the plain-language lead, and the seven that bypass the engine stop bypassing it"
type: task
description: "Task 104's catalogue renders a generic lead from --stage alone. This task feeds it real values at all 22 call sites so the lead says something specific, converts the seven bare `gh issue comment` sites onto the engine so they get a lead at all, and updates the 16 test files that assert on comment shape."
tags: [tracker-comment, stakeholder-communication, develop-pipeline, migration]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-09-09
updated: 2026-09-10
assignee:
estimated_effort_hours: 12
github_issue: 378
---

# Technical Task: feed the lead, and close the bypass

**GitHub Issue**: [#378](https://github.com/Gamaroff/agent-skills/issues/378)

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.105.review.1.comment-call-sites-plain-language-lead.md` implemented 2026-09-10

---

## 1. Overview

[Task 104](../task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md)
makes `tracker-comment.js` render a plain-language paragraph from the `--stage` it is already given.
That paragraph is correct but generic — it cannot name the branch, the pull request, the verdict or
the number of problems found, because no call site tells it any of those things.

Task 104 merged on 2026-09-09 (PR #377), so `--slot` and the lead catalogue both ship today — this
task supplies values to a flag that already exists, and can start immediately.

This task does two things:

1. **Feeds the slots.** All 22 `tracker-comment.js` call sites pass `--slot k=v` values, so the lead
   stops being the same paragraph every time and starts being a summary.
2. **Closes the bypass.** Seven sites post a bare `gh issue comment` or `gh issue close --comment`
   and never reach the engine at all. No engine change can give those a lead. They are converted.

It ends with the guard turned to its final form and the 16 test files that assert on comment shape
brought in line.

**Scope**: tracker-issue comments only. Pull-request comments are
[task.106](../task.106.pr-comment-plain-language-lead/task.106.pr-comment-plain-language-lead.md).

---

## 2. Motivation

### Current problems

1. **A generic lead repeated five times stops being read.** The QA loop can post `qa-cycle-1`
   through `qa-cycle-5` on one issue. With no slots, all five open with an identical paragraph. The
   reader learns to skip it — which is the exact failure this work exists to prevent, arriving by a
   different route.

2. **The most important fact is the one most likely to stay technical.** `qa-story` and `qa-task`
   post `QA CONCERNS (78/100)`. Without the verdict reaching the lead as a slot, the plain-language
   paragraph cannot say whether the news is good or bad, and a reader is sent back into the body to
   find out.

3. **Seven sites bypass the engine entirely.** `develop-pipeline-step-7-finalise.md` (L170, L173,
   L180, L183), `qa-story` (L1762), `qa-task` (L1169) and `review-story` (L2313) post with a bare
   `gh issue comment` / `gh issue close --comment`. They are GitHub-only, carry no idempotency
   marker, re-post on a resumed run — and after task.104 they would be the only tracker comments in
   the pipeline with no lead, which is worse than the uniform state we started from.

4. **`review-story` is the only `review-*` skill whose GitHub arm is not routed through the CLI.**
   `review-task` has both arms on the CLI (L1674 Jira, L1743 GitHub). The asymmetry is an
   accident, and it is why the same review outcome reads differently depending on the tracker.

5. **Three bodies are built once and posted twice.** `qa-fix` builds `$COMMENT_BODY` around L700–763
   and posts it to the pull request (L770) *and* the tracker issue (L807). A stakeholder-facing lead
   is right for one and not the other, and the shared variable currently prevents them differing.

### Benefits

1. **The lead becomes a summary rather than a category label** — it names the pull request, the
   verdict, the count, the cycle.
2. **One path for every tracker comment.** After this, `tracker-comment.js` is the only way a
   comment reaches a Jira card or a GitHub issue, which is what the comment contract has claimed
   since task 55 and has not been true since.
3. **Idempotency arrives for free at seven sites.** They gain the marker they never had, so a
   resumed run stops double-commenting.
4. **The rule becomes unskippable.** With no bypass left, the engine guard is a complete guarantee
   rather than a guarantee about the sites that happen to use it.

---

## 3. Technical Background

### The 22 `tracker-comment.js` call sites

| # | Source file | Line | `--stage` | Slots to add |
| :-- | :--- | :-- | :--- | :--- |
| 1 | `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | 342 | `work-started` | `title` |
| 2 | `shared/resources/develop-pipeline-step-2-review.md` | 168 | `review` | `outcome=already-reviewed` |
| 3 | same | 331 | `review` | `outcome`, `blocking` |
| 4 | same | 350 | `review` | `outcome`, `blocking` |
| 5 | `shared/resources/develop-pipeline-step-3-develop-loop.md` | 207 | `develop-complete` | `count` |
| 6 | same | 230 | `develop-complete` | `count` |
| 7 | `shared/resources/develop-pipeline-step-4-create-pr.md` | 231 | `in-review` | `pr` |
| 8 | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | 312 | `qa-cycle-{N}` | `verdict`, `cycle` |
| 9 | same | 794 | `qa-fix-{N}` | `cycle` |
| 10 | `shared/resources/develop-pipeline-step-7-finalise.md` | 241 | `done` | `pr` |
| 11 | `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` | 87 | `qa-cycle-{N}` | `verdict`, `cycle` |
| 12–13 | `skills/create-pr/SKILL.md` | 378, 413 | `in-review` | `pr` |
| 14 | `skills/finalise/SKILL.md` | 1196 | `done` | `pr` |
| 15 | `skills/finalise/SKILL.md` | 1292 | `done` | `pr` |
| 16 | `skills/qa-fix/SKILL.md` | 807 | `qa-fix` | `cycle` |
| 17 | `skills/qa-story/SKILL.md` | 1783 | `qa-gate` | `verdict`, `blocking_count` |
| 18 | `skills/qa-task/SKILL.md` | 1190 | `qa-gate` | `verdict`, `blocking_count` |
| 19 | `skills/review-bug/SKILL.md` | 163 | `review-bug` | `outcome`, `blocking` |
| 20 | `skills/review-story/SKILL.md` | 2274 | `review-story` | `outcome`, `blocking` |
| 21–22 | `skills/review-task/SKILL.md` | 1674, 1743 | `review-task` | `outcome`, `blocking` |

> **These line numbers were correct on 2026-09-09 and will not stay correct.** Re-locate each site by
> grepping for `tracker-comment.js` before editing — see `project_tracked_tree_link_verification`
> and observation #22 on decaying line citations. The table's value is the **inventory and the slot
> mapping**, not the coordinates.

### Which slots each stage actually reads — the authoritative list

The slot column above is only useful if every name in it is one the stage's template reads. **The
engine validates nothing here**: `tracker-comment.js` L332–342 splits `--slot k=v` on the first `=`
and stores any key, and `normaliseSlots` (`stakeholder-summary.js` L190–233) passes an unrecognised
name through to a template that never reads it. A wrong slot name posts a comment that succeeds and
reads exactly as though the slot had been omitted — no exit code, no warning, nothing in the log.

So this table, not intuition, is the source of truth. It is transcribed from
`shared/resources/stakeholder-summary.js` L58–141 (templates) and L178–180 (classification):

| Stage | Slots the template reads | Type |
| :--- | :--- | :--- |
| `work-started` | `title` | text |
| `review`, `review-story`, `review-task`, `review-bug` | `outcome`, `blocking` | text, boolean |
| `develop-complete` | `count` | numeric |
| `in-review` | `pr` | text |
| `qa-gate` | `verdict`, `blocking_count` | text, numeric |
| `qa-cycle` | `verdict`, `cycle` | text, numeric |
| `qa-fix` | `cycle` | numeric |
| `done` | `pr` | text |

Type matters, because coercion is per-type: a **boolean** slot treats `""`/`0`/`false`/`no`/`none`/
`null`/`undefined`/`off` as *absent* (so the template's negative branch renders), a **numeric** slot
accepts positive integers only and drops anything else, and a **text** slot is passed through verbatim
with only `""` dropped. Do not pass a count to `blocking`, or a word to `cycle`.

**Do not copy a slot name from a neighbouring row.** Three of the rows in the table above were wrong in
the first draft of this document for exactly that reason — `pr` on `qa-gate` and `count` on `qa-cycle`
are real slot names on other stages, which is what made them look right.

### The seven bypass sites

| Source file | Line | Command | Marker? |
| :--- | :-- | :--- | :--- |
| `shared/resources/develop-pipeline-step-7-finalise.md` | 170 | `gh issue comment` (story complete) | none |
| same | 173 | `gh issue close --comment` (story) | none |
| same | 180 | `gh issue comment` (task complete) | none |
| same | 183 | `gh issue close --comment` (task) | none |
| `skills/qa-story/SKILL.md` | 1762 | `gh issue comment` (QA one-liner) | none |
| `skills/qa-task/SKILL.md` | 1169 | `gh issue comment` (QA one-liner) | none |
| `skills/review-story/SKILL.md` | 2313 | `gh issue comment` (review outcome) | none |

`gh issue close --comment` is the awkward one: it is a **close plus a comment in one call**.
`tracker-issue.js` owns closing. Splitting it into `tracker-comment.js` then `tracker-issue.js` is
two calls where there was one, and the two can now fail independently.

### The hook path is deliberately excluded

`shared/resources/develop-pipeline-on-precompact.sh` L140 posts pause notices from a shell hook
that must run without Node available and must never block compaction. It stays as-is; the exclusion
is recorded in §4 so a future sweep does not read it as an oversight.

---

## 4. Scope

**In scope**

- `--slot` values at all 22 `tracker-comment.js` call sites (18 source files after bundling).
- Converting the seven bypass sites onto `tracker-comment.js`.
- Splitting `qa-fix`'s shared `$COMMENT_BODY` so the tracker comment and the pull-request comment can
  differ.
- Updating the 16 test files listed in §8.
- `npm run bundle`; `npm run generate-catalog` if a skill description changed.
- A guard test that fails when a shipped `.md` contains a bare `gh issue comment` outside the
  allowlist — the thing that stops the bypass coming back.

**Out of scope**

- **Pull-request comments** — task.106. `qa-fix`'s PR comment is *touched* here only to decouple it
  from the tracker body; its own lead is task.106's.
- **The precompact hook** (§3). Recorded, not changed.
- **Rewriting the technical bodies.** The lead goes above; the detail below stays as it is. This is
  what keeps the change reviewable — every diff hunk is an added `--slot` or an added line.
- **`tracker-reconcile`**, which reads markers and posts nothing.
- Backfilling leads onto comments already posted to live boards.

---

## 5. Breaking Changes

### 5.1 Seven comments change transport

They gain an idempotency marker and, on a Jira project, become postable at all (they are `gh`-only
today, so a Jira consumer silently gets nothing from them).

**Impact**: a resumed run that previously posted a second copy now posts none. That is the intended
fix, but a reader watching a re-run will see one fewer comment than before.

They also **lose the 3× exponential backoff**. `tracker_call_with_retry` is an alias of `tracker_write`
(`resolve-platform.sh` L721–731), and `tracker-comment.js` has no retry of its own — the engine owns
the `ACCESS_TRACKER` deferral gate, not the retry. Re-wrapping the engine call would double-defer, so
the retry is genuinely given up rather than relocated. The established convention accepts this:
`review-task` SKILL.md L1743, the reference implementation for a converted site, carries no wrapper and
degrades with `|| echo "⚠️ …  — continuing"`. Match it, and say so in the implementation report.

**Migration**: none for the user. `tests/mutation-call-site-coverage.test.js` (L77–80, L110,
L142–143) already asserts every `gh issue comment` site routes through `tracker_write` or
`tracker-comment.js`; extend it to assert **zero** bare sites outside the allowlist.

### 5.2 `gh issue close --comment` becomes two calls

**Before**: `gh issue close {N} --comment "Closing — story accepted. PR: …"`
**After**: `tracker-comment.js --stage done --slot pr=…` then
`tracker-issue.js --kind close --issue {N} --reason completed`. (`--kind close` — `tracker-issue.js`
has no `--close` flag; closing is a kind, per its usage at L158.)

**Impact**: the two can now fail independently — an issue can be commented and left open, or closed
without its closing comment.

**Migration**: comment first, close second, and read each `reason`. Comment-then-close leaves the
recoverable state (an open issue carrying its summary) rather than the misleading one (a closed
issue with no explanation). State this ordering in the step doc as a rule, not an accident.

**Prior art — copy it, do not re-derive it.** `skills/finalise/SKILL.md` L1325–1347 already implements
exactly this: one `tracker-comment.js --stage done` comment, then `tracker-issue.js --kind close
--reason completed`, with a note explaining that `--comment` on the close is an *unmarked* second
comment the marker cannot see, so it recurs on every resume. Phase 3 should end up looking like it.

**The `--stage done` marker collision is resolved, and does not reach back into task.104.** Two
`--stage done` comments on one issue do collapse — `tracker-comment.js` L751–786 returns `already` on a
single marker match and does not post — but that does not bite here, for two independent reasons.
First, the existing `--stage done` call at `develop-pipeline-step-7-finalise.md` L241 is in the **Jira**
arm while the four bare-`gh` sites are in the **GitHub** arm, and the file branches on `TRACKER`, so
they are mutually exclusive within a run. Second, the two GitHub-arm comments (completion, then close)
*would* collide with each other, and the prior art above is the fix: merge them into **one** `done`
comment carrying PR, status, DoD verdict and report path, then close with no `--comment`. The two
existing texts are near-duplicates and nothing is lost. **No new stage and no new lead template are
needed**, so this task requires no change to task.104's module.

### 5.3 `qa-fix`'s shared body splits in two

**Before**: one `$COMMENT_BODY`, posted to both the pull request and the tracker issue.
**After**: `$PR_COMMENT_BODY` and `$TRACKER_COMMENT_BODY`.

**Impact**: an edit to the fix summary must now be made in one place and consciously mirrored, or the
two drift.

**Migration**: keep the shared *content* in one variable and have each site wrap it, rather than
duplicating the text. Duplicated prose in this repository drifts within weeks
(`project_behaviour_change_doc_sweep`).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.105.plan.comment-call-sites-plain-language-lead.md](task.105.plan.comment-call-sites-plain-language-lead.md)

### Phase 1 — Pipeline step docs (risk: Low)

**Files**: `shared/resources/develop-pipeline-step-{0,2,3,4,5-6,7}*.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`

- [x] Add `--slot` values to sites 1–11.
- [x] Verify each slot value is a variable the step doc has already resolved at that point — a slot
      referencing a value bound three steps later renders as a literal.

### Phase 2 — Skill call sites (risk: Low)

**Files**: `skills/{create-pr,finalise,qa-fix,qa-story,qa-task,review-bug,review-story,review-task}/SKILL.md`

- [x] Add `--slot` values to sites 12–22.
- [x] Split `qa-fix`'s `$COMMENT_BODY` per §5.3.

### Phase 3 — Close the bypass (risk: Medium)

**Files**: `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/{qa-story,qa-task,review-story}/SKILL.md`

- [x] Convert the three `gh issue comment` sites to `tracker-comment.js`.
- [x] Convert the two `gh issue close --comment` sites to comment-then-close, in that order, each
      `reason` read.
- [x] `review-story`'s GitHub arm: collapse to the single CLI call, matching `review-task` L1743.

### Phase 4 — Tests and the anti-regression guard (risk: Medium)

**Files**: the files in §8

- [x] Update body-shape assertions to match the caller's body as a substring.
- [x] **Guard A — zero bypass.** In `tests/mutation-call-site-coverage.test.js`: no bare
      `gh issue comment` / `gh issue close --comment` **invocation** in shipped source outside a named
      allowlist. Match **invocation shape**, not the bare literal: a line whose command position is the
      call, optionally preceded by `tracker_call_with_retry` or `tracker_write`. A literal match fails
      on prose — `develop-pipeline-step-0-resolve-and-prepare.md` L401,
      `develop-pipeline-step-4-create-pr.md` L196/L215 and `create-pr/SKILL.md` L386 all contain the
      string inside sentences *prohibiting* the call, and widening the allowlist to swallow them is the
      "allowlist widens silently" failure `docs/reference/anti-patterns.md` names. Assert the allowlist
      is non-empty and every entry exists on disk.
- [x] **Guard B — every site feeds the lead.** The population check for the slot half, and the more
      important of the two. For every `tracker-comment.js` invocation in shipped source, assert (i) it
      passes at least one `--slot`, and (ii) every slot name it passes is in the set that stage's
      template reads. Derive that set by **importing** `LEAD_TEMPLATES` / `TEXT_SLOTS` / `BOOLEAN_SLOTS`
      / `NUMERIC_SLOTS` from `stakeholder-summary.js` — never by restating the mapping in the test, which
      would be a second enumeration of the thing §3 already enumerates once. Assert a non-vacuity floor
      (the walk found ≥ 20 sites), because a guard that silently matches nothing passes forever.
- [x] `evals/shared/tests/transition-protocol-parity.test.mjs`: extend the `--stage` literal check so
      every literal also resolves to a lead template.

> **Guard B is the deliverable of Phases 1–2, not an afterthought.** `anti-patterns.md` L129: *"when a
> fix is the same edit applied at more than one call site … the deliverable is the check that finds site
> N+1 — not the N edits."* Three of the slot mappings in §3's table were wrong on first authoring and
> nothing could have caught them; Guard B is the mechanical form of the review that did.

### Phase 5 — Bundle and sweep (risk: Low)

- [x] `npm run bundle`; confirm only `references/` copies changed.
- [x] `npm run generate-catalog`.
- [x] Sweep the consumer-facing docs that restate pipeline comment behaviour
      (`docs/development/project-completion-roadmap.md`, `docs/reference/pipeline-artifacts.md`,
      the runbooks) — see `project_behaviour_change_doc_sweep`.

---

## 7. Files Summary

**Modified — sources (20)**

Call sites (15):
`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`,
`…-step-2-review.md`, `…-step-3-develop-loop.md`, `…-step-4-create-pr.md`,
`…-step-5-6-qa-loop.md`, `…-step-7-finalise.md`,
`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`,
`skills/create-pr/SKILL.md`, `skills/finalise/SKILL.md`, `skills/qa-fix/SKILL.md`,
`skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/review-bug/SKILL.md`,
`skills/review-story/SKILL.md`, `skills/review-task/SKILL.md`

Contract and docs (2):
`shared/resources/tracker-comment-contract.md` (§9 Migration — the incomplete-migration
paragraph rewritten, not deleted),
`AGENTS.md` (carried the same now-false claim; Phase 5's doc sweep)

Tests (3):
`tests/mutation-call-site-coverage.test.js` (Guard A repaired — twice),
`evals/shared/tests/transition-protocol-parity.test.mjs` (every comment `--stage` literal must
resolve to a lead template),
`shared/resources/tests/review-report-freshness.test.mjs` (a pre-existing guard **narrowed** — see below)

**Added — sources (1)**

`shared/resources/tests/comment-slot-coverage.test.mjs` — Guard B, the population check for the slot
half. Covered by the existing `shared/resources/tests/*.test.mjs` glob in `package.json`, so it runs
without a `npm test` edit (checked, per `project_npm_test_glob_orphans_suites`).

> **Three of these were not in the original Files Summary, and the additions are worth naming rather
> than absorbing.** `AGENTS.md` and the contract are the Phase 5 doc sweep finding its own targets —
> both asserted that several sites still post a bare `gh issue comment`, which this task makes false.
>
> **`review-report-freshness.test.mjs` is the one genuinely debatable file in this change.** It is not
> a call site and not a doc sweep: it pinned *every line* of every `#### develop-story` section in
> `develop-pipeline-step-2-review.md` against `origin/develop`, to hold an earlier task's promise that
> its **tables** were unchanged. Adding slots to the review comment is required at both arms — the lead
> is a property of the moment, not of the tracker — so the symmetric, correct change failed a guard
> that had nothing to say about it. It was **narrowed to the decision tables**, which is what that
> task's §9 actually claimed, and mutation-proved. Recorded here so a reviewer meets the decision in
> the Files Summary rather than discovering it in a diff.

> `skills/develop-bug/references/develop-bug-step-*.md` are **source** files — they carry no
> auto-generated banner and have no `shared/resources/` counterpart. Every other
> `skills/*/references/` file in this task's blast radius is generated.

**Regenerated** — 29 bundled copies across 13 skills, by `npm run bundle`. Never hand-edited.

---

## 8. Testing Strategy

**Files whose assertions must be revisited** — the verified set, not an estimate:

| File | Why |
| :--- | :--- |
| `shared/resources/tests/tracker-comment.test.mjs` | body composition, marker position, `--slot` parsing |
| `shared/resources/tests/stakeholder-summary.test.mjs` | per-stage lead content once slots are supplied |
| `shared/resources/tests/tracker-issue.test.mjs` | close-path argv, now preceded by a comment |
| `shared/resources/tests/jira-interception.test.mjs` | the stale-claim guard about `gh issue comment` gating (L990) — its wording becomes true here and must be re-checked, not deleted |
| `shared/resources/tests/qa-execute-snippets.test.mjs` | mutating-snippet classification; the harness for the behavioural assertions below |
| `shared/resources/tracker-access.test.sh` | `tracker_write` gating assertions (L504, L1651, L1678) |
| `evals/shared/tests/transition-protocol-parity.test.mjs` | `--stage` literals; the positive "step docs still contain `tracker-comment.js`" guard at L669–692 |
| `tests/mutation-call-site-coverage.test.js` | the existing `gh issue comment` entries (L79, L143) and both new guards |
| `skills/qa-story/tests/qa-story.test.js` | call-shape assertions on the converted QA one-liner |
| `skills/qa-task/tests/qa-task.test.js` | same |

> **Two corrections to an earlier draft of this section, both worth keeping.** It listed
> `skills/{qa-fix,review-story,review-task,finalise,create-pr}/tests/*` — **none of those five
> directories exists**. Only `qa-story`, `qa-task` and `review-bug` have a `tests/` directory at all,
> and `review-bug`'s holds no comment assertions. It also named `handover-verify.test.mjs` and
> `handover-render.test.mjs`, which contain no `tracker-comment` reference. Creating a new per-skill
> suite is a legitimate choice here, but it must be a **deliberate** one: `package.json` lists per-skill
> test globs by hand, so a new `skills/*/tests/` directory runs nowhere until it is added
> (`project_npm_test_glob_orphans_suites`).

**Behavioural, not textual.** Several of these assert that a SKILL.md *contains a string*. Per
`feedback_assert_behaviour_not_source_text`, where a site is converted, add an assertion that
**executes** the snippet against a fake transport and inspects what was sent — a grep proves the
string exists, not that the call works. `qa-execute-snippets.test.mjs` is the existing harness for
this; extend it rather than inventing a second one.

**Mutation proofs**

| Mutation | Test that must go red |
| :--- | :--- |
| Drop `--slot verdict=…` from the `qa-gate` site | the qa-gate lead-content assertion |
| Restore one bare `gh issue comment` in a step doc | the new zero-bypass guard |
| Reorder `gh issue close` before the comment | the comment-then-close ordering assertion |

**Regression**: `npm test` and `npm run eval:all` green. Run `qa-execute-snippets.test.mjs` alone
before believing a failure in it — it is load-flaky (`project_qa_execute_snippets_load_flake`).

---

## 9. Success Criteria

**Functional**

- [x] **Every** `tracker-comment.js` call site in shipped source passes at least one `--slot`; each slot
      value is bound at that point in the step; and **each slot name is one that stage's template
      actually reads** — proven by Phase 4's Guard B importing the mapping from
      `stakeholder-summary.js`, not by a count in the report. A slot name no template reads is silently
      inert, so a count alone cannot establish this criterion.

      > **Deliberately not "all 22".** The inventory in §3 was 22 when this was authored and the
      > delivered figure is **24**: converting `step-7-finalise.md`'s GitHub arm turns each of its two
      > bare `gh` pairs (story variant, task variant) into a `tracker-comment.js` site, where the
      > inventory counted each pair once. A criterion pinned to a number would have to be edited by
      > whoever is proving it, which is the wrong way round. Guard B's population walk is the arbiter,
      > and its non-vacuity floor is what stops "every site" being vacuously true.
- [x] Zero bare `gh issue comment` / `gh issue close --comment` in shipped `.md` outside the named
      allowlist, proven by a test rather than a grep in the report.
- [x] **All seven** converted sites post a marker and are idempotent across a re-run.

      > This read "the five converted sites" and was ambiguous against the rest of the document. §3's
      > table and §5.1 both say **seven**; §6 Phase 3 says "three `gh issue comment`" plus "two
      > `gh issue close --comment`", which is five only because `qa-story` and `qa-task`'s two were
      > converted in Phase 2 as part of the same edit that added their slots. Seven is the number of
      > sites that stopped bypassing the engine, and it is the number this criterion is about.
- [x] `review-story`'s Jira and GitHub arms produce the same comment text.
- [x] Comment-then-close ordering is asserted, not just documented.

**Performance**

- [x] No call site gains an extra network round-trip except the two `--comment`-on-close sites, which
      necessarily become two. No other site's call count changes.

**Code quality**

- [x] No `skills/*/references/` file hand-edited; `npm run bundle` produces no diff after the commit.
- [x] `qa-fix`'s two bodies share their content through one variable, not two copies.
- [x] Every converted site reads `reason` and acts on it per the contract; none posts over
      `unverifiable`.

**Migration**

- [x] `tracker-comment-contract.md` L20–24 — the paragraph admitting the incomplete GitHub migration
      — is rewritten to describe the finished state. It must not be deleted silently: it is the
      record of why the guard exists.
- [x] Consumer docs restating comment behaviour swept.

---

## 10. Risk Assessment

**HIGH — a slot referencing an unbound variable ships a literal.** A `--slot pr=${PR_URL}` in a step
that has not yet resolved `PR_URL` renders the lead with an empty or literal value, and nothing
fails — the comment posts, just wrong.
*Probability*: medium — 22 sites, several with variables bound in a different step.
*Impact*: high, and invisible; this is precisely the class of defect that reaches a live board.
*Mitigation*: Phase 1's second checkbox is a per-site binding check. The
`qa-execute-snippets` harness executes snippets and can assert the rendered lead contains no `${`.

> **The binding check covers only half the risk, and the other half is the half that already bit.** A
> *bound* variable passed under a slot name no template reads is equally silent — the comment posts and
> reads as though the slot were omitted — and the binding check cannot see it, because the variable is
> bound. Three such names were in this document's own §3 table before review. Phase 4's **Guard B** is
> the mitigation for that axis; the per-site binding check is the mitigation for this one. Both are
> required, and neither substitutes for the other.

**MEDIUM — comment-then-close leaves an issue open.** §5.2.
*Mitigation*: ordering is asserted; a failed close is a reported `reason`, not a silent skip.

**MEDIUM — the `review-story` GitHub arm has a body the Jira arm does not.** L2313–2325 is a
multi-line inline `--body`, not the same text as L2257–2272. Collapsing the arms is a content
decision, not only a transport one.
*Mitigation*: diff the two bodies before collapsing and record which one wins and why.

**LOW — bundling drift.** As task.104.

**LOW — line numbers in this document decay.** Explicitly flagged at §3; re-grep before editing.

---

## 11. Rollback Plan

**Triggers**

- A lead renders with an unsubstituted `${…}` on a live board.
- A converted site stops posting on either tracker.
- An issue is closed without its closing comment.

**Immediate** (< 10 min): revert the merge and `npm run bundle`. Task.104's generic leads survive the
revert, so comments keep their (weaker) lead rather than losing it — the pipeline does not regress
past its previous state.

**Partial**: revert Phase 3 alone (the seven bypass conversions) and keep Phases 1–2. The slot values
are additive and independently safe; the transport conversions are the risky half. This is the split
to reach for first.

**Forward fix**: for a single bad slot, remove that one `--slot` — the template renders correctly
with `{}` by construction (task.104 Phase 2), so dropping a slot degrades to the generic lead rather
than breaking the comment. That property was designed for exactly this rollback.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-10
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.105.qa.1.comment-call-sites-plain-language-lead.md](./task.105.qa.1.comment-call-sites-plain-language-lead.md)
- **Gate File**: [task.105.gate.1.comment-call-sites-plain-language-lead.yml](./task.105.gate.1.comment-call-sites-plain-language-lead.yml)

### Test Coverage Summary

- **Tests Executed**: 3132 (`npm run ci:fast`, 0 failures)
- **Phases Verified**: 5/5
- **Call sites verified**: 24 — every slot demonstrably changes its lead, checked by rendering as well as by the guard
- **Mutation proofs**: 7, each turning exactly its own assertion red
- **Security probes**: 8 executed, 0 exploitable
- **Critical Issues**: 0
- **NFR Status**: Security: PASS (`measured`), Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

No open issues. One MEDIUM was found and fixed inside the cycle: Guard A still missed
connective-chained invocations (`cmd && gh issue comment …`) after its first repair — found by
probing the guard rather than reading it, which is the same lesson as the original defect applied to
its own fix.

The gate is CONCERNS rather than PASS on two counts, both recorded so Step 5c reads them as the
things to check: the seven converted sites knowingly give up the 3× backoff, and the independent
code-review subagent hung and was killed, so the diff review was performed in-line by the agent that
wrote the code.

---

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 1.0 | Initial draft | create-task |
| 2026-09-10 | 1.1 | Review passed (8/10) — corrected the slot-to-stage mapping at 3 sites and added the missing `blocking_count`; pinned the authoritative per-stage slot table; fixed the `tracker-issue.js` close invocation; corrected the false "engine owns the retry" claim; added Guard B (the population check for the slot half); replaced the inflated test inventory with the verified set | review-task |
| 2026-09-10 |  | Status → ready-for-development | review-task |
| 2026-09-10 |  | Implemented — 24 call sites fed slots, 7 bypass sites converted, 2 anti-regression guards (one repaired, one added), 5 mutation proofs; 20 source files + 47 bundled copies | develop |
| 2026-09-10 |  | Status → ready-for-review | develop |
| 2026-09-10 |  | QA gate CONCERNS (90/100) — 0 open findings; 1 MEDIUM found and fixed in-cycle; Reliability CONCERNS (backoff traded away), independent review did not run | qa-task |

---

## Progress Tracking

- [x] Phase 1 — Pipeline step docs (7 files, 13 sites)
- [x] Phase 2 — Skill call sites (8 SKILL.md, 11 sites; `qa-fix`'s body split per §5.3)
- [x] Phase 3 — Close the bypass (all 7 bypass sites converted; `review-story`'s arms collapsed)
- [x] Phase 4 — Tests and the anti-regression guards (Guard A repaired, Guard B added, parity extended)
- [x] Phase 5 — Bundle and sweep (`npm run bundle`, catalogue, `AGENTS.md` claim corrected)
- [ ] QA review
- [ ] Quality gate

---

## References

- Depends on: [task.104](../task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md)
- Contract: [`shared/resources/tracker-comment-contract.md`](../../../shared/resources/tracker-comment-contract.md)
- Sibling: [task.106](../task.106.pr-comment-plain-language-lead/task.106.pr-comment-plain-language-lead.md)

---

## Notes

- **This task cannot start before task.104 merges.** It supplies values to a flag that does not exist
  until then.
- QA report, bug reports and the quality gate are co-located in this directory when created.
