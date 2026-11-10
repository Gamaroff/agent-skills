---
id: task.293
title: "QA snippet classifier refuses indirect evaluation"
type: task
description: "Close the QA snippet classifier's indirect-evaluation holes (T292-CR-1..3): quoted command substitutions reached through printf -v and similar subscript operands, prompt-escape expansion, and quoted data re-evaluated as arithmetic."
tags: [qa-task, security, follow-up-292]
category: refactoring
status: in-progress
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 16
github_issue:
---

# Technical Task: QA snippet classifier refuses indirect evaluation

**Status:** In Progress

**Review**: ✅ All review recommendations from `task.293.review.1.qa-snippet-classifier-indirect-evaluation.md` implemented 2026-11-10

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

- `assignmentHazard` — `shared/resources/qa-execute-snippets.mjs:2818` *(`function assignmentHazard({ word, args })`)*. It *returns a reason* for `printf -v`, and for `export`, `local`, `readonly` and `read` with a non-plain variable name. It does not look at `test -v`, `[[ -v ]]`, `unset` or `[[ -eq ]]`. **Returning a reason is not refusing:** the reason only becomes a verdict through `startupHazard`, below.
- `startupHazard` — set at `:3142` from `STARTUP_VARIABLE` over the stripped code and at `:3247` from `assignmentHazard`. It only fires for a helper-function call (`:3391`, `calls.length > 0 && startupHazard`), so a direct use is not refused. This is why `printf -v 'a[$(touch W)]' x` is `runnable` although `assignmentHazard` flags it.
- Existing tests pin the helper-call reason strings (`shared/resources/tests/qa-execute-snippets.test.mjs:3412`, `:3682`, `:3697`, `:3736`, `:3800`, each `^helper call with …`). The new direct-use refusal takes its own reason prefix and leaves those strings unchanged.
- The tokenizer from task 292 is `tokenize` at `:1507` *(`function tokenize`)*; quoted spans are already collapsed before these checks run.

Reproduced at review under real bash (GNU bash 5.3.20, scratch directory, marker file `W`): `printf -v`, `PS4` with `set -x`, `${x@P}`, `$((x))`, `[[ $x -eq 1 ]]`, `read -r "$x"` and `test -v "$x"` write `W` as stated. `${y:0:$x}`, `unset "$x"` and `${!x}` write `W` only when the state they read exists: `y` must be set (`y=abcdef`), and the array must be declared (`a=(1)`). Without that state they do not reproduce, so the Phase 1 tests declare it. Phase 1 still re-runs each on the developer's bash and drops any that does not reproduce; `unset -v "$x"` reproduces too and joins the family.

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

- [x] Write one failing test per spelling in section 2, each running the block under real bash in a scratch directory and asserting the file it should not create.
- [x] Run the docs scan (`scripts/qa-snippets-docscan.mjs`) before any change and record the baseline `runnable` count and the command. *(Baseline: 257 runnable of 3448 blocks; `node scripts/qa-snippets-docscan.mjs --time --json`.)*
- [x] List every spelling that does not reproduce and drop it from the plan. *(None dropped: `${y:0:$x}`, `unset` and `${!x}` reproduce once `y` is set and the array is declared; the tests declare it.)*

### Phase 2: Refuse the class

**Risk**: Medium. **Files**: `shared/resources/qa-execute-snippets.mjs`. **Depends on**: Phase 1.

- [x] Make a direct use refuse, not only a helper call: the new check `indirectEvaluationHazard` sits after the helper rule and returns `indirect-evaluation: …`, so the pinned `helper call with …` strings are unchanged.
- [x] Refuse prompt variables (`PS0`, `PS1`, `PS2`, `PS4`) set or declared, and `${…@P}`. *(A bare mention such as `echo PS4` stays runnable, because an existing test pins that.)*
- [x] Refuse a quoted literal holding `$(` or a backtick when assigned to a variable or passed to an operand-evaluating builtin.
- [x] Cover `test -v`, `[[ -v ]]`, `unset` and `[[ -eq ]]` operands. *(Done in the new check, not by extending `assignmentHazard`: that function only reaches a verdict through a helper call, and the new check judges the quoted literal where it is built.)*
- [x] Refuse a variable used where bash evaluates arithmetic (`$((x))`, `[[ $x -eq 1 ]]`, `${x:0:$x}`, `${!x}`) when that variable was assigned a quoted substitution literal. *(Done by refusing the assignment, so no value is tracked. A value laundered through a command's output stays an unseen shape, named in the detection doc.)*

### Phase 3: Differential run, docs scan, mutation proofs

**Risk**: Low. **Depends on**: Phase 2.

- [x] Add the new shapes to the differential generator and run it (`node scripts/qa-snippets-differential.mjs --count <N> --seed <S> --atoms <set>`, the three values recorded in the QA report); 0 writes. *(`--atoms indirect --seed 1 --count 3000`: 0 writes; the previous engine wrote 10 on the same blocks. Seeds 2 and 3 at 20000: 0 writes.)*
- [x] Re-run the docs scan; record blocks newly refused and justify each. *(2 newly refused, 0 newly runnable: `task.163.plan…md:26`, an escaped backtick in a double-quoted assignment, a documentation block no QA run needs; `task.293.plan…md:26`, the `printf -v` hazard sample itself.)*
- [x] Mutation-prove every new refusal; name the red test in the QA report. *(Six mutations, one per refusal branch, each red on `task.293 each refusal is held on an input where it alone decides`.)*
- [x] Update `qa-runnable-prose-detection.md` and run `npm run bundle`.

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
- [ ] Differential slice median under 10 s (five runs of `node scripts/qa-snippets-differential.mjs` at the fixed slice's count, seed and atoms, `uptime` beside each), recorded in the QA report.

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

- [x] Phase 1
- [x] Phase 2
- [x] Phase 3

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-10
**Quality Score**: 80/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.293.qa.5.qa-snippet-classifier-indirect-evaluation.md](./task.293.qa.5.qa-snippet-classifier-indirect-evaluation.md)
- **Gate File**: [task.293.gate.5.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.5.qa-snippet-classifier-indirect-evaluation.yml)

### Test Coverage Summary
- **Tests Executed**: 383 in the suite file; `ci:fast` 8346, 0 fail at the cycle-4 fix commit
- **Phases Verified**: 2/3 clean
- **Critical Issues**: 1 (high)
- **NFR Status**: Security: FAIL, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
The last permitted gate. A substitution literal split across adjacent quote tokens has no substitution text in the source and reaches evaluation through `read`, `printf -v` or a here-string. Reproduced under real bash. The QA budget is spent; the owner decides between a waiver and narrowing the task.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-10 | 1.0 | Initial draft | create-task |
| 2026-11-10 | 1.1 | Review passed (8/10) — corrected the `assignmentHazard`/`startupHazard` description (a direct use is not refused today), recorded which spellings reproduce and their preconditions, named the differential command | review-task |
| 2026-11-10 |  | Status → ready-for-development | review-task |
| 2026-11-10 |  | Implemented: `indirectEvaluationHazard` in `qa-execute-snippets.mjs`, `indirect` differential atom set, tests, docs, CHANGELOG. Status → ready-for-review | develop-task |
| 2026-11-10 |  | QA gate FAIL (70/100) — 2 high findings | qa-task |
| 2026-11-10 |  | QA findings fixed — 2 high closed (assembled subscript value, quoted substitution as subscript), 1 iteration | qa-fix |
| 2026-11-10 |  | QA gate FAIL (70/100) — 2 high findings | qa-task |
| 2026-11-10 |  | QA findings fixed — 2 high closed (joined word and quoted literal, literal piped into read) with a block-level rule, 2 iterations | qa-fix |
| 2026-11-10 |  | QA gate FAIL (70/100) — 1 high, 1 medium finding | qa-task |
| 2026-11-10 |  | QA findings fixed — 1 high, 1 medium closed by replacing the arithmetic-read list with a default-deny test (third strike), 3 iterations | qa-fix |
| 2026-11-10 |  | QA gate FAIL (80/100) — 1 high finding | qa-task |
| 2026-11-10 |  | QA finding fixed — 1 high closed by making the literal carrier default-deny, 4 iterations | qa-fix |
| 2026-11-10 |  | QA gate FAIL (80/100) — 1 high finding; QA budget spent | qa-task |
<!-- change-log-end -->

## References

- [task 292](../task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.qa-snippet-classifier-one-bash-tokenizer.md), issue #868
- [gate 4](../task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.gate.4.qa-snippet-classifier-one-bash-tokenizer.yml), `recommendations.future`

## Notes

QA artefacts land beside this file: `task.293.qa.N.*.md`, `task.293.gate.N.*.yml`, bug reports `task.293.bug.N.*.md`.
