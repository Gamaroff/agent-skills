---
id: task.118
title: "[Task 118] review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted"
type: task
description: "review-security's output block carries probes_executed and evidence: measured — with measured requiring probes_executed > 0 — and nothing mechanical connects the probes that ran to the integer that appears. security-probe.mjs already keeps an executed counter and already returns unverifiable on zero; its count is not carried into the block. A prior review fixed the documentation half (the skill says the count is transcribed); this is the mechanism half. Second site: finalise's DoD security step carries the same agent-supplied count under boundary: true. Carry the count from the engine, make measured unrepresentable without an artefact, and assert the population."
tags: [review-security, finalise, security, evidence]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-09-12
updated: 2026-09-17
assignee:
estimated_effort_hours: 5
github_issue: 417
---

# Technical Task: review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Status:** Ready for Review
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

✅ Engine emits a run record — `security-probe.mjs --record <path>` writes/merges `security-probe.run.json`
   (`{version, controls:[{sink, entry, executed, reproduced, verdict, reason}], totals:{executed, reproduced}}`),
   keyed by `{sink, entry}` so two controls sharing a sink do not overwrite each other; `--emit-block <record>`
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
   `security-probe.mjs` writes it — merging into an existing record so a multi-control review
   accumulates one file; `--emit-block <record>` prints the YAML block; unit test for both.
2. review-security: replace the transcription instruction with "read `<record>`; copy the fields";
   remove the ability to write `measured` without one.
3. finalise prompt: rewrite probe-mode Step 3 to run `security-probe.mjs --sink … --entry … --record …`
   instead of the temp script, and copy `probes_executed` from the record. Keep
   `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` green — it asserts the step instructs
   *execution* and sources candidates from the *shared corpus*; the engine satisfies both, the prose
   must still say so.
4. Population test: grep shipped `.md` for `probes_executed:` / `evidence: measured` and assert each
   site's surrounding instruction names the record; allowlist the documentation examples; floor ≥ 2 sites.
5. Mutation: delete the record after a run → the block reads `reasoned`; type `measured` → the contract test reds.
6. `npm run bundle` — `security-probe.mjs`, `security-review-prompt.md` and
   `finalise-dod-security-prompt.md` are all bundled into skill `references/` copies; `bundle:check` and
   `bundled-parity.test.mjs` go red in CI without it.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/security-probe.mjs` | `--record <path>` writes/merges the run record; `--emit-block <record>` prints the YAML block |
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
2. `measured` cannot appear without a record; the contract test fails if it does
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

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-17
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.118.qa.1.probes-executed-from-engine.md](./task.118.qa.1.probes-executed-from-engine.md)
- **Gate File**: [task.118.gate.1.probes-executed-from-engine.yml](./task.118.gate.1.probes-executed-from-engine.yml)

### Test Coverage Summary
- **Tests Executed**: 3382 (3381 pass, 1 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (1 MEDIUM, 4 LOW)
- **NFR Status**: Security: PASS (reasoned, boundary: false), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
CR-1 (MEDIUM): the review-security probe command omits `--repo-root`, so an installed copy records `unverifiable` / 0 for every control — [bug 1](./task.118.bug.1.review-security-command-omits-repo-root.md). CR-2 / CR-3 (LOW): `emitBlock` trusts the file's `totals`; the `--repo-root` test passes for a reason its message does not state.

---

## Implementation Notes

**Implementation summary (2026-09-17).** The count now has one route from the engine to every
block that carries it. `security-probe.mjs` gained three flags: `--record <path>` (write/merge a
version-1 run record keyed by `{sink, entry}`, atomic temp+rename, totals recomputed on every
write), `--emit-block <record> [--mode]` (print the `security_review:` YAML with
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

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.118.probes-executed-from-engine/task.118.probes-executed-from-engine.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
