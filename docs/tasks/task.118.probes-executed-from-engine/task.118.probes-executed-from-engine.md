---
id: task.118
title: "[Task 118] review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted"
type: task
description: "review-security's output block carries probes_executed and evidence: measured — with measured requiring probes_executed > 0 — and nothing mechanical connects the probes that ran to the integer that appears. security-probe.mjs already keeps an executed counter and already returns unverifiable on zero; its count is not carried into the block. A prior review fixed the documentation half (the skill says the count is transcribed); this is the mechanism half. Second site: finalise's DoD security step carries the same agent-supplied count under boundary: true. Carry the count from the engine, make measured unrepresentable without an artefact, and assert the population."
tags: [review-security, finalise, security, evidence]
category: refactoring
status: accepted
priority: Medium
risk_level: medium
created: 2026-09-12
updated: 2026-09-17
completed_date: 2026-09-17
pr_number: 418
assignee:
estimated_effort_hours: 5
github_issue: 417
---

# Technical Task: review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.118.review.1.probes-executed-from-engine.md` implemented 2026-09-17
**GitHub Issue**: [#417](https://github.com/Gamaroff/agent-skills/issues/417)

---

## 1. Overview

`review-security` establishes whether a control *engages* by executing probes; its output block
reports `probes_executed: N` and `evidence: measured | reasoned`, and the contract says `measured`
requires `N > 0`. The integer is typed by the agent. The engine that ran the probes
(`shared/resources/security-probe.mjs`) has the true count and already knows that zero means
`unverifiable`; the review never reads it.

## 2. Motivation

### Current Problems

1. **A self-report gates the verdict about whether the work was done.** An agent that executed no
   probes and wrote `12` satisfies the prose rule and the CI contract test (which reads the doc's
   example block). The condition the check exists to catch — probes skipped — is exactly the one
   under which the self-report is unreliable (#10).
2. **The documentation half was fixed and could be mistaken for the whole.** The Guarantees row no
   longer credits the CI test with runtime enforcement; the count is described as transcribed. That
   is honest and it changes nothing about enforcement — #10 exists so the remaining half stays visible.
3. **Two sites, not one.** `finalise-dod-security-prompt.md` carries an equivalent
   `probes_executed` under `boundary: true` with its own FAIL guard.

### Benefits

1. `measured` becomes a claim only an engine can make.
2. The population is asserted, so a third site cannot appear without the test noticing.

## 3. Technical Background

- `shared/resources/security-probe.mjs` ≈235-260, 304, 340: `executed`, `no-cases-executed`
  → `{verdict: "unverifiable"}`, the return shape `{sink, entry, verdict, reason, executed, passed,
  reproduced, …}`. Its CLI (`main()`, ≈502-520) parses only `--json`, `--sink`, `--entry`,
  `--cases-file`, `--timeout` — it receives **no** report or output path today, so the record needs a
  new `--record <path>` flag rather than a path it already has.
- `skills/review-security/SKILL.md` — output block, Guarantees table, the `measured`/`reasoned` rule.
- `shared/resources/finalise-dod-security-prompt.md` ≈155-157, 198 — the second site. Its probe mode
  (Step 3, ≈140-150) does **not** run `security-probe.mjs`: it tells the agent to write a temporary
  script that imports `security-input-corpus.mjs` and runs the cases itself, then self-report the count.
  "Reads the same record" is therefore only achievable if that step runs the engine with `--record`.
- `shared/resources/qa-gate-security-evidence.md` — the gate-side schema that reads `evidence:`.

## 4. Scope

### In Scope

✅ Engine emits a run record — `security-probe.mjs --record <path>` writes this run's control as an
   entry file under `<path>.d/` (named from `{sink, entry}`, atomic) and the folded snapshot at `<path>`
   (`{version, controls:[{sink, entry, executed, reproduced, verdict, reason}], totals:{executed, reproduced}}`);
   two controls never share a file and concurrent probes cannot lose each other; `--emit-block <record>`
   prints the `security_review:` YAML skeleton with `probes_executed`, `evidence` and `controls[]` filled from it
✅ review-security reads it; the block's `probes_executed` and `evidence:` are copied from the record; absent record ⇒ `reasoned` (stated as the only representable value)
✅ finalise DoD prompt reads the same record — its probe-mode Step 3 runs `security-probe.mjs --record`
   in place of the hand-written temp script, and copies `probes_executed` from the record
✅ Population test over shipped prose for agent-supplied counts gating a verdict, with allowlist + floor
✅ Contract test updated to read a real record, not the doc's example

### Out of Scope

❌ New probe kinds · ❌ changing what `unverifiable` means

## 5. Breaking Changes

A review that previously wrote `measured` by hand now writes `reasoned` unless the engine ran.
That is the intended tightening; CHANGELOG under Changed.

## 6. Implementation Plan

1. Record format (small, versioned, `controls[]` keyed by `{sink, entry}`); `--record <path>` flag on
   `security-probe.mjs` writes one entry file per control under `<path>.d/` and folds them into the
   snapshot at `<path>` — no merged file, no lock (QA cycles 2–6 established that a merged file needs
   a lock and a lock needs crash recovery that never converges); `--emit-block <record>` prints the
   YAML block; unit test for both.
2. review-security: replace the transcription instruction with "read `<record>`; copy the fields";
   remove the ability to write `measured` without one.
3. finalise prompt: rewrite probe-mode Step 3 to run `security-probe.mjs --sink … --entry … --record …`
   instead of the temp script, and copy `probes_executed` from the record. Keep
   `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` green — it asserts the step instructs
   *execution* and sources candidates from the *shared corpus*; the engine satisfies both, the prose
   must still say so.
4. Population test: grep shipped `.md` for `probes_executed:` / `evidence: measured` and assert each
   site's surrounding instruction names the record; allowlist the documentation examples; floor ≥ 2 sites.
5. Mutation: delete the record after a run → the block reads `reasoned` (tested); hand-edit the totals or a control → the block still reads what the entries say (tested); a `measured` typed into the *report* is not testable until security reports exist in the corpus — the population test holds the paste rule at every producer site instead.
6. `npm run bundle` — `security-probe.mjs`, `security-review-prompt.md` and
   `finalise-dod-security-prompt.md` are all bundled into skill `references/` copies; `bundle:check` and
   `bundled-parity.test.mjs` go red in CI without it.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/security-probe.mjs` | `--record <path>` writes the control's entry file under `<path>.d/` and the folded snapshot; `--emit-block <record>` prints the YAML block |
| `skills/review-security/SKILL.md`, `shared/resources/security-review-prompt.md` | read the record |
| `shared/resources/finalise-dod-security-prompt.md` | probe-mode Step 3 runs the engine with `--record`; reads the record |
| `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` | Step 3b runs the engine with `--record` (third site, found by the population test) |
| `skills/review-security/tests/*`, `evals/shared/tests/probes-executed-population.test.mjs` (new) | tests |
| `CHANGELOG.md` | Changed |
| `skills/*/references/` (bundled copies) | regenerated by `npm run bundle` — the finalise prompt now names `security-probe.mjs`, so it and its imports are bundled into `finalise`, `qa-story`, `qa-task` |

## 8. Testing Strategy

Engine unit test for the record; contract test rewritten to run the engine on a fixture and compare
the block; population test with floor; mutation as in §6.

## 9. Success Criteria

1. `probes_executed` and `evidence:` in a review's output block are copied from an engine-written record
2. `measured` cannot appear in the engine-emitted block without a record — `evidenceOf` computes it from the entries and the contract test fails if the block says otherwise; the paste into the report is prose-enforced ("pasted, never typed") and population-checked, not tested on the report file
3. finalise's DoD security step reads the same record
4. The population test finds ≥ 2 sites and every one reads an artefact or is allowlisted
5. Observation #10 closes naming this PR

## 10. Risk Assessment

**Medium.** A review run where the engine cannot execute (no runnable entry) will now honestly say
`reasoned` where it may previously have said `measured`; consumers reading gate evidence will see
more `reasoned`. That is the truth surfacing, and the CHANGELOG must say so.

## 11. Rollback Plan

`git revert`; the record becomes an unread file.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |
| 2026-09-17 | 1.1     | Review passed (8/10) — `--record` flag stated (CLI has no report path), record keyed by `{sink, entry}`, finalise probe mode to run the engine, bundle step added, issue #417 linked | review-task |
| 2026-09-17 |         | Status → ready-for-development | review-task |
| 2026-09-17 |         | Implemented — 12 source files, 14 tests (9 engine + 5 population) | develop |
| 2026-09-17 |         | QA gate CONCERNS (90/100) — 1 medium, 2 low blocking (CR-1..3) | qa-task |
| 2026-09-17 |         | QA findings fixed — CR-1 (`--repo-root` on the review-security command + population guard), CR-2 (totals recomputed from controls; record without totals rejected), CR-3 (reason asserted; "escape" wording corrected), CR-4/5/6 + emitBlock(null) via evidenceOf; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 2 — CR-1..3 verified fixed; 1 medium (concurrent record merge), 2 low | qa-task |
| 2026-09-17 |         | QA findings fixed — CR2-1 (O_EXCL lock around the record merge, stale-lock reclaim, 2 deterministic lock tests), CR2-2 (every control element validated), CR2-3 (YAML-typed scalars quoted), CR2-4 (record preflight before the run), CR2-5/6/7; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 3 — CR2-1..3 verified fixed; 1 medium (trailing-colon YAML), 2 low; 5 advisory | qa-task |
| 2026-09-17 |         | QA findings fixed — CR3-1 (trailing `:` quoted), CR3-3 (lock timeout > stale window, exported `LOCK_TIMING`), CR3-4 (YAML 1.2 int/float forms), CR3-2 (rename-based `reclaimStaleLock`, one winner), CR3-5 (`accessSync` W_OK preflight), CR3-6 (`VERDICTS` membership), CR3-7 (ENOENT-only continue), CR3-8; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 4 — CR3-1..8 verified fixed; 2 low (reclaim identity check, timing assertion) | qa-task |
| 2026-09-17 |         | QA findings fixed — CR4-1 (post-rename identity check in `reclaimStaleLock`; stolen live lock restored), CR4-5 (fail-fast asserts no verdict printed, not wall-clock), CR4-2 (YAML 1.2 target stated), CR4-3/4 (dead int branch removed); 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 5 — CR4-1..5 verified fixed; 1 low (put-back overwrites via rename) | qa-task |
| 2026-09-17 |         | QA findings fixed — CR5-1 (`restoreStolenLock` by link, EEXIST leaves the newer lock), CR5-2 (holder pid in the lock; dead pid ⇒ stale next retry), `observedMtimeMs` required; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 6 — CR5-1/2 verified fixed; 1 medium (pid-write failure leaks the lock); replace the lock mechanism | qa-task |
| 2026-09-17 |         | QA findings fixed — CR6-1..4 closed as a class: merged record file + lock replaced by one atomic entry file per control under `<record>.d/`, folded on read; lock/reclaim/put-back/pid code and 8 lock tests removed, 3 entry tests added; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 7 — replacement verified under mutation; 1 medium (emit snapshot write unguarded), 1 low (snapshot without entries silent) | qa-task |
| 2026-09-17 |         | QA findings fixed — CR7-1 (emit prints the block even if the snapshot cannot be written), CR7-2 (orphaned snapshot is loud; preflight reads before mkdir), CR7-3 (fold dedupes by key), CR7-4..8 lock-era residue cleared; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 8 — CR7-1..8 verified fixed; 1 low (library recordRun unguarded) | qa-task |
| 2026-09-17 |         | QA findings fixed — CR8-1 (`recordRun` reads before creating the entry directory), CR8-2 (`ran_at` validated; one comparator), CR8-3/4/5; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100) cycle 9 — CR8-1..5 verified fixed; 1 low (orphan-check race on concurrent first runs) | qa-task |
| 2026-09-17 |         | QA findings fixed — CR9-1 (orphan check re-reads the directory before throwing; injectable readdir for the test), CR9-2 (one `openRecordForWrite` prologue), CR9-3 (exact exit codes); 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate PASS (100/100) cycle 10 — CR9-1..3 verified fixed; no findings; 1 advisory cleanup | qa-task |
| 2026-09-17 |         | PR review CONCERNS (PC-1 medium: SC2 claim narrowed to the `--emit-block` boundary; CR-1..3 low, follow-up) — SC2 and §6.5 reworded | review-pr |
| 2026-09-17 | 1.2     | DoD passed — accepted (PR #418); 10 QA cycles, gate PASS 100/100; observation #10 actioned | finalise |

---

## Progress Tracking

### Phase 1: the artefact
- [x] `security-probe.mjs` writes a machine-readable run record (executed / reproduced / verdict per sink) beside the review
### Phase 2: the reader
- [x] `review-security` builds `probes_executed` and `evidence:` from the record; `measured` is unrepresentable without it
- [x] finalise's DoD security prompt reads the same record under `boundary: true`
### Phase 3: the population check
- [x] A test enumerates every shipped-prose verdict that depends on an agent-supplied count and asserts each reads an artefact or is on an allowlist, with a floor

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-17
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 10)

### QA Report
- **Full Report**: [task.118.qa.10.probes-executed-from-engine.md](./task.118.qa.10.probes-executed-from-engine.md) (earlier: [qa.9](./task.118.qa.9.probes-executed-from-engine.md), [qa.8](./task.118.qa.8.probes-executed-from-engine.md), [qa.7](./task.118.qa.7.probes-executed-from-engine.md), [qa.6](./task.118.qa.6.probes-executed-from-engine.md), [qa.5](./task.118.qa.5.probes-executed-from-engine.md), [qa.1](./task.118.qa.1.probes-executed-from-engine.md), [qa.2](./task.118.qa.2.probes-executed-from-engine.md), [qa.3](./task.118.qa.3.probes-executed-from-engine.md), [qa.4](./task.118.qa.4.probes-executed-from-engine.md))
- **Gate File**: [task.118.gate.10.probes-executed-from-engine.yml](./task.118.gate.10.probes-executed-from-engine.yml) (earlier: [gate.9](./task.118.gate.9.probes-executed-from-engine.yml), [gate.8](./task.118.gate.8.probes-executed-from-engine.yml), [gate.7](./task.118.gate.7.probes-executed-from-engine.yml), [gate.6](./task.118.gate.6.probes-executed-from-engine.yml), [gate.5](./task.118.gate.5.probes-executed-from-engine.yml), [gate.1](./task.118.gate.1.probes-executed-from-engine.yml), [gate.2](./task.118.gate.2.probes-executed-from-engine.yml), [gate.3](./task.118.gate.3.probes-executed-from-engine.yml), [gate.4](./task.118.gate.4.probes-executed-from-engine.yml))

### Test Coverage Summary
- **Tests Executed**: 3401 (3400 pass, 1 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (1 advisory cleanup)
- **NFR Status**: Security: PASS (reasoned, boundary: false), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Ten cycles, never a HIGH: 45 findings closed, each fixed and mutation-proven in its cycle; the merged-file lock of cycles 2–5 was replaced in cycle 6 by one atomic entry file per control, and cycles 7–10 closed that layout's edges. One advisory cleanup remains (a stranded JSDoc).
---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.118.qa.10.probes-executed-from-engine.md` (cycles 1–9 beside it)
**Gate File**: `task.118.gate.10.probes-executed-from-engine.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 5/5 — SC1–SC4 cited to engine code and per-PR tests; SC5 (observation #10 → `actioned`, resolution naming PR #418) performed at finalise
✅ **Tests:** `npm run ci:fast` 3401 tests, 3400 pass, 1 skipped; 55 engine tests + 6 population tests added over the change; every fix mutation-proven in its cycle
✅ **PR Review:** PR #418, Step 5c `/review-pr` CONCERNS (advisory — PC-1 acted on as a documentation edit; CR-1..3 low recorded for follow-up); CI reading 1 SUCCESS @ `c2075a51`
✅ **Documentation:** CHANGELOG (task 118); review-security SKILL + prompt, finalise DoD prompt, qa-task/qa-story 3b; bundles in sync
✅ **Security Review:** ✅ PASS — no boundary in the change set; secrets/unsafe-pattern greps clean; no dependency change
✅ **Compliance Review:** ⚠️ NOT_APPLICABLE — internal tooling, no personal/payment/UI/health data
✅ **Reliability / Maintainability:** ✅ PASS (gate 10)

**Ten QA cycles, never a HIGH.** The deliverable was correct from cycle 2; cycles 2–5 hardened a merged-file lock that kept growing crash-recovery edges, cycle 6 replaced it with one atomic entry file per control folded on read, cycles 7–10 closed that layout's edges. 45 findings fixed; bugs 1 and 2 closed.

**Follow-up (non-blocking):** CR10-1 stranded JSDoc; 5c CR-1 (circular remedy in the orphan-snapshot message), CR-2 (null-sink default name), CR-3 (`emitBlock` on a bare object).

**Task marked as ACCEPTED on:** 2026-09-17

**Detailed Verification Log:** See `task.118.dod.1.probes-executed-from-engine.md` for complete verification evidence and timestamps.

---

## Implementation Notes

**Implementation summary (2026-09-17).** The count now has one route from the engine to every
block that carries it. `security-probe.mjs` gained three flags: `--record <path>` (write this run's
control as an atomic entry file under `<path>.d/`, named from `{sink, entry}`, and fold the directory
into the snapshot at `<path>` — the merged-file-plus-lock design of cycles 2–5 was replaced in QA cycle 6
because each lock fix exposed the next crash-recovery edge), `--emit-block <record> [--mode]` (print the `security_review:` YAML with
`probes_executed`, `evidence` and `controls[]` from the record — `evidence` computed by
`evidenceOf()`, `measured` only on `totals.executed > 0`; a missing record renders the honest
empty block, a corrupt one exits 2), and `--repo-root` (the containment root defaults to two
dirs above the engine file, which in a bundled `references/` copy is the skill dir — without the
flag every consumer entry resolved under the skill dir, could not be imported, and read as
`unverifiable` with `executed: 0`). `--name` / `--call-site` carry the two
descriptive fields into the record so the emitted block is complete.

**Readers.** `security-review-prompt.md` §2 states that neither number is typed; §4 shows the
`--record` invocation and says the block is pasted from `--emit-block`. `review-security/SKILL.md`
steps 5–6 and the Guarantees row name the mechanism. `finalise-dod-security-prompt.md` probe-mode
steps 2–5 run the engine instead of a hand-written temp harness, keeping the contract test's
literals (execution, corpus-sourced, reproduced-only, `probes_executed` required). The population
test found a **third** producer the task had not named — qa-story / qa-task Step 3b, identical
text, hand-written harness and typed count — and it was converted the same way rather than
allowlisted.

**Testing results.** `skills/review-security/tests/review-security.test.js` +9 (37 total): merge
semantics, emitted-block invariant on a real run, the deletion mutation (`reasoned`, 0),
`evidenceOf` floor, CLI record/emit/corrupt/usage, and `--repo-root` from a nested copy.
`evals/shared/tests/probes-executed-population.test.mjs` (new, 5 tests): non-vacuity floor
(≥10 sites, ≥2 producer files), every site reads the artefact or is allowlisted with a reason,
no stale allowlist entry, the five producer files read the record, negative control on the
matcher. Mutation-proved: stripping the record references from qa-task 3b turns it red with the
three lines named. `finalise-dod-prompt-contract.test.mjs` 32/32 after `npm run bundle`.

**Deferred.** Nothing from scope. Noted, not done: the engine's default containment root in a
bundled copy is a pre-existing limit now worked around by `--repo-root` rather than fixed.

---

## References

- **Plan**: [`task.118.plan.probes-executed-from-engine.md`](task.118.plan.probes-executed-from-engine.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observation**: #10 (carrier of #5, whose documentation half landed)
- **Canonical**: `shared/resources/security-probe.mjs` (`executed`, `no-cases-executed` → `unverifiable`); `.agents/skills/review-security/`; `shared/resources/finalise-dod-security-prompt.md`
- **Predecessors**: task.73 (DoD probe executes), task.74 (re-review re-probes)

---

**Status:** Accepted

**Next Steps**:
1. `/develop-task docs/tasks/task.118.probes-executed-from-engine/task.118.probes-executed-from-engine.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
