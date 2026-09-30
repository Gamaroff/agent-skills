---
id: task.168
title: "[Task 168] Harden task.135's gate-head scoping"
type: task
description: "Close the six advisory follow-ups task.135 left: validate a gate's head before the re-review trigger counts from it, pass the scope list as literal paths, recompute safety clause 1 in Step 3b from one bundled script, refuse to scope past an uncommitted fix, read qa-cycle.sh's refusal instead of discarding it, and make the freshness test's field reader agree with the shell's."
tags: [qa-loop, qa-task, qa-story, scoping, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-09-30
updated: 2026-09-30
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 533
---

# Technical Task: Harden task.135's gate-head scoping

**Status:** Planned
**GitHub Issue**: [#533](https://github.com/Gamaroff/agent-skills/issues/533)

---

## 1. Overview

Task.135 (PR #531, merged `ea88e5a7`) made QA gates record the commit they judged (`head:`) and moved the cycle-3+ re-review scope and `qa-task`'s re-review trigger onto it. Its last gate (`task.135.gate.4`, CONCERNS 90) and its 5c PR review (`task.135.pr-review.1`, APPROVE) carried six findings forward as advisory. Each is small; together they are the difference between a scope that is right on the path the tests walk and one that is right on the paths an agent actually takes. This task closes all six.

**Scope**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `shared/resources/qa-re-review-scope.md` (the one byte-identical scope block and the clause-1 section), one new bundled script for clause 1, `shared/resources/tests/gate-head-freshness.test.mjs`, `shared/resources/tests/qa-scope-from-head.test.mjs`, `evals/shared/tests/qa-re-review-scope-parity.test.mjs`, bundled copies, CHANGELOG.

**Key deliverables**: (1) the trigger counts from a head only after proving it is a 40-hex commit on this branch; (2) the scoped diff treats every file name literally; (3) safety clause 1 lives in one script that Phase 0 step 5 and Step 3b both call, so Step 3b no longer trusts a bound value for the mechanical clause; (4) Step 3b HALTs when a fix is still uncommitted; (5) every `qa-cycle.sh --path gate` rebind reads the helper's exit status; (6) `field()` and the shell's sed read `head:` identically.

**Expected outcome**: no cycle-3+ scope, and no re-review skip, depends on an agent typing a value correctly or on a file name being ordinary.

---

## 2. Motivation

### Current Problems

- **A malformed head reads as "nothing moved" forever (CR4-1).** `skills/qa-task/SKILL.md:213` counts `git rev-list --count "$GATE_HEAD"..HEAD`. A hand-typed `head: HEAD` gives 0 on every run, so a PASS gate skips re-review whatever lands after it. The Step 3b block rejects the same heads (it HALTs); the trigger does not.
- **A file named with a leading `:` leaves the scope (CR4-2).** `shared/resources/qa-re-review-scope.md:257` (and `qa-task/SKILL.md:498`, `qa-story/SKILL.md:968`) run `git diff "$BASE...HEAD" -- "${FILES[@]}"`. `FILES` are pathspecs, so `:README.md` is magic and `:!x` is an exclude. Task.135 fixed the C-quoting half of this (CR3-6); the pathspec half remains.
- **Step 3b trusts the agent's `SAFETY_REPROBE` for the clause that is mechanical (CR3-4).** Task.135 made the scope block refuse to run with `SAFETY_REPROBE` unbound (`qa-re-review-scope.md:224`), but a bound `false` after a security-FAIL gate still narrows. Clause 1 is computed by an awk probe that exists as a fenced block (`qa-re-review-scope.md:107`, `qa-task/SKILL.md:302`, `qa-story/SKILL.md:506`) and cannot be called from another block.
- **An uncommitted fix is never shown to the reviewer (CR3-7).** The scope reads `<head>..HEAD` for the file list and `BASE...HEAD` for the patch — committed history only — while the Phase 0 trigger (task.135 CR2-5) counts uncommitted changes as movement. A re-review triggered by an uncommitted fix reviews everything except that fix.
- **A `qa-cycle.sh` refusal reads as "no gate" (5c CR-1).** Phase 0 steps 2 and 5 rebind `LATEST_GATE` with `qa-cycle.sh … --path gate 2>/dev/null` and ignore the exit code (`qa-task/SKILL.md:177`, `:291`; `qa-story/SKILL.md:254`, `:495`). Two files claiming one cycle make the helper refuse; step 5 then reports `SAFETY_REPROBE=false` with no warning. Step 1 (`qa-task/SKILL.md` "rc 1 = the helper REFUSED") already distinguishes these states.
- **The freshness test and the shell disagree on one shape (5c CR-2).** `gate-head-freshness.test.mjs:48` `field()` strips quotes before trimming. Verified: `head: 'abc'  ` reads `abc'` in `field()` and `abc` in the shell sed (`qa-task/SKILL.md:205`). A gate the QA blocks accept fails the corpus test.

### Benefits

- The re-review trigger, the scope and the safety carve-out each fail toward review on every malformed input, not only on the ones the task.135 tests named.
- Clause 1 gets one definition, as the gate cycle number did with `qa-cycle.sh` (task.121, task.158).
- The two readers of `head:` cannot disagree.

---

## 3. Technical Background

### Current Architecture

- **Trigger** (`skills/qa-task/SKILL.md:205-221`): `GATE_HEAD` from the gate's `head:` line; `CODE_MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- . ":(exclude)$TASK_DIR" … || echo 1)` (`:213`); no format, existence or ancestry check.
- **Scope block** (`shared/resources/qa-re-review-scope.md` § "What the trigger changes", byte-identical in both skills' Step 3b; test E in `qa-scope-from-head.test.mjs` pins the three copies): refuses an unbound `SAFETY_REPROBE` (`:224`), validates `LAST_GATE_HEAD` with `cat-file -e` and `merge-base --is-ancestor`, reads `FILES` NUL-delimited, then `git diff "$BASE...HEAD" -- "${FILES[@]}"` (`:257`).
- **Clause 1** (`qa-re-review-scope.md:107` block, verbatim in `qa-task/SKILL.md:302` and `qa-story/SKILL.md:506`): an awk program over the gate's `nfr_validation.security` block, with three transit constraints (no whole-record variable, no apostrophe, no GNU-only escape). `evals/shared/tests/qa-re-review-scope-parity.test.mjs` `extractProbe()` (`:341`) requires exactly one such block in the shared rule and executes it against real gates (the replay tests).
- **Helper** `shared/resources/qa-cycle.sh`: `--path gate` prints the latest gate or refuses (rc 1 with a stderr reason) when no numbered gate exists or two files claim one cycle.
- **Freshness test** (`shared/resources/tests/gate-head-freshness.test.mjs:48` `field()`): `.replace(/\s+#.*$/, "").replace(/^['"]|['"]$/g, "").trim()`.

### Target Architecture

- **Trigger**: before counting, `GATE_HEAD` must match `^[0-9a-f]{40}$`, resolve (`git cat-file -e "$GATE_HEAD^{commit}"`) and be an ancestor of `HEAD`; any failure sets `CODE_MOVED=1` and prints why. Same failure direction as the existing `|| echo 1`.
- **Scope block**: `git --literal-pathspecs diff "$BASE...HEAD" -- "${FILES[@]}"`; and, before scoping, a HALT when `git status --porcelain` shows a tracked or untracked change outside the work-item directory ("commit the fix before re-review — the scope reads committed history"). The work-item directory reaches the shared block as `$WORK_ITEM_DIR`, bound in each skill's preamble (`$TASK_DIR` / `$STORY_DIR`).
- **Clause 1**: 🆕 `shared/resources/qa-safety-clause1.sh <gate-file>` prints `true` or `false` (exit 0), exit 2 on usage; the awk program moves into it unchanged. The shared rule's clause-1 block becomes `SAFETY_REPROBE=false` + a call to the script (still the single block `extractProbe()` finds). Step 3b's preamble calls the same script on its own `$LATEST_GATE` and ORs the result into the bound value: `true` from the script can never be overridden by a bound `false`; a bound `true` (clauses 2–3) still stands.
- **Helper rebinds**: the two-call pattern Phase 0 step 1 already uses. `qa-cycle.sh <dir>` first: empty with rc 1 → no gate (first review); rc ≥ 2 → HALT (broken invocation). A cycle number → `qa-cycle.sh <dir> --path gate` must exit 0; rc 1 there is a refusal (`qa-cycle.sh` exits 1 both for "no file" and for "two files claim one cycle", so only the first call can tell them apart) → HALT naming the helper's stderr line. Stderr is kept.
- **`field()`**: trim, then strip one pair of surrounding quotes, then trim — the sed's order.

### Important Clarifications

- **Same-class mechanism inventory** (review-task check 6): the trigger already has one failure-direction mechanism (`|| echo 1`), which the head validation **extends**; the scope block already validates the head (`cat-file -e`, `merge-base`) and the new dirty-tree HALT **sits beside** those checks because it guards a different input (the working tree, not the gate). The clause-1 script **replaces** the three fenced copies of the probe.
- The dirty-tree HALT excludes the work-item directory because a QA cycle writes its own report and gate there before Step 3b runs.
- `extractProbe()` must still find exactly one block in the shared rule; the transit-constraint tests move from the block's text to the script's text.

---

## 4. Scope

### In Scope

✅ `skills/qa-task/SKILL.md` — Phase 0 steps 2, 3, 5; Step 3b preamble
✅ `skills/qa-story/SKILL.md` — Phase 0 steps 2, 5; Step 3b preamble
✅ `shared/resources/qa-re-review-scope.md` — clause-1 block, scope block, prose
✅ 🆕 `shared/resources/qa-safety-clause1.sh` — clause 1, one definition
✅ `shared/resources/tests/gate-head-freshness.test.mjs`, `shared/resources/tests/qa-scope-from-head.test.mjs`, 🆕 `shared/resources/tests/qa-safety-clause1.test.mjs`
✅ `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — `extractProbe()` and the transit-constraint tests onto the script
✅ `npm run bundle`; CHANGELOG

### Out of Scope

❌ Clauses 2 and 3 of the safety trigger — judgement calls; they stay agent-bound inputs
❌ The pre-existing BSD `mktemp` template in Step 3b — observation #181, fixed separately (PR #532)
❌ Any change to the gate schema

---

## 5. Breaking Changes

None — API stable. The scope block gains a HALT (uncommitted change outside the work item) on a state that previously reviewed the wrong code; a develop-pipeline run always commits a fix before re-review, so it does not reach it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.168.plan.gate-head-scoping-hardening.md](task.168.plan.gate-head-scoping-hardening.md)

### Phase 1: Trigger validates its head; helper rebinds read rc (CR4-1, 5c CR-1)

**Risk**: Low
**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [ ] Trigger: 40-hex + `cat-file -e` + `merge-base --is-ancestor` before `rev-list`; any failure → `CODE_MOVED=1` with the reason printed
- [ ] Every `qa-cycle.sh --path gate` rebind in Phase 0 steps 2 and 5 (both skills) captures `rc`, keeps stderr, HALTs on a refusal that is not "no gate"
- [ ] Tests: `head: HEAD` and an off-branch head each read `CODE_MOVED=1` (bash + zsh); a two-files-one-cycle directory HALTs step 5 instead of printing `SAFETY_REPROBE=false`

### Phase 2: One clause-1 script (CR3-4)

**Risk**: Medium (moves a probe with three silent-failure constraints)
**Files**: 🆕 `shared/resources/qa-safety-clause1.sh`, `shared/resources/qa-re-review-scope.md`, both SKILL.md, `evals/shared/tests/qa-re-review-scope-parity.test.mjs`, 🆕 `shared/resources/tests/qa-safety-clause1.test.mjs`

- [ ] Move the awk program into the script unchanged; the shared rule's block calls it; the two skills' step-5 blocks call their bundled copy
- [ ] Step 3b preamble (both skills) computes clause 1 from its own `$LATEST_GATE` and ORs it into `SAFETY_REPROBE`
- [ ] `extractProbe()` still finds one block; replay and transit-constraint tests read the script
- [ ] Test: a security-FAIL prior gate with `SAFETY_REPROBE=false` bound runs Step 3b whole-branch

### Phase 3: Scope block — literal paths, uncommitted fix; `field()` (CR4-2, CR3-7, 5c CR-2)

**Risk**: Low
**Files**: `shared/resources/qa-re-review-scope.md`, both SKILL.md (Step 3b, byte-identical), `shared/resources/tests/qa-scope-from-head.test.mjs`, `shared/resources/tests/gate-head-freshness.test.mjs`

- [ ] `git --literal-pathspecs diff` in the scoped arm; fixture with a file named `:colon.sh`
- [ ] Dirty-tree HALT outside `$WORK_ITEM_DIR`, bound in each preamble; fixture with an uncommitted fix
- [ ] `field()` trims before unquoting; fixture `head: '<sha>'  ` with trailing spaces
- [ ] Test E still passes (three copies identical)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-task/SKILL.md` — Phase 0 steps 2, 3, 5; Step 3b preamble
2. ✅ `skills/qa-story/SKILL.md` — Phase 0 steps 2, 5; Step 3b preamble
3. ✅ `shared/resources/qa-re-review-scope.md` — clause-1 block, scope block
4. 🆕 `shared/resources/qa-safety-clause1.sh` — clause 1

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/qa-scope-from-head.test.mjs`
6. ✅ `shared/resources/tests/gate-head-freshness.test.mjs`
7. 🆕 `shared/resources/tests/qa-safety-clause1.test.mjs`
8. ✅ `evals/shared/tests/qa-re-review-scope-parity.test.mjs`

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md` — [Unreleased] › Fixed
10. ✅ `skills/*/references/` — regenerated (`npm run bundle`; the new script is bundled into `qa-task` and `qa-story`)

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: every new branch executed from the shipped fences under bash and zsh, in scratch repositories — the `qa-scope-from-head.test.mjs` pattern.
- **Mutation proofs**: one per finding — remove the head validation (the `head: HEAD` test goes red), drop `--literal-pathspecs` (`:colon.sh` red), drop the clause-1 OR in Step 3b (security-FAIL test red), drop the dirty-tree HALT (uncommitted-fix test red), restore `2>/dev/null` without rc (two-gates test red), restore the old `field()` order (trailing-space test red).
- **Command**: `npm run ci:fast`; the three suites directly with `command node --test`.

### Integration Tests

- `npm run eval:develop-task`, `npm run eval:develop-story` — replay fixtures with schema-1 gates stay green.

### Performance Tests

Not applicable — one extra `git status` and one script call per cycle.

### Consumer Tests

- A consumer on schema-1 gates only: unchanged behaviour (clause 1 still reads their security block; the head checks never run).

---

## 9. Success Criteria

### Functional

- [ ] A gate whose `head:` is not a 40-hex commit on this branch makes the trigger report `CODE_MOVED=1`
- [ ] A changed file whose name begins with `:` stays in the cycle-3+ patch
- [ ] After a security-FAIL gate, Step 3b runs whole-branch even when `SAFETY_REPROBE=false` is bound
- [ ] Step 3b HALTs when a change outside the work item is uncommitted
- [ ] A `qa-cycle.sh` refusal in Phase 0 steps 2 and 5 is a HALT naming the helper's reason, never "no gate"
- [ ] `field()` and the shell sed read `head: '<sha>'  ` identically

### Performance

- [ ] Not applicable

### Code Quality

- [ ] Six mutation proofs recorded; test E and `extractProbe()` green; `npm run validate -- skills/qa-task/` and `skills/qa-story/` clean

### Migration

- [ ] CHANGELOG [Unreleased] › Fixed names the six fixes; no consumer migration

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Moving the clause-1 probe breaks one of its silent-failure constraints**
   - **Risk**: an apostrophe, a whole-record variable or a GNU-only escape in the moved awk makes BSD awk return empty — the carve-out stops firing and nothing says so (the history in `qa-re-review-scope.md` § "Transit constraints").
   - **Probability**: Low · **Impact**: High
   - **Mitigation**: move the program byte-for-byte; move the transit-constraint and replay tests onto the script in the same phase; run them under the macOS awk.

### Low Risk Areas

1. **The dirty-tree HALT fires on a standalone QA run with unrelated local edits** — it names the paths; the operator commits or stashes. The develop pipeline commits before every cycle.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a QA cycle HALTs on a healthy branch; clause 1 stops firing on a security-FAIL replay gate.
- **Steps**: revert the offending phase's commit; `npm run bundle`; push.
- **Validation**: `qa-re-review-scope-parity.test.mjs` and `qa-scope-from-head.test.mjs` green.

### Partial Rollback (1-2 hours)

- **When to use**: only the dirty-tree HALT proves too strict for standalone use — revert it alone and keep the other five.

### Rollback Triggers

- **Critical**: the safety carve-out stops firing.
- **Non-critical**: HALT wording.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-30 | 1.0 | Initial draft — task.135 follow-ups (gate.4 recommendations.future CR4-1, CR4-2, CR3-4, CR3-7; pr-review.1 CR-1, CR-2) | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: trigger validates its head; helper rebinds read rc
- [ ] Phase 2: one clause-1 script
- [ ] Phase 3: literal paths, uncommitted fix, `field()`
- [ ] QA: `task.168.qa.[N].gate-head-scoping-hardening.md`
- [ ] Gate: `task.168.gate.[N].gate-head-scoping-hardening.yml`

## References

- task.135 — `docs/tasks/task.135.gate-scoping-from-recorded-head/` (PR #531): `task.135.gate.4.gate-scoping-from-recorded-head.yml` § recommendations.future; `task.135.pr-review.1.gate-scoping-from-recorded-head.md` CR-1, CR-2
- `shared/resources/qa-cycle.sh` — the one-definition precedent (task.121, task.158)
- Observation #181 — BSD `mktemp` (out of scope; PR #532)

## Notes

- QA artifacts land beside this file: `task.168.qa.[N].*.md`, `task.168.bug.[N].*.md`, `task.168.gate.[N].*.yml`.
- Effort recorded as 4h at the author's choice; the rubric with the clause-1 script move suggested 8h.
