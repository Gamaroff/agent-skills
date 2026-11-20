# QA Report: Task 276 - Halts and re-entries leave and read true state

**Task**: [Link to task document](./task.276.halts-and-re-entries-leave-and-read-true-state.md)
**Gate File**: [task.276.gate.2.halts-and-re-entries-leave-and-read-true-state.yml](./task.276.gate.2.halts-and-re-entries-leave-and-read-true-state.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2, the full-diff refute pass. The three cycle-1 findings that code could close are closed and mutation-proven. The refute reviewer found one low issue in the new fix, which I reproduced. The wall-time success criterion is still unmeasured.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one read-only Explore subagent with the REFUTE PASS directive appended. Diff review: code review. Reviewer duration 22037 ms from the completion notice. The reviewer reports it read `resume-prompt-check.sh` in full, the `canon()` and `halt_lock` code in `advance-pipeline-lock.sh`, and `qa-report-cycles.sh`; the rest of the patch was not read, and it executed nothing. That is a narrower pass than the whole 1533-line patch, so the other files rest on cycle 1's review, the suites and the mutation proofs.

CI on 1858f76fb: not read from the PR this cycle. The CI-parity suite on the LAN server ran on the same code before the commit: 8504 tests, 8501 pass, 0 fail.

Re-review scope: whole branch diff (cycle 2 refute pass; `origin/develop...HEAD`, 1533 lines of source, test and CHANGELOG changes, bundled copies excluded). Step 4b: not applicable to the fixes; the changed code is shell, and no fenced block changed since cycle 1.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T276-QA-1 foreign lock misread | ✅ FIXED | `resume-prompt-check.sh` compares the lock's document directory; test "a step-7 lock for ANOTHER document is ignored" goes red when the comparison is reverted |
| T276-QA-2 no CHANGELOG entry | ✅ FIXED | `changelog-cites.sh task.276` prints `cites (task 276)` |
| T276-QA-3 wall-time criterion unmeasured | ❌ NOT FIXED | left open on purpose; qa-fix does not edit criteria |
| T276-QA-4 `LC_ALL=C` step-5 row | ✅ FIXED | test "step 5 row found under LC_ALL=C" goes red when the bracket class returns |
| CR-4 stale header | ✅ FIXED | header reworded |
| CR-2 untested refusal relay | open, advisory | stays in `recommendations.future` |

---

## New Findings This Cycle

- **[low]** `shared/resources/resume-prompt-check.sh:75` — `canon()` falls back to the raw string and does not strip `./` or trailing slashes, so a relative lock directory read from another cwd is taken for another document's lock → strip as `advance-pipeline-lock.sh` does, and return `cannot tell` when the directory cannot be resolved (T276-QA-5)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Restore guard, `--halt`, `--newest-dod` | PASS | advance-pipeline-lock.test.sh 235/0 | |
| 2. Re-entry routes, distinct budget base | PASS | reenter 80/0, grant 65/0 | |
| 3. Resume-prompt check | CONCERNS | resume-prompt-check.test.sh 28/0 | T276-QA-5 |
| 4. HALT fences, contract, bundling | PASS | halt-fence 6/0; bundle check clean | |

**Overall Phase Completion**: 4/4 built; 1 with a low finding.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Behaviour criteria (guard, `--halt`, distinct base, resume check) | PASS | each held by a committed suite |
| `CI=true npm test` wall time within 10% of develop (median of five alternating runs) | **UNVERIFIED** | no measurement (T276-QA-3) |
| CHANGELOG cites the task | PASS | `cites (task 276)` |

criteria-drift.js: clean.

---

## Breaking Changes Validation

None documented. Breaking change check: PASS (not applicable). The one deliberate behaviour change, a plain `--restore` refusing a step-7 GAPS halt, is documented in the resume contract and the CHANGELOG.

---

## Issues Found

### MEDIUM Severity Issues (1)

- **T276-QA-3** wall-time criterion unmeasured. The fix is a decision, not code: measure (about 2.5 hours of runs on the LAN server) or amend the criterion with an approver.

### LOW Severity Issues (1)

- **T276-QA-5** relative lock directory from another cwd (origin: code-review CR-1, reproduced by QA; reviewer severity low and confidence low, unchanged). Reproduction: lock `{current_step:7, task_or_story_directory:"docs/t"}`, prompt `step 5` with the absolute document directory, cwd `/` → `proceed: 5`. Control: from the repository root with the relative directory → `already complete: 5`. Provenance: the comparison was added in cycle 1's fix, so it has no base counterpart.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — CONCERNS
Wall-time criterion unmeasured.

### Reliability — PASS
`--halt` is idempotent and writes the snapshot first. T276-QA-5 affects the advisory resume check only.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The boundary classifier matched "refuses"; the inputs are artefacts this pipeline writes, so `boundary: internal`, reason recorded in the gate.

### Maintainability — PASS
`canon()` now exists in two scripts with slightly different behaviour; T276-QA-5 is the visible cost.

---

## Code Review

Diff review: code review (refute pass).

**Correctness bugs (1):**
- [low/low] `shared/resources/resume-prompt-check.sh:75` — fallback `canon()` does not normalise `./` or a trailing slash (T276-QA-5, reproduced)

**Cleanups (0):** none.

Mutation proofs from cycle 1's fixes were re-run in the qa-fix step (committed tests; each reverted from a `cp` snapshot, `cmp` clean):

```
mutation-proven: lock treated as always ours → resume-prompt-check.test.sh "a step-7 lock for ANOTHER document is ignored: the artefacts decide" → covered
mutation-proven: bracket class restored for the step-5 row → resume-prompt-check.test.sh "step 5 row found under LC_ALL=C" → covered
```

No new mutation was applied this cycle, since no code changed after the fix commit. The cycle-1 proofs of the other guards still stand.

---

## Regression Testing

CI-parity suite on the LAN server: 8504 tests, 8501 pass, 0 fail, 3 skipped, tmp-leak ratchet ok. Bundle check and prettier clean after the fix.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run test:remote
bash shared/resources/resume-prompt-check.test.sh
bash .agents/skills/qa-task/references/changelog-cites.sh task.276
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
```

Standards-named validation (`npm run validate -- skills/<skill>/`): not run this cycle; the CI-parity suite covers `validate`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T276-QA-5.
2. Decide T276-QA-3: measure it, or amend the criterion with an approver.

### Short-term Actions (Non-Blocking)
1. Test the DoD-gaps refusal through `grant-qa-cycles.sh` and `accept-qa-residual.sh`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high findings; one medium that needs a human decision and one low with a small fix.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T276-QA-3, T276-QA-5

---

**QA Report**: co-located at `task.276.qa.2.halts-and-re-entries-leave-and-read-true-state.md`
**Gate File**: co-located at `task.276.gate.2.halts-and-re-entries-leave-and-read-true-state.yml`
**Next Steps**: `/qa-fix` cycle 2 for T276-QA-5; escalate T276-QA-3.
