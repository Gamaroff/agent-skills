---
id: task.129
title: "[Task 129] A call-site list in a task document is the author's recall, not a measurement: review-task and review-story enumerate the population with the repository's own collector and diff it against the list"
type: task
description: "review-task Step 3 check 6 inventories same-class functions; nothing inventories call sites. When a task's scope is 'these N invocations of engine X', the review verifies the N it names and never counts the population — on task.121 the document listed three tracker-comment.js sites and one orchestrator duplicate, and the collector the task's own guard reuses (collectCallSites() in comment-slot-coverage.test.mjs, sub-second) found two more in scope: a second orchestrator duplicate and a live develop-bug consumer that a success criterion would have forbidden. Both became Important findings the pre-pass grep for named symbols could not see. Add a call-site population check to review-task Step 3 (check 14) and review-story Step 4 (check 10): when a document enumerates invocations of a shared engine, run the collector for that engine (or the documented grep shape across shared/resources, skills/*/SKILL.md, un-bannered references/, tracked shell), diff against the list, and flag every unnamed site as in-scope or as an exclusion the document must state. Ship a small `call-sites.js` so the reviewer, the guard tests and create-task run one collector. Observation #120."
tags: [review-task, review-story, create-task, call-sites, tracker-comment]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-18
updated: 2026-09-29
assignee:
estimated_effort_hours: 5
github_issue: 432
---

# Technical Task: A call-site list in a task document is the author's recall, not a measurement

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.129.review.1.review-call-site-population-check.md` implemented 2026-09-29
**GitHub Issue**: [#432](https://github.com/Gamaroff/agent-skills/issues/432)

---

## 1. Overview

A task that scopes itself as "the N call sites of engine X" makes a claim about a population, and the review checks the N sites and never the population. On task.121 (2026-09-18) the document named three `tracker-comment.js` sites and one orchestrator duplicate; the review's pre-pass Agent C grepped for the *named* symbols and confirmed them; the collector the task's own guard reuses found two unnamed sites in scope, one of which a success criterion would have forbidden. Both were found only because the reviewer happened to run the collector — and the guard the task shipped would otherwise have found the boundary drawn short on its first green.

This task makes the count a review step. `review-task` Step 3 (as **check 14**) and `review-story` Step 4 (as **check 10**) gain a **call-site population** check: identify the engine the document enumerates, run the repository's collector for it, diff the result against the document's list, and turn every difference into a finding. A small pure `shared/resources/call-sites.js` gives the reviewer, the guard tests and `create-task`'s authoring pass (3.5) the same collector, so the population is measured once and the same way.

**Scope**: `skills/review-task/SKILL.md` Step 3 + Detection Rules, `skills/review-story/SKILL.md` Step 4 + Detection Rules, both pre-pass prompt files, `shared/resources/call-sites.js` + test, `comment-slot-coverage.test.mjs` (consume the shared collector), `create-task` 3.5 twin + Section 7 pointer, a presence test.

## 2. Motivation

### Current Problems

1. **The pre-pass confirms names, not populations.** Agent C greps for the symbols the document names; a site the document does not name is invisible by construction.
2. **The collector exists and is not run.** `collectCallSites(engineRe, engine)` scans `shared/resources/*.{md,sh}`, `skills/*/SKILL.md` and un-bannered `skills/*/references/*.md` for an engine's invocation shape; the whole guard file runs in ~0.3 s (`node --test shared/resources/tests/comment-slot-coverage.test.mjs`, 320 ms on 2026-09-29). It lives inside one test file and no review step names it.
3. **The guard finds the gap last.** A task that ships a guard over "all sites" discovers the unnamed sites when the guard first runs — after develop, at QA — when the fix is a scope change rather than a document edit.
4. **Each engine's collector is private.** `comment-slot-coverage.test.mjs` runs its parameterised collector twice — `SITES` (`tracker-comment.js`, 24 sites on `develop` @ `01c8701f`) and `PR_SITES` (`stakeholder-summary-cli.js`, 12 sites); `transition-protocol-parity.test.mjs` has another shape for `--stage` literals; nothing collects `gh-stage.js` / `jira-stage.js` / `tracker-issue.js` sites at all. (Counts: a `console.log(SITES.length, PR_SITES.length)` appended to a throwaway copy of the guard file.)

### Benefits

1. A document's site list is checked against a measurement before development starts.
2. One collector, three consumers; the review and the guard cannot disagree about what a site is.
3. Unnamed sites become findings at review, where fixing them is a paragraph.

## 3. Technical Background

### Current Architecture

```
review-task Step 3     checks 1–13; check 6 inventories same-class FUNCTIONS
review-story Step 4    checks 1–9 (a subset; no function inventory)
pre-pass Agent C       grep for named symbols → confirms/denies each
collectCallSites()     private to comment-slot-coverage.test.mjs; tracker-comment.js + stakeholder-summary-cli.js
```

### Target Architecture

```
shared/resources/call-sites.js   collect({ engine, root }) → [{ file, line, engine, stage, kind, slots }]
                                 engines: tracker-comment | gh-stage | jira-stage | stakeholder-summary-cli | tracker-issue
                                 stage: the --stage value (null when absent); kind: tracker-issue's --kind (else null)
                                 CLI: call-sites.js --engine tracker-comment [--root <dir>] --json
                                 root default: `git rev-parse --show-toplevel`, else cwd — never __dirname
review-task Step 3 check 14      document enumerates invocations of an engine → run the CLI → diff
review-story Step 4 check 10     unnamed site → Important: "in scope: add it" | "exclusion: state why"
                                 count mismatch → Important
                                 same wording in both; both Detection Rules lists gain the rule
pre-pass Agent C (both files)    when the document enumerates, run the CLI; return population_diff
comment-slot-coverage.test.mjs   imports collect() from call-sites.js (every floor unchanged)
create-task 3.5 + Section 7      "a call-site list is a claim about a population — run call-sites.js and paste its count"
```

### Important Clarifications

- **The collector is the source; the test consumes it.** Moving `collectCallSites()` out of the test into a shared module must keep the test's floors (`SITES ≥ 20`, `PR_SITES ≥ 9`, suffixed `≥ 4` each) and its mutation proofs green before and after — the move is a refactor with a test on both sides. Baseline: `SITES` 24, `PR_SITES` 12.
- **Roots: today's three, plus tracked shell.** The lift keeps `shared/resources/*.{md,sh}`, `skills/*/SKILL.md` and un-bannered `skills/*/references/*.md`, and adds `skills/*/scripts/*.sh` and `scripts/*.sh` — the shell roots `tests/mutation-call-site-coverage.test.js` already scans. `git grep -l 'tracker-comment\.js' -- 'skills/*/scripts/*.sh' 'scripts/*.sh'` is empty today, so the guard's population must not move; the count assertion proves it.
- **The general shape admits the two wrappers shipped prose puts before `node`** — `tracker_call_with_retry node … tracker-issue.js` (finalise step doc) and `[ -n "$X" ] && node … tracker-issue.js` (sync-github-bug). Found by the develop surface map; the two lifted shapes are unchanged, so the guard's population is not.
- **Bundled, the CLI must find the repository by git, not by its own path.** Copied into `.agents/skills/review-task/references/call-sites.js`, a `__dirname`-relative root points inside the skill. Inside `shared/resources/`, siblings are cited by bare filename (AGENTS.md); SKILL.md cites the script as `.agents/skills/<skill>/references/call-sites.js` so the bundler copies it.
- **"Un-bannered references/" is a real scan target.** A bundled copy headed `AUTO-GENERATED` is excluded; a hand-authored reference is a call site like any other (bug 14's PreCompact discovery).
- **The check is scoped to documents that enumerate.** A task that touches one engine call and says so is not asked to count the world; the trigger is a list, a count, or "all call sites of".

## 4. Scope

### In Scope

✅ `shared/resources/call-sites.js` (pure + thin CLI) and its test, with the tracker-comment and stakeholder-summary-cli shapes lifted from `comment-slot-coverage.test.mjs`.
✅ `review-task` Step 3 check 14 and `review-story` Step 4 check 10, plus a rule in each Detection Rules list; both pre-pass prompt files name the CLI.
✅ `comment-slot-coverage.test.mjs` consumes the shared collector.
✅ `create-task` 3.5 authoring twin and a one-sentence pointer in the Section 7 (Files Summary) prompt.
✅ A presence test (`tests/review-call-site-population-check.test.js`) in the shape of `tests/review-property-checks.test.js`.
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
- [x] Lift `collectCallSites()` with both of its shapes (`tracker-comment`, `stakeholder-summary-cli`) unchanged; add engine shapes for `gh-stage`, `jira-stage`, `tracker-issue`; add the two shell roots.
- [x] CLI `--engine <name> [--root <dir>] [--json]` → `{ reason, engine, root, count, sites }`; `reason` `ok` (exit 0) or `empty` (exit 0, zero sites — a claim about the instrument, reported rather than hidden); `no-roots` (exit 1) when the root holds none of the walked trees (QA cycle 1, CR-4); exit 2 with `reason: usage` on an unknown engine or bad flag. An explicit `--root` is measured as given (CR-1); `node "$VAR"` is a site when VAR may hold the engine's path in that shell function (CR-2).
- [x] Test: fixture tree with one site per root class and one bannered decoy; the live tree's counts equal the guard's (24 / 12 at `01c8701f`).

**Dependencies**: none.

### Phase 2: The review check (#120)

**Risk Level**: Low

**Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `shared/resources/review-task-prepass-prompts.md`, `shared/resources/review-story-prepass-prompts.md`, `skills/create-task/SKILL.md` (3.5 + Section 7), `tests/review-call-site-population-check.test.js`

**Changes**:
- [x] review-task check 14 / review-story check 10 with trigger, command, diff rule, severities; the task.121 case as the worked example; a matching Detection Rules entry in each.
- [x] Agent C prompt (both files — they carry a sibling rule): when the document enumerates, run the CLI and return `population_diff`.
- [x] create-task 3.5 twin + Section 7 pointer.
- [x] Presence test: section-scoped, asserted on the check's own list item, at all five sites.

**Dependencies**: Phase 1.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`
2. ✅ `shared/resources/review-task-prepass-prompts.md`, `shared/resources/review-story-prepass-prompts.md` (Agent C prompt)

### Files to Create

3. ✅ `shared/resources/call-sites.js`, `shared/resources/tests/call-sites.test.mjs`

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/comment-slot-coverage.test.mjs`
5. ✅ `tests/review-call-site-population-check.test.js` (new presence test)

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`; `skills/*/references/` regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [x] Collector: each root class (including both shell roots), the banner exclusion, each engine shape, `kind` for tracker-issue; unknown engine → exit 2; empty root → `empty`.
- [x] `comment-slot-coverage.test.mjs` green before and after the lift, with its floor and mutation proofs intact.

**Command**: `npm test` (per phase: `npm run ci:fast`)

### Integration Tests
- [x] Automated: `call-sites.js --engine tracker-comment --root <git archive of c69f5115^>` returns the two sites the task.121 review found unnamed. (`c69f5115` is the commit that widened task.121 after review; the document as reviewed is `c69f5115^`.)
- [x] Hand run, recorded in the implementation report: check 14 applied to `git show c69f5115^:docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md` reports those two sites as Important.

### Contract Tests
- [x] `tests/review-call-site-population-check.test.js`: the check is present, with its trigger, command and verdicts, at review-task Step 3, review-story Step 4, both Detection Rules lists and create-task 3.5. (No family in `skill-families.md` covers the review skills, so the families audit cannot hold this.)

### Performance Tests
- [x] CLI ≤ 2 s on the live tree.

### Consumer Tests
- [ ] Next task that scopes "all call sites of X" carries a collector count in §7 and the review confirms it.

## 9. Success Criteria

### Functional
- [x] `call-sites.js --engine tracker-comment --json` returns the same sites the guard test scans (24 at `01c8701f`), and `--engine stakeholder-summary-cli` the same as `PR_SITES` (12).
- [x] On the task.121 fixture (`c69f5115^`), the collector returns the two unnamed sites and the hand-run check reports them as Important.
- [x] The guard test's floor and proofs are unchanged after consuming the shared collector.

### Performance
- [x] No measurable change to review wall-clock (one sub-second command; CLI ≤ 2 s on the live tree).

### Code Quality
- [x] One collector, three consumers; no restated engine shape — `comment-slot-coverage.test.mjs` defines no regex of its own.
- [x] Mutation proof: remove a root class from the collector → the fixture test names it.

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

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-29
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.129.qa.1.review-call-site-population-check.md](./task.129.qa.1.review-call-site-population-check.md)
- **Gate File**: [task.129.gate.1.review-call-site-population-check.yml](./task.129.gate.1.review-call-site-population-check.yml)

### Test Coverage Summary
- **Tests Executed**: 76 (affected suites); `npm run ci:fast` 4,564 pass
- **Phases Verified**: 2/2
- **Critical Issues**: 0 (2 medium: TASK-129-CR-1, TASK-129-CR-2)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
An explicit `--root` inside a git work tree is replaced by the repo top level (CR-1), and `node "$VAR"` invocations of an engine are invisible to the collector (CR-2).

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-18 | 1.0 | Initial draft — observation review 2026-09-18 (obs #120) | create-task |
| 2026-09-29 | 1.1 | Review passed (8/10) — renumbered to review-task check 14 / review-story check 10; corrected the collector's roots and existing engines (24 / 12 baseline); named both pre-pass files; presence test replaces the families audit; fixture at `c69f5115^` with `--root`; site schema defined | review-task |
| 2026-09-29 |  | Status → ready-for-development | review-task |
| 2026-09-29 |  | Implemented — `call-sites.js` (5 engines, `--root`), guard lifted (24 / 12 unchanged), review-task check 14 / review-story check 10, both Agent C prompts, create-task 3.5 twin; 3 new/changed test files, 17 + 10 new tests | develop-task (inline) |
| 2026-09-29 |  | QA gate CONCERNS (80/100) — 2 medium findings (CR-1 root override, CR-2 node "$VAR" invisible) | qa-task |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: call-sites.js
- [x] Phase 2: review check
- [ ] QA: `task.129.qa.[N].review-call-site-population-check.md`
- [ ] Gate: `task.129.gate.[N].review-call-site-population-check.yml`

## References

- Observation #120; obs #103 (check 6, the function-inventory sibling)
- task.121 review `task.121.review.1.cycle-scoped-qa-tracker-comments.md` — the two unnamed sites
- `shared/resources/tests/comment-slot-coverage.test.mjs` `collectCallSites()`

## Notes

Bugs found during QA land at `task.129.bug.[N].[name].md` in this directory.
