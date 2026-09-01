---
id: task.74
title: "[Task 74] A security re-review must re-probe, not re-read"
type: task
description: "qa-task and qa-story scope a re-review to files changed since the last gate. That is right for efficiency and wrong after a security FAIL: QA cycle 2 confirmed 13 holes closed, found nothing new, and the DoD gate then found 14 more of the same class. Add a carve-out so a re-review after a security failure searches unscoped."
tags: [qa, re-review, security, scoping, verification]
category: infrastructure
status: ready-for-development
priority: High
risk_level: medium
created: 2026-09-01
updated: 2026-09-01
assignee:
estimated_effort_hours: 5
---

# Technical Task: A security re-review must re-probe, not re-read

**Status:** Ready for Development

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

`qa-task` / `qa-story` Phase 0 decides skip-vs-re-review from the prior gate, then — on re-review —
derives `LAST_GATE_DATE` from the gate's `updated:` field and scopes both the file set and the Step 3b
diff review to files changed since:

```bash
FILES=$(git log --since="$LAST_GATE_DATE" --name-only --format="" | sort -u)
[ -n "$FILES" ] && git diff "$BASE...HEAD" -- $FILES > "$DIFF_FILE"
```

### Target architecture

The same flow, plus a **scope decision** taken before that block. When the prior gate failed on a safety
axis, the re-review runs **unscoped** — full branch diff, and the adversarial search repeated from
scratch rather than narrowed to the fix.

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
- [ ] State the rule once, in a shared resource both QA skills reference — the two copies of the
      current rule are already a drift risk and this task should not add a third
- [ ] Trigger: the prior gate has **any** of
      - `nfr_validation.security.status: FAIL`
      - a `top_issues[]` entry with `severity: high` whose finding concerns a boundary (a classifier,
        validator, parser, sanitiser, allow/deny-list, or authorisation check)
      - `gate: FAIL` where the work item's own Success Criteria contain *never*, *must not*,
        *fails closed*, or *refused*
- [ ] Non-trigger, stated explicitly: CONCERNS on performance, reliability or maintainability; a FAIL on
      documentation or coverage. Those re-reviews stay scoped

**Dependencies**: none

---

### Phase 2: The unscoped path

**Risk Level**: Medium

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [ ] Before the `LAST_GATE_DATE` scoping block, evaluate the Phase 1 trigger
- [ ] When it fires: use the **full** `BASE...HEAD` diff, not the since-last-gate subset
- [ ] When it fires: the Step 3b / Phase 1.6 code-review prompt is dispatched with an explicit
      instruction to search the surface again rather than verify the prior findings — the prior findings
      are handled separately by the Re-Review Context table
- [ ] Record the decision in Review Methodology: `Re-review scope: unscoped (prior gate failed on
      security)` or `Re-review scope: since {date} (default)`

**Dependencies**: Phase 1

---

### Phase 3: Ask both questions, and answer both in the report

**Risk Level**: Low

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Changes**:
- [ ] The re-review report keeps the Re-Review Context table (question 1: were they fixed?)
- [ ] It gains a short **New Findings This Cycle** section (question 2: what else is there?), which must
      be present even when empty — `None` is an answer; an absent section is not
- [ ] On an unscoped re-review, a cycle that reports zero new findings must say what was searched, so
      "nothing found" is distinguishable from "nothing looked for"

**Dependencies**: Phase 2

---

### Phase 4: Hold it with a contract test

**Risk Level**: Low

**Files**: `evals/shared/tests/qa-re-review-scope-parity.test.mjs` (new)

**Changes**:
- [ ] Both QA skills reference the shared rule and do not restate the trigger
- [ ] Both carry the unscoped path and the scope-decision recording
- [ ] Both require the New Findings section, and require it when empty
- [ ] The trigger list in the prose matches the one in the shared resource — the drift this repo has
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

5. ✅ `skills/*/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] Rule stated once; both skills reference rather than restate
- [ ] Trigger list identical in prose and shared resource
- [ ] Unscoped path present in both; scope decision recorded
- [ ] New Findings section required, including when empty

**Command**: `node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs`

### Replay Verification

- [ ] Against `task.67.gate.1` (`security: FAIL`) the trigger fires
- [ ] Against a CONCERNS-on-maintainability gate it does not
- [ ] Against `task.67.gate.2` (`security: PASS`, no top_issues) the skip logic is unaffected

### Mutation Proving

- [ ] Remove the security-FAIL trigger → the task.67 replay stops firing
- [ ] Remove the "search again" instruction → the unscoped diff is produced but the prompt still only
      verifies prior findings, which is the half-fix this task must not ship

That second proof matters most: widening the diff without changing the question is the shape of an
apparent fix that changes nothing.

---

## 9. Success Criteria

### Functional

- [ ] A re-review after a security FAIL runs unscoped and searches the surface again
- [ ] A re-review after a non-safety CONCERNS keeps today's scoping
- [ ] The scope decision appears in Review Methodology in both cases
- [ ] The QA report carries a New Findings section, present even when empty

### Regression

- [ ] The `task.67.gate.1` state triggers the carve-out
- [ ] The skip-re-review path (clean PASS, unchanged code and doc) is unaffected
- [ ] Artifact numbering and gate schema unchanged

### Safety

- [ ] The trigger cannot be satisfied by a gate that merely has issues — it requires a safety axis
- [ ] An unscoped cycle reporting zero new findings states what was searched

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

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                    | Author      |
| ---------- | ------- | -------------------------------------------------------------- | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.67 pipeline retrospective    | create-task |

---

## Progress Tracking

### Phase 1: Trigger
- [ ] Shared resource stating the rule once
- [ ] Trigger and non-trigger cases

### Phase 2: Unscoped path
- [ ] Full diff on trigger
- [ ] Search-again instruction
- [ ] Scope decision recorded

### Phase 3: Both questions
- [ ] New Findings section, required when empty
- [ ] State what was searched

### Phase 4: Contract test
- [ ] Parity held
- [ ] Replay against gate.1 / gate.2
- [ ] Mutation proofs

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
