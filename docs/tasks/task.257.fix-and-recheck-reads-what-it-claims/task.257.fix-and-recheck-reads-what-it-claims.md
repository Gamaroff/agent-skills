---
id: task.257
title: "finalise fix-and-recheck reads severity, scope and the named test"
type: task
description: "Make /finalise Step 8a reachable for a low acceptance-criteria, docs or compliance finding, read a Files Summary in the notation authors use, and stop accepting a mutation proof for a test that did not go red."
tags: [finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-04
updated: 2026-11-04
estimated_effort_hours: 8
github_issue: 826
---

# Technical Task: finalise fix-and-recheck reads severity, scope and the named test

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.257.review.1.fix-and-recheck-reads-what-it-claims.md` implemented 2026-11-04

**GitHub Issue**: [#826](https://github.com/Gamaroff/agent-skills/issues/826)

> Cut from observations #61, #131 and #132. One document because all three are the same evaluator's inputs: two of them refuse healthy work, and the third accepts a false proof. Loosening the first two without tightening the third would widen a gate whose proof check is already wrong.

---

## 1. Overview

`/finalise` Step 8a lets a run fix one low finding and carry on instead of halting. Its evaluator, `finalise-fix-and-recheck.mjs`, misreads its inputs in three ways. It refuses every acceptance-criteria finding, because the agent emits no severity. It refuses most code fixes, because it compares scope with exact strings. And it accepts a mutation proof for a test that passed, if a neighbouring test failed. This task corrects all three.

**Scope**: `shared/resources/finalise-fix-and-recheck.mjs` and its preconditions file, `finalise-rerun-scope.js`, the four DoD agent prompts, `skills/finalise/SKILL.md` Step 8a, their tests, the bundled copies and `CHANGELOG.md`.

---

## 2. Motivation

### Current Problems

1. **A proof for a green test is accepted.** On develop `6e49e042`, a real node:test log with `✔ new guard refuses` directly above `✖ findRelatedDocs a` and `mutationProof.test: "new guard refuses"` exits 0 with `failed: []`. With six green tests between the two lines it exits 1. `redNamesTest` accepts a red line within 3 lines of the name.
2. **A file name proves nothing.** The record's convention is a test file path, which appears on a `test at <file>` line beside any failure in that file. On task.207 (2026-10-16) a broken revert reddened two unrelated tests and was accepted as `mutation-proved`.
3. **No acceptance-criteria finding can use the path.** The AC prompt emits no `severity`, and the evaluator reads a missing severity as not low. On task.243 a one-test gap took the full gaps halt and a QA re-entry at 5a.
4. **Scope is compared as exact strings.** `filesSummary.includes(p)` refuses `skills/finalise/references/wireframe-map.js` under the `skills/*/references/` entry authors write. On task.243 run 2 a one-line fix in a bundled script took the same halt, and any fix to a bundled `shared/resources/` script meets it.

### Benefits

1. A low finding on a healthy run costs one commit, not a halt and a QA re-entry.
2. A proof is tied to the test it names.
3. The scope check reads the notation the Files Summary uses.
4. Step 6's "one of these four sections" becomes true for all four.

---

## 3. Technical Background

### Current Architecture

Every line below was found with `grep -n` on `shared/resources/finalise-fix-and-recheck.mjs` unless stated.

- `RED_MARKER` (`:154`) is `/^\s*(not ok\b|✖|ℹ fail [1-9]|FAIL\b)/`, and `RED_WINDOW` (`:157`) is 3. `redNamesTest` (`:168`) finds any line naming the test, then any red line within the window. Its comment (above `:168`) says a green test's name "appears only on a `✔` line with no red neighbour", which is false for an adjacent failure.
- `mutation-proved` is at `:247`. `inside-files-summary` is at `:218`, and its `inScope` compares with `f.filesSummary.includes(p)` at `:237`.
- `severity-low` is at `:208`. A missing severity is refused by design ("not low"), and that stays.
- `shared/resources/glob-match.js` already exists and `finalise` already bundles it (`skills/finalise/references/glob-match.js`, used by `ci-tree-equivalence.js:68`). **Run on 2026-11-04**: `skills/*/references/**` matches a bundled copy and not `shared/resources/…`, but a trailing `/` entry and `{a,b}` do not match, and a bare `**` matches everything. So the entries need a small adaptation before matching; the matcher itself stays as it is.
- `finalise-rerun-scope.js` builds a merged AC entry from a named field list (`:520-531`), which has no `severity`, so the field would be dropped on that path. `mergeReportedGap` spreads `...agentAc` (`:645`) and would keep it. **(read, not run: Phase 2 tests both.)** Step 3c says `AC_RESULT` is the merged result, so that is what Step 8a must read.
- Prompts: `severity` appears only in `finalise-dod-security-prompt.md` (`:379`, `:423`). `finalise-dod-ac-prompt.md`, `finalise-dod-docs-prompt.md`, `finalise-dod-compliance-prompt.md` and `finalise-dod-fix-evidence-prompt.md` have none.
- Step 8a's `When this step applies` (`skills/finalise/SKILL.md`) asks for a finding "this run produced by execution — a reproduced probe, a failing check with a citation". An AC FAIL with a cited member is a failing check with a citation, so this task does not change that sentence.
- The docs-link clause (`skills/finalise/SKILL.md`, "The mutation proof is the engine itself") uses a `.md` path as `mutationProof.test`, and relies on `✖ <file>:<line> → …` naming it **on the red line**. The new rule must keep that working.
- Tests that pin the old convention: `shared/resources/tests/finalise-fix-and-recheck.test.mjs` (`test: "tests/qa-cycle.test.js"`, log at `:57`) and `shared/resources/tests/acceptance-commit-carries-5c.test.mjs` (`test: "b.js"`, `:926`).

**A second mechanism for a job the file already does.** Matching is `glob-match.js`'s job, so no new matcher is written. Brace and trailing-slash handling only rewrite an entry into the patterns that matcher reads.

### Target Architecture

**The proof.** `mutationProof.test` is the test's **title**, or for the docs-link clause the file. It proves only when one line is red **and** names it, with a boundary after the name, so a title that is a prefix of another title does not match. `ℹ fail N` no longer counts. A value shaped like a test file (`*.test.*`, `*.spec.*`) is refused by name. Other red tests in the log are returned as `otherRed` in the JSON output, which Step 8a records in the DoD: more than one red can be legitimate, and the rule is that the named test must be among them.

**The scope.** A Files Summary entry reads as a pathspec: exact, trailing `/` as a directory prefix, `*` and `**` per `glob-match.js`, `{a,b}` expanded first. An entry whose wildcards have no literal path segment (`*`, `**`, `**/*`) is not a scope and matches nothing. Expansion is bounded, so a long list of brace groups cannot blow up.

**The severity.** The AC, docs, compliance and fix-evidence agents emit `severity` on every FAIL, by one rule. The merge keeps it on every path. The evaluator is unchanged here.

### Important Clarifications

- **This widens the gate, and the other preconditions hold it.** A low grade alone licenses nothing: one commit, inside scope, mutation-proved and no other finding open all still apply. The proof check is tightened in the same task for that reason.
- **The grading rule.** `low`: one member or one check, where the code's behaviour is right or it fails closed, such as a missing test for a correct branch or one wrong doc line. `medium`: behaviour is wrong for a member. `high`: the criterion is undelivered, or it fails open. More than one failed member is not low. No severity is still not low.
- **A carried FAIL.** A re-run carrying an earlier FAIL with no severity stays not low and halts, which is the safe direction.

---

## 4. Scope

### In Scope

✅ **Evaluator**: the proof rule, `otherRed`, the pathspec read, the preconditions file's statements.
✅ **Merge**: `severity` kept on every merge path and in the AC record.
✅ **Prompts**: `severity` on every FAIL in the four agent prompts, and the grading rule.
✅ **Step 8a prose**: the record template, where severity comes from, what to do with `otherRed`, and how to run the named test.
✅ **Tests, bundles, `CHANGELOG.md`.**

### Out of Scope

❌ `/finalise` reading a severity by re-dispatch, as Step 3b.1 does for probes. The per-FAIL field is simpler, and #131 offers it first.
❌ Bug-mode changes other than the fix-evidence prompt's severity.
❌ Deciding whether a run with `otherRed` should halt. It is reported, and the proof rule is what holds.
❌ The other `finalise` observations (#59, #96, #117 and others).
❌ `qa-task`'s own rules. Step 8a is `/finalise`'s.

---

## 5. Breaking Changes

### Breaking Change 1: `mutationProof.test` names a test, not a file

**What Changed**: a test-file path is refused, and red must be on the line naming the test.

**Before**: `{ "test": "tests/x.test.js", "redOnRevert": true, "run": "…" }` proves on any failure in that file.

**After**: the same record exits 1 on `mutation-proved`, naming the rule. `{ "test": "a filename with an embedded newline is un-numbered", … }` proves when that test's `✖` line is in the log.

**Impact**: Step 8a's template and the two test files above. A run in flight across the merge refuses and takes Step 8, which is the existing safe path.

**Migration Path**: update the template in the same change. The docs-link clause keeps its `.md` path unchanged.

### Breaking Change 2: agent YAML gains `severity` on FAIL

**What Changed**: an additive field on four prompts' output.

**Impact**: readers of those YAML blocks ignore unknown keys; Phase 2 confirms the merge does not refuse it.

**Migration Path**: none.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.257.plan.fix-and-recheck-reads-what-it-claims.md](task.257.plan.fix-and-recheck-reads-what-it-claims.md)

### Phase 1: The proof rule

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-fix-and-recheck.mjs`
- `shared/resources/finalise-fix-and-recheck-preconditions.json`
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs`
- `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`

**Changes**:
- [ ] Write the red test first, from the reproduction in § 2: a green named test directly above a failing neighbour exits 1.
- [ ] Replace `redNamesTest` and remove `RED_WINDOW`: one line carries the marker and the name, with a boundary after the name.
- [ ] Refuse a test-file-shaped value by name, and drop `ℹ fail N` as a proof.
- [ ] Return `otherRed` in the JSON output, de-duplicated across node:test's failing-tests summary.
- [ ] Update the preconditions statement and the fixtures that pin the old convention.
- [ ] Confirm the docs-link clause's `✖ <file>:<line>` shape still proves.
- [ ] Update the two assertions that pin the refusal message text (`finalise-fix-and-recheck.test.mjs:437` and `:479`, `shows no failing test`), found by `git grep -n 'shows no failing test'`.

**Dependencies**: none.

---

### Phase 2: Severity from every agent

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-dod-ac-prompt.md`, `finalise-dod-docs-prompt.md`, `finalise-dod-compliance-prompt.md`, `finalise-dod-fix-evidence-prompt.md`
- `shared/resources/finalise-rerun-scope.js`
- `shared/resources/tests/finalise-rerun-scope.test.mjs`
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

**Changes**:
- [ ] Add `severity` on FAIL and the grading rule to all four prompts.
- [ ] Test the merge on each path with a low FAIL; keep `severity` where it is dropped, and carry it in the AC record.
- [ ] Extend the prompt contract test over all four prompts.

**Dependencies**: none.

---

### Phase 3: Scope in the notation authors use

**Risk Level**: Medium

**Files**:
- `shared/resources/finalise-fix-and-recheck.mjs`
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs`

**Changes**:
- [ ] Rewrite each entry through a bounded brace expansion and a trailing-`/` rule, then match with `matchesAnyGlob`.
- [ ] Treat an entry with no literal segment as matching nothing.
- [ ] Test both directions: a bundled copy admitted under `skills/*/references/`, and a path outside every pattern refused.

**Dependencies**: none.

---

### Phase 4: Step 8a prose, bundles and proof

**Risk Level**: Low

**Files**:
- `skills/finalise/SKILL.md`
- `CHANGELOG.md`
- generated copies under `skills/*/references/`

**Changes**:
- [ ] Update the record template: `test` is the title, and `node --test` takes the test's file.
- [ ] Say that severity for an AC FAIL comes from the merged result, and that `otherRed` is recorded in the DoD.
- [ ] If the staged observation-review update has been installed, remove its sentence that the evaluator does not check this.
- [ ] `npm run bundle`, `npm run bundle:check`, the `CHANGELOG.md` entry citing task 257.
- [ ] Re-run § 2's reproduction and the task.243 shapes, recording the results in the QA report.

**Dependencies**: Phases 1, 2 and 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finalise-fix-and-recheck.mjs` - the proof rule, `otherRed`, the pathspec read
2. ✅ `shared/resources/finalise-fix-and-recheck-preconditions.json` - the statements
3. ✅ `shared/resources/finalise-rerun-scope.js` - keep `severity`
4. ✅ `shared/resources/finalise-dod-ac-prompt.md` - `severity` and the rule
5. ✅ `shared/resources/finalise-dod-docs-prompt.md` - the same
6. ✅ `shared/resources/finalise-dod-compliance-prompt.md` - the same
7. ✅ `shared/resources/finalise-dod-fix-evidence-prompt.md` - the same
8. ✅ `skills/finalise/SKILL.md` - Step 8a

### Files to Modify (Tests)

9. ✅ `shared/resources/tests/finalise-fix-and-recheck.test.mjs`
10. ✅ `shared/resources/tests/finalise-rerun-scope.test.mjs`
11. ✅ `shared/resources/tests/acceptance-commit-carries-5c.test.mjs` - the record's `test` value
12. ✅ `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

### Files to Modify (Documentation)

13. ✅ `CHANGELOG.md`

### Generated (by `npm run bundle`)

14. ✅ `skills/*/references/`

The set is defined as: copies of items 1 to 7 under `skills/`. Command: `find skills \( -name 'finalise-fix-and-recheck*' -o -name finalise-rerun-scope.js -o -name 'finalise-dod-*-prompt.md' \)`. `npm run bundle:check` is what holds them, not a count.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the evaluator's two checks and the merge.

**Actions**:
- [ ] Proof: named test red proves; green beside a red neighbour refuses; a title that is a prefix of a failing title refuses; a test-file value refuses; `ℹ fail 1` alone refuses; the docs-link shape proves; TAP `not ok N - title` proves; `otherRed` lists the other failures once each.
- [ ] Scope: an exact path; `skills/*/references/`; `skills/{a,b}/SKILL.md`; `skills/create-{story,task}/SKILL.md`; a path outside each refused; `skills/*/SKILL.md` not admitting `skills/a/b/SKILL.md`; `*`, `**` and `**/*` admitting nothing; an oversized brace list refused, not hung.
- [ ] Severity: a low AC FAIL survives the merge on each path and reaches `evaluateFixAndRecheck` as low; a FAIL with no severity stays refused.
- [ ] **Control case**: a scope pattern and a test title this document never mentions, plus a real node:test run rather than a hand-written log, so a pass does not mean the example was recognised.

**Command**: `command node --test shared/resources/tests/finalise-fix-and-recheck.test.mjs shared/resources/tests/finalise-rerun-scope.test.mjs`

**Target**: all existing tests, as updated, plus the new ones pass.

### Integration Tests

- [ ] One evaluator run end to end on a generated record: low AC FAIL, bundled-path fix, real red log, exit 0; change any one input and it exits 1 on that precondition.

### Mutation

- [ ] Restore the 3-line window: the green-beside-red test goes red. Restore.
- [ ] Remove the boundary after the name: the prefix-title test goes red. Restore.
- [ ] Remove the test-file refusal: its test goes red. Restore.
- [ ] Remove the no-literal-segment rule: the `**` test goes red. Restore.
- [ ] Restore exact `includes`: the bundled-copy test goes red. Restore.
- [ ] Drop `severity` from the merge: the merge test goes red. Restore.

### Consumer Tests

**Command**: `npm run bundle:check` and `npm test`.

---

## 9. Success Criteria

### Functional

- [ ] A green named test beside a failing neighbour exits 1 on `mutation-proved` (Phase 1 states the branch).
- [ ] A test-file-shaped `mutationProof.test` exits 1, naming the rule (Phase 1).
- [ ] A test whose own red line is in the log proves, and other failures appear in `otherRed`.
- [ ] The docs-link clause's `.md` proof still exits 0.
- [ ] A path under `skills/*/references/` or a `{a,b}` entry is inside scope, and a path outside every pattern exits 1 (Phase 3 states the branch).
- [ ] `*`, `**` and `**/*` admit nothing.
- [ ] A low AC, docs or compliance FAIL reaches the evaluator as `low`, on every merge path (Phase 2).
- [ ] A FAIL with no severity is still refused.

### Performance

- [ ] An oversized brace list is refused within the test's default timeout, not expanded without bound.
- [ ] Matching stays linear per entry, by reusing `glob-match.js` (no new matcher, asserted by the mutation above reverting to `includes`).

### Code Quality

- [ ] No second glob matcher is added.
- [ ] `npm test`, `CI=true npm test` and `npm run bundle:check` pass.
- [ ] `npm run validate -- skills/finalise/` passes.
- [ ] Every mutation in § 8 turns a test red, recorded in the QA report.

### Migration

- [ ] Step 8a's template and the preconditions file state the new `test` rule.
- [ ] `CHANGELOG.md` records the changed proof rule and the scope notation, citing task 257.

---

## 10. Risk Assessment

### High Risk Areas

**1. Widening a gate that authorises pushing code without a human.**
- **Risk**: an AC finding graded low too easily takes the bounded path when it should have halted.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the grading rule names what is not low; the fix still needs one commit, inside scope, a red on revert and no other open finding; the proof check tightens in the same change.
- **Rollback**: revert Phase 2's prompt change. Every FAIL returns to "not low".

### Medium Risk Areas

**1. A log shape the same-line rule does not read.**
- **Risk**: a real proof from a suite printing its failures differently is refused.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: refusal takes Step 8, the existing halt. Tests cover node:test spec and TAP output.
- **Rollback**: forward fix in the marker.

**2. A scope pattern admits too much.**
- **Risk**: `docs/` in a Files Summary admits every doc.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the entry is the author's own scope, reviewed at `review-task`; the no-literal-segment rule refuses the empty case.
- **Rollback**: forward fix.

### Low Risk Areas

**1. Bundle drift.** Mitigation: `npm run bundle` then `bundle:check` in Phase 4.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A proof for a green test is accepted after the merge.
- A path outside the Files Summary is admitted.

**Steps**:
1. Revert the merge commit.
2. `npm run bundle` to restore the copies.
3. Re-run `npm test`.

**Verification**: `npm test` and `npm run bundle:check` pass.

---

### Partial Rollback (1-2 hours)

**When to Use**: agents over-grade `low`, and the evaluator changes are sound.

**Steps**:
1. Revert the prompt change from Phase 2 only.
2. Re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: a log shape or a scope notation the rule does not read.

**Approach**: add the shape with a test. A refusal is safe in the meantime, because it takes Step 8.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- `mutation-proved` passes on a test that did not go red.

**Non-Critical (Forward Fix)**:
- A healthy fix is refused and halts.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-04
**Quality Score**: 70/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.257.qa.1.fix-and-recheck-reads-what-it-claims.md](./task.257.qa.1.fix-and-recheck-reads-what-it-claims.md)
- **Gate File**: [task.257.gate.1.fix-and-recheck-reads-what-it-claims.yml](./task.257.gate.1.fix-and-recheck-reads-what-it-claims.yml)

### Test Coverage Summary
- **Tests Executed**: 178
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Two reproduced medium bugs in the new readers (path-guard normalisation bypass, TODO/SKIP read as red) and an unprobeable scope predicate.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                           | Author      |
| ---------- | ------- | ----------------------------------------------------- | ----------- |
| 2026-11-04 | 1.0     | Initial draft — cut from observations #61, #131, #132 | create-task |
| 2026-11-04 | 1.1     | Review passed (8/10) — added the pinned-message assertions to Phase 1 | review-task |
| 2026-11-04 |         | Status → ready-for-development                        | review-task |
| 2026-11-04 |         | QA gate CONCERNS (70/100) — 3 findings                | qa-task     |
| 2026-11-04 |         | QA findings fixed — 3 of 3, 1 iteration               | qa-fix      |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The proof rule
- [ ] Red test from the reproduction
- [ ] Same-line rule, test-file refusal, `otherRed`
- [ ] Fixtures and statements updated

### Phase 2: Severity from every agent
- [ ] Four prompts
- [ ] Merge keeps it on every path

### Phase 3: Scope in the notation authors use
- [ ] Pathspec read through `glob-match.js`
- [ ] Both directions tested

### Phase 4: Step 8a prose, bundles and proof
- [ ] Prose and CHANGELOG
- [ ] Bundle and bundle:check
- [ ] Reproductions recorded in the QA report

---

## References

- Observation #61 — Fix-and-recheck accepts a mutation proof whose red came from a broken revert, not the named test
- Observation #131 — finalise Step 8a is unreachable for an acceptance-criteria FAIL: the AC agent emits no severity
- Observation #132 — finalise Step 8a's inside-files-summary refuses bundled copies a Files Summary lists as a glob
- **Earlier tasks**: task.128 (the evaluator), task.139 and task.152 (the docs-link clause), task.242 (the merge)
- **Rules**: `shared/resources/mutation-proving.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only; `npm run bundle` regenerates the copies.
- Mutation-prove every fix.
- Use `command node`.

### Future Improvements

- Have `review-task` warn when a Files Summary entry names a pattern with no literal segment.

---

**Status:** Ready for Review

**Next Steps**:
1. Implement according to the plan with `/develop-task`.
2. Mark checkboxes as completed.
3. QA will create the QA report, gate and any bug files in this directory.
