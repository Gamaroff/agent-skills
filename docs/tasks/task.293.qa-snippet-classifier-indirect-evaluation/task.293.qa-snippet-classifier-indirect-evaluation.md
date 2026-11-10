---
id: task.293
title: "QA snippet classifier refuses indirect evaluation"
type: task
description: "Close the QA snippet classifier's indirect-evaluation holes (T292-CR-1..3): quoted command substitutions reached through printf -v and similar subscript operands, prompt-escape expansion, and quoted data re-evaluated as arithmetic."
tags: [qa-task, security, follow-up-292]
category: refactoring
status: planned
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 16
github_issue:
---

# Technical Task: QA snippet classifier refuses indirect evaluation

**Status:** Planned

Follow-up to [task 292](../task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.qa-snippet-classifier-one-bash-tokenizer.md) (issue #868). The three findings were raised by gate 3's safety re-probe, are identical on `develop`, and were left open on purpose.

---

## 1. Overview

The QA snippet classifier decides which fenced shell blocks QA may run. Three shapes get through as `runnable` while bash runs a command from them. All three are **indirect evaluation**: a value is built or stored harmlessly, and a later bash feature evaluates it.

**Scope**: `shared/resources/qa-execute-snippets.mjs` and its test file. One sweep of the class, not three patches.

**Key deliverables**:

- Every shape below classifies `mutating`, and a test per shape holds it.
- A differential run over the new shapes writes nothing under real bash.
- Every change is mutation-proven, with the red test named.

---

## 2. Motivation

Current problems (reproduced at gate 3 and gate 4 of task 292, on `develop`):

- **T292-CR-1**: a quoted `a[$(cmd)]` subscript used as an operand of `printf -v`, `read`, `test -v`, `[[ -v ]]`, `unset` or `[[ -eq ]]` is classified `runnable`, and bash runs `cmd`.
- **T292-CR-2**: `PS4`, `PS0`, `PS1`, `PS2` and `${x@P}` expand prompt escapes, which include command substitution. `PS4=$(touch W)` then `set -x`, or `x=$(touch W)` then `echo ${x@P}`, runs the command.
- **T292-CR-3**: quoted data later re-evaluated as arithmetic (`$((x))`, `[[ $x -eq 1 ]]`, `${x:0:$x}`, `${!x}`) runs a substitution held in the variable.

Benefits:

- The runner's `runnable` verdict stops being wrong for a whole class, not three examples.
- The class is closed by one rule with one test family, so a fourth spelling is a failing test, not a new finding.

---

## 3. Technical Background

All three findings share one cause: the classifier checks each command for what it does directly, and does not model a later feature that evaluates a value.

Current state (grepped on 2026-11-10 at `develop` plus task 292's branch):

- `assignmentHazard` — `shared/resources/qa-execute-snippets.mjs:2818` *(`function assignmentHazard({ word, args })`)*. It refuses `printf -v` outright, and for `export`, `local`, `readonly` and `read` it requires a plain variable name. It does not look at `test -v`, `[[ -v ]]`, `unset` or `[[ -eq ]]`.
- `startupHazard` — set at `:3142` from `STARTUP_VARIABLE` over the stripped code and at `:3246` from `assignmentHazard`. It only fires for a helper-function call (`:3391`), so a direct use is not refused.
- The tokenizer from task 292 is `tokenize` at `:1507` *(`function tokenize`)*; quoted spans are already collapsed before these checks run.

Claims from the gate that Phase 1 must reproduce before any code is written: CR-1's `read` and `unset` spellings, and CR-3's `${!x}` and `${x:0:$x}` spellings *(unverified in this document; gate 4 states them)*.

**Direction (not a decision):** refuse a quoted literal that holds `$(` or a backtick when it is assigned to a variable or passed to an operand-evaluating builtin, and refuse the prompt variables and `@P` outright. Phase 1 confirms whether that is enough or whether it over-refuses blocks the docs scan currently runs.

**Second mechanism check:** `assignmentHazard` already refuses some assignments. New refusals extend it and the existing hazard path. They do not add a second checker beside it.

---

## 4. Scope

In scope:

- ✅ The three findings and any spelling of the same class that Phase 1 reproduces.
- ✅ Tests, a differential run, and mutation proofs.
- ✅ `shared/resources/qa-runnable-prose-detection.md` and its generated copies, if the documented rules change.

Out of scope:

- ❌ **Moving the `WORD` and assignment regexes onto tokens.** Decided here: a separate task. It changes how the classifier reads, not what it refuses, so it ships and reverts on its own. It is an optional tidy-up after this task, not a dependency.
- ❌ Any change to the tokenizer itself.

---

## 5. Breaking Changes

None to any API. The behavioural change is that blocks using these shapes move from `runnable` to `mutating`, so QA no longer runs them. Phase 3 measures how many docs-scan blocks move; the target is zero blocks that were safe and useful.

**Migration path:** a documentation block that needs one of these shapes marks itself non-runnable in the way the runner already documents, or is rewritten to avoid the indirection.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.293.plan.qa-snippet-classifier-indirect-evaluation.md](task.293.plan.qa-snippet-classifier-indirect-evaluation.md)

### Phase 1: Reproduce and size the class

**Risk**: Low. **Files**: tests only.

- [ ] Write one failing test per spelling in section 2, each running the block under real bash in a scratch directory and asserting the file it should not create.
- [ ] Run the docs scan (`scripts/qa-snippets-docscan.mjs`) before any change and record the baseline `runnable` count and the command.
- [ ] List every spelling that does not reproduce and drop it from the plan.

### Phase 2: Refuse the class

**Risk**: Medium. **Files**: `shared/resources/qa-execute-snippets.mjs`. **Depends on**: Phase 1.

- [ ] Refuse prompt variables (`PS0`, `PS1`, `PS2`, `PS4`) and `${…@P}`.
- [ ] Refuse a quoted literal holding `$(` or a backtick when assigned to a variable or passed to an operand-evaluating builtin.
- [ ] Extend `assignmentHazard` for `test -v`, `[[ -v ]]`, `unset` and `[[ -eq ]]` operands.
- [ ] Refuse a variable used where bash evaluates arithmetic (`$((x))`, `[[ $x -eq 1 ]]`, `${x:0:$x}`, `${!x}`) when that variable was assigned a quoted substitution literal.

### Phase 3: Differential run, docs scan, mutation proofs

**Risk**: Low. **Depends on**: Phase 2.

- [ ] Add the new shapes to the differential generator and run it; 0 writes.
- [ ] Re-run the docs scan; record blocks newly refused and justify each.
- [ ] Mutation-prove every new refusal; name the red test in the QA report.
- [ ] Update `qa-runnable-prose-detection.md` and run `npm run bundle`.

---

## 7. Files Summary

Core implementation:

1. ✅ `shared/resources/qa-execute-snippets.mjs`: new refusals.

Tests:

2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs`: one reproduced test per spelling, plus differential rows.

Scripts:

3. ✅ `scripts/qa-snippets-differential.mjs`: extend the generator.

Documentation:

4. ✅ `shared/resources/qa-runnable-prose-detection.md` and its generated `references/` copies.
5. ✅ `CHANGELOG.md`: cites `(task 293)`.

---

## 8. Testing Strategy

- **Unit**: one test per reproduced spelling, asserting `mutating`. Command: `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`.
- **Behavioural**: each spelling also runs under real bash in a scratch directory and asserts nothing is written, so a test cannot pass by matching the classifier's own idea of the block.
- **Control**: one instance of the same defect class that this document does not name (a different builtin or a different expansion), and one safe block that must stay `runnable`.
- **Differential**: the fixed-seed slice stays under 10 s (median of five, `uptime` beside each run, outliers reported). Output goes in the QA report.
- **Docs scan**: median of five against the pre-change baseline, no more than 10% slower.

---

## 9. Success Criteria

**Functional**

- [ ] Every spelling in section 2 that Phase 1 reproduces classifies `mutating`.
- [ ] The control instance classifies `mutating` and the safe block stays `runnable`.
- [ ] The differential run writes nothing under real bash; the count of blocks is recorded in the QA report.

**Performance**

- [ ] Docs scan median within 10% of the baseline (five runs, load recorded, outliers reported), recorded in the QA report.
- [ ] Differential slice median under 10 s (five runs), recorded in the QA report.

**Code quality**

- [ ] `CI=true` suite green; lint and prettier pass on the changed `.mjs` files.
- [ ] `npm run bundle:check` clean.
- [ ] Every change mutation-proven, red test named in the QA report.

**Migration**

- [ ] `CHANGELOG.md` cites `(task 293)`.
- [ ] Every docs-scan block newly refused is listed in the QA report with a reason.

---

## 10. Risk Assessment

**High**

1. Over-refusal. Probability: Medium. Impact: High, because QA stops running legitimate blocks. Mitigation: the docs-scan comparison in Phase 3, and a safe-block control. Rollback: revert the refusal that over-refuses.

**Medium**

1. A fourth spelling of the class that this sweep misses. Probability: Medium. Impact: Medium. Mitigation: the unnamed control instance and the differential run. Rollback: none needed; it stays a known finding.

**Low**

1. Documentation drift in the generated copies. Mitigation: `npm run bundle:check`.

---

## 11. Rollback Plan

**Immediate (under 1 hour)**: revert the merge commit. The classifier returns to task 292's behaviour, which is identical to `develop` for these shapes. Triggers: a legitimate documentation block stops running, or the docs scan regresses by more than 10%.

**Partial**: revert the single refusal that over-refuses and keep the others, since each is tested on its own.

**Forward fix**: a missed spelling is fixed forward as a new finding.

---

## Progress Tracking

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-10 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

## References

- [task 292](../task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.qa-snippet-classifier-one-bash-tokenizer.md), issue #868
- [gate 4](../task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.gate.4.qa-snippet-classifier-one-bash-tokenizer.yml), `recommendations.future`

## Notes

QA artefacts land beside this file: `task.293.qa.N.*.md`, `task.293.gate.N.*.yml`, bug reports `task.293.bug.N.*.md`.
