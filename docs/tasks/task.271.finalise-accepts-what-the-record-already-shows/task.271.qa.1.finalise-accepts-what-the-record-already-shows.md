# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.1.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.1.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: FAIL

---

## Executive Summary

The three arms work for their accepting cases and refuse their unmatched controls, and `ci:fast` is green (8043 tests, 0 failed). The adversarial review found two ways `rerun-eligible` answers `eligible` for a failed file the PR changed, which is the fail-open direction for the one arm that spends CI time on a trust decision. Both were reproduced here. The deferral matcher accepts an impossible approval date, and the new Step 3b.1 item 5a block does not run under zsh.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`CI=true npm run ci:fast`, run in Step 3 on this head)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#859)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (Step 3b). First review, so the whole branch diff, with the generated bundled copies excluded from the patch (they are byte copies of the sources reviewed). Reviewer wall time not measured. Adaptive strategy: direct tools; one reviewer.

CI on 3f3dc026: not read at gate time (PR opened minutes earlier; no completed check). Recorded as undecided.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Owner decisions | PASS | n/a | Answers recorded in the plan |
| 2: Arm 1 | PASS | Verified | AC prompt clause cites `finalise-delta.js docs-only`; the three AC-prompt tests pass (66) |
| 3: Arm 2 | CONCERNS | Partial | Engine and wiring present; fail-open on path spellings (QA-1, QA-2) |
| 4: Arm 3 | CONCERNS | Partial | Matcher and wiring present; impossible date (QA-3), zsh (QA-4) |
| 5: Bundle and sweep | PASS | Verified | `bundle --check` 0 problems |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Each arm accepts its matching case and refuses its unmatched control | PASS | `finalise-delta.test.mjs` (15) and `finalise-deferral-match.test.mjs` (14), each accepting case beside a control |
| Every accepted case writes its basis into the DoD | PASS | AC prompt cites M and the result; SKILL.md 5a renders `deferred (owner, date, task)`; CI re-run line records both attempts |
| With no matching record finalise behaves as before | PASS | Existing finalise fixtures pass unchanged in `ci:fast` |
| `npm test` wall time within 10% of develop (median of five alternating) | pending | Run in progress when this gate was written; the number goes into the cycle-2 report |
| Mutation proof per arm | PASS (dev-only) | Recorded in the implementation report; see Step 3c below |
| Fixture-vanish cause stated | PASS | Suspected cause named (detached `git maintenance`), not reproduced, commands tried recorded |

---

## Issues Found

### HIGH Severity Issues (2)

**T271-QA-1: failed-file path spellings bypass the in-diff refusal**
- **Observation**: with `src/a.js` changed by the PR and a docs-only delta, `--failed-file src/a.js` and `./src/a.js` give `in-diff`; `<absolute>/src/a.js`, `../p/src/a.js` and `src/./a.js` give `eligible`.
- **Impact**: a red the PR caused is re-run and can be accepted on a second green.
- **Recommendation**: canonicalise against the workspace root, refuse a path that escapes it.

**T271-QA-2: an unsubstituted placeholder is eligible**
- **Observation**: `--failed-file "{failed-files}"` gives `eligible`. The SKILL.md block also expands `{failed-files}` unquoted.
- **Recommendation**: refuse `{...}` in the engine (exit 2), require the file to exist in the head tree, read the list with `while IFS= read -r`.

### MEDIUM Severity Issues (2)

**T271-QA-3**: `2026-13-45` and `0000-00-00` match the date shape and render into the DoD line.

**T271-QA-4**: the item 5a block uses `read -r -a`; under zsh this prints `bad option: -a` and every deferral reads `no-approver-configured`. Same block run under bash returns `matched`.

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 0 (four advisory items in the gate's `recommendations.future`)

---

## NFR Assessment

### Performance — CONCERNS
The timing comparison had not finished. `ci:fast` took 110.6 s for 8043 tests on this head.

### Reliability — CONCERNS
The 5a block fails closed under zsh but names the wrong reason.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: reasoned
- **Probes executed**: 0
- Both engines are accept/reject predicates (`boundary: true`). The probe engine was not run this cycle because the code under test changes in the fix cycle, and `/finalise` Step 3b.1 will fail the zero-guard unless cycle 2 runs it. The hostile inputs for QA-1 and QA-2 were enumerated and run by hand against the CLI; by-hand runs do not count toward `probes_executed`.

### Maintainability — PASS
One shared engine for Arms 1 and 2, reusing the repository's single docs-path definition.

---

## Code Review

**Correctness bugs (7):** the reviewer returned CR-1 to CR-8. Mapped to the gate (code_review_blocking on): CR-1 (QA-1), CR-2 (QA-2), CR-3 (QA-3). CR-6 (QA-4) was reproduced by QA under bash and zsh, so it is in the gate although the reviewer rated it medium confidence.

- [high/high] `shared/resources/finalise-delta.js:230` — raw failed-file strings compared to repo-relative names → canonicalise
- [high/high] `skills/finalise/SKILL.md:1442` — unquoted `{failed-files}` and no placeholder refusal → quote, refuse
- [medium/high] `shared/resources/finalise-deferral-match.js:66` — date by shape only → real date check
- [medium/medium] `shared/resources/finalise-deferral-match.js:65` — any `task.N` accepted, existence unchecked → advisory (gate `recommendations.future`)
- [medium/medium] `shared/resources/finalise-deferral-match.js:218` — Deferred Work bullet is free text the pipeline writes → advisory; the owner chose a mechanical match, so this is a recorded residual of the design
- [medium/medium] `skills/finalise/SKILL.md:822` — `read -a` under zsh → in the gate as QA-4
- [low/medium] `skills/finalise/SKILL.md:825` — placeholder in `{gate-file}` reads `unverifiable` → advisory
- [low/low] `shared/resources/finalise-delta.js:152` — case-insensitive checkout and stale local `--pr-base` → advisory

**Cleanups (0).**

Step 4b: the two changed fenced blocks in `skills/finalise/SKILL.md` were classified `mutating` and not executed by the engine (`changed-blocks-not-executed`, `zero-blocks-executed`: 49 blocks, 3 placeholder, 46 mutating). QA executed the item 5a block by hand in a scratch directory under bash and zsh; that run is where QA-4 was found.

Step 3c: mutation-proven: dropping the docs-path check, the in-diff exclusion, the owner check and the once-only limit → named tests in `finalise-delta.test.mjs` and `finalise-deferral-match.test.mjs` → dev-only (recorded in the implementation report; QA did not re-run them because the working tree was in use for the timing comparison) → `not-run`.

Provenance: all four findings reproduce on this branch only; the engines do not exist on `develop`, so none is pre-existing.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix QA-1 and QA-2 together in `finalise-delta.js` and its SKILL.md block, with a refused control per spelling.
2. Fix QA-3 and QA-4.

### Short-term Actions (Non-Blocking)
1. The four gate `recommendations.future` items.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two high-confidence fail-open defects in the arm that spends CI time on a trust decision.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.271.qa.1.finalise-accepts-what-the-record-already-shows.md`
**Gate File**: co-located at `task.271.gate.1.finalise-accepts-what-the-record-already-shows.yml`
**Next Steps**: `/qa-fix`, then re-review (cycle 2 runs the probe engine and records the timing result).
