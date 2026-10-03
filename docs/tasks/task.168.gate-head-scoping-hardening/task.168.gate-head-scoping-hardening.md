---
id: task.168
title: "[Task 168] Harden task.135's gate-head scoping"
type: task
description: "Close the six advisory follow-ups task.135 left: validate a gate's head before the re-review trigger counts from it, pass the scope list as literal paths, recompute safety clause 1 in Step 3b from one bundled script, refuse to scope past an uncommitted fix, read qa-cycle.sh's refusal instead of discarding it, and make the freshness test's field reader agree with the shell's."
tags: [qa-loop, qa-task, qa-story, scoping, follow-up]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-09-30
updated: 2026-10-03
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 533
---

# Technical Task: Harden task.135's gate-head scoping

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.168.review.1.gate-head-scoping-hardening.md` implemented 2026-10-03
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
- **A file named with a leading `:` leaves the scope (CR4-2).** `shared/resources/qa-re-review-scope.md:257` (and `qa-task/SKILL.md:501`, `qa-story/SKILL.md:975`) run `git diff "$BASE...HEAD" -- "${FILES[@]}"`. `FILES` are pathspecs, so `:README.md` is magic and `:!x` is an exclude. Task.135 fixed the C-quoting half of this (CR3-6); the pathspec half remains.
- **Step 3b trusts the agent's `SAFETY_REPROBE` for the clause that is mechanical (CR3-4).** Task.135 made the scope block refuse to run with `SAFETY_REPROBE` unbound (`qa-re-review-scope.md:224`), but a bound `false` after a security-FAIL gate still narrows. Clause 1 is computed by an awk probe that exists as a fenced block (`qa-re-review-scope.md:107`, `qa-task/SKILL.md:302`, `qa-story/SKILL.md:510`) and cannot be called from another block.
- **An uncommitted fix is never shown to the reviewer (CR3-7).** The scope reads `<head>..HEAD` for the file list and `BASE...HEAD` for the patch — committed history only — while the Phase 0 trigger (task.135 CR2-5) counts uncommitted changes as movement. A re-review triggered by an uncommitted fix reviews everything except that fix.
- **A `qa-cycle.sh` refusal reads as "no gate" (5c CR-1).** Phase 0 steps 2 and 5 rebind `LATEST_GATE` with `qa-cycle.sh … --path gate 2>/dev/null` and ignore the exit code (`qa-task/SKILL.md:177`, `:291`; `qa-story/SKILL.md:254`, `:499`). Two files claiming one cycle make the helper refuse; step 5 then reports `SAFETY_REPROBE=false` with no warning. Step 1 (`qa-task/SKILL.md` "rc 1 = the helper REFUSED") already distinguishes these states.
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
- **Clause 1** (`qa-re-review-scope.md:107` block, verbatim in `qa-task/SKILL.md:302` and `qa-story/SKILL.md:510`): an awk program over the gate's `nfr_validation.security` block, with three transit constraints (no whole-record variable, no apostrophe, no GNU-only escape). `evals/shared/tests/qa-re-review-scope-parity.test.mjs` `extractProbe()` (`:341`) requires exactly one such block in the shared rule and executes it against real gates (the replay tests).
- **Helper** `shared/resources/qa-cycle.sh`: `--path gate` prints the latest gate or refuses (rc 1 with a stderr reason) when no numbered gate exists or two files claim one cycle.
- **Freshness test** (`shared/resources/tests/gate-head-freshness.test.mjs:48` `field()`): `.replace(/\s+#.*$/, "").replace(/^['"]|['"]$/g, "").trim()`.

### Target Architecture

- **Trigger**: before counting, `GATE_HEAD` must match `^[0-9a-f]{40}$`, resolve (`git cat-file -e "$GATE_HEAD^{commit}"`) and be an ancestor of `HEAD`; any failure sets `CODE_MOVED=1` and prints why. Same failure direction as the existing `|| echo 1`.
- **Scope block**: `git --literal-pathspecs diff "$BASE...HEAD" -- "${FILES[@]}"`; and, before scoping, a HALT on every re-review arm (`PRIOR_GATES >= 1`) when a tracked file outside the work-item directory is modified (an untracked file outside it only warns — QA cycle 1, CR-1/CR-2) ("commit the fix before re-review — the scope reads committed history"). The work-item directory reaches the shared block as `$WORK_ITEM_DIR`, bound in each skill's preamble (`$TASK_DIR` / `$STORY_DIR`).
- **Clause 1**: 🆕 `shared/resources/qa-safety-clause1.sh <gate-file>` prints `true` or `false` (exit 0), exit 2 on usage; the awk program moves into it unchanged. The shared rule's clause-1 block becomes `SAFETY_REPROBE=false` + a call to the script (still the single block `extractProbe()` finds). Step 3b's preamble calls the same script on its own `$LATEST_GATE` and ORs the result into the bound value: `true` from the script can never be overridden by a bound `false`; a bound `true` (clauses 2–3) still stands.
- **Helper rebinds**: the two-call pattern Phase 0 step 1 already uses. `qa-cycle.sh <dir>` first: empty with rc 1 → no gate (first review); rc ≥ 2 → HALT (broken invocation). A cycle number → `qa-cycle.sh <dir> --path gate` must exit 0; rc 1 there is a refusal (`qa-cycle.sh` exits 1 both for "no file" and for "two files claim one cycle", so only the first call can tell them apart) → HALT naming the helper's stderr line. Stderr is kept.
- **`field()`**: trim, then strip one pair of surrounding quotes, then trim — the sed's order.

### Important Clarifications

- **Same-class mechanism inventory** (review-task check 6): the trigger already has one failure-direction mechanism (`|| echo 1`), which the head validation **extends**; the scope block already validates the head (`cat-file -e`, `merge-base`) and the new dirty-tree HALT **sits beside** those checks because it guards a different input (the working tree, not the gate). The clause-1 script **replaces** the three fenced copies of the probe.
- The dirty-tree HALT excludes the work-item directory because the pipeline's own bookkeeping sits uncommitted there when Step 3b runs — the implementation report's updates, deferred to Step 8 (QA cycle 2, CR-4). It also excludes `.claude/state/` from both the tracked check and the warning (QA cycle 2, CR-2). It HALTs on **tracked** changes only: develop-pipeline Step 4 holds out-of-scope untracked files aside for the PR commit and restores them into the tree for the whole QA loop, so an untracked file outside the work item is the normal state of a healthy branch — it is named in a warning instead, with `.claude/state/` (the pipeline's own scratch) left out of the warning (review.1 I1; QA cycle 1, CR-1). It runs on every re-review arm, not only the scoped one (QA cycle 1, CR-2).
- `qa-task` Phase 0 step 3 carries a third `qa-cycle.sh --path gate` rebind (`skills/qa-task/SKILL.md:199`). It is **left as is**: it already keeps stderr, and a refusal there leaves `GATE_HEAD` empty, which sets `CODE_MOVED=1` — it already fails toward re-review (review.1 Q2).
- **Bundling closure**: `qa-re-review-scope.md` is bundled into eight skills. The shared rule's clause-1 block calls the script as `.agents/skills/{qa-task|qa-story}/references/qa-safety-clause1.sh` — the invocation spelling the bundler follows only into the skills it names — so the script ships in `qa-task` and `qa-story` alone, the two skills that run it. The parity test points that path at the shared source to execute the block. (Review.1 Q3 accepted eight copies on the premise that a placeholder path could not be executed; develop found the test can resolve it, so the narrower closure was taken.)
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

None — API stable. The scope block gains a HALT on a re-review when a tracked file outside the work item is uncommitted — a state that previously reviewed the wrong code. A develop-pipeline run commits every fix before the next review: a passing fix in its `fix(...)` commit, and — since QA cycle 2, CR-1 — a fix whose fast gate stayed red after two attempts in an unpushed commit (`develop-pipeline-step-5-6-qa-loop.md` §5b step 0a), so it does not reach the HALT.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.168.plan.gate-head-scoping-hardening.md](task.168.plan.gate-head-scoping-hardening.md)

### Phase 1: Trigger validates its head; helper rebinds read rc (CR4-1, 5c CR-1)

**Risk**: Low
**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [x] Trigger: 40-hex + `cat-file -e` + `merge-base --is-ancestor` before `rev-list`; any failure → `CODE_MOVED=1` with the reason printed
- [x] Every `qa-cycle.sh --path gate` rebind in Phase 0 steps 2 and 5 (both skills) captures `rc`, keeps stderr, HALTs on a refusal that is not "no gate"
- [x] Tests: `head: HEAD` and an off-branch head each read `CODE_MOVED=1` (bash + zsh); a two-files-one-cycle directory HALTs step 5 instead of printing `SAFETY_REPROBE=false`

### Phase 2: One clause-1 script (CR3-4)

**Risk**: Medium (moves a probe with three silent-failure constraints)
**Files**: 🆕 `shared/resources/qa-safety-clause1.sh`, `shared/resources/qa-re-review-scope.md`, both SKILL.md, `evals/shared/tests/qa-re-review-scope-parity.test.mjs`, 🆕 `shared/resources/tests/qa-safety-clause1.test.mjs`

- [x] Move the awk program into the script unchanged; the shared rule's block calls it; the two skills' step-5 blocks call their bundled copy
- [x] Step 3b preamble (both skills) computes clause 1 from its own `$LATEST_GATE` and ORs it into `SAFETY_REPROBE`
- [x] `extractProbe()` still finds one block; replay and transit-constraint tests read the script
- [x] Test: a security-FAIL prior gate with `SAFETY_REPROBE=false` bound runs Step 3b whole-branch

### Phase 3: Scope block — literal paths, uncommitted fix; `field()` (CR4-2, CR3-7, 5c CR-2)

**Risk**: Low
**Files**: `shared/resources/qa-re-review-scope.md`, both SKILL.md (Step 3b, byte-identical), `shared/resources/tests/qa-scope-from-head.test.mjs`, `shared/resources/tests/gate-head-freshness.test.mjs`

- [x] `git --literal-pathspecs diff` in the scoped arm; fixture with a root-level file named `:colon.sh` (only a pathspec that begins with `:` is magic)
- [x] Dirty-tree HALT outside `$WORK_ITEM_DIR` and `.claude/state`, `$WORK_ITEM_DIR` bound in each preamble; fixture with an uncommitted fix (HALTs) and one with only an untracked `.claude/state/` file (does not HALT)
- [x] `field()` trims before unquoting; fixture `head: '<sha>'  ` with trailing spaces
- [x] Test E still passes (three copies identical)

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
10. ✅ `skills/*/references/` — regenerated (`npm run bundle`): 🆕 `qa-safety-clause1.sh` in `qa-task` and `qa-story`; `qa-re-review-scope.md` in its eight bundling skills (`develop-story`, `develop-task`, `qa-gate`, `qa-story`, `qa-task`, `review-code`, `review-pr`, `review-security`)

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: every new branch executed from the shipped fences under bash and zsh, in scratch repositories — the `qa-scope-from-head.test.mjs` pattern.
- **Mutation proofs**: one per finding — remove the head validation (the `head: HEAD` test goes red), drop `--literal-pathspecs` (`:colon.sh` red), drop the clause-1 OR in Step 3b (security-FAIL test red), drop the dirty-tree HALT (uncommitted-fix test red), restore `2>/dev/null` without rc (two-gates test red), restore the old `field()` order (trailing-space test red).
- **Command**: `npm run ci:fast`; the three suites directly with `command node --test`; `npm run lint:shell` (ShellCheck) for the new `qa-safety-clause1.sh`.

### Integration Tests

- `npm run eval:develop-task`, `npm run eval:develop-story` — replay fixtures with schema-1 gates stay green.

### Performance Tests

Not applicable — one extra `git status` and one script call per cycle.

### Consumer Tests

- A consumer on schema-1 gates only: unchanged behaviour (clause 1 still reads their security block; the head checks never run).

---

## 9. Success Criteria

### Functional

- [x] A gate whose `head:` is not a 40-hex commit on this branch makes the trigger report `CODE_MOVED=1`
- [x] A changed file whose name begins with `:` stays in the cycle-3+ patch
- [x] After a security-FAIL gate, Step 3b runs whole-branch even when `SAFETY_REPROBE=false` is bound
- [x] Step 3b HALTs when a change outside the work item is uncommitted
- [x] A `qa-cycle.sh` refusal in Phase 0 steps 2 and 5 is a HALT naming the helper's reason, never "no gate"
- [x] `field()` and the shell sed read `head: '<sha>'  ` identically

### Performance

- [x] Not applicable

### Code Quality

- [x] Six mutation proofs recorded; test E and `extractProbe()` green; `npm run validate -- skills/qa-task/` and `skills/qa-story/` clean

### Migration

- [x] CHANGELOG [Unreleased] › Fixed names the six fixes; no consumer migration

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

## Implementation Summary

**Completion Date**: 2026-10-03

**Approach**: Inline from the co-located plan (develop-task Step 3). The clause-1 awk program moved byte-for-byte into `shared/resources/qa-safety-clause1.sh` (verified with `diff` against the old block); the shared rule's clause-1 block now calls it as `.agents/skills/{qa-task|qa-story}/references/qa-safety-clause1.sh`, so only the two QA skills bundle it. The shared scope block was edited once and copied into both Step 3b fences (test E holds the three identical). Each Step 3b preamble binds `WORK_ITEM_DIR` and recomputes clause 1 — a script that cannot run is a HALT, not a quiet `false`. Phase 0 steps 2 and 5 use step 1's two-call `qa-cycle.sh` pattern; step 3 (`:199`) is unchanged by design.

**Testing Results**:
- New: `qa-scope-from-head.test.mjs` L1–L9 (24 tests, bash + zsh: `head: HEAD`, a head ahead of the checkout, a root-level `:colon.sh`, uncommitted fix HALT, work-item and `.claude/state` files not halting, unbound/root `WORK_ITEM_DIR`, steps 2 and 5 HALT on two gates claiming one cycle, Step 3b whole-branch after a security FAIL with `SAFETY_REPROBE=false` bound); `qa-safety-clause1.test.mjs` (16 tests); a `field()`/sed agreement test in `gate-head-freshness.test.mjs`. `qa-re-review-scope-parity.test.mjs` now executes the block through the script and reads the script for the transit-constraint tests.
- Mutation proofs (each reverted the fix and the named test went red): M1 head validation removed → L1/L2 red; M2 `--literal-pathspecs` dropped → L3 red; M3 clause-1 OR dropped → L9 red (qa-task and qa-story separately); M4 dirty-tree HALT disabled → L4 red; M5 step-5 one-liner with `2>/dev/null` restored → L7 red; M6 old `field()` order → field test red. M2 first survived: the plan's fixture `skills/:colon.sh` is not magic (only a pathspec that *begins* with `:` is); the fixture moved to the repository root.
- `npm run ci:fast`: 5,243 tests, 0 failures. `npm run eval:develop-task` 13/13, `npm run eval:develop-story` 68/68. `npm run bundle:check` clean; `shellcheck --severity=warning` clean on the new script; `quick_validate.py` clean on `qa-task` and `qa-story`.

**Deferred Work**: three LOW items carried by the QA loop's Cosmetic-residue exit — listed under QA Testing Results › Deferred Work.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-03
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.168.qa.3.gate-head-scoping-hardening.md](./task.168.qa.3.gate-head-scoping-hardening.md)
- **Gate File**: [task.168.gate.3.gate-head-scoping-hardening.yml](./task.168.gate.3.gate-head-scoping-hardening.yml)

### Test Coverage Summary
- **Tests Executed**: 176 across the four affected suites (bash + zsh; `TMPDIR=/tmp` variance)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Three QA cycles. Every medium and low finding from cycles 1–2 fixed and mutation-proven. Cycle 3 raised three LOW items, carried by the loop's Cosmetic-residue exit (route 2b) — see Deferred Work.

### Deferred Work

Carried by the QA loop's Cosmetic-residue exit (route 2b, cycle 3) — recorded in [gate 3](./task.168.gate.3.gate-head-scoping-hardening.yml) `recommendations.future`:

- **T168-QA3-CR-1** — Phase 0 trigger still counts a tracked `.claude/state` change as movement; apply the exclusion there or document it.
- **T168-QA3-CR-2** — name the bounded-retry red exit as a second zero-push case at every push-budget statement in `develop-pipeline-step-5-6-qa-loop.md`.
- **T168-QA3-CR-3** — give L15 a remote-tracking ref so it distinguishes local HEAD from a pushed branch.

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-30 | 1.0 | Initial draft — task.135 follow-ups (gate.4 recommendations.future CR4-1, CR4-2, CR3-4, CR3-7; pr-review.1 CR-1, CR-2) | create-task |
| 2026-10-03 | 1.1 | Review passed (9/10) — dirty-tree HALT also excludes `.claude/state`; four line anchors corrected; step-3 rebind exclusion and bundling-closure decision recorded; ShellCheck named | review-task |
| 2026-10-03 |  | Status → ready-for-development | review-task |
| 2026-10-03 |  | Implemented — 19 files, 41 tests | develop |
| 2026-10-03 |  | QA gate CONCERNS (80/100) — 5 findings (2 medium, 3 low) | qa-task |
| 2026-10-03 |  | QA gate CONCERNS (90/100) — 4 findings (1 medium, 3 low); cycle-1 findings fixed | qa-task |
| 2026-10-03 |  | QA gate PASS (100/100) — 3 LOW carried to Deferred Work (route 2b); cycle-2 findings fixed | qa-task |
| 2026-10-03 |  | QA findings fixed — gate PASS (100/100), 2 iterations | qa-fix |

<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: trigger validates its head; helper rebinds read rc
- [x] Phase 2: one clause-1 script
- [x] Phase 3: literal paths, uncommitted fix, `field()`
- [ ] QA: `task.168.qa.[N].gate-head-scoping-hardening.md`
- [ ] Gate: `task.168.gate.[N].gate-head-scoping-hardening.yml`

## References

- task.135 — `docs/tasks/task.135.gate-scoping-from-recorded-head/` (PR #531): `task.135.gate.4.gate-scoping-from-recorded-head.yml` § recommendations.future; `task.135.pr-review.1.gate-scoping-from-recorded-head.md` CR-1, CR-2
- `shared/resources/qa-cycle.sh` — the one-definition precedent (task.121, task.158)
- Observation #181 — BSD `mktemp` (out of scope; PR #532)

## Notes

- QA artifacts land beside this file: `task.168.qa.[N].*.md`, `task.168.bug.[N].*.md`, `task.168.gate.[N].*.yml`.
- Effort recorded as 4h at the author's choice; the rubric with the clause-1 script move suggested 8h.
