---
id: task.233
title: "Done lead claims a merge that has not happened"
type: task
description: "The done lead says the change is now part of the product and nothing more is needed, but every caller posts it before the pull request is merged; reword it to claim only acceptance, and hold the wording with a test."
tags: [finalise, observation, stakeholder-summary]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-26
updated: 2026-10-26
assignee:
estimated_effort_hours: 8
github_issue: 749
---

# Technical Task: Done lead claims a merge that has not happened

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.233.review.1.done-lead-claims-merge.md` implemented 2026-10-26
**GitHub Issue**: [#749](https://github.com/Gamaroff/agent-skills/issues/749)

---

## 1. Overview

Every comment this repository posts at acceptance opens with the `done` lead from
`shared/resources/stakeholder-summary.js:145`:

> This work is finished and has been accepted. Everything it set out to do was checked and
> confirmed working, and the change is now part of the product. No further action is needed on this
> item.

Every caller posts it **before** the pull request is merged. So a non-technical reader is told the
work has shipped and nothing is left, while a merge is still outstanding (observation #98).

This task rewords the template so it claims only what acceptance establishes, updates the two
places the spec quotes it, and adds a test that the lead makes no claim of a later event.

**Key deliverables:**

- A `done` template that says the work is accepted and becomes part of the product when it is merged.
- `stakeholder-summary.md` quoting the new wording in both places, with its rationale paragraph rewritten.
- A test, mutation-proved, that the rendered `done` lead claims neither shipping nor "no further action".

---

## 2. Motivation

### Current Problems

- **The lead claims a later event than the one that triggered it.** On 2026-10-25, task.232's
  `/finalise` posted the canonical summary to PR #748 (comment 6402815754) and the `done` comment to
  issue #747. PR #748 was open and unmerged at the time; it merged at 20:42Z, after both comments.
- **This happens on every run, not by accident.** The develop pipeline runs `/finalise` at Step 7,
  and Step 7 says merging "happens later, by hand or via `/develop-next`"
  (`shared/resources/develop-pipeline-step-7-finalise.md`). develop-story and develop-bug run the
  same step.
- **"No further action is needed" is false while a merge remains.** The spec calls that sentence
  "doing real work" (`shared/resources/stakeholder-summary.md:389`): it tells a stakeholder nothing is
  expected of them. That is true. But it also reads as "this item is closed", and the item is not
  closed until someone merges it.

### Benefits

- The lead is true at the moment it is posted, on every caller.
- A reader learns that one step is left, without having to read the body.

---

## 3. Technical Background

### Current Architecture

- **The template.** `LEAD_TEMPLATES.done` at `shared/resources/stakeholder-summary.js:145`. It reads
  one slot, `pr`, rendered in parentheses after "part of the product".
- **The spec.** `shared/resources/stakeholder-summary.md` quotes the lead twice: § `done` under the
  tracker stages (`:197`–`:202`) and the worked Before/After example (`:356`–`:389`). The rationale
  paragraph at `:389` defends the last sentence.
- **The callers.** All post before merge:
  - Canonical PR summary: `skills/finalise/SKILL.md:1990` (`stakeholder-summary-cli.js --stage done`).
  - DoD PR comment: `shared/resources/develop-pipeline-step-7-finalise.md:206`.
  - Tracker `done` comments: `skills/finalise/SKILL.md:2219`, `:2317`; and
    `develop-pipeline-step-7-finalise.md:288`, `:311` (story and task arms) and `:387` (the Jira
    arm, `--slot pr=`).
  - Search that defines this list:
    `command node .agents/skills/review-task/references/call-sites.js --engine tracker-comment.js --json`
    and the same with `--engine stakeholder-summary-cli.js`, filtered to `stage == "done"` (7 sites on
    2026-10-26).
- **The tests that read the lead.** `shared/resources/tests/stakeholder-summary.test.mjs:72`
  (every stage renders with no slots, 2–4 sentences) and `:102` (the jargon deny-list: no `PR`,
  `commit`, `branch`, `/`, backticks). `tracker-comment.test.mjs:199`, `:1672`, `:1717`, `:1873` call
  `renderLead("done", {})` and compare against it, so they follow any rewording.
- **No caller posts after a merge.** A grep for `--stage done` over `skills/*/SKILL.md`,
  `shared/resources/` and `scripts/` returns only the pre-merge sites above (plus board-move
  `gh-stage.js` / `jira-stage.js` calls, which post no comment).

### Target Architecture

Reword the template. A proposed text (4 sentences, deny-list clean):

> This work has been checked and accepted. Everything it set out to do was confirmed working
> {pr}. It becomes part of the product once the change is merged, which is the last step for this
> item. No action is needed from anyone reading this.

The last sentence keeps the job the old "No further action is needed" did
(`stakeholder-summary.md:389`): naming the merge must not read as a task handed to the reader. It
reuses the `pipeline-paused` lead's wording, so the catalogue says it one way.

The implementer may improve the wording within these rules: it claims acceptance, not release; it
names the merge as the remaining step in plain words; it tells the reader nothing is expected of
them; and it stays within the 2–4 sentence and deny-list tests.

### Rejected Alternative

**A `merged` slot that lets the template claim release when the PR is merged.** No caller posts
`done` after a merge, so no caller would pass it. A slot nobody passes is dead code, and
`comment-slot-coverage.test.mjs` would have nothing to check. If a post-merge caller is added later,
it can add the slot then.

---

## 4. Scope

### In Scope

- `LEAD_TEMPLATES.done` in `shared/resources/stakeholder-summary.js`.
- Both quoted copies, and the rationale paragraph, in `shared/resources/stakeholder-summary.md`.
- A new test in `shared/resources/tests/stakeholder-summary.test.mjs`.
- Bundled `references/` copies, regenerated by `npm run bundle`.
- A CHANGELOG `[Unreleased]` entry.

### Out of Scope

- Any other stage's lead. The `dod-gaps`, `qa-gate` and `in-review` leads make no release claim.
- Comments already posted. Past comments are not edited.
- The plans of task.104 and task.106, which quote the old text as history.

---

## 5. Breaking Changes

None. The stage name, the slot (`pr`) and the comment marker are unchanged. Only the lead text
changes. Idempotency keys on the marker, not the text, so an existing `done` comment is still found
as `already`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.233.plan.done-lead-claims-merge.md](task.233.plan.done-lead-claims-merge.md)

### Phase 1: Test first (Risk: Low)

- [x] Add a test: the rendered `done` lead, with no slots and with `pr` set, does not claim the
      change is part of the product now, does not say no further action is needed, and names the
      merge as the remaining step.
- [x] Run it on the current template and confirm it is red.

### Phase 2: Reword (Risk: Low)

- [x] Rewrite `LEAD_TEMPLATES.done` per § 3 Target Architecture.
- [x] Confirm the new test, the no-slots test and the deny-list test are green.
- [x] Mutation-prove: restore the old text and confirm the new test goes red; restore the new text.

### Phase 3: Spec and bundle (Risk: Low)

- [x] Update both quoted copies in `stakeholder-summary.md` and rewrite the `:389` paragraph so it
      explains why the lead names the merge.
- [x] `npm run bundle`, then `npm run bundle:check`.
- [x] CHANGELOG `[Unreleased]` → Changed.
- [x] `npm run ci` with `.agents/skills` moved aside.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `shared/resources/stakeholder-summary.js` — the `done` template.

### Files to Modify (Tests)

- `shared/resources/tests/stakeholder-summary.test.mjs` — one new test.

### Files to Modify (Documentation)

- `shared/resources/stakeholder-summary.md` — two quotes, one paragraph.
- `CHANGELOG.md` — `[Unreleased]` entry.

### Generated

- `skills/*/references/stakeholder-summary.js` and `.md` — regenerated by `npm run bundle`
  (`ls skills/*/references/stakeholder-summary.js | wc -l` reads 14 on 2026-10-26; the bundler
  decides the set).

---

## 8. Testing Strategy

### Unit Tests

- **New:** `done` lead makes no release claim. Inputs: `{}` and `{ pr: "#748" }`. Assert the lead
  does not match `/now part of the product/i` or `/no further action/i`, and does match `/merged/i`.
  Red on today's template.
- **Existing, must stay green:** no-slots rendering (`stakeholder-summary.test.mjs:72`), deny-list
  (`:102`), hostile slot values (`:328`), and the `tracker-comment.test.mjs` sites that compare
  against `renderLead("done", {})`.

### Regression

- `comment-slot-coverage.test.mjs`: `done` still reads `pr`, so the callers that pass `--slot pr=`
  stay correct.

---

## 9. Success Criteria

### Functional

- [x] `renderLead("done", {})` and `renderLead("done", { pr: "#1" })` claim acceptance and name the
      merge as the remaining step. Neither says the change is part of the product now, and neither
      says no further action is needed. Held by the new test in `stakeholder-summary.test.mjs`.
- [x] The new test is red on the old template and green on the new one.

### Performance

- [x] Not applicable: a template string.

### Code Quality

- [x] The no-slots, deny-list and slot-coverage tests pass unchanged.
- [x] `npm run ci` (with `.agents/skills` aside) and `npm run bundle:check` pass.

### Migration

- [x] `stakeholder-summary.md` quotes the new text in both places.
- [x] CHANGELOG `[Unreleased]` records the change.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

- **A copy of the old text survives somewhere.** Mitigation: grep `part of the product` across
  `shared/`, `skills/` and `evals/` after the bundle. Only the task.104 and task.106 plans may still
  match.
- **The new wording trips the deny-list** (for example "pull request" written as `PR`). Mitigation:
  the deny-list test runs on every stage.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

Revert the merge commit. The old text returns, and no state depends on the wording.

### Partial Rollback

Not applicable: one template.

### Forward Fix

Reword again; the test states the rule, not the text.

### Rollback Triggers

- A stakeholder reads the new lead as "the work is not done".
- A test outside `stakeholder-summary.test.mjs` turns out to hard-code the old text.

---

## Implementation Summary

**Completed**: 2026-10-26 (develop-task pipeline run 1, inline implementation from the co-located plan)

**Approach**

- **Test first.** `stakeholder-summary.test.mjs` gained "done lead claims acceptance, not release",
  after the deny-list loop. It renders `done` with `{}` and `{ pr: "#748" }` and asserts no
  `now part of the product`, no `no further action`, and a `merged`. Red on the old template (1 of
  56 failing), green on the new.
- **Template.** `LEAD_TEMPLATES.done` now reads: "This work has been checked and accepted.
  Everything it set out to do was confirmed working ({pr}). It becomes part of the product once the
  change is merged, which is the last step for this item. No action is needed from anyone reading
  this." Four sentences, the test's upper bound. The last sentence reuses the `pipeline-paused`
  lead's wording. A comment above the template names why it claims acceptance only.
- **Spec.** Both quotes in `stakeholder-summary.md` (§ `done` and the Before/After example) carry the
  new text. The rationale paragraph now covers both halves: the comment is posted before the merge,
  and naming a step left must not read as a step handed to the reader.
- **Bundle.** `npm run bundle` refreshed the `references/` copies (14 `.js`, 13 `.md`).

**Testing Results**

- `stakeholder-summary.test.mjs`: 56/56. `tracker-comment.test.mjs` + `comment-slot-coverage.test.mjs`: 91/91.
- Mutation proof: old text restored → the new test red (1 fail); new text restored → 56/56.
- `npm run ci` with `.agents/skills` moved aside: 6,340 tests, 6,326 pass, 0 fail, 14 skipped. The
  first run had 1 failure, `tests/bundle-comment-origin.test.js` §2 reading a `.t131-mutant-*`
  directory that `security-probe.test.mjs` creates in `shared/resources/tests/` and deletes. It
  passes alone and on the re-run. A pre-existing race, not this change (observation #102).
- `npm run bundle:check`: 128 skills, 0 problems.
- Old-text sweep: `grep -rn "part of the product" shared skills evals` finds only the rationale
  paragraph quoting the old claim, the new test's pattern, and an unrelated `qa-next` asset string.

**Deferred Work**

None.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-26 | 1.0 | Initial draft — cut from observation #98 | create-task |
| 2026-10-26 | 1.1 | Review passed (8/10) — call-site list corrected (Jira arm added, anchors re-measured, search recorded); proposed lead keeps a no-action sentence | review-task |
| 2026-10-26 |  | Status → ready-for-development | review-task |
| 2026-10-26 |  | Implemented — 4 source files (template, test, spec, CHANGELOG), 1 new test; 27 bundled copies regenerated | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Test first
- [x] Red test

### Phase 2: Reword
- [x] Template
- [x] Mutation proof

### Phase 3: Spec and bundle
- [x] Spec quotes
- [x] Bundle, CHANGELOG, `npm run ci`

---

## References

- Observation #98 — done lead says the change is part of the product before its PR is merged
- `shared/resources/stakeholder-summary.md` — the lead standard
- task.232 — the run that surfaced it (PR #748, issue #747)

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then `npm run bundle`. Never edit `references/` copies.
- Move `.agents/skills` aside before trusting a local `npm run ci`.
