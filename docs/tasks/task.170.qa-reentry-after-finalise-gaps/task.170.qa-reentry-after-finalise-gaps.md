---
id: task.170
title: "[Task 170] QA re-entry after a finalise DoD-gaps halt fixed by a code change"
type: task
description: "When a /finalise DoD-gaps HALT is fixed by changing code, the documented resume re-runs finalise at step 7 over a head no QA gate has read; give the resume contract a sanctioned, recorded 7 → 5 re-entry, the way grant-qa-cycles.sh sanctions re-entry after a loop-limit escalation (observation #235)."
tags: [develop-task, develop-story, resume, pipeline-lock, qa-loop, observation]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-30
updated: 2026-10-04
assignee:
estimated_effort_hours: 8
risk_level: medium
github_issue: 536
---

# Technical Task: QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.170.review.1.qa-reentry-after-finalise-gaps.md` implemented 2026-10-03

**GitHub Issue**: [#536](https://github.com/Gamaroff/agent-skills/issues/536)

---

## 1. Overview

A `/finalise` run that finds Definition of Done gaps HALTs the develop pipeline at Step 7, and the
halt snapshot records `halt_step: 7`. When the gaps are closed by changing code, the documented
resume restores the lock at step 7 and re-runs `/finalise` — which then accepts a head that no QA
gate has read. The pipeline lock is monotonic, so there is no sanctioned way back to the QA loop.
This task adds one, recorded and guarded, modelled on the existing loop-limit re-entry.

**Scope**: the resume contract, one new lock writer script (sibling of `grant-qa-cycles.sh`), the
Stop hook's reading of the re-entered lock, and finalise's gap-report next steps.

**Key deliverables**:

1. A named resume case — "DoD gaps fixed by a code change" — in `develop-pipeline-resume-contract.md`.
2. A script that performs the 7 → 5 re-entry: validates the snapshot, confirms the code moved past
   the newest gate's `head:`, restores the lock at step 5 / `qa_phase: 5a`, and records the re-entry.
3. Tests that the re-entry fires only for that case and never silently no-ops.

**Expected outcome**: a code change made after a finalise halt always passes through a QA gate
before acceptance, by a path the pipeline documents rather than one an operator improvises.

---

## 2. Motivation

### Current Problems

1. **Resume re-finalises an ungated head.** On task.142 (2026-09-30), `/finalise` run 1 halted on
   four un-passable criteria; the user approved a re-scope that added two tests. The documented
   resume — `advance-pipeline-lock.sh --restore`, lock at step 7 — would have run finalise run 2 over
   code no gate had read (task.142 implementation report, "Resume after Step 7 halt").
2. **The improvised re-entry found a real defect.** The operator ran QA by hand ("run outside the
   loop", lock left at 7); that cycle's refute pass found a medium defect in the fix
   (`task.142.gate.2.reference-doc-skill-pinning.yml`, CR-1). The gate was worth running; nothing
   required it.
3. **The backward move is a silent no-op.** `advance-pipeline-lock.sh 5` on a step-7 lock exits 0
   and changes nothing (`shared/resources/advance-pipeline-lock.sh`: *"Idempotent: already at or
   past the target step"* — `if [ "$NEXT" -le "$CURRENT" ]; then exit 0`). An operator who tries the
   obvious move gets no error and no re-entry.
4. **The Stop hook fires during the improvised QA wait.** With the lock at 7 and no `waiting_on`
   mark, the hook re-prompts for `/finalise` while the QA reviewer is still running (observed on
   task.142).

### Benefits

1. Every code change after a finalise halt is gated before acceptance — by rule, not by discipline.
2. The re-entry is recorded on the lock and in the report, so a reader can see why the QA loop ran
   after Step 7.
3. The lock stays monotonic for `advance-pipeline-lock.sh`; the one backward move has one writer
   with its own guards (the task.123 argument for keeping two meanings off one field).

---

## 3. Technical Background

### Current Architecture

- `shared/resources/develop-pipeline-resume-contract.md` § "Restore the lock (both resume paths)"
  decides who restores by `halt_reason`: `loop-limit|not-converging` → the grant path
  (`grant-qa-cycles.sh`); **any other `halt_reason`** → `advance-pipeline-lock.sh --restore` at the
  halted step. A finalise DoD-gaps halt takes the second bullet, so the lock comes back at 7.
- `shared/resources/grant-qa-cycles.sh` — the one sanctioned re-entry writer today: reconstructs the
  cycle count from the gates on disk, restores via `--restore`, and writes `extra_cycles_granted`,
  `qa_max_cycles` and `qa_phase: 5a`. It re-enters at step 5 because a loop-limit halt already
  records `halt_step` 5; it never moves the step backwards.
- `shared/resources/advance-pipeline-lock.sh` — monotonic; `--restore` sets
  `current_step = halt_step // current_step`; a numeric advance to a lower step exits 0 silently.
- `shared/resources/develop-pipeline-on-stop.sh` — reads `current_step`, and `qa_phase` on a step-5
  lock, to name the skill to re-prompt.
- `skills/finalise/SKILL.md` § "Step 8: Report Gaps" — the gap report's Next Steps end with
  "Re-run verification after fixes are implemented", which names no QA pass.
- Existing mechanisms of the same kind (same-class inventory): `grant-qa-cycles.sh` (re-entry after
  loop escalation) and `advance-pipeline-lock.sh --restore` (resume at the halted step). The new
  writer **sits beside** both: it is the only case that needs a *lower* step than the halt, which
  neither may do without giving `current_step` a second meaning.

### Target Architecture

- A new resume case in the contract: a halt snapshot with `halt_step: 7` whose DoD file reads
  `GAPS IDENTIFIED`, **and** a tree that has moved past the newest gate's `head:` outside the work
  item's own directory, measured as **committed history** — what the re-entered review reads
  (commits since the head; a `head:` that is absent, not 40-hex, not a commit or not an ancestor of
  `HEAD` counts as moved). Uncommitted tracked work is refused (`uncommitted-fix` — commit and
  re-run), never sent to `/finalise`; untracked files are named on every outcome and never counted,
  since nothing can tell Step 4's restored held-aside files from a new fix file (QA cycles 1–4
  refined this from review 1's "the full qa-task Phase 0 measure": the re-entered cycle is always a
  re-review, and qa-task Step 3b HALTs on an uncommitted tracked change) → **re-enter QA**.
  Otherwise the existing bullet applies (finalise re-runs at 7 — correct when only documents moved).
- A new script, `shared/resources/reenter-qa-after-finalise.sh` (sibling of `grant-qa-cycles.sh`):
  refuses unless the snapshot is a step-7 halt for this document and code moved past the gate head.
  **Every refusal runs before any write**: the candidate is read through
  `advance-pipeline-lock.sh --restore --which <doc-dir>` (the selection `--restore` itself uses, as
  `grant-qa-cycles.sh` does), so a refusal restores and consumes nothing. Otherwise it restores the
  lock through `--restore` and lowers it to `current_step: 5`, `qa_phase: 5a`, and writes
  `qa_reentry: { from_step: 7, reason: "dod-gaps-code-fix", at, gate_head }`. It is the only writer
  that may lower `current_step`, and only on this path. If the lowering write fails after the
  restore, the restored step-7 lock is **kept** — `--restore` consumed the snapshot, so the lock is
  the run's only state (the grant's `undo_restore` rule).
- The QA budget for the re-entered loop is `qa_max_cycles = max(existing, base + 2)`, where `base`
  is reconstructed from disk exactly as the grant does — max(highest gate via `qa-cycle.sh`,
  `### QA Cycle` entries in the implementation report) — so a re-entry does not reset the cycle
  count, and an existing higher budget is kept, never lowered. `2` is the grant prompt's recommended
  `k` (review 1, I2).
- `finalise` Step 8's gap report names the rule: a gap closed by a code change re-enters QA before
  finalise re-runs.

### Important Clarifications

- **A document-only fix does not re-enter QA.** Re-scoping a criterion changes no code; finalise
  re-running at 7 is correct there, and the `CODE_MOVED` measure distinguishes the two.
- **`advance-pipeline-lock.sh` stays monotonic.** This task does not teach it a backward move.

---

## 4. Scope

### In Scope

✅ The resume-contract case and its decision rule.
✅ `reenter-qa-after-finalise.sh` and its test suite.
✅ The Stop hook's naming for a re-entered lock (no change expected: step 5 + `qa_phase` already works — asserted).
✅ finalise Step 8 gap-report Next Steps line.
✅ Bundled copies regenerated (`npm run bundle`); CHANGELOG.

### Out of Scope

❌ `develop-bug` — its verify loop does not use the step-5 lock shape.
❌ Any change to how finalise decides gaps.
❌ Authoring-time prevention of un-passable criteria (obs #222 — folded into task.166).

---

## 5. Breaking Changes

None — API stable. The lock gains one optional field (`qa_reentry`); every reader ignores unknown
fields today (the halt snapshot is already a superset of the lock).

---

## 6. Implementation Plan

> Detailed implementation guide:
> [task.170.plan.qa-reentry-after-finalise-gaps.md](task.170.plan.qa-reentry-after-finalise-gaps.md)

### Phase 1: The re-entry writer

**Risk Level**: Medium

**Files**: `shared/resources/reenter-qa-after-finalise.sh`, `shared/resources/reenter-qa-after-finalise.test.sh`, `package.json` (`test` chain)

**Changes**:

- [x] Refuse (exit 1, named reason) unless: a halt snapshot exists for this document, `halt_step` is
      7, the newest DoD file's Final Status is GAPS, and code moved past the newest gate's `head:`.
- [x] Document match checked through `advance-pipeline-lock.sh --restore --which` **before** any write;
      `halt_step` compared as a string (the HALT snippet writes it with `jq --arg`).
- [x] On pass: restore via `advance-pipeline-lock.sh --restore`, then lower `current_step` to 5, set
      `qa_phase: 5a`, set `qa_max_cycles = max(existing, base + 2)`, write `qa_reentry` — one atomic
      `mktemp` + `mv`; on a failed write keep the restored lock.
- [x] `bundle-dependency:` lines for `advance-pipeline-lock.sh`, `qa-cycle.sh` and `newest-numbered.sh`.
- [x] Suite: each refusal reason; the happy path; that a document-only change is refused.

**Dependencies**: none.

### Phase 2: The resume contract and the step docs

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md`

**Changes**:

- [x] Add the case to § "Restore the lock (both resume paths)" as a third bullet, with the decision rule.
- [x] Step 7 doc "If DoD Gaps Are Found": name the re-entry for a code fix.
- [x] finalise Step 8 Next Steps: the same rule in one line.
- [x] `npm run bundle`.

**Dependencies**: Phase 1.

### Phase 3: Guards

**Risk Level**: Low

**Files**: `evals/shared/tests/` (parity), `shared/resources/develop-pipeline-on-stop.test.sh`

**Changes**:

- [x] Parity test: the contract names the script, and the script's refusal reasons match the contract's list.
- [x] Stop-hook test: a lock carrying `qa_reentry` at step 5 / `qa_phase: 5a` re-prompts `/qa-task`.
- [x] CHANGELOG `[Unreleased]`.

**Dependencies**: Phases 1–2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/reenter-qa-after-finalise.sh` — **new**.
2. ✅ `shared/resources/develop-pipeline-resume-contract.md` — the new case.
3. ✅ `shared/resources/develop-pipeline-step-7-finalise.md` — gaps path names the re-entry.
4. ✅ `skills/finalise/SKILL.md` — Step 8 Next Steps line.

### Files to Modify (Tests)

5. ✅ `shared/resources/reenter-qa-after-finalise.test.sh` — **new**.
6. ✅ `shared/resources/develop-pipeline-on-stop.test.sh` — re-entered lock case.
7. ✅ `evals/shared/tests/reenter-qa-refusals-parity.test.mjs` — **new**: contract refusal list ≡ script refusals; header documents each; both SKILL.md and the contract invoke the bundled path.

### Files to Modify (Dependencies)

8. ✅ `package.json` — append the new `.test.sh` to the explicit `test` `&&` chain (there is no glob).

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md` — `[Unreleased]`.
11. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` — Phase 0b offers "Re-enter QA at 5a" and invokes the bundled script (added in development: the Phase 0b prompts live there, as the grant's does).
12. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — `qa_max_cycles` names its second writer.
13. ✅ `shared/resources/develop-pipeline-pause.md` — lock schema: `qa_max_cycles` writers, new `qa_reentry` row.
10. ✅ Bundled `references/` copies — regenerated by `npm run bundle`, never hand-edited. New copies: `reenter-qa-after-finalise.sh` and its dependency `newest-numbered.sh` in `develop-task` and `develop-story` only (the contract cites the script by bare filename, so it does not fan out to every skill that bundles the contract).

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `reenter-qa-after-finalise.sh` against fixture directories (a halt snapshot, a DoD file,
gate files with `head:`, a git repo with and without code movement).

**Actions**:

- [x] Refuses: no snapshot; snapshot for another document; `halt_step` ≠ 7; DoD not GAPS; no code moved.
- [x] Accepts: writes step 5, `qa_phase: 5a`, `qa_reentry`, and a reconstructed `qa_max_cycles`.
- [x] Never leaves a temp file behind on failure.

**Command**: `bash shared/resources/reenter-qa-after-finalise.test.sh`

### Integration Tests

**Scope**: the Stop hook reading a re-entered lock; the parity between contract and script.

**Command**: `npm test`

### Performance Tests

**Scope**: none — a lock write.

### Consumer Tests

**Scope**: bundled copies in `develop-task` and `develop-story` match their source (`npm run bundle:check`).

---

## 9. Success Criteria

### Functional

- [x] A step-7 GAPS halt followed by a code change is re-entered at step 5 / `qa_phase: 5a` — held by the script's accept test.
- [x] A step-7 GAPS halt followed by a document-only change is refused — held by the refuse test; finalise then re-runs at 7 through the existing, unchanged `--restore` bullet.
- [x] An uncommitted tracked change outside the work-item directory is refused (`uncommitted-fix`), never accepted and never routed to finalise — held by the two uncommitted refusal cases and the parity test's route check; untracked files are named and never counted — held by the untracked-only, document-only-plus-untracked and held-aside cases.
- [x] A resume after the re-entry, before the re-entered cycle writes its `### QA Cycle` entry, re-enters at 5a rather than Step 7 — held by the contract's single-statement **Second precedence** (keyed on the heading count `qa_reentry.report_entries`), the suite's report_entries cases (report at, ahead of and behind the gates) and the parity test.
- [x] A snapshot for another document, or with `halt_step` ≠ 7, is refused — held by refusal tests.
- [x] The re-entered lock records `qa_reentry` with the gate head — held by the accept test.
- [x] A lock at step 5 / `qa_phase: 5a` carrying `qa_reentry` makes the Stop hook name `/qa-task` — held by the new case in `develop-pipeline-on-stop.test.sh`.
- [x] The contract's list of refusal reasons equals the script's — held by the Phase 3 parity test in `evals/shared/tests/`.

### Performance

- [x] The lock write is atomic (`mktemp` + `mv`) and leaves no temp file on failure — held by the failure-path test.

### Code Quality

- [x] ShellCheck clean at `--severity=warning`; Prettier clean; `npm test` green with `.claude/skills` and `.agents/skills` moved aside.
- [x] `npm run bundle:check` green.
- [x] Each refusal reason mutation-proven.

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` records the new resume case.
- [x] No consumer migration — the lock gains one optional field.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. A second writer lowering `current_step`**

- **Risk**: the lock's monotonicity is the Stop hook's contract; a writer that lowers it could point
  the hook behind the work.
- **Probability**: Low — one writer, one guarded case.
- **Impact**: Major if wrong — a mis-pointed hook re-runs finished steps.
- **Mitigation**: the refusal list; `qa_reentry` recorded so the lowered step is explained; the
  parity test pins the contract to the script.
- **Rollback**: delete the script and the contract bullet; the old resume path is untouched.

### Low Risk Areas

**1. `CODE_MOVED` misreads a document-only change as code**

- **Risk**: an edit outside the work-item directory that is only documentation triggers a QA cycle.
- **Probability**: Low. **Impact**: Minor — one extra QA cycle, never a skipped one.
- **Mitigation**: the measure fails toward re-review, which is the safe direction.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the Stop hook or a resume misbehaves on a re-entered lock.

**Steps**: revert the merge commit; `npm test`, `npm run bundle:check` green.

### Partial Rollback (1-2 hours)

**When to Use**: the script is sound but the contract wording misroutes a case.

**Steps**: revert Phase 2's contract bullet; keep the script and its tests.

### Forward Fix (< 4 hours)

**When to Use**: a refusal reason too strict or too loose.

### Rollback Triggers

**Critical**: a resumed run re-executing finished steps. **Non-critical**: message wording, an extra QA cycle.

---

## Implementation Summary

**Completed**: 2026-10-03 (develop-task run 1, invoked by `/develop-next`).

**Approach**: `reenter-qa-after-finalise.sh` copies `grant-qa-cycles.sh`'s shape — refuse first, restore
through the one `--restore` path, write atomically — and adds the one thing the grant never does:
lower `current_step` 7 → 5. All eight refusals (`lock-present`, `no-snapshot`, `not-a-finalise-halt`,
`no-dod`, `dod-not-gaps`, `no-gate`, `uncommitted-fix`, `no-code-moved`) run before any write; the
document match uses `--restore --which`, the restore's own selection. The movement measure is
**committed history** since the newest gate's `head:` (QA cycles 1–4 narrowed it from review 1's
"`qa-task` Phase 0 in full"): uncommitted tracked work is refused as `uncommitted-fix`, and untracked
files are named but never counted. `qa_reentry.report_entries` records the back-filled count,
`max(highest gate, headings)` (QA cycle 5). The contract gains a third bullet in § "Restore the lock (both resume paths)" (inside the
`who-restores` marker, so the single-statement test still holds) and a section, **Re-entry after a
finalise DoD-gaps halt**, whose refusal list sits between `reenter-qa-refusals` markers for the
parity test.

**Testing results**:

- `bash shared/resources/reenter-qa-after-finalise.test.sh` — 52 passed, 0 failed at QA cycle 6
  (25 at first implementation; throwaway git repos per case; every refusal, document-only refusal,
  committed / uncommitted / untracked / no-head / non-40-hex / non-ancestor movement, hostile gate
  heads, budget rules, numeric and string `halt_step`, `report_entries` ahead/behind, failed write).
- `bash shared/resources/develop-pipeline-on-stop.test.sh` — 49 passed (2 new `qa_reentry` cases).
- `command node --test evals/shared/tests/reenter-qa-refusals-parity.test.mjs` — 5 passed at QA cycle 6 (3 at first
  implementation).
- Mutation proof (first implementation; each QA cycle mutation-proved its own fixes): each of the
  seven then-existing refusals, the uncommitted / untracked / ancestor halves of the
  measure, the never-lower rule and the keep-the-lock rule were removed one at a time — every one
  turned the suite red (1–7 failures each). The Stop-hook case went red (2) with the 5a arm pointed
  at `/finalise`; the parity test went red with a reason dropped from the contract (1) and renamed
  in the script (2).
- ShellCheck `--severity=warning` clean on both new `.sh` files; Prettier clean.
- `npm run ci:fast` with `.agents/skills` and `.claude/skills` moved aside: everything green except
  `tests/test-clean-checkout.test.js`, which tripped its own LOAD-SENSITIVE timing budget (10500 ms
  vs 10000 ms) and passes alone (13/13). `npm run bundle:check` — 129 skills, 0 problems.

**Deferred work**: none.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-04
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.170.qa.7.qa-reentry-after-finalise-gaps.md](./task.170.qa.7.qa-reentry-after-finalise-gaps.md)
- **Gate File**: [task.170.gate.7.qa-reentry-after-finalise-gaps.yml](./task.170.gate.7.qa-reentry-after-finalise-gaps.yml)

### Test Coverage Summary
- **Tests Executed**: 53 (re-entry suite, under bash 5 and bash 3.2) + parity 5
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Cycle 7 (QA re-entry after the finalise DoD-gaps halt) gates DoD gap 1's fix (`3008d0d7`): parses under `/bin/bash` 3.2, suite 53/53 on both bashes, mutation-proven.
- CR-1 (cleanup, advisory): the bash 3.x guard checks parse only.

### Deferred Work

- CR-1 (gate 6, low) — carried to the gate's `recommendations.future` by the cosmetic-residue exit (route 2b, cycle 6): scope the resume contract's in-flight-gate sentence to a report not ahead of the gates.

## Definition of Done - Gaps Identified

**Status:** IN PROGRESS

### QA Gate Status

**QA Report**: `task.170.qa.6.qa-reentry-after-finalise-gaps.md`
**Gate File**: `task.170.gate.6.qa-reentry-after-finalise-gaps.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

### Missing Criteria:

1. **Security Review:**
   - [ ] `shared/resources/reenter-qa-after-finalise.sh:146` does not parse under macOS `/bin/bash` 3.2 (an unparenthesised case pattern inside `$(...)`); the suite under `/bin/bash` 3.2.57 fails 42/52. Fails closed, but the re-entry is unusable on a stock macOS shell.
   - [ ] Probe zero-guard: `probes_executed: 0` — the probe engine cannot reach a two-positional shell script.

### Next Steps:

- [ ] **BLOCKING**: change the case pattern to `("$p".*)`, re-bundle, and add a guard that parses the script with `/bin/bash -n` where that shell is 3.x; commit. The resume re-enters QA at 5a for this code fix.
- [ ] **BLOCKING**: operator decision on the zero-guard — record it as "unverified by the engine" (task.130 precedent) or extend the engine to multi-argument shell entries.

**Estimated Effort:** Small — one-line fix, a parse guard, one QA cycle, one decision.

**Gap Report Generated:** 2026-10-03

### Gap Resolution (2026-10-04)

- **Gap 1 (bash 3.2 parse)** — fixed in `3008d0d7`: the case pattern is parenthesised, and the suite gains a `/bin/bash -n` case that runs where `/bin/bash` is 3.x (53/53 under bash 5 and with only bash 3.2 on PATH). A code fix, so the resume re-enters QA at 5a before `/finalise` re-runs.
- **Gap 2 (probe zero-guard)** — **operator decision, 2026-10-04: record the probe as "unverified by the engine"**, as task.130 did. The engine has no form that reaches a two-argument shell script; the eight hostile `head:` cases in `reenter-qa-after-finalise.test.sh` are the executed evidence (they run per PR, but are not an engine count). Follow-up that closes the engine gap: task.181, a `shell-argv:` entry form ([#564](https://github.com/Gamaroff/agent-skills/issues/564)).

**Detailed Verification Log:** See `task.170.dod.1.qa-reentry-after-finalise-gaps.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-30 | 1.0     | Initial draft — cut from observation #235     | create-task |
| 2026-10-03 | 1.1     | Review 1 (8/10, 0 critical / 4 important): full qa-task CODE_MOVED measure (uncommitted, untracked, invalid head); budget max(existing, base + 2); refusals via --restore --which before any write, failed lowering keeps the lock; criteria for the parity and Stop-hook tests | review-task |
| 2026-10-03 |         | Status → ready-for-development                | review-task |
| 2026-10-03 |         | Implemented — 9 source files (2 new scripts, 1 new parity test), 30 new test cases | develop |
| 2026-10-03 |         | QA gate CONCERNS (80/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-10-03 |         | QA gate FAIL (70/100) — 3 findings (1 high, 1 medium, 1 low) | qa-task |
| 2026-10-03 |         | QA gate CONCERNS (90/100) — 1 finding (1 medium) | qa-task |
| 2026-10-03 |         | QA gate CONCERNS (80/100) — 4 findings (2 medium, 2 low) | qa-task |
| 2026-10-03 |         | QA gate CONCERNS (90/100) — 1 finding (1 medium) | qa-task |
| 2026-10-03 |         | QA gate PASS (100/100) — 1 finding (1 low) | qa-task |
| 2026-10-03 |         | DoD incomplete — 2 gaps identified (security: bash 3.2 parse, probe zero-guard) | finalise |
| 2026-10-04 |  | QA gate PASS (100/100) — 0 findings (cycle 7, re-entry after finalise DoD gaps) | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The re-entry writer

- [x] Refusals
- [x] Atomic write
- [x] Suite

### Phase 2: The resume contract and the step docs

- [x] Contract case
- [x] Step 7 doc + finalise Step 8
- [x] Bundle

### Phase 3: Guards

- [x] Parity test
- [x] Stop-hook test
- [x] CHANGELOG

---

## References

- Observation #235 — No sanctioned QA re-entry after a finalise DoD-gaps halt fixed by a code change — resume re-finalises an ungated head
- **Worked example**: task.142 — `docs/tasks/task.142.reference-doc-skill-pinning/` (implementation report § "Resume after Step 7 halt"; gate 2 CR-1)
- **Sibling mechanism**: `shared/resources/grant-qa-cycles.sh` (task.123)

---

## Notes

- `command node`, never bare `node`; ShellCheck is required after any `.sh` edit.
