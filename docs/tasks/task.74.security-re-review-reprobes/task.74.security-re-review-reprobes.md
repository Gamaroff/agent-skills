---
id: task.74
title: "[Task 74] A security re-review must re-probe, not re-read"
type: task
description: "qa-task and qa-story scope a re-review to files changed since the last gate. That is right for efficiency and wrong after a security FAIL: QA cycle 2 confirmed 13 holes closed, found nothing new, and the DoD gate then found 14 more of the same class. Add a carve-out so a re-review after a security failure searches unscoped."
tags: [qa, re-review, security, scoping, verification]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-01
updated: 2026-09-02
assignee:
estimated_effort_hours: 5
---

# Technical Task: A security re-review must re-probe, not re-read

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.74.review.1.security-re-review-reprobes.md` implemented 2026-09-02

---

## 1. Overview

`qa-task` Phase 0 step 5 (`skills/qa-task/SKILL.md:221`) says:

> **For re-reviews: scope to what changed since last gate.**
> …
> `:229` — "Focus re-review on files changed since the last gate. Include a **Re-Review Context**
> section … listing each previous issue and its current status (FIXED / PARTIAL / NOT FIXED)."

`qa-story` carries the same rule. It is a good rule: re-reviewing everything on every cycle is wasteful,
and the Re-Review Context table is genuinely useful.

But it silently changes the **question** a re-review asks. Cycle 1 asks *"what is wrong here?"* Cycle 2
asks *"were those things fixed?"* — and nothing asks the first question again.

**Scope**: a carve-out for the case where that substitution is unsafe, in both QA skills. No change to
the gate schema, the artifact numbering, or the default scoping.

---

## 2. Motivation

### Current Problems

1. **Measured on task 67.** Cycle 1 found **13 fail-open holes** in a safety boundary and returned FAIL.
   `qa-fix` closed all 13. Cycle 2 re-tested those 13, confirmed them closed, found **nothing new**, and
   returned PASS 90/100 with `security: PASS`. The DoD gate then found **14 more of the same class** —
   including two commands the code deny-listed **by name**.
2. **Cycle 2 was not wrong.** It did exactly what the scoping rule asks. It re-asked the question that
   had already been answered.

   > **What has since changed, and what has not.** `61197c3` (2026-09-01) gave *cycle 2* a full-branch
   > diff and a refute directive on every work item, so the exact cycle measured above would now behave
   > differently. That is not this task, and it does not close this task — see §3 "The residual gap".
   > The incident stays here because it is how the class was found, not because the specific cycle is
   > still unguarded.
3. **The scoping rule is load-bearing in the wrong direction here.** After a security FAIL, the files
   changed since the last gate are precisely the *fixes* — so the re-review inspects the patch and not
   the surface the patch was meant to protect.
4. **A fix cycle changes the attack surface it did not touch.** Closing 13 holes rewrote the classifier's
   tokenizer; the 14 later holes ran through code paths the diff never went near, but whose behaviour
   the diff altered. Diff-scoping cannot see that by construction.
5. **The failure is silent and it looks like success.** Two green gates in a row read as converging
   evidence. They were one piece of evidence, counted twice.

### Benefits

1. **Closes the specific hole that let 14 defects reach the DoD gate**, on the only project where it has
   so far been measured — which is this one.
2. **Costs nothing on the common path.** The carve-out is conditional; an ordinary re-review after a
   CONCERNS on maintainability keeps today's scoping exactly.
3. **Makes the two questions explicit.** "Were the findings fixed?" and "what else is there?" are
   different reviews, and naming both is what stops one silently standing in for the other.

---

## 3. Technical Background

### Current architecture

> **Corrected 2026-09-02 by `review-task`.** This section originally described the scoping as
> unconditional. It was overtaken by `61197c3` — *feat(qa-loop): give the QA loop a stall guard, and
> close the traps that fed it* — which landed on `develop` on 2026-09-01, the same day this task was
> filed. Read the live block before implementing: `skills/qa-task/SKILL.md:299`,
> `skills/qa-story/SKILL.md:770`.

`qa-task` / `qa-story` Phase 0 decides skip-vs-re-review from the prior gate. Step 3b then chooses the
diff scope from a **three-way branch on the number of gates that already exist**, and sets a
`REFUTE_PASS` flag that the code-review subagent prompt reads:

| Cycle | `PRIOR_GATES` | Diff scope | `REFUTE_PASS` | Instruction to the subagent |
| ----- | ------------- | ------------------------- | ------------- | ------------------------------------------- |
| 1     | 0             | whole branch              | `false`       | ordinary adversarial review                 |
| 2     | 1             | **whole branch**          | **`true`**    | **refute — "find the claim that is FALSE"** |
| 3+    | ≥2            | since `LAST_GATE_DATE`    | `false`       | ordinary re-review                          |

```bash
PRIOR_GATES=$(ls "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | wc -l | tr -d ' ')
LAST_GATE_DATE=$(grep -E '^updated:' "$LATEST_GATE" 2>/dev/null | head -1 | sed -E "s/updated:[[:space:]]*//; s/['\"]//g")
if [ "$PRIOR_GATES" -ge 2 ] && [ -n "$LAST_GATE_DATE" ]; then   # cycle 3+ — scope to files changed since last gate
  REFUTE_PASS=false
  FILES=$(git log --since="$LAST_GATE_DATE" --name-only --format="" | sort -u)
  [ -n "$FILES" ] && git diff "$BASE...HEAD" -- $FILES > "$DIFF_FILE"
else                                                             # first review, or cycle 2 — whole branch diff
  [ "$PRIOR_GATES" = "1" ] && REFUTE_PASS=true || REFUTE_PASS=false
  git diff "$BASE...HEAD" > "$DIFF_FILE" 2>/dev/null || git diff "origin/develop...HEAD" > "$DIFF_FILE"
fi
```

### The residual gap

`61197c3` covers **cycle 2 on every work item**, keyed on the *cycle number*. This task is about the
prior gate's *safety state*, which is a different key, and two gaps survive:

**(a) Cycle 3 and later after a safety failure are still diff-scoped.** A work item whose security FAIL
is not closed on the first attempt gets cycles 3, 4 and 5 narrowed to the fixes — the same substitution
`61197c3` removed from cycle 2, reappearing one cycle later on exactly the items most likely to need it.

**(b) The refute directive is anchored on the fixes, not on the surface.** It instructs the subagent to
*"start with the fixes from the previous QA cycle"*. That is the right emphasis for a general cycle-2
pass and the wrong one after a safety failure, where the point is that the fixes changed the behaviour of
code the diff never touched. "Re-read the repairs adversarially" and "re-probe the boundary" are not the
same instruction.

### Target architecture

The same flow, plus a **scope decision** evaluated as part of the existing branch — not in front of it.
When the prior gate failed on a safety axis, the re-review runs **unscoped at any cycle**: full branch
diff, and the adversarial search repeated from scratch rather than narrowed to the fix.

### Important clarifications

- **This is not "always re-review everything".** The trigger is narrow and named.
- **It is not only about the diff.** Widening the diff is necessary but insufficient; the *instruction*
  must also change, from "verify these findings are fixed" to "verify these findings are fixed **and**
  search the surface again as if for the first time".
- **The Re-Review Context table stays.** It is the useful half of the current rule.

---

## 4. Scope

### In Scope

✅ **Trigger definition** — which prior-gate states force an unscoped re-review
✅ **Unscoped path** in Phase 0 of both QA skills — full diff, and a re-run of the adversarial search
✅ **The instruction change** — both questions asked, and both answered in the report
✅ **Recording the scope decision** in the QA report's Review Methodology

### Out of Scope

❌ **Removing diff-scoping for ordinary re-reviews** — it is correct and stays the default
❌ **Changing the gate schema, quality-score formula, or artifact numbering**
❌ **The DoD-side probe mode** — that is `task.73`, a different gate
❌ **Retro-running against historical gates**

---

## 5. Breaking Changes

None. A re-review whose prior gate did not fail on a safety axis behaves exactly as today.

---

## 6. Implementation Plan

### Phase 1: Define the trigger

**Risk Level**: Low

**Files**: `shared/resources/qa-re-review-scope.md` (new)

**Changes**:
- [x] State the rule once, in a shared resource both QA skills reference — the two copies of the
      current rule are already a drift risk and this task should not add a third
- [x] Trigger: the prior gate has **any** of
      - `nfr_validation.security.status: FAIL`
      - a `top_issues[]` entry with `severity: high` whose finding concerns a boundary (a classifier,
        validator, parser, sanitiser, allow/deny-list, or authorisation check)
      - `gate: FAIL` where the work item's own Success Criteria contain *never*, *must not*,
        *fails closed*, or *refused*
- [x] Non-trigger, stated explicitly: CONCERNS on performance, reliability or maintainability; a FAIL on
      documentation or coverage. Those re-reviews stay scoped

**Dependencies**: none

---

### Phase 2: The unscoped path

**Risk Level**: Medium

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [x] **Extend the existing `PRIOR_GATES` conditional — do not add a second one in front of it.** The
      live block already computes `DIFF_FILE` and `REFUTE_PASS` in one place (§3). Evaluate the Phase 1
      trigger into a variable (e.g. `SAFETY_REPROBE`) and add it as a disjunct on the narrowing guard,
      so the cycle-3+ branch is taken only when the trigger has *not* fired:

      ```bash
      if [ "$PRIOR_GATES" -ge 2 ] && [ -n "$LAST_GATE_DATE" ] && [ "$SAFETY_REPROBE" != "true" ]; then
      ```

      Two independent blocks each assigning `DIFF_FILE` is the failure mode to avoid; the second would
      silently win and the first would look implemented.
- [x] When it fires: use the **full** `BASE...HEAD` diff, not the since-last-gate subset
- [x] **Define what `REFUTE_PASS` is when the trigger fires**, since the subagent prompt reads it. The
      safety re-probe instruction is *additional to* and distinct from the cycle-2 refute directive —
      state whether they compose (both appended) or whether the safety instruction replaces it. Leaving
      this undefined is how cycle 2 after a security FAIL ends up with two conflicting directives.
- [x] When it fires: the Step 3b / Phase 1.6 code-review prompt is dispatched with an explicit
      instruction to search the surface again rather than verify the prior findings — the prior findings
      are handled separately by the Re-Review Context table
- [x] Record the decision in Review Methodology: `Re-review scope: unscoped (prior gate failed on
      security)` or `Re-review scope: since {date} (default)`

**Dependencies**: Phase 1

---

### Phase 3: Ask both questions, and answer both in the report

**Risk Level**: Low

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [x] The re-review report keeps the Re-Review Context table (question 1: were they fixed?)
- [x] It gains a short **New Findings This Cycle** section (question 2: what else is there?), which must
      be present even when empty — `None` is an answer; an absent section is not
- [x] On an unscoped re-review, a cycle that reports zero new findings must say what was searched, so
      "nothing found" is distinguishable from "nothing looked for"

**Dependencies**: Phase 2

---

### Phase 4: Hold it with a contract test

**Risk Level**: Low

**Files**: `evals/shared/tests/qa-re-review-scope-parity.test.mjs` (new)

**Changes**:
- [x] Both QA skills reference the shared rule and do not restate the trigger
- [x] Both carry the unscoped path and the scope-decision recording
- [x] Both require the New Findings section, and require it when empty
- [x] The trigger list in the prose matches the one in the shared resource — the drift this repo has
      seen before between a rule and its two consumers

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/qa-re-review-scope.md` — the rule, stated once
2. ✅ `evals/shared/tests/qa-re-review-scope-parity.test.mjs`

### Files to Modify

3. ✅ `skills/qa-task/SKILL.md` — Phase 0 scope decision, report section
4. ✅ `skills/qa-story/SKILL.md` — same

### Files Regenerated

5. ✅ `skills/qa-task/references/qa-re-review-scope.md`, `skills/qa-story/references/qa-re-review-scope.md` —
   `npm run bundle` output (the bundler also rewrites `shared/resources/qa-re-review-scope.md` →
   `references/qa-re-review-scope.md` inside both `SKILL.md` files, which is why the parity test
   accepts either spelling of the link)

### Files NOT changed, and why

- `package.json` — no edit needed. `evals/shared/tests/*.test.mjs` is already in the `npm test`
  glob, so the new parity test runs under `npm run ci`. Verified by running it there, not by
  reading the glob.

---

## 8. Testing Strategy

### Contract Tests

- [x] Rule stated once; both skills reference rather than restate
- [x] Trigger list identical in prose and shared resource
- [x] Unscoped path present in both; scope decision recorded
- [x] New Findings section required, including when empty

**Command**: `node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs`

### Replay Verification

- [x] Against `task.67.gate.1` (`security: FAIL`) the trigger fires
- [x] Against a CONCERNS-on-maintainability gate it does not
- [x] Against `task.67.gate.2` (`security: PASS`, no top_issues) the skip logic is unaffected

### Mutation Proving

- [x] Remove the security-FAIL trigger → the task.67 replay stops firing
- [x] Remove the "search again" instruction → the unscoped diff is produced but the prompt still only
      verifies prior findings, which is the half-fix this task must not ship
- [x] **Remove the trigger and replay at cycle 3** (`PRIOR_GATES=2`, prior gate `security: FAIL`) → the
      re-review reverts to since-last-gate scoping

That second proof matters most: widening the diff without changing the question is the shape of an
apparent fix that changes nothing.

> **Run the second proof at cycle 3, not cycle 2.** At cycle 2 `REFUTE_PASS` is already `true` from
> `61197c3`, so an adversarial instruction reaches the subagent whether or not this task's change is
> present — the mutation would pass for a reason that has nothing to do with the code under proof. The
> third proof exists to isolate the new trigger from the pre-existing cycle-2 carve-out; without it, all
> three proofs could pass on a change that does nothing at cycle 3+, which is the only place the gap is.

---

## 9. Success Criteria

### Functional

- [x] A re-review after a security FAIL runs unscoped and searches the surface again
- [x] **A cycle-3+ re-review after a security FAIL runs unscoped** — the gap `61197c3` left open (§3)
- [x] `REFUTE_PASS` has a defined value when the safety trigger fires, and the two instructions do not
      conflict
- [x] A re-review after a non-safety CONCERNS keeps today's scoping
- [x] The scope decision appears in Review Methodology in both cases
- [x] The QA report carries a New Findings section, present even when empty

### Regression

- [x] The `task.67.gate.1` state triggers the carve-out
- [x] The skip-re-review path (clean PASS, unchanged code and doc) is unaffected
- [x] Artifact numbering and gate schema unchanged

### Safety

- [x] The trigger cannot be satisfied by a gate that merely has issues — it requires a safety axis
- [x] An unscoped cycle reporting zero new findings states what was searched

---

## 10. Risk Assessment

### High Risk Areas

**1. Cost — an unscoped re-review on every cycle of a long QA loop**

- **Risk**: a work item that fails security repeatedly re-reviews the whole diff each cycle.
- **Probability**: Medium.
- **Impact**: Major — QA cycles are the slowest part of the pipeline.
- **Mitigation**: the trigger is the *prior gate's* state, so once security passes the scoping returns to
  default. A run that keeps failing security should be expensive.
- **Rollback**: remove the trigger; scoping reverts.

### Medium Risk Areas

**1. The trigger is too narrow and misses a class**

- **Risk**: a boundary defect that produced a `CONCERNS` rather than a `FAIL` keeps the old scoping.
- **Impact**: Moderate — the defect this task exists to prevent, at lower severity.
- **Mitigation**: the third trigger clause keys on the *work item's own* Success Criteria vocabulary
  rather than only on the gate, so a boundary is recognised even when the gate was lenient.

**2. Two copies of the rule drift**

- **Risk**: `qa-task` and `qa-story` already carry the current scoping rule separately.
- **Impact**: Moderate — the exact drift this repo has been bitten by before.
- **Mitigation**: the rule goes in `shared/resources/`; the contract test asserts neither skill restates
  the trigger.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: QA cycles become unacceptably slow; the carve-out fires on work items it should not.

**Steps**: delete the trigger evaluation from both skills' Phase 0. Scoping reverts to
since-last-gate everywhere; the shared resource becomes inert documentation.

**Verification**: a re-review after a security FAIL scopes to the diff, as today.

### Forward Fix (< 4 hours)

Narrow the trigger, or cap the unscoped path to the first re-review after a security FAIL rather than
every subsequent one.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-02
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 2; cycle 1 was CONCERNS 90/100)
**QA Cycles**: 2

### QA Report

- **Cycle 2 (final)**: [task.74.qa.2.security-re-review-reprobes.md](./task.74.qa.2.security-re-review-reprobes.md) · [gate.2](./task.74.gate.2.security-re-review-reprobes.yml) — PASS 100/100
- **Cycle 1**: [task.74.qa.1.security-re-review-reprobes.md](./task.74.qa.1.security-re-review-reprobes.md) · [gate.1](./task.74.gate.1.security-re-review-reprobes.yml) — CONCERNS 90/100

### Test Coverage Summary

- **Tests Executed**: 2200 (`npm run ci:fast`, 2199 pass / 0 fail) + 31 in the new parity suite
- **Phases Verified**: 4/4
- **Critical Issues**: 0 HIGH, 1 MEDIUM, 2 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### QA Fix Cycle 1 — all three findings addressed

| ID | Severity | Status | Fix |
| --- | --- | --- | --- |
| CR-1 | MEDIUM | ✅ Fixed | Probe guarded on `[ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]` plus `</dev/null`; fixed in `shared/resources/` and re-bundled. Three regression tests added and mutation-proven. |
| CR-2 | LOW | ✅ Fixed | Shared rule now read lazily via `ruleText()`, so `the shared rule exists` reports its own assertion instead of an import-time ENOENT. |
| CR-3 | LOW | ✅ Fixed | `extractProbe` uses `matchAll` and asserts exactly one match. |

Suite: 31 → **34 tests**, all passing.

### QA Cycle 2 — refute pass

`PRIOR_GATES=1` → whole-branch diff, `REFUTE_PASS=true`. `SAFETY_REPROBE=false` (gate.1's security axis
was PASS) — the new machinery correctly declined to fire on its own gate.

The refute pass found that **CR-2's fix did not work**: cycle 1 made the shared-rule read lazy but left
`const CLAUSE_1 = extractProbe()` at module level, which calls it at import anyway, so the claimed
change had no observable effect. Filed as **CR-4**, fixed and proven within the cycle. CR-1 and CR-3
verified genuinely closed by executing the shipped blocks **verbatim, indentation preserved**, from all
three files under both shells.

Gate 2: **PASS 100/100**.

### Key Findings

**CR-1 (MEDIUM)** — the clause-1 trigger probe **hangs** when `$LATEST_GATE` is empty: `awk` with no
filename argument falls back to reading stdin and blocks indefinitely. `LATEST_GATE` is empty by
construction on a first review, and only the prose heading *"For re-reviews"* keeps the block from
running then. Reproduced under both `bash` and `zsh`.

Found by **executing** the shipped prose, not by reading it — which is the change this task is about.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                    | Author      |
| ---------- | ------- | -------------------------------------------------------------- | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.67 pipeline retrospective    | create-task |
| 2026-09-02 | 1.1     | Review passed (8/10) — §3 corrected: `61197c3` already gives cycle 2 a full-diff refute pass; task re-aimed at the cycle-3+ residual gap; Phase 2 now composes with the existing branch; third mutation proof added | review-task |
| 2026-09-02 |         | Implemented — 4 files (1 new shared rule, 2 skills, 1 new parity test), 31 tests, 15 mutation proofs | develop |
| 2026-09-02 |         | QA gate CONCERNS (90/100) — 1 medium: clause-1 probe hangs on empty `$LATEST_GATE` | qa-task |
| 2026-09-02 |         | QA findings fixed — CR-1/CR-2/CR-3 closed, 3 regression tests added, 1 iteration | qa-fix |
| 2026-09-02 |         | QA gate PASS (100/100) — cycle 2 refute pass found CR-2's fix ineffective; refiled as CR-4, fixed | qa-task |

---

## Progress Tracking

### Phase 1: Trigger
- [x] Shared resource stating the rule once
- [x] Trigger and non-trigger cases

### Phase 2: Unscoped path
- [x] Full diff on trigger
- [x] Search-again instruction
- [x] Scope decision recorded

### Phase 3: Both questions
- [x] New Findings section, required when empty
- [x] State what was searched

### Phase 4: Contract test
- [x] Parity held
- [x] Replay against gate.1 / gate.2
- [x] Mutation proofs

---

## References

- **The rule being amended**: `skills/qa-task/SKILL.md:221` and `:229`; the same text in `qa-story`
- **The cycle that found nothing**: [`task.67.qa.2.execute-the-skill-qa-gate.md`](../task.67.execute-the-skill-qa-gate/task.67.qa.2.execute-the-skill-qa-gate.md)
- **What it missed**: [`task.67.bug.3.obfuscated-names-and-flag-writes.md`](../task.67.execute-the-skill-qa-gate/task.67.bug.3.obfuscated-names-and-flag-writes.md)
- **Sibling task, same root cause at the DoD gate**: `task.73`
- **Prior-art for one-rule-two-consumers**: `evals/shared/tests/transition-protocol-parity.test.mjs`

---

## Notes

### Important Reminders

- **Widening the diff is half the fix.** The instruction must change too, or the re-review reads more
  code while still only asking whether the previous findings were fixed. The second mutation proof
  exists to catch exactly that half-fix.
- The Re-Review Context table is the good half of the current rule and stays.

### Why this is High priority

Two green gates in a row read as converging evidence. On task 67 they were one piece of evidence counted
twice, and fourteen defects reached the DoD gate behind them.
