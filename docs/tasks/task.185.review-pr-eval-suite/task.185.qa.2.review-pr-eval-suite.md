# QA Report: Task 185 - review-pr eval suite (cycle 2)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.2.review-pr-eval-suite.yml](./task.185.gate.2.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's high finding is fixed: a skipped live run now stops `repeat.mjs` with exit 3. The refute
pass over the whole branch found that fix incomplete at its edges. The npm script collapses exit 3
to 1, `live.minPass` stays absolute above 5 runs, and a driver error still reads as a failed run.
There are three medium findings and two low ones, and no high.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-185-CR-1 — skip counted as a pass | high | FIXED | reproduction re-run: `run 1/2: skipped`, exit 3; [bug 1](./task.185.bug.1.repeat-counts-skips-as-passes.md) closed |
| TASK-185-QA-2 — `live.minPass` above `--runs` refused | low | FIXED (fewer runs) / PARTIAL | capped below 5 runs; the above-5 case is new finding C2-CR-2 |
| TASK-185-QA-1 — `{n}` overflow wraps | low | FIXED | 19-digit `{n}` → `refused (overflow)`, exit 2; tests both shells |
| CR-2 (advisory) — 03 had no non-vacuity floor | medium | FIXED | 03 asserts the merged task.901 doc exists |
| CR-4 (advisory) — `--min-pass 0` accepted | low | FIXED | usage error, test |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only code-review subagent running the **cycle-2 refute pass** over the
whole branch diff (`origin/develop...HEAD`, 38 files, 3850 lines). Dispatched
2026-10-05T16:17:14Z; completion notice `duration_ms` 169362 (169 s).

Re-review scope: unscoped (cycle 2 refute pass), whole branch diff (prior gate security: PASS, so
`SAFETY_REPROBE` is false).

Step 4b re-run on `skills/review-pr/SKILL.md`: 17 blocks. 1 is runnable with `DOC_FILE` bound, and
it ran under bash and zsh with 0 findings. 16 are `mutating`. The new Step 7 line is executed by
`review-pr.test.js`.

---

## New Findings This Cycle

- **[medium]** `package.json:49` — `eval:review-pr:cli` maps every non-zero `repeat.mjs` exit to 1, so could-not-run (3) is lost, and the README says it exits 3 → keep the strongest status. [Bug 2](./task.185.bug.2.cli-script-collapses-could-not-run.md)
- **[medium]** `evals/shared/repeat.mjs:87` — `live.minPass` is absolute above 5 runs: `--runs 10`, min 4 → 40% (reproduced `passed 10/10 (min 4)`) → scale as a rate. [Bug 3](./task.185.bug.3.min-pass-not-scaled-above-five-runs.md)
- **[medium]** `evals/shared/runner.mjs` driver-error path — a `claude -p` failure exits 1, so `repeat.mjs` counts it as a failed run → opt-in driver-error exit code; repeat stops with could-not-run. [Bug 4](./task.185.bug.4.driver-error-counted-as-failed-run.md)
- **[low]** `evals/shared/repeat.mjs:70` — malformed `scenario.json` exits 1, not 2 (reproduced).
- **[low]** `evals/shared/repeat.mjs:58` — a trailing `--runs`/`--min-pass` is silently ignored (reproduced: exit 0).
- **[low/low, advisory]** platform variance — the no-`claude` tests assume `/usr/bin` has no `claude`; make the test set up the absence.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | overflow refusal added, 17 script tests both shells |
| Phase 2 | CONCERNS | repeat/runner edge cases above |
| Phase 3 | PASS | replay 4/4; 03 floor added |
| Phase 4 | CONCERNS | npm script exit-status collapse; README claim |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2 (+1 advisory)

---

## NFR Assessment

### Performance — PASS
Unchanged from cycle 1.

### Reliability — CONCERNS
The pass-rate tool still conflates states at its edges (exit 3 lost in the npm script; driver error read as a failed run).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 28 (record `task.185.qa.2.security.run.json` `totals.executed`). The verdict is `absent` for the same sink-mismatch reason as cycle 1. The cycle-1 overflow refusal adds no attack surface.

### Maintainability — PASS

---

## Code Review

Code-review blocking is on. The promoted findings are C2-CR-1, C2-CR-2, C2-CR-4 and C2-CR-5 (all
bug with high confidence). CR-3 has medium confidence. It was verified by reading the runner's
driver-error catch and is entered as QA-3, which is QA's own finding. CR-6 (low confidence) is
advisory.

**Mutation proofs (cycle-1 fixes, committed in `b0218695`):**
- mutation-proven: repeat stops requesting a skip code → repeat.test.mjs "never a pass" (2) → covered
- mutation-proven: runner unavailable-driver skip back to exit 0 → repeat.test.mjs "no claude binary" → covered
- mutation-proven: no `live.minPass` cap → repeat.test.mjs "capped" → covered
- mutation-proven: no overflow refusal → review-pr.test.js "past 18 significant" (bash + zsh) → covered
- mutation-proven: `--min-pass 0` accepted → repeat.test.mjs "usage errors" → covered

---

## Regression Testing

`npm run ci:fast` at the fix commit: 5346 tests, 0 fail. Replay 4/4.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: three medium findings in the pass-rate tool (rule 2); no high.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix the three medium findings.

---

**QA Report**: co-located at `task.185.qa.2.review-pr-eval-suite.md`
**Gate File**: co-located at `task.185.gate.2.review-pr-eval-suite.yml`
**Next Steps**: `/qa-fix` cycle 2.
