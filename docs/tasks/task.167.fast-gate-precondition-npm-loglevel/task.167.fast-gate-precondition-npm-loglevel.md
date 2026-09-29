---
id: task.167
title: "[Task 167] Fast-gate precondition: no false HALT under npm loglevel=silent"
type: task
description: "The develop loop's fast-gate precondition reads `npm run`'s script listing, which `loglevel=silent` suppresses, so a consumer whose `.npmrc` sets it, or any run under `npm run -s`, is halted with 'does not define' for a script it does define. Pass `--loglevel=notice` to that one `npm run` and add silent-environment cases to the precondition's test."
tags: [develop-task, develop-story, develop-bug, testing, observation]
category: testing
status: planned
priority: Medium
created: 2026-09-29
updated: 2026-09-29
assignee:
estimated_effort_hours: 2
github_issue: 514
---

# Technical Task: Fast-gate precondition — no false HALT under npm loglevel=silent

**Status:** Planned

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

- [ ] `runCheck` accepts optional `env` (merged over `process.env`) and `npmrc` (written into the fixture)
- [ ] Add the three per-shell cases from § 4
- [ ] Run the file and confirm the two "does not HALT" silent cases fail on the current snippet

### Phase 2: The flag (green)

**Risk**: Low
**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`, then `npm run bundle`

- [ ] Add `--loglevel=notice` to the `npm run` in the precondition block, plus one comment sentence
- [ ] `npm run bundle`; confirm the three `references/` copies changed and `bundle:check` reports 0 problems
- [ ] Re-run the test file: all cases green
- [ ] Mutation: remove the flag, observe the new cases go red, and quote the red output

### Phase 3: Record

**Risk**: Low
**Files**: `CHANGELOG.md`

- [ ] `[Unreleased]` › Fixed entry citing (task 167) and obs #213

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

### Files to Modify (Documentation)

6. `CHANGELOG.md`

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

- [ ] With `npm_config_loglevel=silent`, a project defining the gate script is not halted (bash; zsh where present)
- [ ] With `npm_config_loglevel=silent`, a project missing it is still halted, and the message names `develop.fastGateCommand`
- [ ] With a project `.npmrc` setting `loglevel=silent`, a project defining the script is not halted
- [ ] The existing cases in `fast-gate-precondition.test.mjs` still pass

### Performance

- [ ] `fast-gate-precondition.test.mjs` stays inside its `spawnBudget` with no new timeout literal (`tests/test-harness-concurrency.test.js` guards this)

### Code Quality

- [ ] The removed-flag mutation is observed red, and the red output is quoted in the implementation report
- [ ] `npm run ci:fast`, `bundle:check` (0 problems), `lint:shell` and `validate:all` are clean

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` cites (task 167)
- [ ] Observation #213 set to `actioned` when the PR merges

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

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-09-29 | 1.0     | Initial draft — cut from observation #213 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first (red)
- [ ] `runCheck` env / npmrc options
- [ ] Three per-shell cases
- [ ] Premise: silent "does not HALT" cases red on the current snippet

### Phase 2: The flag (green)
- [ ] Flag and comment
- [ ] Bundle regenerated; `bundle:check` clean
- [ ] Suite green; mutation proved

### Phase 3: Record
- [ ] CHANGELOG entry

---

## References

- Observation #213 — fast-gate-precondition test fails under inherited npm_config_loglevel=silent (npm run -s)
- [task.101](../task.101.fast-gate-command-existence-check/task.101.fast-gate-command-existence-check.md), which introduced the precondition

---

## Notes

- QA report: `task.167.qa.{N}.fast-gate-precondition-npm-loglevel.md`
- Bug reports: `task.167.bug.{N}.{name}.md`
- Quality gate: `task.167.gate.{N}.fast-gate-precondition-npm-loglevel.yml`, all co-located in this directory
