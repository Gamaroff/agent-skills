---
id: task.289
title: "QA snippet runner allows flags, not just commands"
type: task
description: "Replace the snippet runner's flag-level deny-list (DENY_PATTERNS) with a per-command flag allow-list, closing seven known ways a runnable block writes and deciding the 17 doc blocks task 274 now refuses."
tags: [qa-task, finalise, security]
category: refactoring
status: ready-for-review
pr_number: 864
priority: Medium
created: 2026-11-09
updated: 2026-11-09
estimated_effort_hours: 16
---

# Task 289: QA snippet runner allows flags, not just commands

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.289.review.1.qa-snippet-runner-flag-level-allow-list.md` implemented 2026-11-09

> Detailed implementation guide: [task.289.plan.qa-snippet-runner-flag-level-allow-list.md](task.289.plan.qa-snippet-runner-flag-level-allow-list.md)

---

## 1. Overview

`qa-execute-snippets.mjs` decides whether a fenced shell block is safe to run. It has an allow-list at the command level (`SAFE_COMMANDS`) and a deny-list one level down (`DENY_PATTERNS`) for the flags of the commands it allows. Task 274 (PR #863) found, and left open, seven ways a block classifies `runnable` and writes. All seven sit in the deny-list layer. This task replaces that layer with an allow-list of the flags and operators each allowed command may carry.

**Scope**: `shared/resources/qa-execute-snippets.mjs`, its tests, the prose that restates its rule, and the owner decision on the 17 doc blocks task 274 now refuses.

---

## 2. Motivation

### Current Problems

1. **Five gaps reproduced by execution at task 274 gate 3, identical on develop** (`task.274.gate.3…yml`, `recommendations.future`): a function named after an allow-listed command; the `<>` redirection; `find -fprint0`; sed's `e` command; `sort --compress-program`.
2. **Two spec challenges from the task 274 DoD security review**: brace expansion builds a deny-listed flag from literal text (`find docs -de{lete,lete}`), and an unquoted expansion after a literal prefix word-splits into a flag (`find docs -name x${IFS}-delete`).
3. **The deny-list can only grow.** Each gap is a flag nobody thought to forbid. Task 274 added shapes 1 to 4 and four QA cycles each found another spelling.
4. **17 doc blocks are refused** by task 274's shape-4 rule, which exists because the scan tracks no values. They are refused, never run, and not fixed. The owner has not yet decided whether to accept that lost coverage.
5. **Unrelated but filed here at the author's request**: `context-pressure-statusline.test.mjs` leaks a `ctx-wrap-` temp directory and failed a CI leak check once.

### Benefits of a flag-level allow-list

1. **Fail-closed by construction**: a flag nobody listed is refused, so a new spelling cannot run.
2. **The seven gaps close together**, by one rule, not by seven patterns.
3. **Shape 4 can be narrowed**: with the allowed flags known, a variable that can only be an operand need not be refused.
4. **The 17-block decision gets facts**: the task measures how many blocks a narrower rule would return to the runnable set.

---

## 3. Technical Background

### Current Architecture

- `SAFE_COMMANDS` is the command-level allow-list: `shared/resources/qa-execute-snippets.mjs:407` *(`export const SAFE_COMMANDS = new Set([`)*. It holds `sed`, `find`, `sort`, `grep` and 27 others.
- `DENY_PATTERNS` is the flag-level deny-list: `shared/resources/qa-execute-snippets.mjs:712` *(`export const DENY_PATTERNS = [`)*. It names `sed -i`, `--in-place`, `--output`, `find` write actions and `tee`.
- `VARIABLE_ARGUMENT_COMMANDS` and `couldBeFlag` implement shape 4: `shared/resources/qa-execute-snippets.mjs:751` and `:770`.
- `classifyBlock` applies the deny-list at `shared/resources/qa-execute-snippets.mjs:1903` *(`for (const [re, name] of DENY_PATTERNS) {`)*.
- The five gaps are absent from the source: `git grep -n 'fprint0\|compress-program' -- shared/resources/qa-execute-snippets.mjs` returns nothing (run at filing, 2026-11-09).

### Target Architecture

A table of allowed flags per allowed command (`sed`, `find`, `sort`, and each other `SAFE_COMMANDS` member whose flags can write or run a program). A flag outside its command's entry classifies `mutating` with the reason `flag-not-allowed: <command> <flag>`. `DENY_PATTERNS` shrinks to the commands outside `SAFE_COMMANDS`, or goes.

### Important Clarifications

- **The seven gaps are known, not exhaustive.** Gate 3 recorded five and the DoD security review two more. A re-probe finds more until the table exists.
- **Operators are in scope**, not just flags: `<>` is a redirection, and a function definition changes what a command name means. The allow-list must cover shell syntax as well as options.
- **Owner decision pending (Section 4):** accept the 17 refused blocks, or add value tracking.

---

## 4. Scope

### In Scope

✅ **The seven gaps** in Section 2, each with a reproducing test written before the fix and a mutation proof.
✅ **A flag and operand allow-list for every `SAFE_COMMANDS` member** (31 today, `command node -e` over the export). An entry lists the flags and the operand count each command may carry; a member with no entry is refused (`flag-not-allowed`/`no-table-entry`), so the table is fail-closed. Operands count because some commands write through a positional one: `uniq in out` and `file -C -m magic` classify `runnable` today and write a file (probed 2026-11-09 by `classifyBlock`; `uniq in.txt out.txt` created `out.txt`).
✅ **The 17 doc blocks**: list them again with the new engine (`task.274…dod.1…md`, section Supplementary evidence, criterion #2), and record the owner's decision.
✅ **Prose restatements** of the rule (`qa-runnable-prose-detection.md`, `probe-boundary-rule.md`) and the bundled copies.

### Out of Scope

❌ **Value tracking for variables.** Only if the owner chooses it for the 17 blocks; then it is its own phase or task.
❌ **The `ctx-wrap-` leak fix is optional** (Phase 5); it is unrelated to the runner and may be split off.
❌ **Network commands.** `gh` and `curl` stay absent from `SAFE_COMMANDS`.

---

## 5. Breaking Changes

### Breaking Change 1: blocks with an unlisted flag are refused

**What Changed**: a block whose allowed command carries a flag outside its table entry is `mutating`, where today it is `runnable`.

**Before**: `sort --compress-program=./x f` runs.

**After**: refused with `flag-not-allowed: sort --compress-program`.

**Impact**: any doc block using an unlisted flag stops being executed by QA. The count is measured in Phase 4 before the change merges.

**Migration Path**: add the flag to the table with a test, or fence the block ```sh to put it outside the runner's scope (the runner scans only ```bash fences).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.289.plan.qa-snippet-runner-flag-level-allow-list.md](task.289.plan.qa-snippet-runner-flag-level-allow-list.md)

### Phase 1: Reproduce and decide

**Risk Level**: Low

**Files**:
- `shared/resources/tests/qa-execute-snippets.test.mjs`

**Changes**:
- [x] Write one failing test per gap (seven), each asserting `mutating`, plus one control per gap that must stay `runnable`. Gap 7 is the `function cat { touch x; }; cat f` spelling: the `cat() { …; }` spelling is already `mutating` (unparseable, fail-closed), so keep it as a held control, not a failing case
- [x] Add failing-first tests for the cases probed beyond the seven: `uniq in out`, `file -C -m magic`, `sed --expression=1e f`, `sort -S 1 --compress-program=x f`
- [x] Set the controls' expected class from a run, not from the task 274 text: `find docs/$X -name z` classifies `placeholder` (unbound variable), not `runnable`; bind `X` or assert `placeholder`
- [x] Re-run the old-vs-new real-docs classifier over `git ls-files '*.md'` as the baseline; record the command and the count
- [x] Ask the owner: accept the 17 refused blocks, or add value tracking (record the answer in the Change Log)

**Dependencies**: none

---

### Phase 2: The flag table

**Risk Level**: Medium

**Files**:
- `shared/resources/qa-execute-snippets.mjs`

**Changes**:
- [x] Add the per-command flag and operand table for every `SAFE_COMMANDS` member, `SAFE_FLAGS` beside it
- [x] Refuse any flag or operand outside the table with a named reason; a member with no entry is refused
- [x] Record the audit result per command (`grep`, `jq`, `diff`, `ls`, `cat`, `uniq`, `file`, and the rest) in a test that fails when a member has no record
- [x] Decide `SAFE_FLAGS` against the existing `DENY_PATTERNS` and `VARIABLE_ARGUMENT_COMMANDS` (`:751`): state for each whether the table replaces, extends or sits beside it

**Dependencies**: Phase 1

---

### Phase 3: Operators and expansions

**Risk Level**: High

**Files**:
- `shared/resources/qa-execute-snippets.mjs`

**Changes**:
- [x] Refuse `<>`, and a function definition (`name()` and `function name`) whose name is an allowed command
- [x] Before removing a `DENY_PATTERNS` entry, list every test that pins its reason text: `git grep -n 'deny-list:' -- '*.test.*'` (record each hit with the removed or rewritten reason it pins)
- [x] Refuse a brace expansion or an unquoted expansion that can build a flag in an allowed command's argument list, and keep the controls runnable (`find docs/$X -name z`)
- [ ] Remove `DENY_PATTERNS` entries the table now covers; keep a test for each removal (not done: the owner-visible decision is that `DENY_PATTERNS` sits beside the table, see the implementation report Decisions Log)

**Dependencies**: Phase 2

---

### Phase 4: Real docs and prose

**Risk Level**: Medium

**Files**:
- `shared/resources/qa-runnable-prose-detection.md`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`, bundled `references/` copies

**Changes**:
- [x] Re-run the real-docs classifier; list every newly refused block against develop, with command and output
- [x] Update the prose and run `npm run bundle`
- [x] CHANGELOG entry citing this task

**Dependencies**: Phase 3

---

### Phase 5 (optional): temp-dir leak

**Risk Level**: Low

**Files**:
- `shared/resources/tests/context-pressure-statusline.test.mjs`

**Changes**:
- [ ] Find why the `ctx-wrap-` directory survives (the `after` hook at the top of the file removes `TMP` entries) and fix it, or file it separately

**Dependencies**: none

---

## 7. Files Summary

**Core Implementation:**
1. ✅ `shared/resources/qa-execute-snippets.mjs` - flag table, operator refusals

**Tests:**
2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` - gap reproductions, controls, table audit
3. ✅ `shared/resources/tests/context-pressure-statusline.test.mjs` - Phase 5 only

**Documentation:**
4. ✅ `shared/resources/qa-runnable-prose-detection.md`, `shared/resources/probe-boundary-rule.md`
5. ✅ `CHANGELOG.md`
6. ✅ bundled copies under `skills/*/references/`, regenerated by `npm run bundle`

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: each gap as a failing-first test with a control; one test per table entry; a test that every `SAFE_COMMANDS` member has an audit record.
- **Command**: `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`
- **Mutation proof**: revert each phase's behaviour and confirm a named test goes red.

### Integration Tests

- The old-vs-new classifier over every tracked `.md` bash fence; the count and the list of newly refused blocks recorded in the QA report.

### Performance Tests

- `CI=true npm test` wall time against develop: at least five alternating pairs, the median compared with a 10% bound, `uptime` recorded beside each run, outliers reported (task 274 criterion #4 shape). Recorded in the QA report.

### Consumer Tests

- `npm run bundle:check` and `CI=true npm run ci`.

---

## 9. Success Criteria

### Functional

- [x] Each of the seven gaps classifies `mutating`, by a named test, and its control stays `runnable`
- [x] A flag or operand outside a table entry is refused with `flag-not-allowed`, by a named test per `SAFE_COMMANDS` member; a member with no entry is refused, by a named test
- [x] `uniq in out` and `file -C -m magic` classify `mutating`, by named tests
- [x] Every block the task 274 engine ran and the new engine refuses is listed in the QA report with the command and the runner output

### Performance

- [x] `CI=true npm test` median wall time within 10% of develop (five alternating pairs, load recorded, in the QA report). Measured on `npm run test:suite`, the suite `npm test` wraps, develop in a separate worktree. Median develop 205.6s, branch 207.5s, ratio 1.009. Pairs (develop/branch, load at each): 205.6/207.5 (7.19/6.07), 165.9/289.2 (4.77/8.05), 170.7/165.6 (5.83/4.16), 206.2/187.9 (6.00/5.20), 339.1/293.5 (31.09/9.88). Pair 2's branch run and pair 5 are host-load outliers, reported and kept. Figures also in the implementation report's QA Cycle 6 entry.
- [x] The classifier adds under 10% to the median time of a 3,000-block docs scan against develop (median of five alternating pairs, `uptime` beside each, command and figures in the QA report)

### Code Quality

- [x] Each fix has a mutation proof (revert, a test goes red), recorded in the QA report's findings table
- [x] `npm run bundle:check` reports 0 problems
- [x] `CI=true npm run ci` passes (exit 0 on `c42729c5`, 2026-11-09; the `tmp-leak` ratchet held)

### Migration

- [x] CHANGELOG.md cites this task
- [x] The owner's decision on the 17 refused blocks is recorded in the Change Log

---

## 10. Risk Assessment

### HIGH RISK

1. **A table that is itself incomplete**
   - Risk: a flag that writes is added to the table by mistake, or a command is audited too quickly.
   - Probability: Medium
   - Impact: High (a QA run executes a write)
   - Mitigation: an audit record per command, an adversarial probe at QA, and the DoD security agent.
   - Rollback: revert the table commit; the deny-list returns.

### MEDIUM RISK

1. **More doc blocks refused than expected**
   - Risk: the table is stricter than the docs.
   - Probability: Medium
   - Impact: Medium (lost coverage, not a safety loss)
   - Mitigation: Phase 4 measures before merge; the migration path is the ```sh fence or a table entry.

### LOW RISK

1. **Prose drift**: restatements of the rule fall behind. Mitigation: the doc sweep in Phase 4.

---

## 11. Rollback Plan

### Immediate rollback (< 1 hour)

- **Triggers**: QA runs execute a write; CI red on develop after merge.
- **Steps**: `git revert` the merge commit; run `npm run bundle`; push.
- **Validation**: `CI=true npm test` and `npm run bundle:check`.

### Partial rollback

- Revert Phase 3 only if the operator refusals refuse too many real blocks; the flag table (Phase 2) stands alone.

### Forward fix

- A missing table entry is added with a test, not rolled back.

---

## QA Testing Results

**QA Status**: WAIVED (owner)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-09
**Quality Score**: 82/100
**Gate Decision**: WAIVED

### QA Report

- **Full Report**: [task.289.qa.6.qa-snippet-runner-flag-level-allow-list.md](./task.289.qa.6.qa-snippet-runner-flag-level-allow-list.md)
- **Gate File**: [task.289.gate.6.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.6.qa-snippet-runner-flag-level-allow-list.yml)

### Test Coverage Summary

- **Tests Executed**: 300
- **Phases Verified**: 5/5
- **Critical Issues**: 0 (1 high and 1 medium, both pre-existing and identical on develop, filed as task.290)
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

The cycle 5 fix held. Cycle 6 found a `#` after an escaped space read as a comment (`echo a\ # ; touch out` classifies runnable and writes) and a RangeError on 20000-deep nesting. Both are identical on develop and neither is in code this task introduced. The owner accepted the branch as a strict improvement over develop and filed both as task.290, so the gate is waived by the owner, not passed.

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-09 | 1.0     | Initial draft | create-task |
| 2026-11-09 | 1.1     | Review 1 (8/10): table widened to all 31 SAFE_COMMANDS members and operands (uniq, file -C found writing); gap 7 repro and a control's class corrected; performance and mutation criteria given a bound and a location; deny-reason test sweep added | review-task |
| 2026-11-09 |         | Status → ready-for-development | review-task |
| 2026-11-09 |         | Owner decision on the 17 refused doc blocks: accept the refusal, no value tracking | develop-task |
| 2026-11-09 |         | Status → ready-for-review | develop-task |
| 2026-11-09 |         | QA gate FAIL (80/100) — 2 findings | qa-task |
| 2026-11-09 |         | QA findings fixed — 2 high findings, 1 iteration | qa-fix |
| 2026-11-09 |         | QA gate FAIL (80/100) — 2 findings | qa-task |
| 2026-11-09 |         | QA findings fixed — 2 high findings, 2 iterations | qa-fix |
| 2026-11-09 |         | QA gate FAIL (80/100) — 2 findings | qa-task |
| 2026-11-09 |         | QA findings fixed — 2 high findings, 3 iterations (third strike: expansion reading replaced) | qa-fix |
| 2026-11-09 |         | QA gate FAIL (80/100) — 2 findings | qa-task |
| 2026-11-09 |         | QA findings fixed — 2 high findings, 4 iterations (third strike: substitution handling replaced) | qa-fix |
| 2026-11-09 |         | QA gate FAIL (80/100) — 1 finding (budget spent: 5 gates, 4 fixes) | qa-task |
| 2026-11-09 |         | QA findings fixed — 1 high finding, 5 iterations (masker made quote-aware; unreadable substitution refused for any word) | qa-fix |
| 2026-11-09 |         | QA gate WAIVED by owner (82/100) — 2 pre-existing findings filed as task.290 | qa-task |

<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Reproduce and decide
- [x] Phase 2: The flag table
- [x] Phase 3: Operators and expansions
- [x] Phase 4: Real docs and prose
- [ ] Phase 5 (optional): temp-dir leak

---

## References

- Task 274 and PR #863: `docs/tasks/task.274.qa-engines-stop-passing-what-they-cannot-see/`
- Gate 3 recommendations: `task.274.gate.3.qa-engines-stop-passing-what-they-cannot-see.yml`
- The 17 blocks and the timing method: `task.274.dod.1.qa-engines-stop-passing-what-they-cannot-see.md`

---

## Notes

QA artifacts for this task land beside this file: `task.289.qa.N.*.md`, `task.289.gate.N.*.yml`, `task.289.bug.N.*.md`.
