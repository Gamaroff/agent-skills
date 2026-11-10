---
id: task.294
title: "QA snippet classifier allow-list"
type: task
description: "Replace the QA snippet classifier's refusal rules with an allow-list: a shell block runs only when every word is a known-safe literal. Closes the three residual indirect-evaluation shapes task 293 left open, and folds in two advisory test cleanups from its gate 9."
tags: [qa-task, security, follow-up-293]
category: refactoring
status: planned
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 16
github_issue:
---

# Technical Task: QA snippet classifier allow-list

**Status:** Planned

Follow-up to [task 293](../task.293.qa-snippet-classifier-indirect-evaluation/task.293.qa-snippet-classifier-indirect-evaluation.md) (PR #870). The owner's "Narrow T293" decision at gate 5 split this out: task 293 closed the indirect-evaluation family by refusal rules, and three shapes it could not close stay documented. Detail: [QA report 9](../task.293.qa-snippet-classifier-indirect-evaluation/task.293.qa.9.qa-snippet-classifier-indirect-evaluation.md), [gate 9](../task.293.qa-snippet-classifier-indirect-evaluation/task.293.gate.9.qa-snippet-classifier-indirect-evaluation.yml) `recommendations.future`.

---

## 1. Overview

**Task**: make `isRunnableBlock` an allow-list. Today a block is `runnable` unless a refusal rule fires. After this task a block is `runnable` only when every word of it is a known-safe literal, and every other block is `mutating`.

**Scope**: the classifier in `shared/resources/qa-execute-snippets.mjs`, its tests, the differential harness, and the detection doc.

**Key deliverables**:

- An allow-list classifier that closes the three documented residual shapes.
- A stated, measured over-refusal cost: how many documentation blocks stop being runnable.
- Two advisory test cleanups from gate 9.

**Expected outcome**: the three residuals classify `mutating`, and the next hostile spelling needs no new rule because it is not on the list.

## 2. Motivation

**Current problems**

- Three shapes reproduce under real bash and classify `runnable`: a value laundered through command output with the substitution spelled by an octal escape (`x=$(printf 'a[\044(cmd)]'); echo $((x))`), a `[` or `$` that arrives by expansion (`b='['; x="a${b}…"`), and a literal split across adjacent quote tokens (`read x <<< "a[$""(cmd)]"; echo $((x))`). Source: `shared/resources/qa-runnable-prose-detection.md` §2a-ii, "Known unseen shapes".
- Task 293 widened text-level detection of the literal four times and each widening lost to a new carrier. A refusal list is incomplete by construction.
- `EVALUATING_WORD` (`shared/resources/qa-execute-snippets.mjs:3119`) omits `set`, `mapfile`, `readarray`, `getopts`, `trap`, `compgen`, `wait` and `shift`. Today they are refused only by the unrecognised-command rule, and no test locks that dependency.
- The test `task.293 a helper call that also names a start-up variable keeps its pinned reason` (`shared/resources/tests/qa-execute-snippets.test.mjs:5307`) asserts only `mutating`, so it cannot fail on the ordering it names.

**Benefits**

- Closes the class, not three spellings.
- Removes the per-cycle QA cost task 293 paid (nine gates).
- The security boundary reads as one rule: "every word is on the list".

## 3. Technical Background

**Current architecture.** `classifyBlock` (`shared/resources/qa-execute-snippets.mjs:3045`) wraps `classifyFailClosed`, which calls `classifyInternal`. `isRunnableBlock` (`:3071`) is `klass === "runnable"`. `classifyInternal` tokenizes with the one bash tokenizer task 292 introduced, classifies commands against a table, and applies refusal rules in order. A command not in the table is refused by the `unrecognised-command` rule. Task 293's rules sit in `indirectEvaluationHazard` (`:3194`), built from `EVALUATING_WORD` (`:3119`), `LIVE_EXPANSION` (`:3129`), `unclosedBracketMap` (`:3149`) and `LOOSE_LITERAL` (`:3162`).

**Population.** `npm run qa-snippets:docscan -- --json` on `develop` reports `blocks: 3452`, `runnableBase: 256`. Only the 256 runnable blocks can lose their verdict, so the over-refusal cost is bounded by that number. Command: `node scripts/qa-snippets-docscan.mjs --json`.

**Target architecture.** Two layers, in this order:

1. **Word allow-list (new).** After tokenizing, every word of a candidate-`runnable` block must be a *safe literal*: text with no expansion (`$`, backtick), no quote-joined fragments that the tokenizer cannot reduce to one literal, no escape that changes meaning (`\0NN`, `$'…'`), and no glob or brace form whose result is not fixed. A word the allow-list cannot prove literal makes the block `mutating`, reason `not-allow-listed: <word class>`.
2. **Existing rules (kept).** Task 293's rules stay as the second layer for blocks the allow-list admits, and as the reason text for blocks it refuses with a known class. They are not deleted in this task; whether any becomes redundant is a measured outcome of Phase 4.

A **second layer of defence needs its own test** (obs #154): Phase 3 includes a test that defeats the allow-list's word check, so the existing rules stand alone, and the mutation list names which mutation only that test turns red.

**Design question for Phase 1 (decide before coding).** Which words are admitted: the allow-list can be over *commands* (today's table) and *arguments* (new). The three residuals are all about arguments. Phase 1 writes the decision down with the measured cost of each candidate (see Risk 1).

**Verification of names above:** `classifyBlock` `:3045`, `isRunnableBlock` `:3071`, `EVALUATING_WORD` `:3119`, `LIVE_EXPANSION` `:3129`, `unclosedBracketMap` `:3149`, `LOOSE_LITERAL` `:3162`, `indirectEvaluationHazard` `:3194`, all in `shared/resources/qa-execute-snippets.mjs`, found by `grep -n` on 2026-11-10.

## 4. Scope

**In scope**

✅ A word-level allow-list in the classifier, and its reason strings.
✅ The three residual shapes as real-bash test cases that must classify `mutating`.
✅ The two advisory test cleanups from gate 9.
✅ The docs-scan and differential measurements, committed to a QA report.
✅ Updating `shared/resources/qa-runnable-prose-detection.md` §2a-ii (the "known unseen shapes" paragraph) and `CHANGELOG.md`.

**Out of scope**

❌ Deleting task 293's refusal rules (decide from the Phase 4 measurement, in a later task if wanted).
❌ Changing what the runner executes or how it sandboxes. This task changes only the verdict.
❌ Rewriting documentation blocks to stay runnable, unless the count is small enough to be a one-line fix each (list them instead).

## 5. Breaking Changes

**Some `runnable` blocks become `mutating`.**

- Before: a block with a quoted or parameter-expanded word that no rule refuses is `runnable` and QA executes it.
- After: the same block is refused unless every word is a provable literal.
- Impact: QA runs fewer documentation snippets. Bounded by the 256 runnable blocks in the docs corpus.
- Migration path: for each block newly refused, the docs-scan lists it with its reason. Rewrite the block to use literals, or accept that it is no longer run. A refused block is never executed, so the failure direction is safe.

No API, CLI flag or file-format change.

## 6. Implementation Plan

> Detailed implementation guide: [task.294.plan.qa-snippet-classifier-allow-list.md](task.294.plan.qa-snippet-classifier-allow-list.md)

### Phase 1: Decide the admitted words (risk: Low)

Files: `docs/tasks/task.294.qa-snippet-classifier-allow-list/` (a decision note inside the QA or plan record), `scripts/qa-snippets-docscan.mjs` (read only).

- [ ] List the distinct word shapes in the 256 runnable docs blocks (command: the docs-scan with a `--words` listing, or a one-off script run from the scratchpad).
- [ ] For each candidate allow-list (literal-only; literal plus plain `$name`; literal plus a fixed set of safe expansions), count how many of the 256 stay runnable.
- [ ] Choose one, write the choice and its count into the plan.

### Phase 2: Pin the target behaviour with tests first (risk: Low)

Files: `shared/resources/tests/qa-execute-snippets.test.mjs`.

- [ ] Add the three residual shapes to a real-bash table (each shown to write a marker file when run) that must classify `mutating`.
- [ ] Add a control table of ordinary safe blocks that must stay `runnable`.
- [ ] Confirm the three shapes are red on today's code (known failure reproduced before the fix).

### Phase 3: Implement the allow-list (risk: High)

Files: `shared/resources/qa-execute-snippets.mjs`.

- [ ] Add the word check after tokenizing, before the final `runnable` verdict.
- [ ] Reason strings `not-allow-listed: <class>`.
- [ ] A test that defeats the allow-list's check so the existing rules stand alone (obs #154).
- [ ] Mutation-prove: revert the check, confirm the Phase 2 table goes red.

### Phase 4: Measure and document (risk: Low)

Files: `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`, bundled copies.

- [ ] Add differential atoms for the three residuals; run the differential on the `.249` server, count writes (must be 0).
- [ ] Run the docs scan; list every newly refused block with its reason in a QA report.
- [ ] Update §2a-ii: the three residuals move from "known unseen shapes" to refused.
- [ ] `npm run bundle`, then `npm run bundle:check`.

### Phase 5: The two advisory cleanups (risk: Low)

Files: `shared/resources/tests/qa-execute-snippets.test.mjs`.

- [ ] Make `task.293 a helper call that also names a start-up variable keeps its pinned reason` pass a `helperRoot` and assert the reason string, so it can fail on the ordering it names.
- [ ] Add a test that `set`, `mapfile`, `readarray`, `getopts`, `trap`, `compgen`, `wait` and `shift` classify `mutating` through the unrecognised-command rule, locking the dependency.
- [ ] Mutation-prove both.

## 7. Files Summary

**Core**

1. ✅ `shared/resources/qa-execute-snippets.mjs`: the allow-list and reasons.

**Tests**

2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs`: residual table, control table, defeat-the-first-layer test, the two cleanups.
3. ✅ `scripts/qa-snippets-differential.mjs`: atoms for the residuals.

**Documentation**

4. ✅ `shared/resources/qa-runnable-prose-detection.md`: §2a-ii.
5. ✅ `CHANGELOG.md`: entry citing `(task 294)`.
6. ✅ Bundled `references/` copies, regenerated by `npm run bundle`.

Population commands: `git grep -ln "qa-execute-snippets" -- 'skills/*/references/'` lists the copies the bundler regenerates.

## 8. Testing Strategy

**Unit**: the residual real-bash table and control table in `qa-execute-snippets.test.mjs`. Command: `node --test shared/resources/tests/qa-execute-snippets.test.mjs`. Run on the `.249` server (`ci@192.168.1.249`), not the laptop.

**Differential**: `npm run qa-snippets:differential -- --atoms all --seed 1 --count 4000` on `.249`; the result is 0 writes.

**Docs scan**: `npm run qa-snippets:docscan`; the newly-refused list goes in a QA report.

**Timing** (obs #31): the docs scan and differential medians are taken over at least five runs, with `uptime` beside each, outliers reported not dropped, on head or a tree-equivalent commit.

**Control case**: the control table (safe blocks) varies in every dimension the allow-list keys on, and includes blocks the rule text never mentions.

## 9. Success Criteria

**Functional**

- [ ] The three residual shapes from QA report 9 classify `mutating`, each shown first to write a marker file under real bash. Evidence: the real-bash table in `qa-execute-snippets.test.mjs`.
- [ ] The control table of ordinary safe blocks stays `runnable`.
- [ ] The differential run writes nothing: 0 writes, with the block count recorded in the QA report.

**Performance**

- [ ] The docs-scan median over five runs is within +10% of the pre-change median, with `uptime` recorded beside each run, in the QA report.
- [ ] The differential slice median over five runs is under 10 s, recorded in the QA report with load.

**Code quality**

- [ ] `CI=true` suite green; `prettier --check` and lint pass on every changed `.mjs`.
- [ ] `npm run bundle:check` reports 0 problems.
- [ ] Every change is mutation-proven: the QA report names the reverted behaviour and the red test for each.
- [ ] The two gate-9 cleanups are done, each mutation-proven (QA report).

**Migration**

- [ ] `CHANGELOG.md` cites `(task 294)`.
- [ ] Every documentation block newly refused is listed in the QA report with its reason (the count is stated and the number of newly runnable blocks is 0).

## 10. Risk Assessment

**High**

1. **Over-refusal turns the runner into a no-op.**
   - Risk: a strict allow-list refuses most of the 256 runnable docs blocks.
   - Probability: Medium. Impact: High (QA stops running snippets).
   - Mitigation: Phase 1 measures each candidate list against the 256 before choosing; the Phase 4 docs-scan reports the cost.
   - Rollback: revert the word check; task 293's rules still hold.

**Medium**

2. **The allow-list has its own gap.**
   - Risk: a word class is admitted that bash evaluates.
   - Probability: Medium. Impact: High.
   - Mitigation: default-deny by construction; the differential with the three residual atoms; an independent QA gate.

**Low**

3. **Reason-string churn** breaks a test that pins a reason. Mitigation: grep `not-allow-listed` and the existing reasons before renaming.

## 11. Rollback Plan

**Immediate (< 1 hour)**: `git revert` the merge commit. The classifier returns to task 293's behaviour (three residuals open, documented).

**Partial**: revert only the Phase 3 word check, keep Phase 2 tests marked as expected failures and the Phase 5 cleanups.

**Forward fix**: if the docs-scan cost is high but safe, narrow the admitted-word list rather than reverting.

**Triggers**

- Critical: any block that classifies `runnable` and writes under the differential; revert.
- Non-critical: a documentation block refused unexpectedly; fix forward by rewriting the block or widening the list with a test.

---

## Progress Tracking

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-10 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

## References

- [task 293](../task.293.qa-snippet-classifier-indirect-evaluation/task.293.qa-snippet-classifier-indirect-evaluation.md), PR #870
- [QA report 9](../task.293.qa-snippet-classifier-indirect-evaluation/task.293.qa.9.qa-snippet-classifier-indirect-evaluation.md)
- [gate 9](../task.293.qa-snippet-classifier-indirect-evaluation/task.293.gate.9.qa-snippet-classifier-indirect-evaluation.yml), `recommendations.future`

## Notes

QA artefacts land beside this file: `task.294.qa.N.*.md`, `task.294.gate.N.*.yml`, bug reports `task.294.bug.N.*.md`.
