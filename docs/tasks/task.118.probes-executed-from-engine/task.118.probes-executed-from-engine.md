---
id: task.118
title: "[Task 118] review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted"
type: task
description: "review-security's output block carries probes_executed and evidence: measured — with measured requiring probes_executed > 0 — and nothing mechanical connects the probes that ran to the integer that appears. security-probe.mjs already keeps an executed counter and already returns unverifiable on zero; its count is not carried into the block. A prior review fixed the documentation half (the skill says the count is transcribed); this is the mechanism half. Second site: finalise's DoD security step carries the same agent-supplied count under boundary: true. Carry the count from the engine, make measured unrepresentable without an artefact, and assert the population."
tags: [review-security, finalise, security, evidence]
category: refactoring
status: planned
priority: Medium
risk_level: medium
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 5
---

# Technical Task: review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Status:** Planned

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
  reproduced, …}`.
- `skills/review-security/SKILL.md` — output block, Guarantees table, the `measured`/`reasoned` rule.
- `shared/resources/finalise-dod-security-prompt.md` ≈155-157, 198 — the second site.
- `shared/resources/qa-gate-security-evidence.md` — the gate-side schema that reads `evidence:`.

## 4. Scope

### In Scope

✅ Engine emits a run record (JSON beside the report: per-sink executed/reproduced/verdict, totals)
✅ review-security reads it; the block's `probes_executed` and `evidence:` are copied from the record; absent record ⇒ `reasoned` (stated as the only representable value)
✅ finalise DoD prompt reads the same record
✅ Population test over shipped prose for agent-supplied counts gating a verdict, with allowlist + floor
✅ Contract test updated to read a real record, not the doc's example

### Out of Scope

❌ New probe kinds · ❌ changing what `unverifiable` means

## 5. Breaking Changes

A review that previously wrote `measured` by hand now writes `reasoned` unless the engine ran.
That is the intended tightening; CHANGELOG under Changed.

## 6. Implementation Plan

1. Record format (small, versioned); engine writes it; unit test.
2. review-security: replace the transcription instruction with "read `<record>`; copy the fields";
   remove the ability to write `measured` without one.
3. finalise prompt: same.
4. Population test: grep shipped `.md` for `probes_executed:` / `evidence: measured` and assert each
   site's surrounding instruction names the record; allowlist the documentation examples; floor ≥ 2 sites.
5. Mutation: delete the record after a run → the block reads `reasoned`; type `measured` → the contract test reds.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/security-probe.mjs` | run record |
| `skills/review-security/SKILL.md`, `shared/resources/security-review-prompt.md` | read the record |
| `shared/resources/finalise-dod-security-prompt.md` | read the record |
| `skills/review-security/tests/*`, `evals/shared/tests/probes-executed-population.test.mjs` (new) | tests |
| `CHANGELOG.md` | Changed |

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

---

## Progress Tracking

### Phase 1: the artefact
- [ ] `security-probe.mjs` writes a machine-readable run record (executed / reproduced / verdict per sink) beside the review
### Phase 2: the reader
- [ ] `review-security` builds `probes_executed` and `evidence:` from the record; `measured` is unrepresentable without it
- [ ] finalise's DoD security prompt reads the same record under `boundary: true`
### Phase 3: the population check
- [ ] A test enumerates every shipped-prose verdict that depends on an agent-supplied count and asserts each reads an artefact or is on an allowlist, with a floor

---

## References

- **Plan**: [`task.118.plan.probes-executed-from-engine.md`](task.118.plan.probes-executed-from-engine.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observation**: #10 (carrier of #5, whose documentation half landed)
- **Canonical**: `shared/resources/security-probe.mjs` (`executed`, `no-cases-executed` → `unverifiable`); `.agents/skills/review-security/`; `shared/resources/finalise-dod-security-prompt.md`
- **Predecessors**: task.73 (DoD probe executes), task.74 (re-review re-probes)

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.118.probes-executed-from-engine/task.118.probes-executed-from-engine.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
