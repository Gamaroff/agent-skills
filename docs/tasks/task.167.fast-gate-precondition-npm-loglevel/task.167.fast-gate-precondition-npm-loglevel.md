---
id: task.167
title: "[Task 167] Fast-gate precondition: no false HALT under npm loglevel=silent"
type: task
description: "The develop loop's fast-gate precondition reads `npm run`'s script listing, which `loglevel=silent` suppresses, so a consumer whose `.npmrc` sets it, or any run under `npm run -s`, is halted with 'does not define' for a script it does define. Pass `--loglevel=notice` to that one `npm run` and add silent-environment cases to the precondition's test."
tags: [develop-task, develop-story, develop-bug, testing, observation]
category: testing
status: ready-for-review
priority: Medium
created: 2026-09-29
updated: 2026-10-03
assignee:
estimated_effort_hours: 2
github_issue: 514
---

# Technical Task: Fast-gate precondition — no false HALT under npm loglevel=silent

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.167.review.1.fast-gate-precondition-npm-loglevel.md` implemented 2026-10-03

**GitHub Issue**: [#514](https://github.com/Gamaroff/agent-skills/issues/514)

---

## 1. Overview

The develop loop's fast-gate precondition decides whether `develop.fastGateCommand` names a script
the project defines, by reading the listing `npm run` prints with no arguments. npm treats that
listing as log output, so `loglevel=silent` suppresses it. The check then finds no scripts and
HALTs a correct project. This task makes the listing immune to the ambient log level with one flag,
and adds test cases that run the precondition under a silent environment and a silent `.npmrc`.

**Key deliverables:** the flag in the shared step doc (and its three bundled copies), and three new
test cases per shell in `fast-gate-precondition.test.mjs`.

---

## 2. Motivation

### Current Problems

- **A false HALT in consumer projects.** A consumer whose `.npmrc` sets `loglevel=silent` is halted
  before the first develop iteration with "develop.fastGateCommand runs 'ci:fast', which this project
  does not define", for a script it defines. Measured on 2026-09-29 against a fixture with that
  `.npmrc`: `npm run 2>/dev/null | grep -cE '^[[:space:]]+ci:fast$'` → `0`.
- **The same under `npm run -s`.** `-s` exports `npm_config_loglevel=silent` to every child, so a
  pipeline or test started through `npm run -s` sees the same false HALT. Observation #213 found it
  this way: `npm run -s test:clean-checkout` went red on 5 cases of
  `evals/shared/tests/fast-gate-precondition.test.mjs` that pass 12/12 without the flag.
- **The test inherits the ambient environment.** `runCheck` spawns with no `env`, so its verdicts
  depend on the caller's npm settings. Nothing in the suite runs the precondition under a silent
  log level, so the defect passed every CI run.

### Benefits of the Fix

- The precondition gives the same verdict whatever npm's log level is.
- The suite pins that property on the two routes a silent level arrives by: an inherited env var and
  a project `.npmrc`.
- A red `fast-gate-precondition` run is no longer a side effect of how the suite was started.

---

## 3. Technical Background

### Current Architecture

The precondition block sits under `### Precondition — the gate must resolve before the first
iteration` in `shared/resources/develop-pipeline-step-3-develop-loop.md:192`. Its test is:

```bash
if [ -n "$GATE_SCRIPT" ] && ! npm run 2>/dev/null | grep -qE "^[[:space:]]+${GATE_SCRIPT}$"; then
```

(`shared/resources/develop-pipeline-step-3-develop-loop.md:207`). The bundled copies carry the same
line at `skills/develop-task/references/develop-pipeline-step-3-develop-loop.md:208`,
`skills/develop-story/references/develop-pipeline-step-3-develop-loop.md:208` and
`skills/develop-bug/references/develop-pipeline-step-3-develop-loop.md:208`.
`docs/tasks/task.101.fast-gate-command-existence-check/task.101.fast-gate-command-existence-check.md:100`
quotes it as history and is not changed.

`evals/shared/tests/fast-gate-precondition.test.mjs` extracts that block (`bashBlockUnder`, anchored
on `HEADING`), substitutes `<fastGateCommand>` and runs it through `runCheck`. `runCheck` calls
`spawnSync(shell, ["-c", script], { cwd: dir, encoding, timeout })` with no `env`, so the child
inherits `process.env`. The per-shell cases start at `for (const shell of SHELLS)`
(`fast-gate-precondition.test.mjs:230`).

Measured on 2026-09-29 (npm 11.17.0):

| Environment | `npm run` listing matches `ci:fast` | with `--loglevel=notice` |
| --- | --- | --- |
| default | 1 | 1 |
| `npm_config_loglevel=silent` | **0** | 1 |
| project `.npmrc` with `loglevel=silent` | **0** | 1 |

A command-line `--loglevel` overrides both the environment variable and `.npmrc`.

### Target Architecture

```bash
if [ -n "$GATE_SCRIPT" ] && ! npm run --loglevel=notice 2>/dev/null | grep -qE "^[[:space:]]+${GATE_SCRIPT}$"; then
```

This is the only change to the shipped block. The comment above it gets one sentence on why the
flag is there.

### Important Clarifications

- `npm pkg get scripts.<name>` was considered. It returns data rather than log output, but it prints
  `{}` for a missing key and needs JSON handling in both shells, which is a larger change than the
  defect.
- No other shipped block parses `npm run`'s listing:
  `grep -rnE 'npm run( 2>[^ ]+)? *\|' shared skills scripts` (excluding `references/`) returns only
  `shared/resources/develop-pipeline-step-3-develop-loop.md:207`.

---

## 4. Scope

### In Scope

✅ The `--loglevel=notice` flag in the shared step doc, then `npm run bundle` to regenerate the three copies
✅ Three test cases per shell: a defined script under `npm_config_loglevel=silent` does not HALT; a missing script under the same env still HALTs; a defined script with a silent `.npmrc` does not HALT
✅ A `CHANGELOG.md` `[Unreleased]` Fixed entry

### Out of Scope

❌ Replacing the listing parse with `npm pkg get` (see Clarifications)
❌ Other package managers (`pnpm`, `yarn`). The precondition only reasons about `npm run`, by design.
❌ Isolating the rest of the suite from the ambient environment. The new cases prove the property directly.

---

## 5. Breaking Changes

None. The precondition's verdict changes only where it was wrong: a project that defines the script
and runs under a silent log level.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.167.plan.fast-gate-precondition-npm-loglevel.md](task.167.plan.fast-gate-precondition-npm-loglevel.md)

### Phase 1: Tests first (red)

**Risk**: Low
**Files**: `evals/shared/tests/fast-gate-precondition.test.mjs`

- [x] `runCheck` accepts optional `env` (merged over `process.env`) and `npmrc` (written into the fixture)
- [x] Add the three per-shell cases from § 4
- [x] Run the file and confirm the two "does not HALT" silent cases fail on the current snippet

### Phase 2: The flag (green)

**Risk**: Low
**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`, then `npm run bundle`

- [x] Add `--loglevel=notice` to the `npm run` in the precondition block, plus one comment sentence
- [x] `npm run bundle`; confirm the three `references/` copies changed and `bundle:check` reports 0 problems
- [x] Re-run the test file: all cases green
- [x] Mutation: remove the flag, observe the new cases go red, and quote the red output

### Phase 3: Record

**Risk**: Low
**Files**: `CHANGELOG.md`

- [x] `[Unreleased]` › Fixed entry citing (task 167) and obs #213

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. `shared/resources/develop-pipeline-step-3-develop-loop.md`: the flag and one comment sentence

### Files Regenerated

2. `skills/develop-task/references/develop-pipeline-step-3-develop-loop.md`
3. `skills/develop-story/references/develop-pipeline-step-3-develop-loop.md`
4. `skills/develop-bug/references/develop-pipeline-step-3-develop-loop.md`

All three are regenerated by `npm run bundle`, never hand-edited.

### Files to Modify (Tests)

5. `evals/shared/tests/fast-gate-precondition.test.mjs`: `runCheck` options and three per-shell cases
6. `tests/executable-instructions.test.js`: its `npm run` extractor skips npm flags (`npmRunScript`), so `npm run --loglevel=notice` is not read as a script named `--loglevel`. Found by the fast gate in Step 3, not planned

### Files to Modify (Documentation)

7. `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the extracted precondition block, run in `bash` (and in `zsh` where present) against fixture projects.
- **Command**: `command node --test evals/shared/tests/fast-gate-precondition.test.mjs`
- **New cases**: silent env with the script defined → exit 0; silent env with the script missing → exit 1 naming `develop.fastGateCommand`; silent `.npmrc` with the script defined → exit 0.
- **Premise**: the two exit-0 cases fail on the unmodified snippet (Phase 1). This proves the cases can see the defect.

### Mutation proof

| Revert | Test that must go red |
| --- | --- |
| Remove `--loglevel=notice` | both silent "does not HALT" cases, in every shell |

### Integration Tests

- `npm run -s test` no longer fails in `fast-gate-precondition.test.mjs`, the route that found obs #213.

### Performance Tests

Not applicable. The new cases add 3 spawns per shell to a file whose spawns run under the shared `spawnBudget`.

### Consumer Tests

Not applicable. A consumer's behaviour changes only where the old check halted a correct project.

---

## 9. Success Criteria

### Functional

- [x] With `npm_config_loglevel=silent`, a project defining the gate script is not halted (bash; zsh where present)
- [x] With `npm_config_loglevel=silent`, a project missing it is still halted, and the message names `develop.fastGateCommand`
- [x] With a project `.npmrc` setting `loglevel=silent`, a project defining the script is not halted
- [x] The existing cases in `fast-gate-precondition.test.mjs` still pass

### Performance

- [x] `fast-gate-precondition.test.mjs` stays inside its `spawnBudget` with no new timeout literal (`tests/test-harness-concurrency.test.js` guards this)

### Code Quality

- [x] The removed-flag mutation is observed red, and the red output is quoted in the implementation report
- [x] `npm run ci:fast`, `bundle:check` (0 problems), `lint:shell` and `validate:all` are clean

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` cites (task 167)

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **npm version variance**
   - **Risk**: an npm version that rejects `--loglevel=notice` would turn every run into a HALT.
   - **Probability**: Low. `--loglevel` is a documented npm CLI config and `notice` is its default level (verified on npm 11.17.0; the CI npm is whatever Node 22 ships).
   - **Impact**: High for consumers. Every develop run would halt at the precondition.
   - **Mitigation**: CI's Node 22 npm and the local npm 11.17.0 both run the suite. The existing "a defined script does not HALT" case fails on any npm that rejects the flag.

### Low Risk Areas

1. **Fixture `.npmrc` leaking**: the `.npmrc` is written inside the per-case `mkdtemp` fixture and removed with it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the precondition HALTs a project that defines the gate script, in CI or for a consumer.

**Steps**:
1. Revert the commit.
2. `npm run bundle` and `npm run bundle:check`.

**Validation**: `command node --test evals/shared/tests/fast-gate-precondition.test.mjs` passes as before.

---

### Partial Rollback (1-2 hours)

**When to Use**: the new test cases are flaky under load while the flag is sound.

**Steps**:
1. Keep the flag; drop the flaky case.
2. Confirm the remaining cases are green.

---

### Forward Fix (< 4 hours)

**When to Use**: an npm version prints the listing at a level other than `notice`.

**Approach**: switch the listing read to `npm pkg get "scripts.${GATE_SCRIPT}"` and test for `{}`.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A false HALT on a project that defines its gate script

**Non-Critical (Forward Fix)**:
- A flaky new case under load

---

## Implementation Summary

**Completed**: 2026-10-03 (`/develop-task` run 1, Step 3 implemented inline from the plan file).

### Approach

- **Phase 1, tests first.** `runCheck` takes optional `env` (merged over `process.env`, so `PATH`
  survives) and `npmrc` (written beside the fixture's `package.json`). Three cases per shell were
  added. Before the flag, the two "defined script" cases were red in both shells, 4 of 18 in all,
  and the "missing script still HALTs" case was already green, as expected.
- **Phase 2, the flag.** `npm run --loglevel=notice` in the precondition block, plus one comment
  sentence. `npm run bundle` regenerated the three `references/` copies and `bundle:check` reports 0
  problems. The test header's spawn count now states how it is derived (12 per shell plus 2).
- **Phase 3.** A CHANGELOG `[Unreleased]` › Fixed entry.
- **Unplanned, found by the fast gate.** `tests/executable-instructions.test.js` checks that every
  `npm run X` in prose names a script someone provides. Its regex read the new `--loglevel` (and the
  comment's `-s`) as script names, which put 8 hits in 4 files. This is the same false claim its
  `isFdRedirect` already excludes for `2>/dev/null`, so the instrument was fixed and the prose left
  alone. A new `npmRunScript` reads past leading tokens that begin with `-` and checks the first
  script after them. A script name may no longer start with `-`. A unit test pins both directions
  (a flag is skipped, and a script after a flag is still checked). Mutation: with flag-skipping
  removed, that unit test goes red.

### Testing Results

- `command node --test evals/shared/tests/fast-gate-precondition.test.mjs`: 18/18 on macOS (bash and
  zsh).
- The obs #213 route: `npm_config_loglevel=silent command node --test …fast-gate-precondition.test.mjs`
  gives 18/18.
- **Mutation proof.** With `--loglevel=notice` removed, these 4 go red and 14 pass:
  `✖ [bash] under npm_config_loglevel=silent a defined script does not HALT`,
  `✖ [bash] a project .npmrc with loglevel=silent does not HALT a defined script`, and the same two
  for `[zsh]`. Restored, 0 fail.
- `npm run lint:shell` is clean, `npm run validate:all` passes 129, `tests/test-harness-concurrency.test.js`
  passes 16/16 (no timeout literal), and `npm run bundle:check` reports 0 problems. `npm run ci:fast`:
  5201 pass and 0 fail of 5202, on the second run. The first run caught the extractor false positive
  described under Approach.

### Deferred Work

None. The post-merge action in Notes (observation #213 → `actioned`) is not deferred work.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-03
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.167.qa.1.fast-gate-precondition-npm-loglevel.md](./task.167.qa.1.fast-gate-precondition-npm-loglevel.md)
- **Gate File**: [task.167.gate.1.fast-gate-precondition-npm-loglevel.yml](./task.167.gate.1.fast-gate-precondition-npm-loglevel.yml)

### Test Coverage Summary

- **Tests Executed**: 23 targeted (18 precondition + 5 extractor), and 5201 in `ci:fast`
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. Two low-severity, advisory test-robustness points (CR-1, CR-2) are recorded as future work in the gate.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-09-29 | 1.0     | Initial draft — cut from observation #213 | create-task |
| 2026-10-03 | 1.1     | Review passed (9/10) — post-merge obs #213 criterion moved to Notes | review-task |
| 2026-10-03 |         | Status → ready-for-development | review-task |
| 2026-10-03 |         | Implemented — 7 files, 7 tests (3 per shell + 1 extractor) | develop |
| 2026-10-03 |         | QA gate PASS (100/100) — 0 blocking, 2 advisory findings | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first (red)
- [x] `runCheck` env / npmrc options
- [x] Three per-shell cases
- [x] Premise: silent "does not HALT" cases red on the current snippet

### Phase 2: The flag (green)
- [x] Flag and comment
- [x] Bundle regenerated; `bundle:check` clean
- [x] Suite green; mutation proved

### Phase 3: Record
- [x] CHANGELOG entry

---

## References

- Observation #213 — fast-gate-precondition test fails under inherited npm_config_loglevel=silent (npm run -s)
- [task.101](../task.101.fast-gate-command-existence-check/task.101.fast-gate-command-existence-check.md), which introduced the precondition

---

## Notes

- **Post-merge action (not a success criterion; finalise runs before merge):** set observation #213 to `actioned` once the PR merges.
- QA report: `task.167.qa.{N}.fast-gate-precondition-npm-loglevel.md`
- Bug reports: `task.167.bug.{N}.{name}.md`
- Quality gate: `task.167.gate.{N}.fast-gate-precondition-npm-loglevel.yml`, all co-located in this directory
