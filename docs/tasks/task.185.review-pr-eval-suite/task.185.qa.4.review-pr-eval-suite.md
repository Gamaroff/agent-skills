# QA Report: Task 185 - review-pr eval suite (cycle 4)

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.4.review-pr-eval-suite.yml](./task.185.gate.4.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: PASS

---

## Executive Summary

Cycle 3's structural fix holds. The runner reports a failed run only through `EVAL_FAIL_EXIT`, and
`repeat.mjs` reads every other outcome as could-not-run, so the class of finding behind cycles 1–3
is closed by construction. The cycle-4 review found four low items, two of them cleanups, and none
gates. A live recheck through the final harness passed.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| C3-CR-1 — non-verdict runner exits read as failed runs | medium | FIXED | `DRIVER=claude-cl` → `run 1/2: not judged`, rc 3; throwing setup → rc 3; tests + 3 mutants |
| C3-CR-3 (advisory) — signal / spawn error read as fail | low | FIXED by construction | any status other than 0 / fail code is could-not-run |
| C3-CR-5 (cleanup) — EVAL_RUNS parse error named `--runs` | low | FIXED | test asserts `$EVAL_RUNS` |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only code-review subagent. Dispatched 2026-10-05T16:48:44Z; completion
notice `duration_ms` 84404 (84 s).

Re-review scope: files changed since gate 3 (head 7420c37942ab; 12 files) — default

Step 4b: not applicable this cycle. No `SKILL.md` or shared prompt changed since gate 3.

**Live recheck** (the harness exit logic changed three times after the N=5 measurement):
`env -u ANTHROPIC_API_KEY DRIVER=claude-cli node evals/shared/repeat.mjs evals/review-pr/scenarios/03-unanchored evals/review-pr/scenarios/02-renumber-gap --runs 1`
→ `03-unanchored: passed 1/1`, `02-renumber-gap: passed 1/1`, rc 0.

---

## New Findings This Cycle

- **[low/low, advisory]** `evals/shared/repeat.mjs` — `EVAL_FAIL_EXIT=5` coincides with Node's exit for a fatal V8 error, which would read as a failed run → move it to 64+.
- **[low/low, advisory]** `evals/shared/repeat.mjs` — a scenario with no assertions counts as a pass → refuse an empty assertion list under repeat.
- **[cleanup]** `evals/shared/repeat.mjs` — `EVAL_RUNS=0` still names `--runs` in its message.
- **[cleanup]** `evals/shared/tests/repeat.test.mjs` — no test drives the `killed` / `not started` branches.

None is a bug with high confidence, so none enters the gate. All four go to `recommendations.future`.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 in the gate (4 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
The pass-rate tool now reads a verdict positively.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 28 (record `task.185.qa.2.security.run.json`; no boundary code changed since)
### Maintainability — PASS

---

## Code Review

**Mutation proofs (cycle-3 fixes, committed in `2064ee43`):**
- mutation-proven: re-enumerate non-verdict exits → repeat.test.mjs "unknown DRIVER" + "setup that throws" → covered
- mutation-proven: runner ignores EVAL_FAIL_EXIT → runner-setup.test.mjs "EVAL_FAIL_EXIT marks" → covered
- mutation-proven: EVAL_RUNS message names `--runs` → repeat.test.mjs "malformed EVAL_RUNS" → covered

---

## Regression Testing

`npm run ci:fast` at the fix commit: 5356 tests, 0 fail. Replay 4/4.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding; every NFR PASS.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: 5c, `/review-pr` over PR #574.
