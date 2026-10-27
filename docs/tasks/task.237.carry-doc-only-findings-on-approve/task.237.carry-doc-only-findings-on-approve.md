---
id: task.237
title: "Apply 5c doc-only findings on APPROVE"
type: task
description: "When the 5c /review-pr returns APPROVE, apply its doc-only findings through the same classify-and-stage carry that CONCERNS already uses, so a documentation defect the pipeline found and judged safe to fix is not left for /finalise, which can only halt on it."
tags: [develop-task, develop-story, qa-loop, review-pr, finalise, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-10-27
updated: 2026-10-27
assignee:
estimated_effort_hours: 4
github_issue: 765
---

# Technical Task: Apply 5c doc-only findings on APPROVE

**Status:** Planned
**GitHub Issue**: [#765](https://github.com/Gamaroff/agent-skills/issues/765)

---

## 1. Overview

On an `APPROVE` verdict, Step 5c of the shared QA loop currently records the PR review's findings and fixes none of them. This task makes `APPROVE` apply the **doc-only** findings exactly as `CONCERNS` does today. They go through the same classify block, the same stage block and the same safety tests, and ride the `/finalise` 6a acceptance commit.

**Scope:** the 5c rule in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, its bundled copies, the restatements of the old rule in `develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md` and the two develop SKILL.md summaries, and the guards that should have caught the old rule.

**Key deliverables:**

- The verdict table's `APPROVE` row and the *Carry the review into the acceptance commit* prose apply doc-only findings on `APPROVE`.
- Every restatement that names "doc-only `CONCERNS` fixes" says "doc-only fixes" (APPROVE or CONCERNS).
- A parity assertion that the `APPROVE` and `CONCERNS` rows invoke the same carry, so the two cannot drift apart again.

**Expected outcome:** a one-word documentation defect that 5c flags on an `APPROVE` is fixed before `/finalise` runs. `/finalise`'s docs agent then has nothing to fail on, and an autonomous run does not halt at Step 7 on it.

---

## 2. Motivation

### Current Problems

- **An APPROVE carries low findings, and the loop throws away the fix.** In `/review-pr`, APPROVE means "only `severity: low` findings, or none" (`skills/review-pr/SKILL.md:703`, *`otherwise (only severity: low findings, or none)`*). A low finding is exactly the kind most often a one-word documentation fix. Yet the carry rule fixes doc-only findings on `CONCERNS` only. On `APPROVE` it leaves `CARRY_FIXED` empty (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1602`, *`On APPROVE, or a CONCERNS with nothing doc-only, leave CARRY_FIXED empty`*).
- **`/finalise` then halts on a defect the pipeline already found.** On task.179 (2026-10-27, PR #764), 5c returned APPROVE with PC-1: `CHANGELOG.md:17` said "two stale test comments" where the diff had three. The finding was recorded and not fixed. `/finalise`'s docs agent found the same defect and returned `docs_review.overall: FAIL`. Step 8a could not take it, because the docs agent gives no `severity` and no test pins a CHANGELOG sentence. The autonomous `develop-next` run halted at Step 7 on a one-word fix, and a human had to make it.
- **The restriction was never argued for. It is an artefact of how task.173 was worded.** task.173's description reads "the 5c PR-review report and any doc-only CONCERNS fixes are staged" (`docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.fold-5c-review-into-acceptance-commit.md:5`). Nowhere does it say why an APPROVE's doc-only finding should not be fixed. The classify and stage blocks never read the verdict at all (see § 3).
- **The old rule is restated in four places**, so a reader of any one of them learns the CONCERNS-only rule: the QA loop doc, `develop-pipeline-step-7-finalise.md:147`, `skills/finalise/SKILL.md:1491`, and `skills/develop-{task,story}/SKILL.md` (`CONCERNS records findings without blocking; APPROVE exits to Step 7`).

### Benefits of Applying Doc-only Findings on APPROVE

- **A defect is fixed where it is found.** That is one step earlier than `/finalise`, and inside the loop's already-bounded carry path.
- **No new mechanism.** The classify block, the eligible-list record, the link check, the stage block and 6a's carry are reused unchanged. Only the verdicts that invoke them change.
- **Fewer autonomous halts.** A Step 7 DoD-gaps halt on a doc-only finding that 5c raised can no longer happen. That was task.179's whole halt, about 20 minutes of human time plus one extra DoD run.
- **One rule, stated once, guarded.** The parity assertion stops the `APPROVE` and `CONCERNS` rows from drifting apart again.

---

## 3. Technical Background

### Current Architecture

Step 5c (`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, § *Step 5c*) routes on the `/review-pr` verdict through a table:

- `CONCERNS` row (`:1463`): *"…carry the review into the acceptance commit (below; doc-only findings may be fixed there)…"*
- `APPROVE` row (`:1464`): *"…carry the review into the acceptance commit (below)…"*. There is no fix clause.

§ *Carry the review into the acceptance commit (APPROVE / CONCERNS)* (`:1473`) has three parts:

- The doc-only definition: a `ref` path matching `ci.docsOnly.patterns` that names exactly one tracked file, clean against `HEAD`, neither the implementation report nor the review report (`:1485`). It ends with *"Classify on `CONCERNS` before touching anything."* (`:1496`).
- The **classify block** (fence `:1511`–`:1595`). It reads the report's `## Machine-Readable Findings`, prints `doc-only <id> <path>` or `record <id> <ref>` per finding, and writes `.claude/state/5c-carry-eligible.txt`. **It takes no verdict input.** Its only input is `PR_REVIEW` (`:1513`).
- The **stage block** (fence `:1605`–`:1650`). It stages the report and each `CARRY_FIXED` path that the eligible list cleared and that passes `doc-links.js`. It restores a cleared path that fails the link check, and HALTs on an uncleared path. **It takes no verdict input either.** The verdict reaches it only through the prose at `:1602`–`:1603`, which tells the orchestrator to leave `CARRY_FIXED` empty on `APPROVE`.

The blocks are extracted and executed by `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`, which locates them with `fenceAfter(QA_LOOP, "#### Carry the review into the acceptance commit", n)` (`:140`–`:143`). The verdict routing is pinned by `evals/shared/tests/pr-review-loop-parity.test.mjs`, which reads each row's action cell through `verdictRow(…)` (`:749`–`:760`).

Restatements of the CONCERNS-only rule:

| Site | Text |
| --- | --- |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1463` | `CONCERNS` row: "doc-only findings may be fixed there" (the `APPROVE` row at `:1464` has no such clause) |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1496` | "Classify on `CONCERNS` before touching anything." |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1602` | "On `APPROVE`, or a `CONCERNS` with nothing doc-only, leave `CARRY_FIXED` empty" |
| `shared/resources/develop-pipeline-step-7-finalise.md:147` | "any doc-only `CONCERNS` fixes" |
| `skills/finalise/SKILL.md:1491` | "any doc-only CONCERNS fixes" (a comment in the 6a block) |
| `skills/develop-task/SKILL.md:239`, `skills/develop-story/SKILL.md:252` | "`CONCERNS` records findings without blocking; `APPROVE` exits to Step 7" |

The population was measured with `grep -rn 'doc-only' shared/resources/*.md skills/*/SKILL.md docs/reference/*.md | grep -i 'concerns\|approve'`, then `grep -n 'CONCERNS. records\|records findings without blocking' skills/develop-*/SKILL.md`. The implementer re-runs both before editing. The bundled copies under `skills/develop-{task,story}/references/` are regenerated by `npm run bundle`, never hand-edited.

### Target Architecture

- **Verdict table.** The `APPROVE` row carries the same clause as `CONCERNS`: "carry the review into the acceptance commit (below; doc-only findings may be fixed there)". `CONCERNS` keeps its "Do not block" note. The difference between the two verdicts is what is *recorded*, not what may be *fixed*.
- **Carry prose.** "Classify on `CONCERNS`" becomes "Classify on `APPROVE` or `CONCERNS`". The `:1602` sentence becomes "When the classify block cleared nothing, leave `CARRY_FIXED` empty". No verdict is named, because none is read.
- **Restatements.** Each site in the table above says "doc-only fixes" with no verdict, or "on APPROVE or CONCERNS".
- **The develop SKILL.md summaries** say both verdicts exit to Step 7, with doc-only findings carried.
- **Guard.** `pr-review-loop-parity.test.mjs` asserts that the `APPROVE` row's action cell and the `CONCERNS` row's action cell both contain the doc-only carry clause. It also fails with a named message if either row loses it.

The blocks themselves do not change. The QA Cycle entry's `**Carried to 6a**` and `**Not fixed**` lines are already written from the stage block's output (`:1652`), so they need no template change.

### Important Clarifications

- **Doc-only only.** A finding whose `ref` is code, has no path, or fails the clean-tracked-file test is still **recorded and not fixed** on `APPROVE`, exactly as on `CONCERNS`. Changing code after the last QA cycle is what the loop exists to prevent, and this task does not change that.
- **`REQUEST CHANGES` is untouched.** It routes back to 5b and consumes a cycle.
- **`develop-bug` is not affected.** Its verify loop has no 5c (`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`).
- **Option 2 of observation #109 is out of scope.** That option would give the finalise docs prompt a `severity` and give Step 8a a non-test proof for doc paths. The user chose option 1 only (2026-10-27).

---

## 4. Scope

### In Scope

✅ The `APPROVE` verdict row and the carry prose in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
✅ The restatements in `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md`, `skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md`
✅ The bundled copies, regenerated with `npm run bundle`
✅ A parity assertion in `evals/shared/tests/pr-review-loop-parity.test.mjs`
✅ A `CHANGELOG.md` entry citing `(task 237)`

### Out of Scope

❌ The finalise docs prompt's output contract, and Step 8a's preconditions (observation #109 option 2; not chosen)
❌ The classify and stage blocks. They are verdict-agnostic already, and changing them would reopen task.173's nine QA cycles of hardening
❌ Fixing code findings at 5c, on any verdict
❌ `develop-bug`'s verify loop

---

## 5. Breaking Changes

None — API stable. The visible change is behavioural and additive. On an `APPROVE` that carries a doc-only finding, the acceptance commit now also contains the doc fix, and its message ends `; 5c review carried` as it already does whenever the review report rides it. A consumer gets the change through `setup-consumer.sh --update`, with nothing to configure.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.237.plan.carry-doc-only-findings-on-approve.md](task.237.plan.carry-doc-only-findings-on-approve.md)

### Phase 1: The rule (Risk: Low)

**Files:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

- [ ] `APPROVE` verdict row: add the doc-only carry clause the `CONCERNS` row has
- [ ] Carry prose: "Classify on `CONCERNS`" → "Classify on `APPROVE` or `CONCERNS`"
- [ ] The `CARRY_FIXED` sentence: keyed on what the classify block cleared, not on the verdict
- [ ] One sentence stating why: an APPROVE carries low findings (`/review-pr` verdict table), and a doc-only one is the cheapest to fix here and the costliest to leave for `/finalise` (observation #109)

### Phase 2: The restatements (Risk: Low)

**Files:** `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`

- [ ] Re-run the § 3 population greps; edit every hit, and name any new one in the implementation report
- [ ] "doc-only `CONCERNS` fixes" → "doc-only fixes" at each site
- [ ] The develop SKILL.md summaries: APPROVE and CONCERNS both exit to Step 7 with doc-only findings carried
- [ ] `npm run bundle`, then `npm run bundle:check`

### Phase 3: Guard and record (Risk: Low)

**Files:** `evals/shared/tests/pr-review-loop-parity.test.mjs`, `CHANGELOG.md`

- [ ] Parity assertion: both rows' action cells carry the doc-only clause
- [ ] Mutation-prove it: delete the clause from the `APPROVE` row → red; restore → green
- [ ] `CHANGELOG.md` `[Unreleased]` entry citing `(task 237)`

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the APPROVE row and the carry prose
2. ✅ `shared/resources/develop-pipeline-step-7-finalise.md`: the restatement at `:147`
3. ✅ `skills/finalise/SKILL.md`: the 6a block comment at `:1491`
4. ✅ `skills/develop-task/SKILL.md`: the Step 5–6 summary at `:239`
5. ✅ `skills/develop-story/SKILL.md`: the Step 5–6 summary at `:252`

### Files to Modify (Generated — `npm run bundle`)

6. ✅ `skills/develop-task/references/develop-pipeline-step-5-6-qa-loop.md`
7. ✅ `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md`
8. ✅ every `references/develop-pipeline-step-7-finalise.md` copy the bundler regenerates

### Files to Modify (Tests)

9. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs`: the parity assertion

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** the routing contract. Both verdict rows invoke the doc-only carry.
- **Actions:** add a test to `pr-review-loop-parity.test.mjs` that reads each row's action cell through the file's existing `verdictRow(…)` helper and asserts both carry the doc-only clause. Mutation-prove it: remove the clause from the `APPROVE` row and the test must go red, naming the row.
- **Command:** `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs`

### Integration Tests

- **Scope:** the classify and stage blocks still behave as before.
- **Actions:** no change to `acceptance-commit-carries-5c.test.mjs` is expected. It must stay green unchanged, which proves the blocks were not touched. Its `fenceAfter(…, "#### Carry the review into the acceptance commit", n)` locator depends on that heading prefix, so keep the heading.
- **Command:** `command node --test shared/resources/tests/acceptance-commit-carries-5c.test.mjs`

### Performance Tests

Not applicable. This is a prose and test change with no runtime path.

### Consumer Tests

- **Scope:** a consumer pipeline running 5c.
- **Risk areas:** an APPROVE whose doc-only finding the orchestrator now edits. The existing link-check-and-restore path in the stage block covers a bad edit.

**What the test can and cannot show.** The change is to the instruction that says which verdicts invoke the carry. The blocks do not read the verdict, so no executed-block test can tell APPROVE from CONCERNS. The parity assertion pins the instruction, which is the only place the rule lives. It is a contract test over the routing table, of the same kind `pr-review-loop-parity` already uses for the exit routing, not a grep for a phrase anywhere in the file.

---

## 9. Success Criteria

### Functional

- [ ] The `APPROVE` verdict row's action cell in `develop-pipeline-step-5-6-qa-loop.md` carries the doc-only carry clause, and the `CONCERNS` row still does (test: `pr-review-loop-parity.test.mjs`, the new parity case)
- [ ] The carry prose names no verdict where it decides whether to fix: "Classify on `APPROVE` or `CONCERNS`", and `CARRY_FIXED` keyed on what the classify block cleared
- [ ] Every site in § 3's restatement table, re-measured by its grep, no longer states a CONCERNS-only fix rule
- [ ] Code findings and path-less findings are still recorded and not fixed on `APPROVE` (the § *Carry* prose says so, unchanged)

### Performance

- [ ] No new pipeline step and no new commit. The doc fix rides the existing 6a acceptance commit
- [ ] `acceptance-commit-carries-5c.test.mjs` passes unchanged (the blocks were not touched)

### Code Quality

- [ ] The new parity test is mutation-proved: removing the clause from the `APPROVE` row turns it red
- [ ] `npm run bundle:check` clean; `npm run validate -- skills/develop-task/ skills/develop-story/ skills/finalise/` clean
- [ ] `npm run ci:fast` green, and `npm run ci` green before merge

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` entry cites `(task 237)`
- [ ] No consumer action beyond `setup-consumer.sh --update`

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

1. **A doc fix at 5c on APPROVE goes wrong**
   - Risk: the orchestrator edits a doc-only file and gets it wrong, after QA has stopped looking.
   - Probability: Low
   - Impact: Medium. A wrong sentence would ride the acceptance commit.
   - Mitigation: unchanged from CONCERNS. The stage block link-checks every cleared path and restores a failing one to `HEAD`. `/finalise`'s docs agent then reads the edited file as part of the DoD.
   - Rollback: revert the rule commit. APPROVE goes back to recording only.

### Low Risk Areas

1. **A missed restatement** — a sixth site keeps the old wording. Mitigation: the Phase 2 grep re-run is part of the plan, and the parity test pins the one place the rule lives.
2. **Heading drift** — renaming the *Carry* heading would break `acceptance-commit-carries-5c.test.mjs`'s locator. Mitigation: the heading is kept, as § 8 states.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a consumer run where a 5c APPROVE doc fix ships a wrong or broken document, or `acceptance-commit-carries-5c.test.mjs` goes red.
- **Steps:** `git revert` the task's commits on `develop`; `npm run bundle`; push.
- **Validation:** `pr-review-loop-parity.test.mjs` and `acceptance-commit-carries-5c.test.mjs` green; the `APPROVE` row reads as before.

### Partial Rollback (1-2 hours)

- **When to use:** the rule is sound but a restatement edit reads wrong.
- **Steps:** revert only the Phase 2 edit at the affected site, then re-bundle.

### Forward Fix (< 4 hours)

- **When to use:** the parity test is too strict or too loose on wording.
- **Approach:** adjust the test's clause matcher. The rule stays.

### Rollback Triggers

- **Critical:** a doc-only fix at 5c that the link check passed but that broke a document a test reads.
- **Non-critical:** wording disagreements between the restatements, fixed forward.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-27 | 1.0 | Initial draft — cut from observation #109 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The rule

- [ ] APPROVE row
- [ ] Carry prose

### Phase 2: The restatements

- [ ] Five sites
- [ ] Bundle

### Phase 3: Guard and record

- [ ] Parity test, mutation-proved
- [ ] CHANGELOG

---

## References

- Observation #109 — An APPROVE 5c review leaves doc-only findings unfixed, and finalise can only halt on them
- task.173 — fold the 5c review into the acceptance commit (where the carry rule was written)
- task.179 — the run that halted on it (PR #764; `task.179.dod.1.review-pr-resolution-follow-ups.md`)

---

## Notes

- QA report: `task.237.qa.{N}.carry-doc-only-findings-on-approve.md`
- Bug reports: `task.237.bug.{N}.{name}.md`
- Quality gate: `task.237.gate.{N}.carry-doc-only-findings-on-approve.yml` (co-located)
