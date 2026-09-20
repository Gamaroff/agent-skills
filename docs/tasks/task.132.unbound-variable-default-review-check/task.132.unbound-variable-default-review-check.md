---
id: task.132
title: "[Task 132] A default in executed prose is a claim that some writer binds the variable, and five text reviews read one that nothing bound: the code reviewer asks who binds every ${VAR:-default} and ${VAR:?} a diff adds, and a repo test walks the binding population"
type: task
description: "On task.124 the working-tree probe read origin/${BASE_BRANCH:-develop} for five QA cycles while no pipeline bound BASE_BRANCH; the default was correct on every run reviewed, so the unbound read was invisible until a reviewer grepped for a writer (obs #133). Add a mandatory check to code-review-prompt.md — name the writer for every parameter-expansion default or :? the diff adds, on every path that reaches it — and a test over the pipeline's executed prose that every such read has a binding in the same bundle set or an allow-listed reason."
tags: [code-review, executed-prose, shell, enumeration]
category: testing
status: planned
priority: Medium
created: 2026-09-20
updated: 2026-09-20
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 439
---

# Technical Task: The reviewer asks who binds every `${VAR:-default}` and `${VAR:?}` in executed prose

**Status:** Planned
**GitHub Issue**: [#439](https://github.com/Gamaroff/agent-skills/issues/439)

---

## 1. Overview

A `${NAME:-default}` in a fenced block that an agent executes is two claims: that some earlier block binds `NAME` on every path that reaches this one, and that `default` is right when none does. A `${NAME:?}` is the first claim with the second replaced by a guaranteed failure. Neither claim is checked by reading the block: a green run on the default is evidence about the default. On task.124 the probe's `${BASE_BRANCH:-develop}` survived four narrowed text reviews and was found on the fifth only because that reviewer asked "who binds this?" and grepped for a writer; `develop-pipeline-step-8-commit.md` carries the `:?` spelling of the same unbound name, flagged by a pipeline audit on 2026-08-20 and still unbound. This task makes the question mechanical.

**Scope**: `shared/resources/code-review-prompt.md` (a mandatory check, shared by `review-code`, `qa-task`, `qa-story`, `review-pr`); a new test `shared/resources/tests/executed-prose-bindings.test.mjs` over `shared/resources/develop-pipeline-*.md`, `*-contract.md` and `skills/*/SKILL.md`; the two existing unbound reads fixed (`BASE_BRANCH` in step-8 — bind it from the same source task.130 gives the probe; any others the test finds).

**Key deliverables**: (1) the reviewer check with its own output shape (`finding` names the variable, the read site, and the writer or its absence); (2) the repo test with a derived population, an allow-list with reasons and a non-vacuity floor; (3) the existing unbound reads bound or allow-listed with a reason.

**Expected outcome**: a diff that adds a defaulted read with no writer is a `category: bug` finding at review, and a merged one is red in CI.

---

## 2. Motivation

### Current Problems

- **Text review cannot see an unbound variable.** The read looks complete; the default makes every run on the common path pass; the wrong path is exactly the one the reviewing host never runs (obs #133).
- **The two spellings fail in opposite directions and both are unguarded.** `:-default` silently substitutes a constant; `:?` fails loudly on the untested path. Step-8's `verify-push-state.sh --base "${BASE_BRANCH:?}"` (`develop-pipeline-step-8-commit.md`) has been unbound since the 2026-08-20 pipeline audit named it (A-1) — it works only because the agent binds the name from context, which is the discipline this repository keeps finding does not hold.
- **The population is not small.** A grep over the pipeline's executed prose finds ~40 defaulted or required reads across 12 names (`DOC_BRANCH` ×11, `PIN_BRANCH` ×5, `TRACKER` ×4, `QA_CYCLE` ×4, `PR` ×3, `BASE_BRANCH` ×3, …). Nothing states which block binds each, and the fenced-block-per-shell rule (TASK-121-BUG-2) means a binding in one block does not reach the next.
- **`code-review-prompt.md` has a platform-variance check but no binding check** — the same "evidence about this machine only" argument, one level up.

### Benefits

- The question that found CR-2 on task.124 is asked on every diff, by the shared reviewer, without depending on which reviewer happens to think of it.
- A derived-population test turns "we bind these" into a measured fact with a command, per the obs #117 rule.
- The step-8 `:?` and any other silent read get a writer or a stated reason.

---

## 3. Technical Background

### Current Architecture

**Components**:

- `shared/resources/code-review-prompt.md` — the single reviewer prompt (dispatched verbatim by `review-code`, `qa-task` Step 3b, `qa-story` Phase 1.6, `review-pr` lens A). Sections A–D of "What to look for"; a mandatory PLATFORM VARIANCE check in A; Discipline; the `code_review:` YAML contract.
- Executed prose: `shared/resources/develop-pipeline-step-{0..8}-*.md`, `develop-pipeline-resume-contract.md`, `develop-pipeline-step-5-6-qa-loop.md`, the orchestrator `SKILL.md` files — fenced ```bash blocks the orchestrator runs, each block its own shell (TASK-121-BUG-2: values do not carry across blocks; helpers like `qa-cycle.sh` are re-called per block for that reason).
- Existing population-style tests: `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (dispatch sites, derived), `tests/mutation-call-site-coverage.test.js` (bare `gh issue comment`, allow-list + floor), `tests/fenced-bash-positional-params.test.js` (a `$1` in a fenced block).
- `qa-execute-snippets.mjs` — executes blocks from disk; classifies `{placeholder}` blocks; does not reason about `${VAR}` bindings.

### Target Architecture

**Components**:

- `code-review-prompt.md` § A gains **UNBOUND DEFAULT** (mandatory, like PLATFORM VARIANCE): for every `${NAME:-…}`, `${NAME:=…}` or `${NAME:?…}` the diff adds inside a fenced block or a script, name the writer — the assignment, `read`, `for`, or documented caller binding that sets `NAME` before this block on **every** path that reaches it (a resume path included) — and report `category: bug` when none exists: "`:-` with no writer is a constant wearing a variable's name; `:?` with no writer is a guaranteed failure on the path nobody tested". Confidence `high` when the grep for `NAME=` across the bundle set is empty.
- `shared/resources/tests/executed-prose-bindings.test.mjs`: derive every `${NAME:[-=?]}` read from the population (`shared/resources/develop-pipeline-*.md`, `*-contract.md`, `skills/*/SKILL.md`, `shared/resources/*.sh` invoked from them); for each name, require an assignment `NAME=`/`read … NAME`/`for NAME` in the same file's earlier blocks, in a file the bundle set reaches, or in an **allow-list entry with a reason** (e.g. `FINALISE_CI_MAX_WAIT` — operator environment; `IMPLEMENTATION_REPORT` — set from the lock by the orchestrator, `:?` is the contract). Floor: ≥ 10 names measured; the test records the count.
- Fixes for what the test finds on `develop`: `BASE_BRANCH` in step-8 bound from the report's Pipeline Configuration row / `gh pr view` (the same derivation task.130 gives the probe; share the snippet by citation, not copy); others as found.

### Important Clarifications

- **This is a reviewer check and a test, not a shell linter.** shellcheck's SC2154 ("referenced but not assigned") does not fire on `${X:-y}` and cannot see across fenced blocks; the test reasons about the block-per-shell model the prose documents.
- **Allow-list entries need a reason and a test that the reason still holds** where one can be written (e.g. the operator-environment names are read from `read-config.sh`'s guarded keys or documented in `develop-pipeline-autonomous-defaults.md`).
- Task.129's call-site collector is a different population (engine invocations, not variable reads); task.130 binds `BASE_BRANCH` in the probe — this task binds it in step-8 and adds the guard.

---

## 4. Scope

### In Scope

✅ `code-review-prompt.md` UNBOUND DEFAULT check with the finding shape; bundle regenerated (four consumers).
✅ `executed-prose-bindings.test.mjs` — derived population, allow-list with reasons, floor, count recorded.
✅ Bind or allow-list every read the test finds on `develop` (at least `BASE_BRANCH` in step-8).
✅ `docs/reference/anti-patterns.md` entry: "a default in executed prose is a claim about a writer".
✅ CHANGELOG.

### Out of Scope

❌ A general shell static analyser; `qa-execute-snippets.mjs` changes.
❌ Variables inside `shared/resources/*.sh` scripts themselves (shellcheck + `set -u` cover those).
❌ Task.130's probe binding (it lands there; this task cites it).

---

## 5. Breaking Changes

None — a reviewer check and a test; the step-8 binding replaces a `:?` that already failed when unbound.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.132.plan.unbound-variable-default-review-check.md](task.132.plan.unbound-variable-default-review-check.md)

### Phase 1: the reviewer check

**Risk Level**: Low

**Files**: `shared/resources/code-review-prompt.md`; `skills/{review-code,qa-task,qa-story,review-pr}/references/code-review-prompt.md` (bundle).

**Changes**:
- [ ] Add UNBOUND DEFAULT under § A with the two-direction rule and the writer-naming requirement
- [ ] Finding shape example in the contract comments
- [ ] `npm run bundle`

**Dependencies**: none

### Phase 2: the population test

**Risk Level**: Medium

**Files**: `shared/resources/tests/executed-prose-bindings.test.mjs`; `package.json` if the glob does not cover it.

**Changes**:
- [ ] Derive reads and writers per the block-per-shell model; allow-list with reasons; floor; count in the assertion message
- [ ] Mutation-prove: add `${NOPE:-x}` to a fenced block in a fixture copy → red naming the file and variable
- [ ] Run on `develop`; record what it finds

**Dependencies**: none

### Phase 3: bind what the test finds

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-8-commit.md` (+ others the test names); `docs/reference/anti-patterns.md`; `CHANGELOG.md`.

**Changes**:
- [ ] `BASE_BRANCH` in step-8: bind from the report row / `gh pr view` by citing task.130's derivation (or inline the same three lines if 130 has not landed, with a note)
- [ ] Each remaining name: writer added, or allow-list entry with reason
- [ ] Anti-patterns entry; CHANGELOG

**Dependencies**: Phase 2

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/code-review-prompt.md` — the check
2. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — `BASE_BRANCH` writer
3. ✅ any file the test names — writer or allow-list

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/executed-prose-bindings.test.mjs` — new
5. ✅ `package.json` — glob registration if needed (`npm test` lists per-skill globs by hand)

### Files to Modify (Documentation)

6. ✅ `docs/reference/anti-patterns.md`; `CHANGELOG.md`; `skills/*/references/code-review-prompt.md` (bundle)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the population test itself.

**Actions**: fixture directory with a bound read, an unbound `:-`, an unbound `:?`, an allow-listed name, and a cross-block binding (bound in block 1, read in block 2 — must be reported unless the prose re-binds); assert each verdict.

**Command**: `npm test`; **Target**: mutant red; floor non-vacuous.

### Integration Tests

**Scope**: run the test over the real tree on `develop`; every finding either fixed in Phase 3 or allow-listed with a reason.

### Contract Tests

`bundle:check`; a parity test that the four consumers' bundled prompts carry the new section (the bundle test covers this).

### Performance Tests

Not applicable.

### Consumer Tests

Dispatch the updated reviewer over the task.124 branch diff (`git diff 7d5d4e6b...62945d68 -- shared/resources/develop-pipeline-resume-contract.md`) at the cycle-1 commit: it must report `${BASE_BRANCH:-develop}` — the finding five cycles missed.

---

## 9. Success Criteria

### Functional

- [ ] The reviewer, given task.124's cycle-1 contract diff, reports the unbound `BASE_BRANCH` read as `category: bug`
- [ ] The population test is red on a fixture with an unbound default and green on `develop` after Phase 3
- [ ] Every allow-list entry carries a reason

### Performance

- [ ] Test runs under 2 s

### Code Quality

- [ ] Derived population (no hand list of files or names); floor ≥ 10 names; mutant recorded

### Migration

- [ ] CHANGELOG; anti-patterns entry; obs #133 cited

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. False positives from the block-per-shell model** — a name legitimately bound by the caller (Skill args, lock fields) reads as unbound.
- Mitigation: the allow-list with reasons is the designed outlet; each reason names where the binding comes from; the test records the count so growth is visible.

### Low Risk Areas

**1. Reviewer noise** — the check is scoped to reads the diff *adds*, with `confidence: low` when a writer exists in a different bundle set.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the test is red on `develop` for reads that are correctly bound and cannot be allow-listed honestly.

**Steps**: revert the merge; `npm run bundle`.

**Verification**: `npm test` green.

### Partial Rollback (1-2 hours)

**When to Use**: keep the reviewer check, drop the test.

### Forward Fix (< 4 hours)

**When to Use**: an allow-list reason or a regex edge.

### Rollback Triggers

**Critical**: CI red on `develop` with no honest allow-list entry. **Non-Critical**: wording.

---

## Change Log
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — from obs #133 (task.124 QA cycle 5 CR-2) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: reviewer check
- [ ] Phase 2: population test
- [ ] Phase 3: bind what the test finds
- [ ] QA: `task.132.qa.[N].unbound-variable-default-review-check.md`
- [ ] Gate: `task.132.gate.[N].unbound-variable-default-review-check.yml`

## References

- Observation #133; task.124 QA cycle 5 CR-2 (`task.124.qa.5.*.md`), bug 14
- `docs/reference/develop-story-pipeline-audit.2026-08-20.md` A-1 (step-8 `${BASE_BRANCH:?}`)
- `shared/resources/code-review-prompt.md`; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (derived-population shape)

## Notes

- QA artifacts land beside this file: `task.132.qa.[N].*.md`, `task.132.bug.[N].*.md`, `task.132.gate.[N].*.yml`.
- Independent of tasks 130 and 131; cites 130's `BASE_BRANCH` derivation rather than duplicating it.
