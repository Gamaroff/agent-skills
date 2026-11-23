# QA Report: Task 287 - cases_file accepts only engine-shaped names

**Task**: [Link to task document](./task.287.cases-file-accepts-only-engine-shaped-names.md)
**Gate File**: [task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml](./task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-23
**Testing Completed**: 2026-11-23
**Gate Status**: PASS

---

## Executive Summary

`resolveCasesFile` now refuses a `cases_file` whose basename is not one the engine writes, answering `bad-name-shape` after the confinement check and before `lstat`. The change is small and held: 16 of 16 tests pass, 4 of the 5 new tests go red when the check is disabled, the fast gate on the LAN server was green (8741 tests, 0 fail), and the probe engine executed 8 candidates against the boundary with none reproduced.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (the Breaking Changes section and the CHANGELOG entry)
- [x] Code on feature branch with open PR (#933)

### Testing Approach

- [x] Automated Testing
- [x] Performance Testing (per-test timing, five runs)
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review

### Review Methodology

Adaptive strategy: direct tools plus one read-only Explore subagent for the diff review (small task, 3 phases, single module). Diff review: code review. Step 4b: not applicable, because the change set adds no fenced bash block (the two prose edits are sentences).

CI on 62d5eb096d6d: pending (read once, never waited on; CI is gated at `/finalise`).

Reviewer timing: dispatched 13:04Z, returned within the same minute (completion notice `duration_ms` 23356).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The check | PASS | Verified | `CASES_FILE_NAME` at `security-probe-plan.mjs:175`, refusal at `:201`, after `outside-work-dir` and before `lstatSync`; doc comment lists `bad-name-shape` |
| Phase 2: Tests | PASS | Verified | Fixtures re-pointed (including the direct `resolveCasesFile` test the plan missed); 5 new tests |
| Phase 3: Wording, bundle, changelog | PASS | Verified | prompt and `finalise/SKILL.md` state the shape; bundle `--check` 0 problems; CHANGELOG entry cites task 287 |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Engine-shaped names accepted | both shapes | `t.dod.1.security.cases.json`, `t.dod.1.security.cases.2.json` accepted | PASS | test and probe cases `cf-single-entry`, `cf-multi-entry` |
| Plain and near-miss names refused as `bad-name-shape` | refused | refused | PASS | test "a plain name and near misses are refused" |
| Reuse check names `cases-file-bad-name-shape` | named | named | PASS | test "a plan entry and a reuse check name the refusal" |
| Task 269's committed plans still reuse; task.304's refuses | as stated | corpus control over 31 plans | PASS | test "(the corpus control)" |
| Bad shape never reaches `lstat` | before | missing bad-shape name answers `bad-name-shape`, missing good-shape answers `missing` | PASS | test "the check runs before lstat … and after confinement" |
| No new test over one second | under 1 s | slowest 568-853 ms across five runs | PASS | loadavg 5.4-5.6 beside each run; the figure includes the suite wrapper |
| Mutation proof recorded | red | 4 of 5 new tests red | PASS | see Code Review |
| `CI=true npm run ci:fast` passes | green | `TEST_EXIT=0`, 8741 tests, 0 fail | PASS | LAN server, `npm run test:remote` |
| `quick_validate.py skills/finalise` | passes | passes | PASS | |
| `npm run bundle -- --check` | 0 problems | 0 problems | PASS | run by the pre-commit hook on both commits |
| CHANGELOG entry citing task 287 | present | `changelog-cites.sh` answers `cites (task 287)` | PASS | |
| Prompt and `SKILL.md` state the shape | stated | stated | PASS | |

Criteria drift: clean (base: the review commit).

---

## Breaking Changes Validation

### Breaking Change: a hand-named cases file is refused

Documented: Yes
Migration Path Provided: Yes (rename to the engine shape, or put the cases inline)
Migration Tested: Yes, by the corpus control over 31 committed plans (only task.304's names a non-engine file, and that plan was already not reusable)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

None. HIGH: 0, MEDIUM: 0, LOW: 0 (one advisory recommendation, below).

---

## NFR Assessment

### Performance — PASS
A regex test on a basename before any filesystem call.

### Reliability — PASS
The new reason flows through the existing plan-entry and reuse paths unchanged.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8
- `resolveCasesFile` is a boundary. The probe engine ran `casesFileAccepted` with a cases file: 6 hostile candidates refused (plain name, non-numeric index, trailing extension, trailing newline, engine-shaped climb, engine-shaped absolute) and 2 legitimate engine-shaped names accepted. Verdict `engages`, 0 reproduced, 0 escaped. Record: `task.287.qa.1.security.run.json`, cases `task.287.qa.1.security.cases.json`.
- Criteria classifier: `boundary_signals: ["never","are refused"]`, copied into the gate with `boundary` answered by the probe above.
- Finding about the instrument: with the stock `path` sink and no cases file the same call reads `unverifiable` (`rejects-every-input`), because the sink's legitimate names are not engine-shaped. That is the intended behaviour of the change, not a defect, but a future DoD probe of this entry needs a cases file (recorded as a recommendation).

### Maintainability — PASS
One named constant beside the function; generated copies in sync.

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `shared/resources/security-probe-plan.mjs:175` — the pattern also accepts the bare name `.security.cases.json` (empty stem) and zero-padded indices such as `.01.`, which the engine never writes → require a non-empty stem and a canonical index. Reproduced by execution: both names are accepted; control: `x.security.cases.new.json` is refused. It matches the shape the task document itself states (`*.security.cases.json`), confinement and the regular-file check still apply, and the engine's own output (`${casesBase}.json`, `${casesBase}.${i + 1}.json`) is always accepted, so no unsafe input is admitted. Severity stays low, so it does not move the gate; recorded as advisory in `recommendations.future` (`remedy: unverified`).

Trailing-newline names are correctly refused (`$` without the `m` flag), which the reviewer checked and the probe case `cf-trailing-newline` confirms.

**Cleanups (0):** none.

mutation-proven: disabled the shape check (`if (false && …)` at `security-probe-plan.mjs:201`) → `cases_file shape: a plain name and near misses are refused…`, `…a plan entry and a reuse check name the refusal…`, `…the corpus control…` and `…the check runs before lstat…` went red → covered. The accepted-shape test stayed green, as it should. File restored from a `cp` snapshot (`cmp` clean), 16 of 16 pass afterwards. Nothing else was running over the tree.

---

## Regression Testing

The fast gate (`npm run test:remote`, the CI-parity container on the LAN server) ran the whole hermetic suite on the implementation commit's tree: 8741 tests, 8738 pass, 0 fail. The only commit since is documentation.

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe-plan.mjs`, `shared/resources/tests/security-probe-plan-cases-file.test.mjs`, `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `CHANGELOG.md`, and the four generated copies.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/security-probe-plan-cases-file.test.mjs   # 16 pass, 0 fail, five runs
python3 skills/create-skill/scripts/quick_validate.py skills/finalise                         # passes
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/security-probe-plan.mjs#casesFileAccepted' --args-json '["<scratch dir>"]' --cases-file task.287.qa.1.security.cases.json --record task.287.qa.1.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: tighten the pattern, or state the looser shape in the comment.
2. Note in the probe-plan guidance that a probe of `casesFileAccepted` needs a cases file.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: every criterion is met with evidence, the boundary was executed and held, and the one finding is advisory.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.287.qa.1.cases-file-accepts-only-engine-shaped-names.md`
**Gate File**: co-located at `task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
