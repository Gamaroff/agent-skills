# QA Report: Task 243 - Link Wireloom wireframe nodes to the project's UI components

**Task**: [task.243.wireframe-component-mapping.md](./task.243.wireframe-component-mapping.md)
**Gate File**: [task.243.gate.13.wireframe-component-mapping.yml](./task.243.gate.13.wireframe-component-mapping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Re-Review Context

QA cycle 13 of 13, the last cycle in the budget. It reviews fix cycle 12, `5fb5865a`.
`encodeValue` and `decodeValue` give attribute values one percent-encoding, which `signatureOf` and
`parsePattern` share. A new test checks that every node's signature reads back to the node, and the
docs and sixteen bundled copies are updated.

| Previous issue | Source | Status |
| --- | --- | --- |
| TASK-243-CR12-1 (medium): attribute values do not round-trip through their signature (bug.15) | gate 12 | ✅ FIXED. The bug.15 reproduction reads `1,500` and `a}b` back unchanged; three mutations each turn the new test red; bug.15 closed |
| TASK-243-CR12-2 to CR12-5 (low and cleanups) | gate 12 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR11-1, CR11-2, CR8-1, CR7-1 (low) | gates 7–11 | ❌ NOT FIXED (deferred, carried) |

---

## New Findings This Cycle

- **[medium]** `shared/resources/wireframe-map.js:812`: since `decodeValue`, two signature texts can
  mean the same value (`v=é` and `v=%C3%A9`, `v=72%` and `v=72%25`). `record` still finds the row to
  replace by raw text, so re-recording a node in the other spelling adds a second row, and `match`
  keeps returning the older answer. Reproduced by QA. Promoted as TASK-243-CR13-1,
  [bug.16](./task.243.bug.16.record-adds-a-second-row-for-an-equivalent-signature.md). → compare
  parsed signatures when finding the row to replace.
- **[low]** `shared/resources/tests/wireframe-map.test.mjs:503`: the no-merge check cannot fail,
  because each value sits under its own key (TASK-243-CR13-2).
- **[low, cleanup]** `shared/resources/wireframe-component-mapping.md:112`: the list of encoded
  characters is incomplete (TASK-243-CR13-3, advisory).

---

## Executive Summary

The cycle 12 fix does what it says: every signature `listNodes` produces now parses back to its
node, and nothing escapes the probe. But the decoding it added lets two spellings name the same
value, and `record` does not know that. A corrected answer can therefore be added beside the old one
and lose to it. That is one medium finding, so the gate is CONCERNS, on the last cycle of the budget.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#785)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe re-run)
- [x] Code Review

### Review Methodology

Direct tools (re-review, one fix). One read-only Explore reviewer over the scoped diff: dispatched
17:49:48 UTC, `duration_ms` 77506.

Re-review scope: files changed since gate 12 (head 295974a5ee2b; 20 files: 4 sources and 16 bundled copies) — default

`SAFETY_REPROBE=false`: clause 1 false (gate 12 security PASS); clauses 2 and 3 do not hold (gate 12's
finding is an identity defect, not a safety one).

CI on 5fb5865a5338: pending

Step 4b: `shared/resources/wireframe-component-mapping.md` has 1 bash block, refused as mutating
(`no-executable-blocks`); the change touched no block (`changed.total` 0).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–5 | PASS | Verified | Unchanged since gate 12 apart from the cycle 12 fix in Phase 2's engine |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| A confirmed link is reused on the next run | Yes | Not when the row is re-recorded in the other spelling | CONCERNS | CR13-1 |
| All tests passing | 100% | 20/20 (`wireframe-map.test.mjs`); fast gate at the fix 6829/6843, 0 fail | PASS | |
| `validate` on the 8 changed skills | 0 errors | 0 errors | PASS | |
| `bundle:check` | clean | 128 skills, 0 problems | PASS | |

---

## Breaking Changes Validation

None. Signatures with plain values are spelled as before, and hand-written rows with a `%` that
starts no escape still read literally.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: record adds a second row for a signature that means the same thing**

- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.243.bug.16.record-adds-a-second-row-for-an-equivalent-signature.md](./task.243.bug.16.record-adds-a-second-row-for-an-equivalent-signature.md)
- **Observation**: record `window>input{v=é}` as Old, then `window>input{v=%C3%A9}` (the node's own
  signature) as New. Both calls report `added`, the map holds two rows, and `match` returns Old. The
  same happens with `72%` then `72%25`.
- **Provenance**: at the gate 12 head the same two records also add two rows, but there they name
  different values, so that was correct. The defect comes from the cycle 12 decoding.
- **Impact**: a corrected answer is silently ignored.
- **Recommendation**: compare parsed signatures plus the label when finding the row to replace.
- **Priority**: P2

### LOW Severity Issues (2)

- TASK-243-CR13-2: the round-trip test's no-merge check cannot fail (each value has its own key).
- TASK-243-CR13-3 (cleanup): the docs list only some of the encoded characters.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

One encode or decode pass per value; the regex is compiled once.

### Reliability — CONCERNS

A corrected answer can be silently ignored (CR13-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 114 (escaped: 0)
- `boundary: true`. The DoD run 3 plan was re-run against `5fb5865a` as
  `task.243.qa.13.security.run.json`: 11 controls (two fence guards, the `parsePattern` signature
  gate, eight `record` flags), each executed, 114 cases, 0 reproduced, 0 escaped, 0 refusals.
- CR13-1 is an identity defect, not a refusal gap.

### Maintainability — PASS

One encoding, defined once and shared by writer and reader. The bundled copies match their sources.

---

## Code Review

**Correctness bugs (2):**

- [medium/high] `shared/resources/wireframe-map.js:812`: record compares raw signature text, so an
  equivalent spelling adds a second row that loses the tie → compare parsed signatures. Promoted:
  TASK-243-CR13-1.
- [low/high] `shared/resources/tests/wireframe-map.test.mjs:503`: the no-merge check cannot fail →
  put the values under one key. Promoted: TASK-243-CR13-2.

**Cleanups (1):**

- `shared/resources/wireframe-component-mapping.md:112`: the encoded-character list is incomplete →
  say every character outside the unreserved set plus `/ : # @ + =`, or copy the signature as
  `resolve` prints it.

All three anchors check `ok`.

Mutation proofs, in a scratch worktree at `5fb5865a`:

```
mutation-proven: signatureOf without encodeValue → round-trip test red (19/20) → covered
mutation-proven: parsePattern without decodeValue → round-trip test red (19/20) → covered
mutation-proven: decodeValue strict (no fallback for an invalid run) → round-trip test red (19/20) → covered
```

Restored 20/20, file identical to the snapshot.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `wireframe-map.test.mjs` | PASS, 20/20 |
| Fast gate at the fix (`npm run ci:fast`) | PASS, 6829/6843, 0 fail |
| 8 changed skills, `validate` | PASS |
| `bundle:check` | PASS |

---

## Test Artifacts

### Files Reviewed

`shared/resources/wireframe-map.js`, `shared/resources/tests/wireframe-map.test.mjs`,
`shared/resources/wireframe-component-mapping.md`, `docs/reference/configuration.md`.

### Test Commands Executed

```bash
command node --test shared/resources/tests/wireframe-map.test.mjs
npm run -s validate -- skills/<s>/       # x8
npm run -s bundle:check
command node .agents/skills/finalise/references/security-probe-plan.mjs --plan qa13-plan.json \
  --record docs/tasks/task.243.wireframe-component-mapping/task.243.qa.13.security.run.json \
  --cases-base docs/tasks/task.243.wireframe-component-mapping/task.243.qa.13.security.cases --repo-root . --json
command node qa13-cr1-repro.js shared/resources/wireframe-map.js   # and against the gate 12 head
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 785
```

### Coverage Report

Not measured; the repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-243-CR13-1 (bug.16): record must replace a row whose signature means the same thing.

### Short-term Actions (Non-Blocking)

1. TASK-243-CR13-2: make the no-merge check able to fail.
2. TASK-243-CR13-3 and the carried lows from gates 7–12.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the cycle 12 fix is verified, but it introduced one medium identity defect in `record`.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-243-CR13-1 fixed and re-gated.

---

**QA Report**: co-located at `task.243.qa.13.wireframe-component-mapping.md`
**Gate File**: co-located at `task.243.gate.13.wireframe-component-mapping.yml`
**Next Steps**: the 13-cycle budget is spent; the pipeline escalates to the user.
