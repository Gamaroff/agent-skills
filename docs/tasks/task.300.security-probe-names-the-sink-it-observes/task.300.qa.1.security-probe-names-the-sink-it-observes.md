# QA Report: Task 300 - security-probe names the sink it observes

**Task**: [Link to task document](./task.300.security-probe-names-the-sink-it-observes.md)
**Gate File**: [task.300.gate.1.security-probe-names-the-sink-it-observes.yml](./task.300.gate.1.security-probe-names-the-sink-it-observes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: PASS

---

## Executive Summary

The change states the security-probe runner's observation limits once in the engine, stores their ids per record entry, and prints them beside the candidates-executed count on the DoD Probe Results line. Every phase is delivered and held by committed tests. No findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

## Phase 1 finding (premise)

The filed premise was wrong in part. A validator that accepts a hostile value is already counted as reproduced, so this is a reporting change and not a new observable sink. The design choice is a fixed run-level `observation_limits` list keyed by entry form. A per-entry "sink observable?" field was rejected: the runner has no input that decides it. The field is not called `sink`, which already means the corpus input class.

## Review Methodology

Direct tools, inline. Diff review: code review, performed inline by the QA orchestrator over the 17-file diff (no subagent dispatched, so no independent reviewer ran). Step 4b: not applicable beyond the finalise `SKILL.md` edit, which adds prose only. CI on 0bc3fe88353f: pending.

Re-review scope: not applicable (first review).

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Confirm | PASS | n/a | Decision recorded above and in the implementation report |
| 2: Record the limits | PASS | Verified | `OBSERVATION_LIMITS`, `observationLimitsFor`, `observationLimitIds`, `observationLimitTexts`; field stored per entry |
| 3: Report it | PASS | Verified | `finalise/SKILL.md` Probe Results line; `finalise-dod-prompt-contract.test.mjs` still green |
| 4: Tests | PASS | Verified | four committed tests prefixed "observation limits:" |

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Premise finding recorded | PASS | Section above |
| Form with limit yields the field and DoD line | PASS | security-probe.test.mjs, tests 1, 2 and 4 |
| Form-specific limit only on `fence:`; counts unchanged | PASS | test 1 and the same-count assertion in test 4 |
| No extra probe executions | PASS | test 4 asserts `probes_executed` equals the record's `totals.executed`, and the entry runs once; the change adds no execution path |
| bundle:check, format:check, ci:fast | PASS | `ci:fast` TEST_EXIT=0 on the LAN server at develop; `bundle:check` 129 skills, 0 problems |
| CHANGELOG entry; readers tolerate field | PASS | `CHANGELOG.md` cites task 300; test 3 reads a legacy record |

CHANGELOG citation: `cites (task 300)`. Criteria drift: clean. Boundary signals: none.

## Breaking Changes Validation

None. The record field and plan output field are additive.

## Issues Found

None. Total issues: HIGH 0, MEDIUM 0, LOW 0.

## NFR Assessment

### Performance — PASS
One extra dynamic import of the already-loaded engine in the plan CLI.

### Reliability — PASS
An engine without the export reads as no limits; a legacy record derives the same limits from its entry form.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary is delivered; the change adds a reporting field and prose.

### Maintainability — PASS
Limit text lives once in `OBSERVATION_LIMITS`; bundled copies regenerated.

## Code Review

**Correctness bugs (0):** none.

**Cleanups (0):** none.

boundary: false — no function in the diff accepts or refuses an input. The new functions map an entry string or a record to limit ids and texts.

mutation-proven: `fence:` check in `observationLimitsFor` renamed to `nofence:` → "observation limits: every entry form carries…" and "…the record entry stores ids…" went red → covered
mutation-proven (from develop, committed tests): dropped `emitBlock` rendering → block test red → covered

Platform variance: `TMPDIR=/tmp node --test shared/resources/tests/security-probe.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs` → 356 pass, 0 fail.

The file was restored from a snapshot and `cmp` printed nothing; the tree held only the implementation report's uncommitted edit afterwards.

## Regression Testing

The finalise Probe Results block pins (`finalise-dod-prompt-contract.test.mjs`) pass; `security-probe-plan` readers pass.

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=/tmp CI=true node --test shared/resources/tests/security-probe.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
npm run bundle:check
npm run validate -- skills/finalise/
```

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Next Steps**: Step 5c PR review, then finalise.
