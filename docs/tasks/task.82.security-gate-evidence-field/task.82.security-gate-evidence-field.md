---
id: task.82
title: "[Task 82] Feed the measured security verdict into the QA gate"
type: task
description: "nfr_validation.security carries a status and free-text notes, so a verdict reached by executing twelve candidates is indistinguishable from one reached by reading. Add evidence: measured | reasoned | unverified beside the existing status — additively, because task.74's trigger parses that field mechanically and fails closed and silently on a shape it does not expect."
tags: [security, qa, gate, schema, evidence]
category: infrastructure
status: ready-for-development
priority: Medium
risk_level: medium
created: 2026-09-02
updated: 2026-09-02
assignee:
estimated_effort_hours: 4
depends_on: task.81
---

# Technical Task: Feed the measured security verdict into the QA gate

**Status:** Ready for Development

---

## 1. Overview

There is a loop in this repo worth naming plainly.

`qa-task/SKILL.md:567` produces `nfr_validation.security` from one line of instruction: *"Review for
security issues; check dependencies; validate auth/authorization preserved."* A judgement, from reading.

`task.74`'s `SAFETY_REPROBE` then parses that field **mechanically** — an `awk` scan for
`security:` → `status: FAIL` — to decide whether the next re-review runs unscoped.

**The most rigorous trigger in the system is fed by the least rigorous input**, and the gate schema cannot
tell the two apart. A `security: PASS` derived from twelve executed candidates and one derived from reading
render as the same sentence.

**Scope**: add `evidence:` and `probes_executed:` beside `status:`, additively, and teach the trigger to
read them.

---

## 2. Motivation

### Current Problems

1. **Measured and reasoned verdicts are indistinguishable.** The schema is `{status, notes}`. This task's
   own sibling `task.74` recorded *"the trigger predicate was re-probed … with four inputs each"* in
   `notes` — a measured claim the schema cannot represent as one.
2. **The re-probe trigger inherits the weakness.** `SAFETY_REPROBE` fires on `status: FAIL`. A control that
   was never probed produces `PASS` just as readily as one that held, and the carve-out designed to catch
   security failures never fires.
3. **`task.81` will emit evidence nothing consumes.** The skill produces a block carrying `evidence:`; with
   no schema change it is advisory text that stops at the report.

### Benefits

1. **A PASS states how it was reached.** This is the repo's own standard applied one level up —
   `finalise-dod-ac-prompt.md` already rules that *"a test that exists but never executes is not evidence
   — it is a citation."*
2. **The trigger can fire on absence of evidence**, not only on a failing verdict.
3. **Immediately honest even before it is useful.** Every existing QA security verdict becomes
   `evidence: reasoned`, which is truthful and makes visible, at a glance, that nothing is measured yet.

---

## 3. Technical Background

### Current architecture

```yaml
nfr_validation:
  security:
    status: PASS|CONCERNS|FAIL
    notes: 'free text'
```

Written by `qa-story` / `qa-task` (`qa-task/SKILL.md:661-664`). Read mechanically in exactly one place —
`shared/resources/qa-re-review-scope.md:52-59`, mirrored verbatim into both QA skills:

```bash
SAFETY_REPROBE=false
if [ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
  awk '/^[[:space:]]*security:[[:space:]]*$/{f=1; next}
       f && /^[[:space:]]*status:/ {print; exit}' "$LATEST_GATE" </dev/null \
    | grep -qE '[[:space:]]FAIL[[:space:]]*$' && SAFETY_REPROBE=true
fi
```

### The interlock, which is the whole risk of this task

That `awk` scan takes the **first** `status:` line after `security:`. Inserting a key between them changes
what it reads. And its failure mode is **closed and silent** — the file's own commentary records that its
first draft used `\s`, a GNU extension BSD awk neither matches nor errors on, so the probe returned empty,
`SAFETY_REPROBE` stayed `false`, and the carve-out would never have fired on any platform, with nothing
saying so.

Two consequences for this task:
- `evidence:` goes **after** `status:`, never between `security:` and `status:`.
- `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — which extracts the probe from the shared rule
  and **executes** it against real gate fixtures — must be run before and after, and extended.

### Prior art

- **`task.74`** — the trigger, the parity suite, and the fail-closed lesson.
- **`task.73`** — `probes_executed` as a required field, and "zero executed candidates is a finding, not a
  pass". This task lifts that rule from the DoD envelope into the QA gate.

---

## 4. Scope

### In Scope

✅ **`evidence: measured | reasoned | unverified`** added to `nfr_validation.security`, after `status:`
✅ **`probes_executed:`** required when `evidence: measured`
✅ **Teaching `SAFETY_REPROBE` to read it** — a missing key means *unverified → trigger*
✅ **Extending the parity suite** to execute the amended trigger against fixtures carrying the new shape
✅ **Both QA skills' gate schema and NFR sections**

### Out of Scope

❌ **Transferring ownership of the field** — `qa-story` / `qa-task` keep writing it; `review-security` advises
❌ **Adding `evidence:` to the other three NFR axes** — performance, reliability, maintainability are a
   separate question and a separate task
❌ **Changing `status:` semantics, the gate decision rules, or the quality-score formula**
❌ **Retrofitting historical gates** — going-forward only

---

## 5. Breaking Changes

**None for readers that ignore unknown keys**, which is every current consumer. The one mechanical reader
is `SAFETY_REPROBE`, and Phase 1 exists to prove the addition does not disturb it.

A gate written before this task has no `evidence:` key. That **must** read as `unverified`, not as a parse
failure and not as `reasoned` — see Phase 3.

---

## 6. Implementation Plan

### Phase 1: Prove the addition does not disturb the trigger

**Risk Level**: Medium

**Files**: `evals/shared/tests/qa-re-review-scope-parity.test.mjs`

Do this **before** changing any schema.

**Changes**:
- [ ] Add replay fixtures carrying the proposed shape — `status:` then `evidence:` — and assert the existing
      unmodified probe still returns `true` on `security FAIL` and `false` on `security PASS`
- [ ] Add a negative control: `evidence:` placed **between** `security:` and `status:` — assert the probe
      breaks, so the ordering constraint is pinned by a test rather than by a comment
- [ ] Run the suite before and after; record both

**Dependencies**: none

---

### Phase 2: Add the field

**Risk Level**: Low

**Files**: `skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md`

**Changes**:
- [ ] Gate schema gains, **after** `status:`:
      ```yaml
      security:
        status: PASS|CONCERNS|FAIL
        evidence: measured|reasoned|unverified
        probes_executed: 0        # required when evidence: measured
        notes: '...'
      ```
- [ ] Define the three values once, in `shared/resources/`, and reference from both skills rather than
      restating — the drift `task.74` found three copies of
- [ ] `measured` requires `probes_executed > 0`; asserting `measured` with a zero count is a schema error,
      not a warning
- [ ] The NFR section states plainly that a verdict reached by reading is `reasoned` — accurate, not a
      failing grade

**Dependencies**: Phase 1

---

### Phase 3: Teach the trigger to read evidence

**Risk Level**: Medium

**Files**: `shared/resources/qa-re-review-scope.md`, both QA skills' mirrored snippet

**Changes**:
- [ ] Widen clause 1: fire on `status: FAIL` **or** on `evidence: unverified` where the work item has a
      security-relevant surface
- [ ] **A missing `evidence:` key reads as `unverified` → trigger.** Note the inversion: clause 1 today
      fails *closed* on a missing key. This one must fail *open*, or a gate written before this task
      silently never triggers — the `\s` bug in a new place
- [ ] Extend the parity suite: execute the amended probe against fixtures with `evidence:` present,
      absent, and each of the three values
- [ ] Mutation-prove: make a missing key read as `reasoned` → the absent-key fixture reds

**Dependencies**: Phase 2

---

### Phase 4: Wire `review-security`'s block through

**Risk Level**: Low

**Files**: `skills/review-security/SKILL.md`, `shared/resources/security-review-prompt.md`

**Changes**:
- [ ] The skill's machine block matches the gate's key names exactly, so a QA cycle can lift it verbatim
- [ ] Document in both QA skills where the block comes from and that consuming it is optional — the skill
      advises, it does not own
- [ ] `npm run bundle`; `CHANGELOG.md`

**Dependencies**: Phase 3, task.81

---

## 7. Files Summary

### Files to Create

1. A shared definition of the three `evidence` values (in `shared/resources/`; likely a section of
   `security-input-corpus.md` from `task.79` rather than a new file — decide at implementation time)

### Files to Modify

2. `skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md` — gate schema + NFR section
3. `shared/resources/qa-re-review-scope.md` — clause 1
4. `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — fixtures and the ordering control
5. `skills/review-security/SKILL.md`, `shared/resources/security-review-prompt.md` — key alignment
6. `CHANGELOG.md`

### Files Regenerated

7. `skills/*/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] The probe returns the same verdicts on gates carrying the new shape
- [ ] `evidence:` between `security:` and `status:` breaks the probe (negative control, pinned)
- [ ] A missing `evidence:` triggers a re-probe
- [ ] `measured` with `probes_executed: 0` is a schema error

**Command**: `node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs`

### Replay Verification

- [ ] `task.74.gate.1` and `task.74.gate.2` — real gates with no `evidence:` key — still resolve correctly
      and now trigger on absence

### Mutation Proving

- [ ] Missing key reads as `reasoned` → the absent-key fixture reds
- [ ] `measured` accepted with a zero count → the schema test reds
- [ ] Clause 1 narrowed back to `status` only → the unverified fixture reds

Procedure: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md).

---

## 9. Success Criteria

### Functional

- [ ] `nfr_validation.security` carries `evidence:`, and `probes_executed:` when measured
- [ ] `SAFETY_REPROBE` fires on `status: FAIL` **or** on unverified evidence
- [ ] A gate with no `evidence:` key reads as `unverified` and triggers
- [ ] `review-security`'s block is liftable into the gate without renaming

### Regression

- [ ] Every existing parity assertion in `qa-re-review-scope-parity.test.mjs` still passes
- [ ] The `awk` probe returns identical verdicts on the two real `task.74` gate fixtures
- [ ] Gate decision rules and quality-score formula unchanged
- [ ] `npm run ci` green

### Safety

- [ ] `evidence:` never appears between `security:` and `status:` — pinned by a negative control
- [ ] `measured` cannot be claimed with zero probes
- [ ] The addition is additive: no consumer that ignores the key changes behaviour

---

## 10. Risk Assessment

### High Risk Areas

**1. The schema change silently breaks `SAFETY_REPROBE`**

- **Risk**: the `awk` scan takes the first `status:` after `security:`; a key in the wrong place changes what
  it reads, and it fails **closed and silently** — the carve-out simply never fires and nothing says so.
- **Probability**: Low with Phase 1, High without. **Impact**: Major — it disables the security carve-out
  invisibly.
- **Mitigation**: Phase 1 runs before any schema edit; the ordering constraint is pinned by a negative
  control test, not a comment.
- **Rollback**: revert the schema addition; the probe reverts to reading `status` alone.

### Medium Risk Areas

**1. The fail-open inversion is missed**

- **Risk**: clause 1 currently fails closed on a missing key. If the `evidence` clause is written the same
  way, every pre-existing gate reads as "no trigger" and the change accomplishes nothing.
- **Mitigation**: stated explicitly in Phase 3 and held by the absent-key fixture.

**2. `evidence: reasoned` reads as a failing grade and gets gamed**

- **Risk**: a reviewer writes `measured` to avoid looking bad.
- **Mitigation**: `measured` requires a non-zero `probes_executed` and the schema test enforces it. Beyond
  that this is a cultural rather than a technical control, and worth saying so.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: `SAFETY_REPROBE` stops firing where it did, or the parity suite reds.

**Steps**: revert clause 1 to `status`-only and drop `evidence:` from both gate schemas. `review-security`
keeps emitting the block; it simply stops being consumed.

**Verification**: `node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs` green, and the
`task.74` gate fixtures resolve as before.

### Forward Fix (< 2 hours)

Keep `evidence:` as a recorded field but leave clause 1 on `status` alone — the honesty benefit lands
without touching the trigger.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                                    | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------ | ----------- |
| 2026-09-02 | 1.0     | Initial draft — filed from the rebirth-wallet security-review handover           | create-task |

---

## Progress Tracking

### Phase 1: Prove the trigger survives
- [ ] Fixtures with the new shape; probe unchanged
- [ ] Negative control: wrong placement breaks it
- [ ] Suite run before and after, both recorded

### Phase 2: Add the field
- [ ] Schema in both QA skills, after `status:`
- [ ] Values defined once and referenced
- [ ] `measured` requires a non-zero count

### Phase 3: Teach the trigger
- [ ] Clause 1 widened
- [ ] Missing key → unverified → trigger (fail open, deliberately)
- [ ] Mutation-proved

### Phase 4: Wire the skill's block
- [ ] Key names aligned
- [ ] Advisory relationship documented
- [ ] Bundle + CHANGELOG

---

## References

- **The trigger this must not break**: `shared/resources/qa-re-review-scope.md:52-59` (task.74)
- **Its parity suite**: `evals/shared/tests/qa-re-review-scope-parity.test.mjs`
- **The fail-closed precedent**: the `\s`-vs-POSIX note in the same rule file
- **Where the field is written**: `skills/qa-task/SKILL.md:567,661-664`; `skills/qa-story/SKILL.md:2112-2135`
- **`probes_executed` precedent**: `shared/resources/finalise-dod-security-prompt.md:139-142` (task.73)
- **The producer**: `task.81`

---

## Notes

### Why this is sequenced last

With no engine, every verdict would read `evidence: reasoned`. That is truthful and mildly useful on its
own — it makes the current state visible — but the field earns its keep only once something can write
`measured`. Landing it after `task.81` means the first gate carrying it can actually distinguish.

### The smallest honest version of this task

If the trigger work proves too risky, Phase 2 alone is worth shipping: recording `evidence:` without
teaching `SAFETY_REPROBE` to read it still ends the situation where a probed verdict and a guessed one are
the same sentence.
