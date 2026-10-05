# QA Report: Task 185 - review-pr eval suite (cycle 3)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.3.review-pr-eval-suite.yml](./task.185.gate.3.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: CONCERNS

---

## Executive Summary

Every cycle-2 reproduction now behaves, so BUG-2, BUG-3 and BUG-4 are closed. One medium remains.
It is in the same mechanism as the last two cycles, `repeat.mjs`'s reading of runner exits. The
runner still exits 1 for runs that never ran, such as a setup error or an unknown `DRIVER`, and
`repeat.mjs` counts those as failed runs. There are no high findings for the second cycle in a row.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| C2-CR-1 — npm script collapses exit 3 | medium | FIXED | package.json command run by `sh` with a node-only PATH → rc 3; [bug 2](./task.185.bug.2.cli-script-collapses-could-not-run.md) closed |
| C2-CR-2 — `live.minPass` not scaled above 5 | medium | FIXED | `--runs 10` → `min 8, live.minPass 4/5 scaled to 8/10`; [bug 3](./task.185.bug.3.min-pass-not-scaled-above-five-runs.md) closed |
| QA-3 — driver error counted as a failed run | medium | FIXED | fake `claude` with no credit → `run 1/2: driver error`, rc 3; [bug 4](./task.185.bug.4.driver-error-counted-as-failed-run.md) closed |
| C2-CR-4 — malformed scenario.json exits 1 | low | FIXED | rc 2 |
| C2-CR-5 — trailing value flag ignored | low | FIXED | rc 2 |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only code-review subagent. Dispatched 2026-10-05T16:34:39Z; completion
notice `duration_ms` 113017 (113 s).

Re-review scope: files changed since gate 2 (head b02186959f67; 17 files) — default

Step 4b: not applicable this cycle. No `SKILL.md` or shared prompt changed since gate 2.

---

## New Findings This Cycle

- **[medium]** `evals/shared/repeat.mjs:142` — runner exits that are neither a verdict nor a skip/driver error are read as failed runs: a setup error, an unknown `DRIVER` (`die()`), or an unreadable scenario. Reproduced: `DRIVER=claude-cl` → `passed 0/2`, exit 1 → make the verdict positive (an explicit "assertions ran and failed" code) and treat everything else as could-not-run. Promoted: TASK-185-C3-CR-1.
- **[medium/low, advisory]** `evals/shared/runner.mjs:367` — a timeout is could-not-run by documented design; a hang is never scored as a failure.
- **[low/medium, advisory]** `evals/shared/repeat.mjs:142` — a signal or spawn error in the runner child counts as a failed run.
- **[low/medium, advisory]** `evals/shared/repeat.mjs:129` — with `DRIVER` unset, `repeat.mjs` reports a replay pass rate.
- **[cleanup]** `evals/shared/repeat.mjs:82` — an `EVAL_RUNS` parse error names `--runs`.

---

## Loop routing

`classifyLoopRoute` returned `continue (not-a-pass-gate)`. Route 2 declined with
`product-defect-signal`, because C3-CR-1 is a `category: bug`. HIGH sequence 1, 0, 0, so the
Convergence check does not trip.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (+4 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
One remaining class of could-not-run exits (harness errors) reads as a failed run.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 28 (record `task.185.qa.2.security.run.json`; no boundary code changed since)
### Maintainability — PASS

---

## Code Review

Code-review blocking is on. C3-CR-1 is promoted (bug with high confidence). The rest are advisory.

**Mutation proofs (cycle-2 fixes, committed in `7420c379`):**
- mutation-proven: scale → cap → repeat.test.mjs "scaled to the run count" → covered
- mutation-proven: driver error → exit 1 → repeat.test.mjs "driver error stops" → covered
- mutation-proven: trailing `--runs` accepted → repeat.test.mjs "usage errors" → covered
- mutation-proven: shell-loop remap restored → repeat.test.mjs "npm run eval:review-pr:cli's command" → covered
- mutation-proven: malformed JSON rethrown → repeat.test.mjs "malformed scenario.json" → covered

---

## Regression Testing

`npm run ci:fast` at the fix commit: 5352 tests, 0 fail. Replay 4/4.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding (rule 2); no high.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: C3-CR-1.

---

**Next Steps**: `/qa-fix` cycle 3. Step 2.6 applies, because the subject repeats for the third cycle.
