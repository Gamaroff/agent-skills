# QA Report: Task 276 - Halts and re-entries leave and read true state

**Task**: [Link to task document](./task.276.halts-and-re-entries-leave-and-read-true-state.md)
**Gate File**: [task.276.gate.1.halts-and-re-entries-leave-and-read-true-state.yml](./task.276.gate.1.halts-and-re-entries-leave-and-read-true-state.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-15
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #913. The four phases are built, the CI-parity suite is green (8501 pass, 0 fail), and five mutation proofs each turned a committed test red. Three medium findings and one low finding remain, all small.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (Step 3b). Diff review: code review (the change set holds shell and JS). Reviewer dispatched and returned in one pass; duration 66469 ms from the completion notice. Re-review scope: first review, whole branch diff of the source files (bundled copies excluded from the patch).

Step 4b: the two changed SKILL.md files hold 11 fenced blocks each; the one changed block (the HALT fence) is `mutating` and was not executed, as the engine's allow-list requires. Behaviour of the fence is held by `tests/halt-fence.test.js` and `advance-pipeline-lock.test.sh`.

CI on 61fabf9f4: not read from the PR (no CI read step run this cycle); the same head ran the CI-parity suite on the LAN server.

---

## New Findings This Cycle

_First review; every finding below is new._

- **[medium]** `shared/resources/resume-prompt-check.sh:77` — lock for another document read as authoritative → compare `task_or_story_directory` (T276-QA-1)
- **[medium]** `CHANGELOG.md` — no entry cites task 276 (T276-QA-2)
- **[medium]** task document, success criteria — wall-time criterion unmeasured (T276-QA-3)
- **[low]** `shared/resources/resume-prompt-check.sh:121` — en dash in a bracket class fails under `LC_ALL=C` (T276-QA-4)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Restore guard, `--halt`, `--newest-dod` | PASS | advance-pipeline-lock.test.sh 235/0 | guard mutation-proven |
| 2. Re-entry routes, distinct budget base | PASS | reenter 80/0, grant 65/0 | base and route mutation-proven |
| 3. Resume-prompt check | CONCERNS | resume-prompt-check.test.sh 24/0 | foreign-lock gap (T276-QA-1), locale (T276-QA-4) |
| 4. HALT fences, contract, bundling | PASS | halt-fence 6/0; bundle check clean | |

**Overall Phase Completion**: 4/4 built; 1 with findings.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Behaviour criteria (guard, `--halt`, distinct base, resume check) | PASS | each held by a committed suite; see mutation proofs |
| `CI=true npm test` wall time within 10% of develop (median of five alternating runs) | **UNVERIFIED** | no measurement; one remote run took 934 s with no develop counterpart (T276-QA-3) |
| CHANGELOG cites the task | **FAIL** | `changelog-cites.sh task.276` → `missing (task 276)` (T276-QA-2) |

criteria-drift.js: clean (base: review commit).

---

## Breaking Changes Validation

None documented. Breaking change check: PASS (not applicable). One behaviour change is deliberate and documented: a plain `--restore` over a step-7 GAPS halt is now refused; `reenter-qa-after-finalise.sh` and `--allow-dod-gaps` are the doors.

---

## Issues Found

### MEDIUM Severity Issues (3)

- **T276-QA-1** foreign lock misread by `resume-prompt-check.sh` (origin: code-review CR-1, reproduced by QA; reviewer confidence medium, unchanged). Reproduction: a lock `{current_step:6, task_or_story_directory:"/other/dir"}` and prompt `step 1` for another doc dir prints `already complete: 1`, rc 1. The caller would report done and stop. Control: a lock for this document at the same step gives the same answer, which is correct there, so the directory is what must tell the two apart.
- **T276-QA-2** CHANGELOG entry missing.
- **T276-QA-3** wall-time criterion unmeasured.

### LOW Severity Issues (1)

- **T276-QA-4** `LC_ALL=C` step-5 row not found (origin: code-review CR-3, reproduced by QA; reviewer confidence low, unchanged). Control: default locale finds the row (`already complete: 5`, rc 1); `LC_ALL=C` gives rc 3.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — CONCERNS
Wall-time criterion unmeasured (T276-QA-3).

### Reliability — PASS
`--halt` writes the snapshot first, removes the lock after, checks the post-condition, and is idempotent.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The criteria word "refuses" matched the boundary classifier. The inputs are artefacts this pipeline writes, so `boundary: internal` with the reason recorded in the gate.

### Maintainability — PASS
One definition each for the cycle count and the newest DoD.

---

## Code Review

Diff review: code review.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/resume-prompt-check.sh:77` — lock compared on `current_step` only → compare the document directory (T276-QA-1, reproduced)
- [low/medium] `shared/resources/grant-qa-cycles.sh:225` — `grant-qa-cycles.sh` and `accept-qa-residual.sh` call plain `--restore` and relay the new refusal untested → add a test (future; the refusal names the right door, so no defect)
- [low/low] `shared/resources/resume-prompt-check.sh:121` — en dash in a bracket class (T276-QA-4, reproduced)

**Cleanups (1):**
- `shared/resources/reenter-qa-after-finalise.sh:7` — header still calls a plain `--restore` the working route → reword

Mutation proofs (outcome tokens from `references/mutation-proving.md`; each reverted from a `cp` snapshot, `cmp` clean, tree restored):

```
mutation-proven: --allow-dod-gaps dropped from the re-entry's restore call → reenter-qa-after-finalise.test.sh "gate_head recorded", "fields carried" and four more → covered
mutation-proven: live step-7 lock branch keyed on a wrong step → reenter-qa-after-finalise.test.sh "live step-7 lock message" → covered
mutation-proven: 5b complete test changed from -gt to -ge → resume-prompt-check.test.sh "5b cycle 2 with gate 2 the latest: proceed" → covered
mutation-proven: distinct-count falls back to every heading → qa-report-cycles.test.sh "a Decisions Log heading with an N the History lacks is not counted" → covered
mutation-proven: grant-qa-cycles base read back to grep -c → grant-qa-cycles.test.sh "doubled headings" → covered
```

Earlier in the run (Step 3 of the pipeline) the guard, the distinct base and `--halt` were also mutation-proven. Provenance (5b): both reproduced findings are in new files, so they have no base counterpart. No `pre-existing` findings.

---

## Regression Testing

CI-parity suite on the LAN server, `CI=true npm run test:remote`: 8504 tests, 8501 pass, 0 fail, 3 skipped, 934 s. tmp-leak ratchet ok. The bundle check, shellcheck and prettier were clean at Step 3. The five touched suites were re-run after the mutation restore: 235, 80, 65, 24 and 15 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run test:remote
bash shared/resources/{advance-pipeline-lock,reenter-qa-after-finalise,grant-qa-cycles,resume-prompt-check,qa-report-cycles}.test.sh
bash .agents/skills/qa-task/references/changelog-cites.sh task.276
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
```

Standards-named validation (`npm run validate -- skills/<skill>/`) was not run this cycle; the CI-parity suite covers `validate` for the repository. Recorded as not run.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T276-QA-1 (compare lock directory) and add a foreign-lock test.
2. Add the CHANGELOG entry (T276-QA-2).
3. Measure the wall-time criterion or escalate it for an approver (T276-QA-3).
4. Fix T276-QA-4 and add an `LC_ALL=C` case.

### Short-term Actions (Non-Blocking)
1. Reword the `reenter-qa-after-finalise.sh` header.
2. Test the DoD-gaps refusal through `grant-qa-cycles.sh` and `accept-qa-residual.sh`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high findings; three medium findings, all with small fixes.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

**QA Report**: co-located at `task.276.qa.1.halts-and-re-entries-leave-and-read-true-state.md`
**Gate File**: co-located at `task.276.gate.1.halts-and-re-entries-leave-and-read-true-state.yml`
**Next Steps**: `/qa-fix` cycle 1 for T276-QA-1 to T276-QA-4.
