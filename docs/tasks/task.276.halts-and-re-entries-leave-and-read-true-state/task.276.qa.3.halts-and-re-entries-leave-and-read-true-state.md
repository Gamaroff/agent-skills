# QA Report: Task 276 - Halts and re-entries leave and read true state

**Task**: [Link to task document](./task.276.halts-and-re-entries-leave-and-read-true-state.md)
**Gate File**: [task.276.gate.3.halts-and-re-entries-leave-and-read-true-state.yml](./task.276.gate.3.halts-and-re-entries-leave-and-read-true-state.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-16
**Gate Status**: PASS

---

## Executive Summary

Cycle 3. The cycle-2 fix for T276-QA-5 holds and is mutation-proven. The wall-time criterion (T276-QA-3) is now measured: median of five alternating pairs, +0.8% wall and +0.25% suite time, inside the 10% bound. The diff reviewer found two low edge cases in the new guard, which I reproduced; neither can be produced by any writer in the pipeline.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools plus one read-only Explore subagent on the cycle delta (51 lines, two files) with the whole of `resume-prompt-check.sh` in scope. Diff review: code review. Reviewer duration 35245 ms from the completion notice. It read the delta and all 155 lines of the script, ran the 30-case test file and 12 guard probes.

CI on fb9b6bce450a: green (read from the PR with `qa-ci-read.sh`; state SUCCESS, head equals HEAD).

Re-review scope: files changed since gate 2 (head 1858f76fb; 2 source files, bundled copies excluded) — default. Step 4b: not applicable; the changed code is shell and no fenced Markdown block changed.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T276-QA-3 wall-time criterion unmeasured | ✅ FIXED | measured, see Success Criteria below |
| T276-QA-5 relative lock directory read as another document's | ✅ FIXED | removing the `cannot tell` guard reds "a relative lock directory that does not resolve from this cwd: cannot tell"; the `./relative/` case matches from the repository root |
| CR-2 (cycle 1) untested refusal relay | open, advisory | stays in `recommendations.future` |

---

## New Findings This Cycle

- **[low]** `shared/resources/resume-prompt-check.sh:92` — a lock directory of `./` strips to an empty string, `cd -P -- ""` fails, and the guard answers exit 3 although `.` is valid (T276-QA-6; no writer emits it)
- **[low]** `shared/resources/resume-prompt-check.sh:92` — a stale lock naming a deleted relative directory answers exit 3 with a message that blames the cwd; the strip is written twice and the `canon()` change is inert (T276-QA-7)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Restore guard, `--halt`, `--newest-dod` | PASS | advance-pipeline-lock.test.sh 235/0 | unchanged since gate 2 |
| 2. Re-entry routes, distinct budget base | PASS | reenter 80/0, grant 65/0 | unchanged |
| 3. Resume-prompt check | PASS | resume-prompt-check.test.sh 30/0 | two low edge cases, advisory |
| 4. HALT fences, contract, bundling | PASS | halt-fence 6/0; bundle check clean | unchanged |

**Overall Phase Completion**: 4/4.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Behaviour criteria (guard, `--halt`, distinct base, resume check) | PASS | each held by a committed suite |
| `CI=true npm test` wall time within 10% of develop (median of five alternating runs) | **PASS** | develop 747 s, branch 753 s: +0.8% |
| CHANGELOG cites the task | PASS | `cites (task 276)` |

criteria-drift.js: clean.

### Wall-time measurement (T276-QA-3)

Each run was `CI=true npm run test:remote -- --run test` on the LAN server (CI-parity container), alternating develop then branch, five pairs, `uptime` read just before each run. Develop was a detached worktree of `origin/develop` at `34ec0cceb`, the branch's base. The branch tree was HEAD `fb9b6bce4` plus the uncommitted implementation report. Every run exited 0.

| Pair | develop wall (s) | branch wall (s) | develop suite (s) | branch suite (s) | develop load before | branch load before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 730 | 776 | 602.3 | 642.7 | 0.30, 0.29, 0.32 | 0.54, 1.17, 1.10 |
| 2 | 759 | 789 | 636.1 | 651.5 | 2.32, 5.12, 4.16 | 3.41, 4.79, 4.71 |
| 3 | 1254 | 753 | 933.3 | 633.9 | 16.22, 12.47, 8.70 | 4.74, 12.23, 14.39 |
| 4 | 747 | 724 | 632.3 | 606.6 | 1.51, 3.08, 8.03 | 0.27, 1.59, 4.84 |
| 5 | 724 | 725 | 605.4 | 605.6 | 2.10, 1.65, 3.28 | 0.52, 1.63, 2.74 |
| **median** | **747** | **753** | **632.3** | **633.9** | | |

Branch against develop: **+0.8% wall, +0.25% suite**, against a 10% bound. Pair 3's develop run (1254 s at server load 16, the other repository's CI or the gaming PC) is an outlier the median absorbs; dropping that pair entirely, the four remaining medians are 738.5 s (develop) against 750.5 s (branch), +1.6%. The branch's loads before its runs were often higher than develop's, which works against the branch, so the result is not flattered by the load. The raw table is `walltime.tsv` in the session scratchpad; it is not committed.

---

## Breaking Changes Validation

None documented. Breaking change check: PASS (not applicable).

---

## Issues Found

### LOW Severity Issues (2)

- **T276-QA-6** a `./` lock directory is called unresolvable (origin: code-review CR-1, reproduced by QA; reviewer severity low and confidence medium, unchanged). Reproduction: lock `{current_step:7, task_or_story_directory:"./"}`, cwd a repository, prompt `docs/t 5b 1` → rc 3 "does not resolve". Control: the same lock with `.` → rc 0 `proceed`. Provenance: the guard was added in cycle 2's fix, so it has no base counterpart. No writer emits `./`: a work-item directory is never the repository root.
- **T276-QA-7** a stale relative lock directory answers exit 3 with a message that blames the cwd (origin: code-review CR-2 and CR-3, CR-2 reproduced by QA; reviewer severity low and confidence medium, unchanged). Reproduction: lock directory `gone/x` → rc 3 "run this from the repository root"; control `/gone/x` → rc 0 `proceed`. Provenance: cycle 2's guard, no base counterpart.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
Wall-time criterion measured and inside the bound (above).

### Reliability — PASS
`--halt` is idempotent and writes the snapshot first. T276-QA-6 and T276-QA-7 affect only the advisory resume check, on lock values no writer produces.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The boundary classifier matched "refuses"; the inputs are artefacts this pipeline writes, so `boundary: internal`, reason recorded in the gate.

### Maintainability — PASS
The strip expression is written twice (T276-QA-7); advisory.

---

## Code Review

Diff review: code review (cycle 3, scoped to the delta since gate 2).

**Correctness bugs (2):**
- [low/medium] `shared/resources/resume-prompt-check.sh:92` — `./` lock directory called unresolvable (T276-QA-6, reproduced)
- [low/medium] `shared/resources/resume-prompt-check.sh:92` — stale relative lock answers `cannot tell` with a message that blames the cwd (T276-QA-7, reproduced)

**Cleanups (2):**
- `shared/resources/resume-prompt-check.sh:92` — the strip expression is written in the guard and in `canon()`; one `norm()` helper would keep them together (folded into T276-QA-7)
- `shared/resources/resume-prompt-check.test.sh:100` — the "cannot tell" test relies on `/docs/t` not existing and does not cover `./`, a leading dash, a space or a deleted directory (recorded in `recommendations.future`)

The reviewer also probed relative symlinks with trailing slashes and a `./` prefix, a path with `..`, a leading-dash directory, a path with a space and an empty lock directory; all behaved correctly.

Mutations ran in scratch copies of the script and its test (no working-tree edit, `git status` unchanged):

```
mutation-proven: guard removed (the `cannot tell` case on a relative lock directory) → resume-prompt-check.test.sh "relative lock directory from another cwd" → covered
mutation-proven: canon() strip reverted to the raw string → no test red (30/0) → no-red-dead
```

The second is a measurement of the tests: with the guard in place, `cd -P` resolves `./x/` itself, so the added `canon()` normalisation changes no result a test can see. The code is harmless; it is not covered, and the report does not claim it is.

Local probes of the guard (run from a scratch repository, deleted afterwards): a bare relative directory from the repository root gives `already complete`; the same relative name from another checkout resolves there and compares equal, as the caller passed the same relative path; `./` gives rc 3 (T276-QA-6); `gone/x` gives rc 3 and `/gone/x` gives `proceed` (T276-QA-7).

shellcheck is not installed on this host (`command -v shellcheck` finds nothing), so it was not run this cycle; cycle 1 ran it through the CI-parity container.

---

## Regression Testing

Remote CI-parity suite on the LAN server for the fix commit: 8504 tests, 8501 pass, 0 fail, 3 skipped. Ten further full runs of the same suite during the wall-time measurement (five on the branch tree) all exited 0. CI on the PR head is green.

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/resume-prompt-check.test.sh
CI=true npm run test:remote -- --run test        # ten runs, alternating develop and branch
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 913
bash .agents/skills/qa-task/references/changelog-cites.sh task.276
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
```

Standards-named validation (`npm run validate -- skills/<skill>/`): not run separately; the CI-parity suite covers `validate` and ran green.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Fix T276-QA-6 and T276-QA-7 together: one `norm()` helper, `./` maps to `.`, and a `cannot tell` message that names the lock file as possibly stale.
2. Test the DoD-gaps refusal through `grant-qa-cycles.sh` and `accept-qa-residual.sh`.
3. Harden the relative-lock test (fresh temporary cwd, more cases).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no high or medium finding; the cycle-2 fix holds; the one success criterion left open is now measured and passes. Two low edge cases in an advisory check, on lock values no writer produces, stay open.
**Quality Score**: 92/100

**Deployment Recommendation**: APPROVED
**Conditions**: none

---

**QA Report**: co-located at `task.276.qa.3.halts-and-re-entries-leave-and-read-true-state.md`
**Gate File**: co-located at `task.276.gate.3.halts-and-re-entries-leave-and-read-true-state.yml`
**Next Steps**: 5c `/review-pr`, then `/finalise`.
