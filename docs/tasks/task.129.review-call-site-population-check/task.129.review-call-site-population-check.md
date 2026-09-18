---
id: task.129
title: "[Task 129] A call-site list in a task document is the author's recall, not a measurement: review-task and review-story enumerate the population with the repository's own collector and diff it against the list"
type: task
description: "review-task Step 3 check 6 inventories same-class functions; nothing inventories call sites. When a task's scope is 'these N invocations of engine X', the review verifies the N it names and never counts the population — on task.121 the document listed three tracker-comment.js sites and one orchestrator duplicate, and the collector the task's own guard reuses (collectCallSites() in comment-slot-coverage.test.mjs, ~1 s) found two more in scope: a second orchestrator duplicate and a live develop-bug consumer that a success criterion would have forbidden. Both became Important findings the pre-pass grep for named symbols could not see. Add check 9 to review-task Step 3 and review-story Step 4: when a document enumerates invocations of a shared engine, run the collector for that engine (or the documented grep shape across shared/resources, skills/*/SKILL.md, un-bannered references/, tracked .sh), diff against the list, and flag every unnamed site as in-scope or as an exclusion the document must state. Ship a small `call-sites.js` so the reviewer, the guard tests and create-task run one collector. Observation #120."
tags: [review-task, review-story, create-task, call-sites, tracker-comment]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-09-18
updated: 2026-09-18
assignee:
estimated_effort_hours: 5
github_issue: 432
---

# Technical Task: A call-site list in a task document is the author's recall, not a measurement

**Status:** Planned
**GitHub Issue**: [#432](https://github.com/Gamaroff/agent-skills/issues/432)

---

## 1. Overview

A task that scopes itself as "the N call sites of engine X" makes a claim about a population, and the review checks the N sites and never the population. On task.121 (2026-09-18) the document named three `tracker-comment.js` sites and one orchestrator duplicate; the review's pre-pass Agent C grepped for the *named* symbols and confirmed them; the collector the task's own guard reuses found two unnamed sites in scope, one of which a success criterion would have forbidden. Both were found only because the reviewer happened to run the collector — and the guard the task shipped would otherwise have found the boundary drawn short on its first green.

This task makes the count a review step. `review-task` Step 3 and `review-story` Step 4 gain a **call-site population** check: identify the engine the document enumerates, run the repository's collector for it, diff the result against the document's list, and turn every difference into a finding. A small pure `shared/resources/call-sites.js` gives the reviewer, the guard tests and `create-task`'s §7 authoring the same collector, so the population is measured once and the same way.

**Scope**: `skills/review-task/SKILL.md` Step 3, `skills/review-story/SKILL.md` Step 4, `shared/resources/call-sites.js` + test, `comment-slot-coverage.test.mjs` (consume the shared collector), `create-task` §7 note.

## 2. Motivation

### Current Problems

1. **The pre-pass confirms names, not populations.** Agent C greps for the symbols the document names; a site the document does not name is invisible by construction.
2. **The collector exists and is not run.** `collectCallSites()` scans `shared/resources/*.md`, `skills/*/SKILL.md`, un-bannered `skills/*/references/*.md` and tracked `.sh` for a `--stage` invocation shape in ~1 s. It lives inside one test file and no review step names it.
3. **The guard finds the gap last.** A task that ships a guard over "all sites" discovers the unnamed sites when the guard first runs — after develop, at QA — when the fix is a scope change rather than a document edit.
4. **Each engine's collector is private.** `comment-slot-coverage.test.mjs` has one for `tracker-comment.js`; `transition-protocol-parity.test.mjs` has another shape for `--stage`; nothing collects `gh-stage.js` / `jira-stage.js` / `stakeholder-summary-cli.js` sites at all.

### Benefits

1. A document's site list is checked against a measurement before development starts.
2. One collector, three consumers; the review and the guard cannot disagree about what a site is.
3. Unnamed sites become findings at review, where fixing them is a paragraph.

## 3. Technical Background

### Current Architecture

```
review-task Step 3     checks 1–8; check 6 inventories same-class FUNCTIONS
review-story Step 4    the same list
pre-pass Agent C       grep for named symbols → confirms/denies each
collectCallSites()     private to comment-slot-coverage.test.mjs; tracker-comment.js only
```

### Target Architecture

```
shared/resources/call-sites.js   collect({ engine, roots }) → [{ file, line, stage?, form }]
                                 engines: tracker-comment | gh-stage | jira-stage | stakeholder-summary-cli | tracker-issue
                                 CLI: call-sites.js --engine tracker-comment --json
review-task Step 3 check 9       document enumerates invocations of an engine → run the CLI → diff
                                 unnamed site → Important: "in scope: add it" | "exclusion: state why"
                                 count mismatch → Important
review-story Step 4              the same check, same wording
comment-slot-coverage.test.mjs   imports collect() from call-sites.js (non-vacuity floor unchanged)
create-task §7                   "a call-site list is a claim about a population — run call-sites.js and paste its count"
```

### Important Clarifications

- **The collector is the source; the test consumes it.** Moving `collectCallSites()` out of the test into a shared module must keep the test's floor and its mutation proofs green before and after — the move is a refactor with a test on both sides.
- **"Un-bannered references/" is a real scan target.** A bundled copy headed `AUTO-GENERATED` is excluded; a hand-authored reference is a call site like any other (bug 14's PreCompact discovery).
- **The check is scoped to documents that enumerate.** A task that touches one engine call and says so is not asked to count the world; the trigger is a list, a count, or "all call sites of".

## 4. Scope

### In Scope

✅ `shared/resources/call-sites.js` (pure + thin CLI) and its test, with the tracker-comment shape lifted from `comment-slot-coverage.test.mjs`.
✅ `review-task` Step 3 check 9; `review-story` Step 4 equivalent; the pre-pass prompt names the CLI.
✅ `comment-slot-coverage.test.mjs` consumes the shared collector.
✅ `create-task` §7 authoring note.
✅ `npm run bundle`.

### Out of Scope

❌ Collecting call sites of arbitrary JS functions — engines with a CLI invocation shape only.
❌ Auto-editing the task document's list; the review flags, the author decides.

## 5. Breaking Changes

None. The test keeps its floor; the review gains a check.

## 6. Implementation Plan

> Detailed implementation guide: [task.129.plan.review-call-site-population-check.md](task.129.plan.review-call-site-population-check.md)

### Phase 1: `call-sites.js` (#120)

**Risk Level**: Low

**Files**: `shared/resources/call-sites.js`, `shared/resources/tests/call-sites.test.mjs`, `comment-slot-coverage.test.mjs`

**Changes**:
- [ ] Lift `collectCallSites()`; add engine shapes for `gh-stage`, `jira-stage`, `stakeholder-summary-cli`, `tracker-issue`.
- [ ] CLI `--engine <name> [--json]`; exit 2 on an unknown engine; the same `reason` contract as the other engines.
- [ ] Test: fixture tree with one site per root class; the live tree's tracker-comment count equals the test's floor-checked count.

**Dependencies**: none.

### Phase 2: The review check (#120)

**Risk Level**: Low

**Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, the pre-pass Agent C prompt, `skills/create-task/SKILL.md` §7

**Changes**:
- [ ] Check 9 with trigger, command, diff rule, severities; the task.121 case as the worked example.
- [ ] Agent C prompt: when the document enumerates, run the CLI and return the diff.
- [ ] create-task §7 note.

**Dependencies**: Phase 1.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`
2. ✅ `shared/resources/review-prepass-*.md` (Agent C prompt)

### Files to Create

3. ✅ `shared/resources/call-sites.js`, `shared/resources/tests/call-sites.test.mjs`

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/comment-slot-coverage.test.mjs`

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`; `skills/*/references/` regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] Collector: each root class, the banner exclusion, each engine shape; unknown engine → exit 2.
- [ ] `comment-slot-coverage.test.mjs` green before and after the lift, with its floor and mutation proofs intact.

**Command**: `npm test`

### Integration Tests
- [ ] `review-task` on the task.121 document as of its review (`git show c69f5115:…`): check 9 reports two unnamed sites.

### Contract Tests
- [ ] The review-task and review-story wording of check 9 is identical (families audit shared rule).

### Performance Tests
- [ ] CLI ≤ 2 s on the live tree.

### Consumer Tests
- [ ] Next task that scopes "all call sites of X" carries a collector count in §7 and the review confirms it.

## 9. Success Criteria

### Functional
- [ ] `call-sites.js --engine tracker-comment --json` returns the same sites the guard test scans.
- [ ] review-task and review-story flag an unnamed in-scope site as Important on the task.121 fixture.
- [ ] The guard test's floor and proofs are unchanged after consuming the shared collector.

### Performance
- [ ] No measurable change to review wall-clock (one ~1 s command).

### Code Quality
- [ ] One collector, three consumers; no restated engine shape.
- [ ] Mutation proof: remove a root class from the collector → the fixture test names it.

### Migration
- [ ] Observation #120 closes naming the PR.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
None.

### Low Risk
1. **A false positive on a site that is genuinely out of scope.** The check asks the document to state the exclusion; a stated exclusion is not a finding.
2. **The lift changes the guard's population.** Mitigation: assert the count before and after in the same PR.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: the guard test's population changes after the lift.
- **Steps**: `git revert`; `npm run bundle`; commit.
- **Validation**: `comment-slot-coverage.test.mjs` floor equal to its pre-lift value.

### Partial Rollback (1–2 hours)
- Phase 2 (prose) can be reverted without Phase 1.

### Forward Fix
- A missed root class: add it to the collector with a fixture.

### Rollback Triggers
- **Critical**: the guard scanning fewer sites than before.
- **Non-critical**: check wording.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-18 | 1.0 | Initial draft — observation review 2026-09-18 (obs #120) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: call-sites.js
- [ ] Phase 2: review check
- [ ] QA: `task.129.qa.[N].review-call-site-population-check.md`
- [ ] Gate: `task.129.gate.[N].review-call-site-population-check.yml`

## References

- Observation #120; obs #103 (check 6, the function-inventory sibling)
- task.121 review `task.121.review.1.cycle-scoped-qa-tracker-comments.md` — the two unnamed sites
- `shared/resources/tests/comment-slot-coverage.test.mjs` `collectCallSites()`

## Notes

Bugs found during QA land at `task.129.bug.[N].[name].md` in this directory.
