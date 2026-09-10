---
id: task.104
title: "[Task 104] Every tracker comment opens with a plain-language summary — the engine primitive"
type: task
description: "Stakeholders reading Jira cards and GitHub issues cannot follow the pipeline's comments — they open with gate verdicts, file paths and step numbers. Build the primitive: a per-stage catalogue of non-technical lead paragraphs, rendered by tracker-comment.js and prepended above every body, with a guard that refuses to post a comment for which no lead can be produced."
tags: [tracker-comment, stakeholder-communication, shared-resources, engine]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-09-09
updated: 2026-09-10
assignee:
estimated_effort_hours: 8
github_issue: 376
---

# Technical Task: the plain-language lead, as an engine primitive

**Status:** Ready for Review
**GitHub Issue**: [#376](https://github.com/Gamaroff/agent-skills/issues/376)
**Review**: ✅ All review recommendations from `task.104.review.1.tracker-comment-plain-language-lead.md` implemented 2026-09-10

---

## 1. Overview

Every comment this repository posts to a Jira card or a GitHub issue is written for a developer. It
opens with a gate verdict, a step number, a file path or a commit hash. Stakeholders who read the
board — and only the board — have said the result is unreadable.

This task builds the mechanism that fixes it, and changes no call site. It adds a **per-stage
catalogue of plain-language lead paragraphs** to `shared/resources/`, teaches `tracker-comment.js` to
render the lead for the `--stage` it was already given, and prepends it above the caller's body.
Because the catalogue is keyed by a `--stage` value that all 22 existing call sites already pass,
every one of them gains a lead the day this merges, without being edited.

**Scope**: the standard, the catalogue module, the `tracker-comment.js` integration and its guard.
Feeding real values into the lead's slots is [task.105](../task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md);
pull-request comments are [task.106](../task.106.pr-comment-plain-language-lead/task.106.pr-comment-plain-language-lead.md).

---

## 2. Motivation

### Current problems

1. **The reader the comment is for is not the reader it is written for.** `qa-story` posts
   `QA CONCERNS (78/100) — PR #341: {url}`. A product owner cannot tell from that whether the work
   is in trouble, and the number is on a scale nobody outside the pipeline knows.

2. **The technical summary is at the top, so there is nothing above it to skim.** `finalise`'s
   `done` comment leads with a five-row DoD results table. A reader who does not know what
   "AC / PR Review / Security / Compliance / Documentation" are has no sentence to fall back on —
   the whole comment is the detail.

3. **Roughly 37 distinct body templates, and no shared convention.** They were written independently across
   8 `shared/resources/*.md` files and 10 `skills/*/SKILL.md` files. There is no place that says
   what a comment should open with, so there is nothing for a new call site to copy or a reviewer to
   check against.

4. **A prose-only rule would not hold.** This repository already has evidence: the comment contract
   says every GitHub site should route through `tracker-comment.js`, and seven of them still post a
   bare `gh issue comment` because prose has no chokepoint. A convention documented and not enforced
   is a convention that drifts.

5. **Nothing degrades gracefully today.** If a lead is simply *asked for* in prose, a body written
   under time pressure ships without one and nothing notices, because a comment with no lead posts
   exactly as successfully as a comment with one.

### Benefits

1. **Every existing comment improves on merge**, with zero call-site edits — the catalogue is keyed
   by the `--stage` the caller already passes.
2. **The rule becomes mechanical.** A comment for which no lead can be produced does not post. A new
   stage cannot be added without a lead, because the engine has no template for it.
3. **One place to change the wording.** Improving how the pipeline speaks to stakeholders becomes an
   edit to one data module, not a sweep across 18 source files.
4. **The lead is assertable.** Because the engine renders it, a test can prove the posted body opens
   with it — which the "assert behaviour, not source text" rule this repo learned on task.84 demands.
5. **It composes.** `pr-inline-comment.js` (task.106) imports the same module rather than growing a
   second, divergent vocabulary.

---

## 3. Technical Background

### Current architecture

`tracker-comment.js` (836 lines) builds **no prose at all**. It builds exactly one thing — the
idempotency marker — and concatenates it with a body it received whole:

| Concern | Owner today | Line |
| :--- | :--- | :--- |
| The comment body | The caller, via `--body-file` | `L459–478` |
| The marker (GitHub/Bitbucket HTML) | `markerHtml()` | `L240–242` |
| The marker (Jira plain text) | `markerText()` | `L245–247` |
| Final GitHub body | `` finalBody = `${marker}\n${body}` `` | `L656` |
| Final Jira body | `jira-sync.js` `buildCommentAdf()` / `addComment()` | `L5237`, `L5349` |
| Known stages | `COMMENT_STAGES` | `L100–112` |
| Cycle-scoped stages | `CYCLE_SCOPED_STAGES` (`qa-cycle`, `qa-fix`) | `L98` |
| Unknown stage | exit 2 | `L501–506` |

`COMMENT_STAGES` is the eleven-value list the catalogue keys off:
`work-started`, `in-review`, `develop-complete`, `review`, `review-story`, `review-task`,
`review-bug`, `qa-gate`, `qa-cycle`, `qa-fix`, `done`.

`--stage` is already **validated fail-closed** and already carries the comment's identity. That is
what makes this task cheap: the engine is handed the moment on every call, and simply does not use it
for anything but the marker.

### Target architecture

```
                        ┌─────────────────────────────────┐
  --stage work-started  │  stakeholder-summary.js         │
  --slot branch=feat/x  │  renderLead(stage, slots)       │──▶ "Work has started on this item…"
                        │  (pure; catalogue + renderer)   │
                        └─────────────────────────────────┘
                                       │
  --body-file body.md ─────────────────┼──▶ marker + lead + separator + body ──▶ gh / Jira ADF
                                       │
                        guard: no template and no --summary-file ──▶ exit 2
```

The lead sits **below the marker and above the body**: the marker must stay first so the existing
idempotency search (`agent-skills-comment:{stage}`) and the update-in-place paths keep matching on a
prefix, and the lead must be the first thing a human sees.

---

## 4. Scope

**In scope**

- `shared/resources/stakeholder-summary.md` — the standard: what a lead is, the writing rules, the
  full per-stage catalogue, worked before/after examples, and the "dumb it down" rule for content
  that resists non-technical phrasing.
- `shared/resources/stakeholder-summary.js` — pure module: the catalogue, `renderLead(stage, slots)`,
  `hasTemplate(stage)`, and the exported stage list. No I/O, no `process.exit`.
- `tracker-comment.js`: `--slot k=v` (repeatable) and `--summary-file <path>` (escape hatch);
  render-and-prepend; the guard; `--json` gains a `lead` field naming the source (`template`,
  `summary-file`) so a caller can assert on it.
- Unit tests in `shared/resources/tests/`, including a mutation proof.
- `shared/resources/tracker-comment-contract.md` and `AGENTS.md` updated.
- `npm run bundle` to refresh the 13 skills carrying `tracker-comment.js`.

**Out of scope**

- **Editing any call site's body or passing slot values** — task.105. This task must leave all 22
  call sites byte-identical, which is what makes it independently revertible.
- **Pull-request comments** — task.106. `pr-inline-comment.js` is a separate engine on the `VCS`
  axis, and its one engine-built template (`buildSummaryBody()`, `L289`) is not touched here.
- **The seven bare `gh issue comment` sites.** They bypass this engine entirely, so no engine change
  can reach them. Task.105 converts them.
- **Rewriting the technical portion of any body.** The lead is added above it; the detail below is
  unchanged. A stakeholder gets the gist, a developer keeps everything they had.
- Translation, tone configuration, or per-project wording overrides. If a project wants different
  wording it edits the catalogue; a config surface should be added only once someone asks.

---

## 5. Breaking Changes

### 5.1 Every posted body gains a leading paragraph

**Before** (GitHub, `--stage done`):

```
<!-- agent-skills-comment:done -->
## ✅ Story Accepted — Definition of Done Verified
| Criterion | Status |
...
```

**After**:

```
<!-- agent-skills-comment:done -->
This work is finished and has been accepted. Everything it set out to do was checked and confirmed
working, and the change is now part of the main codebase. No further action is needed on this item.

---
## ✅ Story Accepted — Definition of Done Verified
| Criterion | Status |
...
```

**Impact**: cosmetic for humans; **structural for tests**. `shared/resources/tests/tracker-comment.test.mjs`
and `shared/resources/tests/handover-verify.test.mjs` assert on posted-body content and on replayed
`command.stdin`. Assertions that compare a whole body, or that check the body *starts with* the
caller's first line, will fail.

**Migration**: update those assertions to match on the caller's body as a **substring** and add a
separate positive assertion that the lead is present. Do not weaken the marker-position assertions —
the marker must still be first.

### 5.2 A comment with no producible lead now fails

An unknown `--stage` already exits 2. New: **omitting `--stage` entirely** — previously legal, and
documented as the way to post a comment on every run — now requires `--summary-file`, or it exits 2.

**Impact**: no shipped call site omits `--stage` (verified: all 22 pass one). A consumer project with
a hand-written unmarked comment would break.

**Migration**: pass `--summary-file` with a hand-written lead, or pass a known `--stage`. The error
message must name both routes; a guard that says only "missing summary" sends the reader looking for
a flag they have never seen.

### 5.3 Deferred-mutation record hashes change

The lead is part of the body, so it reaches `command.stdin` in the deferred record and changes the
record's identity hash.

**Impact**: a deferred record written before this change and replayed after it re-posts the old body.
That is correct — the record is a verbatim snapshot of an intended call — but a reader comparing an
old handover script against fresh output will see a diff.

**Migration**: none required. Note it in the contract so it is not read as a bug.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.104.plan.tracker-comment-plain-language-lead.md](task.104.plan.tracker-comment-plain-language-lead.md)

### Phase 1 — The standard (risk: Low)

**Files**: `shared/resources/stakeholder-summary.md` (new)

- [x] Define the lead: 2–4 sentences, first thing a human reads, answers *what happened, what it
      means, what happens next* — in that order.
- [x] Writing rules: no file paths, no command names, no branch names in prose, no step numbers, no
      scores on unexplained scales, no emoji, no acronym unexpanded on first use, no jargon
      (`gate`, `AC`, `DoD`, `CI`, `PR` → "pull request" on first use, `regression`, `NFR`).
- [x] The **dumb-it-down rule**: where a fact resists non-technical phrasing, state its *consequence*
      rather than its mechanism, and never omit it. Worked example required.
- [x] The full per-stage catalogue, one subsection per stage, with slots marked.
- [x] Before/after for three real bodies (`work-started`, `qa-cycle`, `done`).

### Phase 2 — The catalogue module (risk: Low)

**Files**: `shared/resources/stakeholder-summary.js` (new), `shared/resources/tests/stakeholder-summary.test.mjs` (new)

- [x] `LEAD_TEMPLATES` — frozen object, one entry per `COMMENT_STAGES` value.
- [x] Each template is a function `(slots) => string`; every slot is **optional** and every template
      must return a complete, grammatical paragraph when given `{}`.
- [x] `renderLead(stage, slots)` — strips a `-{N}` cycle suffix before lookup, returns `null` for an
      unknown stage rather than throwing.
- [x] `hasTemplate(stage)`, `LEAD_STAGES` exported.
- [x] Test: every value in `COMMENT_STAGES` has a template — imported from `tracker-comment.js`, not
      restated, so adding a stage there fails here.
- [x] Test: every template renders non-empty and jargon-free under `{}` (a deny-list assertion over
      the rendered output).

### Phase 3 — Engine integration (risk: Medium)

**Files**: `shared/resources/tracker-comment.js`, `shared/resources/tests/tracker-comment.test.mjs`

- [x] `--slot k=v` (repeatable) and `--summary-file <path>` parsing; `--summary-file` wins over the
      template when both are given.
- [x] Compose `marker + "\n" + lead + "\n\n---\n" + body` on the GitHub/Bitbucket arm.
- [x] Jira arm: pass the lead to `jira-sync.js` so it becomes its own ADF paragraph node **above**
      the rendered body, not concatenated markdown.
- [x] Guard: no template and no `--summary-file` → exit 2, message naming both routes.
- [x] `--json` gains `lead: "template" | "summary-file"`.
- [x] Update the existing body assertions per §5.1.

### Phase 4 — Contract, docs, bundle (risk: Low)

**Files**: `shared/resources/tracker-comment-contract.md`, `AGENTS.md`, all bundled `references/`

- [x] Contract: new section "The plain-language lead", the guard's exit-2 case, the `lead` JSON
      field, and the §5.3 note about record hashes.
- [x] `AGENTS.md`: a **Stakeholder Summaries** section pointing at the standard, in the style of the
      existing Tracker Comments section.
- [x] `npm run bundle`; commit the regenerated `references/` copies.
- [x] `npm run generate-catalog` if any skill description changed (it should not).

---

## 7. Files Summary

**New**

| File | Purpose |
| :--- | :--- |
| `shared/resources/stakeholder-summary.md` | The standard + the catalogue in prose |
| `shared/resources/stakeholder-summary.js` | Catalogue + `renderLead()` (pure) |
| `shared/resources/tests/stakeholder-summary.test.mjs` | Catalogue coverage + jargon deny-list |

**Modified**

| File | Change |
| :--- | :--- |
| `shared/resources/tracker-comment.js` | `--slot`, `--summary-file`, compose, guard, `lead` in JSON |
| `shared/resources/jira-sync.js` | `addComment()` / `buildCommentAdf()` accept a lead paragraph |
| `shared/resources/tracker-comment-contract.md` | New section; guard; JSON field |
| `shared/resources/tests/tracker-comment.test.mjs` | Body assertions per §5.1; guard tests |
| `shared/resources/tests/handover-verify.test.mjs` | `command.stdin` assertions per §5.1 |
| `shared/resources/tests/handover-render.test.mjs` | Round-trip assertions per §5.1 |
| `AGENTS.md` | Stakeholder Summaries section |
| `skills/*/references/` (13 skills) | Regenerated by `npm run bundle` — never hand-edited |

**Deliberately untouched**: all 22 call sites, `pr-inline-comment.js`, the seven bare
`gh issue comment` sites.

---

## 8. Testing Strategy

**Unit** (`shared/resources/tests/stakeholder-summary.test.mjs`)

- Every `COMMENT_STAGES` value has a template (list imported, not restated).
- Every template renders non-empty, grammatical output under `{}` — the slot-free path is the one
  that ships first, so it is the one most likely to be under-tested.
- Rendered output contains no token from the jargon deny-list, no `/`-bearing path, no backtick.
- `renderLead("qa-cycle-3", …)` resolves to the `qa-cycle` template.
- `renderLead("nonsense")` returns `null` and does not throw.

**Integration** (`shared/resources/tests/tracker-comment.test.mjs`)

- GitHub arm: posted body is `marker`, then the lead, then a separator, then the caller's body —
  asserted on the captured stdin, not on the source file.
- Jira arm: the ADF has the lead as its own paragraph node above the body content.
- `--summary-file` overrides the template; `--json` reports `lead: "summary-file"`.
- No `--stage` and no `--summary-file` → exit 2, and **nothing is posted** (assert the transport was
  never invoked, not merely the exit code).
- Marker stays first; the prefix-collision regression (`review` vs `review-story`) still passes.

**Mutation proof** (required — see `feedback_mutation_prove_every_fix`)

- Delete one stage from `LEAD_TEMPLATES` → the coverage test goes red.
- Make the guard return instead of exiting → the "nothing is posted" test goes red.
- Move the lead above the marker → the marker-position test goes red.

**Regression**

- `npm test` and `npm run eval:all` clean.
- `evals/shared/tests/transition-protocol-parity.test.mjs` — its `--stage` literal check and its
  bundling check must still pass unchanged.

---

## 9. Success Criteria

This task is done when the engine renders a plain-language lead for every known stage, refuses to
post a comment it cannot produce one for, and no existing call site has been edited to get one.

**Functional**

- [x] `renderLead()` returns a non-empty paragraph for all eleven `COMMENT_STAGES` values with `{}`.
- [x] A `tracker-comment.js` call with a known `--stage` and no new flags posts a body whose first
      line after the marker is the lead.
- [x] A call with neither a known stage nor `--summary-file` exits 2 and posts nothing.
- [x] **No call site changes.** `git diff develop...HEAD --stat` touches only: the two new
      `stakeholder-summary.*` files, `tracker-comment.js`, `jira-sync.js`, the four test files named
      in §7, `tracker-comment-contract.md`, `AGENTS.md`, and regenerated `skills/*/references/`
      copies. Any other path in that diff is a call-site edit and belongs to task.105.

**Performance**

- [x] `renderLead()` is pure string work — no I/O, no new dependency; the module adds no measurable
      time to a `tracker-comment.js` invocation.
- [x] No additional network call: the lead travels in the same POST as the body.

**Code quality**

- [x] `stakeholder-summary.js` has zero `require` of anything with I/O and zero `process.exit`.
- [x] Prettier and lint clean; `npm test` green.
- [x] Each of the three mutations in §8 is demonstrated to turn a test red, and which test, recorded
      in the implementation report.

**Migration**

- [x] `tracker-comment-contract.md` documents the lead, the guard and the record-hash note.
- [x] `AGENTS.md` carries the Stakeholder Summaries section.
- [x] `npm run bundle` run and the regenerated copies committed; no `references/` file hand-edited.

---

## 10. Risk Assessment

**HIGH — the Jira ADF arm silently drops the lead.** The Jira path does not concatenate markdown; it
builds an ADF document. A lead appended as a string may be swallowed or rendered as literal text.
*Probability*: medium. *Impact*: high — Jira is the tracker the complaining stakeholders read, so a
failure here misses the entire audience while GitHub looks correct.
*Mitigation*: assert on the **ADF node tree**, not on a rendered string, and test the Jira arm
before the GitHub arm.

**MEDIUM — generic leads read as noise.** A slot-free lead is by construction the same on every
`qa-cycle` comment. A reader who sees the identical paragraph five times stops reading it, which is
the failure this task exists to prevent.
*Mitigation*: templates must fold their available slots into the sentence rather than appending
them, and task.105 — which supplies the slots — should follow closely. Record the dependency.

**MEDIUM — the guard breaks a consumer's unmarked comment.** §5.2.
*Probability*: low (no shipped site). *Impact*: a consumer pipeline halts.
*Mitigation*: error message names both escape routes; contract documents it; call it out in the
CHANGELOG entry rather than only in the task.

**LOW — bundling drift.** Editing a `references/` copy instead of the `shared/resources/` source is
reverted silently by the next `npm run bundle` (see `project_bundle_drift_step_docs`).
*Mitigation*: named in the plan; the bundle step is a Phase 4 checkbox, not an afterthought.

**LOW — jargon deny-list is a proxy, not the property.** Passing it does not make a paragraph
comprehensible.
*Mitigation*: the deny-list is a floor. The standard's worked examples are the actual specification,
and Phase 1 lands before any template is written.

---

## 11. Rollback Plan

**Triggers**

- Jira comments render the lead as literal ADF markup or drop it.
- The guard fires on a call site that should have worked, halting a pipeline run.
- Any of the 22 call sites turns out to be non-byte-identical.

**Immediate** (< 5 min): revert the merge commit and `npm run bundle`. The change is additive across
three new files and one engine; nothing else depends on it yet, because task.105 has not landed.

**Partial**: keep `stakeholder-summary.{md,js}` and the tests; revert only the `tracker-comment.js`
composition and guard. The catalogue is inert on its own and task.105 can still be written against
it.

**Forward fix**: if only the Jira arm is wrong, gate the composition on `TRACKER=github` while the
ADF path is fixed. This is preferable to a full revert — it keeps GitHub readers served and leaves
one named arm outstanding rather than reopening the whole task.

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-10
**Quality Score**: 30/100
**Gate Decision**: FAIL

### QA Report

- **Full Report**: [task.104.qa.1.tracker-comment-plain-language-lead.md](./task.104.qa.1.tracker-comment-plain-language-lead.md)
- **Gate File**: [task.104.gate.1.tracker-comment-plain-language-lead.yml](./task.104.gate.1.tracker-comment-plain-language-lead.yml)

### Test Coverage Summary

- **Tests Executed**: 3107 (`ci:fast`), `eval:all` exit 0
- **Phases Verified**: 4/4 implemented; 2/4 carry findings
- **Critical Issues**: 1 HIGH, 6 MEDIUM
- **NFR Status**: Security: PASS (measured, 16 probes), Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

Slot values arrive from the CLI as strings and the templates consume them by truthiness, so
`--slot blocking=false` renders "Some things need answering before work can start" — the opposite of
what the caller said, in the one paragraph written for a reader who cannot check the body underneath
it. Six MEDIUM findings accompany it, including help text that still documents the behaviour the new
guard rejects, and a Jira ADF test that asserts on its own construction rather than on the
composition path.

---

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 1.0 | Initial draft | create-task |
| 2026-09-10 | 1.1 | Review passed (9/10) — zero critical. Linked GitHub issue #376; replaced the count-based "all 22 call sites" criterion with a `git diff`-decidable property; refreshed stale `jira-sync.js` / `pr-inline-comment.js` line citations; added a §9 prose lead so the tracker card's Success Criteria block renders 193 chars instead of 14 | review-task |
| 2026-09-10 |  | Status → ready-for-development | review-task |
| 2026-09-10 |  | Status → ready-for-review — all four phases implemented; ci:fast 3106 pass / 0 fail and eval:all green; three mutation proofs recorded | develop |
| 2026-09-10 |  | QA gate FAIL (30/100) — 7 findings; slot values are strings consumed by truthiness, so `blocking=false` renders the blocking sentence | qa-task |
| 2026-09-10 |  | qa-fix cycle 1 — all 7 findings closed; slot coercion at the boundary, hasOwnProperty lookup guard, empty --summary-file rejected, `desired:` label preserved, help text reconciled, Jira ADF test driven through the composition path, 12 duplicate flags removed. Each fix mutation-proven | qa-fix |
| 2026-09-10 |  | QA cycle 2 (refute pass) — 2 new findings, both defects in cycle 1's own fixes: slot coercion was swallowing legitimate text values, and a zero-width-only summary file bypassed the empty check. Both closed and mutation-proven within the cycle | qa-task |

---

## Progress Tracking

- [x] Phase 1 — The standard
- [x] Phase 2 — The catalogue module
- [x] Phase 3 — Engine integration
- [x] Phase 4 — Contract, docs, bundle
- [ ] QA review
- [ ] Quality gate

---

## References

- Engine: [`shared/resources/tracker-comment.js`](../../../shared/resources/tracker-comment.js)
- Contract: [`shared/resources/tracker-comment-contract.md`](../../../shared/resources/tracker-comment-contract.md)
- Jira ADF: [`shared/resources/jira-sync.js`](../../../shared/resources/jira-sync.js) — `buildCommentAdf()` (L5237), `addComment()` (L5349)
- Follow-on: [task.105](../task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md), [task.106](../task.106.pr-comment-plain-language-lead/task.106.pr-comment-plain-language-lead.md)

---

## Notes

- QA report, bug reports and the quality gate are co-located in this directory when they are created.
- The three tasks are ordered 104 → 105, and 104 → 106. 105 and 106 are independent of each other.
