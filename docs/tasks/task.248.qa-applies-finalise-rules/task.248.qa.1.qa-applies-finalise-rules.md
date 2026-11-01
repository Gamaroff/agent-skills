# QA Report: Task 248 - QA applies the finalise DoD's rules before finalise does

**Task**: [task.248.qa-applies-finalise-rules.md](./task.248.qa-applies-finalise-rules.md)
**Gate File**: [task.248.gate.1.qa-applies-finalise-rules.yml](./task.248.gate.1.qa-applies-finalise-rules.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #803. The four finalise-DoD rules each have one runnable definition, and both QA skills run them. 129 targeted tests pass, and every changed skill validates. The diff review found two defects in `criteria-drift.js`, and QA reproduced both by running the engine.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — T248-QA-1 and T248-QA-2 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status ready-for-review)
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#803 → develop)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review

### Review Methodology

The review used direct tools. One diff reviewer ran as an Explore subagent over a 3,435-line diff covering 36 files. The bundled `references/` copies were excluded, because `bundle:check` already holds them to their sources. The reviewer was dispatched at 18:29Z and returned after 78.6 s (`duration_ms` 78633).

CI on 5c4d7e3a799b: pending

Step 4b: the snippet engine ran over 5 changed SKILL.md files. Of the 7 changed blocks, it executed 0: all 7 were refused as `mutating` (`unrecognised-command: node` or `gh`; the `changelog-cites.sh` helper is not a literal path). The engine reported `changed-blocks-not-executed` for qa-task, qa-story and finalise. Those same blocks are extracted and run by the committed `qa-finalise-rules-wiring.test.mjs` (9 pass, bash; zsh in CI), so I record the refusal as information rather than as a finding. zsh is not installed on this host.

---

## New Findings This Cycle

- **[medium]** `shared/resources/criteria-drift.js:267` — when no stamp is present, the review-commit fallback is skipped and the base drops to merge-base → find the report independently of its stamp (T248-QA-1)
- **[medium]** `shared/resources/criteria-drift.js:150` — a prefix test treats a bound changed by extension as appended → require a boundary (T248-QA-2)
- **[low]** `shared/resources/changelog-cites.sh` — a path-prefixed stem exits 3, and 6d continues silently → refuse `/` (T248-QA-3)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Boundary signal CLI + gate field | PASS | Verified | `boundary_signals: ["never"]` on this task's own document |
| 2: Criterion amendments | CONCERNS | Verified | Wired correctly; the engine has T248-QA-1 and T248-QA-2 |
| 3: CHANGELOG citation | PASS | Verified | `changelog: cites (task 248)`; probed, 6 cases |
| 4: Quantifier + read-back + qa-fix | PASS | Verified | Read-back check 6 covered by 4 tests |

**Overall Phase Completion**: 4/4 delivered, 1 with concerns

---

## Success Criteria Verification

The three new blocks were run against this task's own document:

- `boundary_signals: ["never"]`
- `criteria-drift: clean (base: reviewed-blob)`
- `changelog: cites (task 248)`

Every behaviour criterion is held by a committed test in the seven suites listed below. The quantifier rule's single home is held by `qa-finalise-rules-wiring.test.mjs`.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Boundary signal runs at QA and lands in the gate | PASS | wiring test (boundary block, both skills); read-back test "a criteria signal with boundary: false and no reason halts" |
| Unapproved amendment is a QA MEDIUM | CONCERNS | wiring test (drift block); engine defects T248-QA-1/2 |
| CHANGELOG citation checked at QA | PASS | `changelog-cites.test.mjs` 6 cases; 6d strings pinned |
| Quantifier rule cited, not restated | PASS | wiring test single-home case |
| All tests passing | PASS | 129/129 targeted; 6952/0 full CI at Step 3 |
| Validation commands | PASS | `npm run validate` rc 0 for finalise, qa-task, qa-story, qa-fix, develop |

---

## Breaking Changes Validation

None. The new gate keys are optional, and gates written earlier still read back. The 6d messages are unchanged, and a test pins them.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: An unstamped review report falls through to merge-base (T248-QA-1)**
- **Category**: Functional
- **Observation**: In a scratch repository, the review step rewords criterion #1, and the review report carries no `reviewed_blob` line. `criteria-drift.js --base-from-review develop` returns `drift`, with base `merge-base` and `#1 reworded, approved false`. After the stamp is added it returns `clean`, with base `reviewed-blob`.
- **Impact**: A false MEDIUM at QA, and a false "amendment unapproved" FAIL at the DoD, for any review that left no stamp.
- **Recommendation**: Look up the newest review report apart from its stamp, and try its adding commit before falling back to merge-base.

**Issue: A bound changed by extension reads as appended (T248-QA-2)**
- **Category**: Functional
- **Observation**: `diffCriteria` classifies `within 5` → `within 50 ms` as `appended`.
- **Impact**: An unapproved tightening or loosening gets the "does it relax?" judgement instead of the automatic MEDIUM.
- **Recommendation**: Count a change as appended only at a word or punctuation boundary, or when the old continuation is empty.

### LOW Severity Issues (1)

- **T248-QA-3**: `changelog-cites.sh ../task.248` exits 3 with "not a task". 6d's rc-3 arm has no default for unrecognised text, so the check is skipped without a word. `STEM` is a typed placeholder in finalise, so the case is reachable only through a mis-substitution.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
The engines are offline and run once per cycle.

### Reliability — CONCERNS
T248-QA-1 and T248-QA-2: the drift engine reports false drift in one case and misses real drift in the other.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 6 (escaped: 0). Run record: `task.248.qa.1.security.run.json`. Cases: `task.248.qa.1.changelog-cites.cases.json`.
- **Boundary**: `true`. `changelog-cites.sh` refuses stems and HALTs 6d, so it was probed with the `shell-argv:` form. Five hostile stems were refused with exit 2: `;`, `$(…)`, the `task.2.8` regex wildcard, `-x` and a newline. No `PWNED` marker file was created, and the legitimate stem cited. The engine could not materialise `../task.248` (`fixture: name carries a path separator`); I reproduced that case by hand, and it is T248-QA-3.
- `boundary_signals: ["never"]` (the criteria classifier's own output).

### Maintainability — PASS
Each rule has one definition. CR-4 is advisory.

---

## Code Review

Code-review blocking is on for this pipeline run. No finding reached `confidence: high`, so none was promoted by the mapping rule. QA reproduced CR-1 and CR-2 itself and entered them as T248-QA-1 and T248-QA-2. The reviewer's confidence is unchanged.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/criteria-drift.js:267` — when the report has no stamp, the base skips the review-commit fallback → look up the report apart from its stamp (→ T248-QA-1)
- [medium/medium] `shared/resources/criteria-drift.js:150` — a string-prefix test calls an edited bound appended → require a boundary (→ T248-QA-2)
- [low/medium] `shared/resources/changelog-cites.sh:56` ⚠️ unverified anchor (text-mismatch; the line is 55) — a missing node, jq or doc-id.js exits 2, like a bad stem. The check fails closed but blames the stem → send missing tools to exit 4

**Cleanups (1):**
- `shared/resources/criteria-drift.js:238` — a second `reviewed_blob` matcher → use `reportReviewedBlob` from `review-report-freshness.js`

mutation-proven: `changelog-cites.sh` usage `exit 2` → `exit 3` → `[bash] 2 usage: no stem, two stems, a stem doc-id.js cannot read` → covered

The six development-time mutation proofs are recorded in the implementation report. I re-ran one of them, the one above.

---

## Regression Testing

| Area | Result |
| --- | --- |
| finalise 6d (finalise-publish-boundary, 31) | PASS |
| qa-read-back (55) and the consumer-shaped block (qa-read-back-block) | PASS |
| criteria-section parity with jira-sync over every task and story doc | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/criteria-drift.js`, `criteria-section.js`, `changelog-cites.sh`, `probe-boundary-signals.mjs`, `qa-read-back.js`, and the changed fenced blocks in `skills/{qa-task,qa-story,finalise,develop,qa-fix}/SKILL.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/changelog-cites.test.mjs shared/resources/tests/criteria-drift.test.mjs shared/resources/tests/criteria-section.test.mjs shared/resources/tests/qa-read-back.test.mjs shared/resources/tests/qa-finalise-rules-wiring.test.mjs evals/shared/tests/finalise-publish-boundary.test.mjs tests/qa-read-back-block.test.js   # 129 pass
npm run validate -- skills/<skill>/   # finalise, qa-task, qa-story, qa-fix, develop: rc 0
command node shared/resources/security-probe.mjs --sink filename --entry 'shell-argv:shared/resources/changelog-cites.sh' --argv '["{input}"]' --cases-file <cases> --record <run.json>
```

### Coverage Report
No coverage instrument is configured for this repository.

---

## Recommendations

### Immediate Actions (Blocking)
1. T248-QA-1 (P2)
2. T248-QA-2 (P2)

### Short-term Actions (Non-Blocking)
1. T248-QA-3, CR-3, CR-4

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two reproduced MEDIUM defects in the drift engine.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T248-QA-1 and T248-QA-2 fixed

---

**QA Report**: co-located at `task.248.qa.1.qa-applies-finalise-rules.md`
**Gate File**: co-located at `task.248.gate.1.qa-applies-finalise-rules.yml`
**Next Steps**: `/qa-fix`, then QA cycle 2 (a full refute pass)
