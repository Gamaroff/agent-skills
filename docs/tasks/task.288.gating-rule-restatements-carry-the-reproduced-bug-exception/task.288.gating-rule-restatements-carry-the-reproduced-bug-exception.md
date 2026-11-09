---
id: task.288
title: "Gating-rule restatements carry the reproduced-bug exception"
type: task
description: "Reword the two LOW residues task 273 left (T273-CR-5, T273-CR-6) and add a guard test so a restatement of the code-review gating rule cannot drop the reproduced-bug (5d) exception again."
tags: [qa, code-review, guard-test]
category: testing
status: planned
priority: Low
created: 2026-11-09
updated: 2026-11-09
assignee:
estimated_effort_hours: 4
github_issue: 862
---

# Technical Task: Gating-rule restatements carry the reproduced-bug exception

**Status:** Planned
**GitHub Issue**: [#862](https://github.com/Gamaroff/agent-skills/issues/862)

---

## 1. Overview

Task 273 added an exception to the code-review gating rule: a `category: bug` finding that QA reproduces by execution gates at any reviewer confidence (step 5d). The rule is restated in prose in many files, and the QA loop needed five cycles to find the restatements that omitted the exception, one per cycle. Two LOW residues were left open when it was accepted. This task rewords them, fixes the other restatement that still omits the exception, and adds a test that reads the sources, so the next restatement that omits it turns a test red instead of costing a QA cycle.

**Scope**: five lines of prose in four files (the carried items T273-CR-5 and T273-CR-6, plus the two restatements the probe in § 3 found), and one new test under `evals/shared/tests/`.

**Key deliverables**:

1. T273-CR-5 reworded.
2. T273-CR-6 reworded at all four report-template lines.
3. A guard test with a non-vacuity floor and a reason on every exemption.

---

## 2. Motivation

### Current Problems

1. **A rule restated in prose drifts.** Gate 6 of task 273 records the cause: each of cycles 1 to 5 found one gating-rule restatement that the earlier probes missed. A phrase-based probe finds the wordings its author thought of.
2. **Two LOW residues are open.** `shared/resources/code-review-prompt.md` says `confidence: low (it will not gate)`, unqualified, while a reproduced bug gates at any confidence. The four report-template lines say "advisory unless the doc opted in", which ignores the run-level `code_review_blocking=true` argument.
3. **Nothing holds the fix.** The task 273 fixes are prose. No test fails if a later edit restates the rule without the exception.

### Benefits

- The carried items close as a unit, and the gate-6 `recommendations.future` entries for them are done.
- A new restatement without the exception is caught in `npm test`, not in a QA cycle.

---

## 3. Technical Background

### Current Architecture

The rule lives once, in `shared/resources/code-review-prompt.md` § "Opt-in to blocking" and item 4 under "QA use" (`code-review-prompt.md:165`, "A `category: bug` finding the caller reproduces by execution is the caller's own finding"). Step 5d in `skills/qa-task/SKILL.md:854` and `skills/qa-story/SKILL.md:1354` applies it. The skills and step docs restate it in prose.

**Measured population** (a prototype probe, run for this task; the command and the definition are what the test will own, not the counts). Definition: every blank-line-delimited paragraph in `git ls-files 'skills/*/SKILL.md' 'shared/resources/*.md'` that either names `code_review_blocking` or `CR_BLOCKING` together with a gating word (`gate`, `gates`, `gated`, `gating`, `advisory`), or names `high-confidence` or `confidence: high` together with a gating word, or says `will not gate`. A paragraph carries the exception when it also contains `5d`, `reproduc`, `item 4`, `Opt-in to blocking` or `resolution matrix`. The probe keyed 40 paragraphs and 20 lacked the marker. By file, with the witness for each:

| Site | Verdict | Witness |
| --- | --- | --- |
| `shared/resources/code-review-prompt.md:92` | true positive: T273-CR-5 | the line reads `confidence: low (it will not gate)` |
| `skills/qa-task/SKILL.md:1622`, `:1936`; `skills/qa-story/SKILL.md:1867`, `:2479` | true positive: T273-CR-6. The probe's marker accepts these because they name `5d`; the defect is the missing run-level argument, so the marker test alone does not hold CR-6 (see Phase 3) | the lines read "advisory unless the doc opted in via `code_review_blocking: true` or QA reproduced the finding (5d)" |
| `skills/review-code/SKILL.md:319` | true positive: "so high-confidence bugs gate the build" with no exception and no pointer | line text |
| `skills/qa-task/SKILL.md:1050`, `shared/resources/qa-runnable-prose-detection.md:461` | decide in Phase 2: "eligible for `top_issues[]` under `code_review_blocking` exactly like any other `category: bug` finding" | the phrase |
| `shared/resources/pr-conformance-prompt.md:191` | decide in Phase 2: it describes `code-review-prompt.md`'s mapping | the phrase |
| `shared/resources/code-review-prompt.md:185` | false positive: the opening paragraph of the section whose matrix and exception follow at `:211` and `:229` | the section |
| `shared/resources/code-review-prompt.md:144, 202, 220`; `shared/resources/pr-conformance-prompt.md:107, 130`; `shared/resources/qa-docs-only-review-prompt.md:56`; `skills/qa-story/SKILL.md:2470`; `skills/qa-task/SKILL.md:1928` | false positive: YAML, a shell fence, a table, a bullet list or a template line that holds no restatement | each is a fence, table or template body |
| `shared/resources/tests/fixtures/report-lint/green/task.118.md`, `.119.md`, `.121.md`, `.123.md` | false positive: test fixtures, not canonical sources | path |

(Re-measure before relying on this table; every file and line is a coordinate that decays. The command is in the plan.)

**Why the probe's paragraph granularity is not enough.** Of the 20 misses, about 11 are false positives from fences, tables, YAML and fixtures, and a long paragraph that contains the marker once masks a restatement in another sentence of the same paragraph. The test therefore works on sentences outside fenced blocks and tables, and excludes the fixtures directory with a stated reason.

### Target Architecture

`evals/shared/tests/gating-rule-restatements.test.mjs` derives its population from `git ls-files`, splits each source into prose sentences (skipping fenced blocks, tables and the fixtures directory), and asserts every sentence that restates the gating rule carries the exception or points at the section that states it. Exemptions are listed in the test with a reason each, and the test asserts every exemption still names a real sentence.

### Important Clarifications

- The bundled copies under `skills/*/references/` are generated by `npm run bundle` from `shared/resources/`. The test reads the sources only; `tests/bundled-copies*` already hold the copies equal. Edit sources, then run `npm run bundle`.
- Task 273's carried entries are in `docs/tasks/task.273.qa-task-steps-state-the-routes-they-lack/task.273.gate.6.qa-task-steps-state-the-routes-they-lack.yml` under `recommendations.future`.

---

## 4. Scope

### In Scope

✅ T273-CR-5 and T273-CR-6 rewordings.
✅ The restatements Phase 2 decides on (`review-code/SKILL.md:319` and, if the decision is to reword, the three others).
✅ The guard test, its non-vacuity floor and its mutation proof.
✅ `npm run bundle` for the changed shared sources.

### Out of Scope

❌ Changing the gating rule itself.
❌ The other `recommendations.future` entries of task 273 (cycle-1 CR-1 to CR-3 and the Migration check).
❌ Any restatement in a file that does not name the rule's flag or the high-confidence gating claim.

---

## 5. Breaking Changes

None. Prose rewordings and one new test; no interface changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.288.plan.gating-rule-restatements-carry-the-reproduced-bug-exception.md](task.288.plan.gating-rule-restatements-carry-the-reproduced-bug-exception.md)

### Phase 1: Reword the two carried residues

**Risk**: Low
**Files**: `shared/resources/code-review-prompt.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [ ] `code-review-prompt.md:92`: "set confidence: low (it will not gate on the reviewer claim alone)".
- [ ] The four report-template lines: "advisory unless blocking resolves to true (run-level arg or frontmatter) or QA reproduced the finding (5d)".

### Phase 2: Decide and reword the other restatements

**Risk**: Low
**Files**: `skills/review-code/SKILL.md`, `skills/qa-task/SKILL.md`, `shared/resources/qa-runnable-prose-detection.md`, `shared/resources/pr-conformance-prompt.md`

- [ ] `review-code/SKILL.md:319`: add the exception or a pointer to § "Opt-in to blocking".
- [ ] For `qa-task:1050`, `qa-runnable-prose-detection.md:461` and `pr-conformance-prompt.md:191`: reword to carry the exception, or exempt in the test with a one-line reason. Record each decision in the plan's decisions log.

### Phase 3: The guard test

**Risk**: Medium (a prose-keyed test can be noisy or blind)
**Files**: `evals/shared/tests/gating-rule-restatements.test.mjs`

- [ ] Population from `git ls-files`, sentence-level, outside fences and tables, fixtures excluded.
- [ ] A restatement must carry the exception or a pointer; a second assertion holds CR-6's shape: a sentence that says "advisory unless" and names `code_review_blocking` must also mention the run-level argument.
- [ ] A non-vacuity floor (the number of keyed sentences is at least the measured count minus slack), and every exemption names a sentence that still exists.
- [ ] A control that the key does not match: a restatement worded without the flag name (for example "bugs above 80% confidence block the merge") and how the test sees it, stated in the plan.
- [ ] `npm run bundle`, then `CI=true npm test`.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/code-review-prompt.md` — CR-5.
2. ✅ `skills/qa-task/SKILL.md` — CR-6 at two lines; `:1050` per Phase 2.
3. ✅ `skills/qa-story/SKILL.md` — CR-6 at two lines.
4. ✅ `skills/review-code/SKILL.md` — `:319`.
5. ⚠️ `shared/resources/qa-runnable-prose-detection.md`, `shared/resources/pr-conformance-prompt.md` — only if Phase 2 chooses to reword.

### Files to Modify (Tests)

6. ✅ `evals/shared/tests/gating-rule-restatements.test.mjs` (new). It runs under the existing `evals/shared/tests/*.test.mjs` glob in `package.json` `test:suite`; no `package.json` edit.

### Generated

7. ✅ The bundled copies of the changed shared sources under `skills/*/references/`, via `npm run bundle`.

### Files to Modify (Documentation)

8. ✅ `CHANGELOG.md` — one entry citing `(task 288)`.

---

## 8. Testing Strategy

### Unit Tests

- The new test, run with `command node --test evals/shared/tests/gating-rule-restatements.test.mjs`.
- **Mutation proof (obs on every fix):** (a) restore the unqualified wording at `code-review-prompt.md:92` in a scratch copy and confirm the test goes red; (b) remove "run-level arg" from one report-template line and confirm red; (c) delete the exception from `review-code/SKILL.md:319` and confirm red. A scratch copy is a `git worktree` under `$CLAUDE_JOB_DIR/tmp` or an env override of the source root, removed in a `finally`.
- **Control that the key does not match:** a restatement with neither the flag name nor "high-confidence" is invisible to the test. The plan states this limit; the test does not claim to find it.

### Regression

- `CI=true npm test` and `npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] `code-review-prompt.md` no longer says "it will not gate" unqualified.
- [ ] None of the four report-template lines says "advisory unless the doc opted in" without the run-level argument.
- [ ] The new test passes on the tree and fails on each of the three mutations in § 8.

### Performance

- [ ] The new test runs in under 2 seconds, recorded in the QA report (median of five runs, `uptime` beside each; outliers reported).

### Code Quality

- [ ] `CI=true npm test` and `npm run bundle -- --check` pass; the QA report records both.
- [ ] Every exemption in the test carries a reason and names a sentence that still exists.

### Migration

- [ ] `CHANGELOG.md` cites `(task 288)`.
- [ ] The gate-6 entries of task 273 for CR-5, CR-6 and the guard test are marked done in this task's QA report.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The test is blind to a restatement that avoids its keys.**
   - Probability: Medium. Impact: Low (the status quo is no test).
   - Mitigation: three keys (flag name, high-confidence claim, "will not gate"), a floor, and the limit stated in the plan.
2. **The test is noisy.**
   - Probability: Medium. Impact: Low.
   - Mitigation: sentence-level matching outside fences and tables; each exemption has a reason.

### Low Risk Areas

1. **A bundled copy lags.** `npm run bundle -- --check` in CI catches it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the new test is red on `develop` for a reason unrelated to a restatement.
- **Steps**: `git revert` the merge commit; run `npm run bundle`; `CI=true npm test`.
- **Validation**: `npm test` is green.

### Partial Rollback

Revert the test file alone and keep the rewordings.

### Forward Fix

A false positive is fixed by an exemption with a reason, not by deleting the test.

### Rollback Triggers

- **Critical**: the test blocks CI on `develop`.
- **Non-critical**: a noisy exemption list; tidy forward.

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-09 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

### Phase 1: Reword the two carried residues

- [ ] CR-5
- [ ] CR-6 (four lines)

### Phase 2: Other restatements

- [ ] `review-code/SKILL.md:319`
- [ ] Decide `qa-task:1050`, `qa-runnable-prose-detection.md:461`, `pr-conformance-prompt.md:191`

### Phase 3: Guard test

- [ ] Test, floor, exemptions, mutation proof
- [ ] Bundle, CHANGELOG

---

## References

- **Carried from**: task 273, gate 6 `recommendations.future` (T273-CR-5, T273-CR-6, the guard-test entry).
- **Rule**: `shared/resources/code-review-prompt.md` § "Opt-in to blocking" and item 4 under "QA use".

---

## Notes

### Important Reminders

Edit `shared/resources/` sources and `skills/*/SKILL.md`, never the bundled copies; run `npm run bundle` before committing.
