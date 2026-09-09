---
id: task.106
title: "[Task 106] Pull-request summary comments open with a plain-language lead"
type: task
description: "Eleven pull-request conversation templates — the Definition of Done comment, finalise's canonical summary, the three board-warning notices, the QA reviews, and the two review-skill summaries — are the most technical text the pipeline writes and are read by anyone following a linked pull request. Give each a plain-language lead from task.104's catalogue. Per-line inline findings stay technical by design."
tags: [pr-inline-comment, stakeholder-communication, review-pr, finalise, migration]
category: refactoring
status: planned
priority: Low
risk_level: low
created: 2026-09-09
updated: 2026-09-09
assignee:
estimated_effort_hours: 8
---

# Technical Task: the lead reaches the pull request

**Status:** Planned

---

## 1. Overview

[Task 104](../task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md)
gives tracker-issue comments a plain-language opening paragraph.
[Task 105](../task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md)
makes that paragraph specific. Neither touches the pull request, which is where the **longest and most
technical** comments this pipeline writes actually land: a full Definition of Done table, a QA review
with findings, a code-review summary with file-and-line references.

Stakeholders reach these through the link in the tracker comment. This task gives the eleven
pull-request **conversation** templates the same lead, from the same catalogue.

**Per-line inline findings are deliberately excluded.** A comment anchored to line 47 of a diff has
exactly one audience, and a non-technical paragraph on each one would be noise for the only person
who will ever read it.

---

## 2. Motivation

### Current problems

1. **The tracker comment sends the reader to a worse document.** Task 104's `done` lead ends by
   naming the pull request. A stakeholder who follows that link arrives at a five-row table of
   `AC / PR Review / Security / Compliance / Documentation` — the exact experience the lead was
   written to spare them.

2. **The one engine-built template has no lead.** `pr-inline-comment.js` `buildSummaryBody()`
   (`L288–305`) is the only comment body constructed inside an engine in this repository. It opens
   with `### Findings that could not be anchored to a line in this diff`, which is unreadable to
   anyone outside the review loop and is the *first* thing in the comment.

3. **The three board-warning notices are pure mechanism.** `⚠️ Project Board Not Updated`,
   `⏸️ Project Board Move Deferred`, `⚠️ Project Board Update Failed` describe an internal failure
   in internal vocabulary. A stakeholder reading one cannot tell whether their work is affected.

4. **Bitbucket gets a different comment from GitHub.** Six sites post via the Bitbucket REST API on
   one arm and `gh pr comment` on the other, from separately maintained prose. Any lead added to one
   arm and not the other makes the divergence worse rather than better.

### Benefits

1. The chain a stakeholder actually walks — board comment → pull request → detail — is readable at
   every step, not only the first.
2. `pr-inline-comment.js` imports task.104's catalogue, so there is **one** vocabulary rather than a
   second one invented for pull requests.
3. The board-warning notices state their consequence ("this does not affect the work itself; the
   board is out of date and someone needs to move the card") instead of their mechanism.
4. Adding the lead in the engine for the degraded-findings summary means the review skills get it
   without either of them being edited.

---

## 3. Technical Background

### The eleven pull-request conversation templates

| # | Source | Line | Template |
| :-- | :--- | :-- | :--- |
| 1 | `shared/resources/develop-pipeline-step-7-finalise.md` | 135 | `## ✅ Definition of Done` + full DoD file contents |
| 2 | `skills/finalise/SKILL.md` | 1033 | `## ✅ Accepted — Canonical Pipeline Summary` (marker `finalise-canonical-summary`, PATCH-by-id at L1028) |
| 3 | `skills/finalise/SKILL.md` | 1353 | `⚠️ Project Board Not Updated` |
| 4 | `skills/finalise/SKILL.md` | ~1366 | `⏸️ Project Board Move Deferred` |
| 5 | `skills/finalise/SKILL.md` | 1376 | `⚠️ Project Board Update Failed` |
| 6 | `skills/finalise/SKILL.md` | 1538 | `## ⚠️ Definition of Done - Gaps Identified` |
| 7 | `skills/qa-story/SKILL.md` | 1731 | `## 🧪 QA Review: [GATE_DECISION]` |
| 8 | `skills/qa-task/SKILL.md` | 1131 | `## QA Review: {GATE_DECISION}` |
| 9 | `skills/qa-fix/SKILL.md` | 770 | fix summary (`$PR_COMMENT_BODY` after task.105 §5.3) |
| 10 | `skills/review-pr/SKILL.md` | 387 | marker `agent-skills-pr-review` + the report file |
| 11 | `skills/review-code/SKILL.md` | 139 | summary-only fallback (prose instruction) |

Plus the engine-built one:

| Engine | Line | Template |
| :-- | :--- | :--- |
| `shared/resources/pr-inline-comment.js` | 288–305 | `buildSummaryBody()` — degraded-findings block, and the carrier for `--summary-file` |

### Both arms, every site

Each of 1–11 has a GitHub arm (`gh pr comment` / `gh api PATCH …/issues/comments/{id}`) and a
Bitbucket arm (`POST|PUT …/pullrequests/{n}/comments`). Bitbucket sites:
`qa-story` L1735–1741, `qa-task` L1135–1139, `qa-fix` L774–778, `finalise` L1050/L1059/L1067,
`review-pr` L398/L404/L408, `review-code` L141.

The lead must be inserted into the **body before it reaches either arm** — one insertion point per
site, not two — or the arms drift.

### Why the marker positions matter

Sites 2 and 10 are idempotent by marker-search-then-PATCH. Site 2 searches for
`<!-- finalise-canonical-summary -->`; site 10 for `<!-- agent-skills-pr-review -->`. The lead goes
**below** the marker, exactly as in task.104. A lead inserted above it breaks the search and the
comment stops being idempotent — which shows up as duplicate comments on a re-run, not as a failure.

---

## 4. Scope

**In scope**

- A lead on all eleven conversation templates, on **both** arms, inserted once per site.
- `pr-inline-comment.js` `buildSummaryBody()` gains a lead, taken from task.104's catalogue via a new
  `pr-summary` entry.
- New catalogue entries for the pull-request moments that have no tracker equivalent: `pr-summary`,
  `board-warning`, `dod-gaps`.
- The three board-warning notices rewritten to lead with consequence.
- Tests: `pr-inline-comment.test.mjs`, `review-pr.test.js`, `review-code.test.js`,
  `finalise-dod-prompt-contract.test.mjs`, `qa-execute-snippets.test.mjs`.
- `npm run bundle`.

**Out of scope**

- **Per-line inline findings.** `pr-inline-comment.js` L494/L524/L558 builds
  `marker + finding.body`. That stays. A plain-language paragraph attached to a comment on line 47
  of a diff has no reader.
- **The technical bodies themselves.** As in tasks 104 and 105: the lead goes above, the detail below
  is unchanged.
- **`gh pr review`** — there are no call sites, only a prohibition at `review-pr` L298.
- **The precompact hook's pull-request notice** (`develop-pipeline-on-precompact.sh` L133). Shell
  hook, no Node, must not block compaction — same exclusion as task.105.
- Tracker-issue comments — tasks 104 and 105.

---

## 5. Breaking Changes

### 5.1 Idempotent comments change body, not identity

Sites 2 and 10 find an existing comment by marker and PATCH it. Adding a lead changes the body that
gets written but not the marker, so the search still matches.

**Impact**: a pull request carrying a pre-change comment gets its body replaced on the next run,
which is the normal update path.
**Migration**: none. Assert the marker is still first, and assert the PATCH path — not only the POST
path — carries the lead. It is the update path that is easy to miss.

### 5.2 `buildSummaryBody()` output changes

`shared/resources/tests/pr-inline-comment.test.mjs` asserts on the degraded-findings block.

**Impact**: those assertions fail.
**Migration**: match `DEGRADED_HEADING` as a substring and assert the lead precedes it.

### 5.3 Bitbucket bodies grow

The Bitbucket REST arm posts `{"content": {"raw": …}}`. A longer body is not a new failure mode, but
these sites are single-shot with no retry (`qa-story` L1735, `qa-task` L1135, `qa-fix` L774).

**Impact**: none expected.
**Migration**: none, but do not add retry here — that is a separate concern and would widen this task.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.106.plan.pr-comment-plain-language-lead.md](task.106.plan.pr-comment-plain-language-lead.md)

### Phase 1 — Catalogue entries (risk: Low)

**Files**: `shared/resources/stakeholder-summary.js`, `shared/resources/stakeholder-summary.md`

- [ ] `pr-summary`, `board-warning`, `dod-gaps` templates.
- [ ] The standard gains a section on pull-request comments, stating the inline-findings exclusion
      and **why** — so a later reader does not add one as an oversight fix.

### Phase 2 — Engine (risk: Low)

**Files**: `shared/resources/pr-inline-comment.js`, `shared/resources/pr-inline-comment-contract.md`

- [ ] `buildSummaryBody()` prepends `renderLead("pr-summary", {degraded: n})`.
- [ ] A caller-supplied `--summary-file` keeps precedence — it is the escape hatch, and the review
      skills use it.
- [ ] Contract documents the composition order.

### Phase 3 — `finalise` (risk: Medium)

**Files**: `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md`

- [ ] Sites 1, 2, 6 get a lead below the marker.
- [ ] Sites 3, 4, 5 — the board warnings — rewritten to lead with consequence. Site 4 must still name
      its deferral record id; that requirement is load-bearing and predates this task.

### Phase 4 — QA and review skills (risk: Low)

**Files**: `skills/{qa-story,qa-task,qa-fix,review-pr,review-code}/SKILL.md`

- [ ] Sites 7–11, both arms, one insertion point each.
- [ ] `qa-fix` site 9 works on `$PR_COMMENT_BODY` — the variable task.105 §5.3 creates. **If task.105
      has not merged, create the split here instead and note it**, rather than adding a lead to the
      shared variable and leaking it into the tracker comment.

### Phase 5 — Tests and bundle (risk: Low)

- [ ] Update the five test files per §8.
- [ ] `npm run bundle`; `npm test`; `npm run eval:all`.

---

## 7. Files Summary

**Modified — sources**

| File | Change |
| :--- | :--- |
| `shared/resources/stakeholder-summary.js` | 3 new templates |
| `shared/resources/stakeholder-summary.md` | pull-request section + the exclusion rationale |
| `shared/resources/pr-inline-comment.js` | lead in `buildSummaryBody()` |
| `shared/resources/pr-inline-comment-contract.md` | composition order |
| `shared/resources/develop-pipeline-step-7-finalise.md` | site 1 |
| `skills/finalise/SKILL.md` | sites 2–6 |
| `skills/qa-story/SKILL.md` | site 7, both arms |
| `skills/qa-task/SKILL.md` | site 8, both arms |
| `skills/qa-fix/SKILL.md` | site 9, both arms |
| `skills/review-pr/SKILL.md` | site 10, both arms |
| `skills/review-code/SKILL.md` | site 11, both arms |
| `shared/resources/tests/pr-inline-comment.test.mjs` | §5.2 |
| `skills/review-pr/tests/review-pr.test.js` | body-shape assertions |
| `skills/review-code/tests/review-code.test.js` | body-shape assertions |
| `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` | the de-escaping assertion at L211 |
| `shared/resources/tests/qa-execute-snippets.test.mjs` | executed-snippet assertions |

**Regenerated**: `references/` copies in `review-code`, `review-pr` and the skills carrying
`develop-pipeline-step-7-finalise.md`, by `npm run bundle`.

---

## 8. Testing Strategy

**Unit**

- `renderLead("pr-summary", {degraded: 3})` names the count; with `{}` it still reads correctly.
- `board-warning` and `dod-gaps` render without jargon under the task.104 deny-list.

**Integration**

- `buildSummaryBody()` output: lead, then `DEGRADED_HEADING`, then the findings. Assert the order,
  not just presence.
- `--summary-file` still overrides — assert a caller-supplied summary is not double-led.
- For sites 2 and 10, assert the **PATCH** path carries the lead, not only the POST path (§5.1).
- Bitbucket arms: assert the `content.raw` payload carries the lead, from the captured request body.

**Behavioural, not textual.** As in task.105: extend `qa-execute-snippets.test.mjs` to execute the
converted snippets against a fake `gh` and a fake `curl` and inspect what was sent
(`feedback_assert_behaviour_not_source_text`). Run that file alone before believing a failure
(`project_qa_execute_snippets_load_flake`).

**Mutation proofs**

| Mutation | Test that must go red |
| :--- | :--- |
| Remove the lead from `buildSummaryBody()` | the ordering assertion |
| Move the lead above the `finalise-canonical-summary` marker | the marker-first / idempotency assertion |
| Add a lead to an inline finding body | the inline-findings-stay-bare assertion (add it — the exclusion needs a test or it will be "fixed") |

**Regression**: `npm test`, `npm run eval:all` green.

---

## 9. Success Criteria

**Functional**

- [ ] All eleven conversation templates open with a lead, on both the GitHub and the Bitbucket arm.
- [ ] `buildSummaryBody()` output opens with a lead; a caller-supplied `--summary-file` is not
      double-led.
- [ ] Per-line inline findings carry **no** lead, and a test asserts it.
- [ ] Sites 2 and 10 remain idempotent — a second run PATCHes rather than posting a duplicate.
- [ ] The three board-warning notices state their consequence for the reader; site 4 still names its
      deferral record id.

**Performance**

- [ ] No new network calls. Every lead travels in the body of a call that was already being made.

**Code quality**

- [ ] The lead is inserted once per site, above the arm split — no site has two insertion points.
- [ ] No new vocabulary: every template comes from `stakeholder-summary.js`.
- [ ] No `references/` file hand-edited; `npm run bundle` produces no diff after the commit.

**Migration**

- [ ] `pr-inline-comment-contract.md` documents the composition order and the inline exclusion.
- [ ] `stakeholder-summary.md` explains **why** inline findings are excluded, so it is not later
      closed as a gap.

---

## 10. Risk Assessment

**MEDIUM — a lead above a marker silently breaks idempotency.** Sites 2 and 10 find their comment by
searching for the marker. Insert above it and the search misses, and the pipeline posts a new comment
every run instead of failing.
*Probability*: medium — it is the natural place to put a lead.
*Impact*: medium, and **silent**: duplicate comments look like a formatting problem, not a bug.
*Mitigation*: an explicit marker-first assertion on both sites, and the mutation proof in §8.

**MEDIUM — the two arms drift.** Eleven sites × two arms = 22 places a lead could be added, and the
arms are separately maintained prose.
*Mitigation*: the design constraint is one insertion point per site, above the arm split. Reviewing
for that is easier than reviewing 22 additions for equality.

**LOW — `qa-fix` site 9 depends on task.105.**
*Mitigation*: §6 Phase 4 names both orders explicitly, so whichever lands first is handled.

**LOW — over-applying the lead to inline findings.** The exclusion is a deliberate design decision
and reads as an oversight.
*Mitigation*: it gets a test and a paragraph of rationale in the standard, not just a scope line.

---

## 11. Rollback Plan

**Triggers**

- Duplicate pull-request comments appear on a re-run (idempotency broken).
- A Bitbucket arm stops posting.
- Inline findings acquire a lead.

**Immediate** (< 5 min): revert the merge and `npm run bundle`. Tracker-issue comments are unaffected
— tasks 104 and 105 are independent of this one — so the stakeholder-facing improvement that matters
most survives the revert.

**Partial**: revert Phase 3 (`finalise`) alone. It holds both idempotent sites and all three board
warnings, and is the highest-risk phase; Phases 2 and 4 are independently safe.

**Forward fix**: if only the marker position is wrong, move the lead below the marker at the affected
site. This is a one-line fix and is strictly preferable to a revert, which would take the other ten
sites with it.

---

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 1.0 | Initial draft | create-task |

---

## Progress Tracking

- [ ] Phase 1 — Catalogue entries
- [ ] Phase 2 — Engine
- [ ] Phase 3 — `finalise`
- [ ] Phase 4 — QA and review skills
- [ ] Phase 5 — Tests and bundle
- [ ] QA review
- [ ] Quality gate

---

## References

- Depends on: [task.104](../task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md)
- Independent of, but adjacent to: [task.105](../task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md)
- Engine: [`shared/resources/pr-inline-comment.js`](../../../shared/resources/pr-inline-comment.js)
- Contract: [`shared/resources/pr-inline-comment-contract.md`](../../../shared/resources/pr-inline-comment-contract.md)

---

## Notes

- **Line numbers in §3 were correct on 2026-09-09.** Re-grep before editing.
- QA report, bug reports and the quality gate are co-located in this directory when created.
