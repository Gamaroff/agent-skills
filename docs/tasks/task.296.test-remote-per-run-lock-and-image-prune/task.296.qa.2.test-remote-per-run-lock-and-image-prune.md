# QA Report: Task 296 - test:remote per-run lock and image-tag prune

**Task**: [Link to task document](./task.296.test-remote-per-run-lock-and-image-prune.md)
**Gate File**: [task.296.gate.2.test-remote-per-run-lock-and-image-prune.yml](./task.296.gate.2.test-remote-per-run-lock-and-image-prune.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Gate Status**: CONCERNS

---

## Executive Summary

Both cycle 1 findings are fixed and re-proved by mutation. The cycle 2 refute pass found one real defect and CI found another. `take` ignores the configured lock margin, so a refused run can report a lock as live while `--unlock` with the same margin calls it stale. CI `link-check` is red because the implementation report holds a bare host-at-address string that autolinks. Both are small.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL on T296-QA-3 and T296-QA-4

---

## Testing Scope

### Review Methodology

- Direct tools for the checks; one read-only Explore reviewer over the whole branch diff, as a refute pass (cycle 2 always reviews the whole diff to refute). Route: Diff review: code review (the change set holds code).
- Reviewer: one finding returned, the reviewer reported it read the two scripts and the lock tests, did not read the docs, and executed nothing. Duration reported by the completion notice: 25276 ms.
- Step 4b: not applicable, no runnable prose in the change set.
- Re-review scope: unscoped, whole branch diff (cycle 2 refute pass; 1923 lines).
- CI on 2c9fe694f76c: 1 failed (0 pre-existing). `link-check` red here, green on develop (run 43234081388).

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| T296-QA-1: assertion that cannot fail | FIXED. The held-lock test now asserts "Wait for it to finish" and not "Clear it with". Mutation: live message gaining "Clear it with" turns the held-lock test red. |
| T296-QA-2: margin held by no test | FIXED. New boundary test. Mutation: `(tmo + $2)` replaced by `(tmo + 0)` turns it red. |

## New Findings This Cycle

- **[medium]** `scripts/remote-test/run.sh:258` — `take` does not pass the margin; the server defaults to 10 → pass it and test it (T296-QA-3).
- **[medium]** `docs/tasks/task.296.*/task.296.implementation.1.*.md` — a host-at-address string autolinks as a mailto and fails `link-check` → put it in backticks (T296-QA-4).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The lock | CONCERNS | Verified | held-lock state ignores the configured margin (T296-QA-3) |
| Phase 2: The image prune | PASS | Verified | unchanged |
| Phase 3: Tests and acceptance | PASS | Verified | 46/46; cycle 1 weak tests now hold |
| Phase 4: Docs | PASS | Verified | the docs say the setting applies to the stale test |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Success Criteria Verification

Unchanged from cycle 1 except where noted. `criteria-drift`: clean. CHANGELOG cites task 296. 46/46 offline tests pass (also under `CI=true`), shellcheck clean, prettier clean, `ci:fast` on the server green on the fixed tree (exit 0, 0 failed). The criterion "a second run refuses naming the owner" holds. The configured-margin behaviour is not a numbered criterion but the docs promise it (`TEST_REMOTE_LOCK_MARGIN_MIN` applies to the stale test).

---

## Breaking Changes Validation

None documented, none found. **Assessment:** PASS (not applicable).

---

## Issues Found

### MEDIUM Severity Issues (2)

**T296-QA-3: take ignores the lock margin**
- **Observation**: `run.sh:258` sends `take RUN_DIR TOKEN TIMEOUT OWNER`; `lockctl.sh:72` reads `${LOCK_MARGIN_MIN:-10}` from the server's environment, which is never set. `--unlock` sends the margin explicitly.
- **Reproduction** (real `lockctl.sh`, fake docker, temp HOME): owner timeout 30, started 36 minutes ago. `take` on the held lock: `state=live`, exit 10. `unlock … 0`: `state=stale`, lock removed, exit 0.
- **Control**: at the default margin of 10 both agree (live at 36 minutes), so the defect shows only when `TEST_REMOTE_LOCK_MARGIN_MIN` is set. Not pre-existing: the file is new in this change set.
- **Reviewer rating** recorded unchanged: low severity, medium confidence. QA rates it medium because a documented setting is ignored by one of its two consumers. Origin: code-review, reproduced by QA.
- **Recommendation**: pass the margin to `take`, read it there, test a held take with a non-default margin, update the anchored argv test.

**T296-QA-4: CI link-check red**
- **Observation**: run 43264563618, `link-check`: `mailto:ci@192.168.1.249 → Status: 400` in the implementation report. Green on develop.
- **Recommendation**: backticks around the string; check the QA reports for the same shape.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
One extra round trip per run, unchanged.

### Reliability — CONCERNS
T296-QA-3. Advisory items CR-3 to CR-6 from cycle 1 stand.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 38 (cycle 1 run record `task.296.qa.1.security.run.json`; `escaped` 0)
- `lockctl.sh` is byte-identical between the cycle-1 head `fd8fbccd9459` and this head, so the record still describes the code. It was not re-run this cycle, and that is stated here rather than implied.

### Maintainability — PASS
One server-side file, shellcheck clean, documented.

---

## Code Review

Diff review: code review. The reviewer's anchor was checked by reading the line at HEAD: `run.sh:258` is the take call (the reviewer wrote 259; the line is 258, off by one, the text matches).

**Correctness bugs (1):**
- [low/medium, QA-rated medium] `scripts/remote-test/run.sh:258` — `take` does not pass the margin → pass it and test it. Reproduced. Gate T296-QA-3.

**Cleanups (0):** none.

mutation-proven: removed the margin from the staleness rule → `lockctl unlock counts the margin…` (T296-QA-2) went red → covered
mutation-proven: made the live message say "Clear it with" → `a held lock stops the run before any sync…` went red → covered
Both mutations were run with nothing else reading the tree, restored with `cmp` against `cp` snapshots, and the working tree matched its state before the step.

Reviewer limits: it executed nothing and did not read the docs, so the unproved parts of its read are the prune loop's behaviour under a stopped container (advisory CR-5) and the docs. The reproduction above is QA's own.

---

## Regression Testing

46 offline tests pass; the 23 pre-existing runner tests pass unchanged.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/test-remote-runner.test.js      # 46 pass
bash scripts/remote-test/lockctl.sh take|unlock           # real script, fake docker, temp HOME (reproduction)
qa-ci-read.sh --vcs github --pr 891                       # CI_SUMMARY 1 failed
gh run view 43264563618 --log-failed
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T296-QA-3, then T296-QA-4.

### Short-term Actions (Non-Blocking)
1. Advisory CR-3 to CR-6 as a follow-up task if wanted.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL on T296-QA-3 and T296-QA-4.

**QA Report**: co-located at `task.296.qa.2.test-remote-per-run-lock-and-image-prune.md`
**Gate File**: co-located at `task.296.gate.2.test-remote-per-run-lock-and-image-prune.yml`
**Next Steps**: `/qa-fix` the two findings, then QA cycle 3.
