# QA Report: Task 153 - Release gate reads CI's verdict; load-sensitive tests name themselves (cycle 3)

**Task**: [task.153.release-ci-gate-load-sensitive-tests.md](./task.153.release-ci-gate-load-sensitive-tests.md)
**Gate File**: [task.153.gate.3.release-ci-gate-load-sensitive-tests.yml](./task.153.gate.3.release-ci-gate-load-sensitive-tests.yml)
**Previous**: [task.153.qa.2.release-ci-gate-load-sensitive-tests.md](./task.153.qa.2.release-ci-gate-load-sensitive-tests.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: PASS (one open LOW entry — QA3-1)

---

## Re-Review Context

Re-review scope: since 2026-09-29T07:22:38Z (default — gate 2's security axis read `CONCERNS
measured`, not FAIL, so no safety re-probe; both controls were re-probed anyway). 14 files changed
since gate 2; the diff reviewed was the 8 source/test/doc files among them (1289 lines).

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR2-1 guard misses FILE_BUDGET_MS budgets | FIXED | budget spelling in PATTERN; direction C clock-source census; 3 files marked and listed; mutation-proven (A/B/C red) |
| CR2-2 refusal names first run's URL | FIXED | causing-run selection; two-run cases; mutation-proven |
| PRB2-1 `--repo ../x` accepted | FIXED | `isRepoSlug`; re-probe engages 13/13 |
| CR2-3 same-line hit credited | FIXED (unit path) | offset check; mutation-proven — but see CR3-2: the grep path supplies only the first column |
| CR2-4 forked = file exists | FIXED | positive-integer pid |
| CR2-5 schedule capped at 3 | FIXED — and regressed, see QA3-1 | doubling schedule |

## New Findings This Cycle

- **[low]** `skills/session-handoff/tests/handoff-verify.test.js` — QA3-1: at
  `HANDOFF_SPAWN_RETRIES=3` the doubled schedule's 4th attempt is 24 s, past `slow.js`'s own 20 s
  sleep. That attempt sees the command exit rather than time out, reads as forked, and fails
  `timeout (24s)` without the LOAD-SENSITIVE marker — the success criterion "exhausted retries fail
  with the marker" fails under a documented knob. Raised from the reviewer's CR3-1 (returned
  medium/medium) after QA verified the arithmetic against the fixture; rated LOW because the default
  (2 retries: 3/6/12 s) is unaffected and it needs both the knob and three consecutive misses.
- Advisory (not gated, confidence below high): CR3-2 first-match-only column; CR3-3 byte vs UTF-16
  column; CR3-4 direction C is per file; CR3-5, CR3-6 cleanups.

---

## Review Methodology

Direct tools plus one read-only Explore subagent over the scoped diff. Step 4b: not applicable.

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 26 (record `task.153.qa.3.security.run.json`, `totals.executed`)
- `release-ci-verdict-sha` engages 13/13; `release-ci-verdict-repo` engages 13/13, 0 reproduced.

### Maintainability — PASS

## Code Review

**Correctness bugs (4, none high-confidence):** CR3-1 (medium/medium → raised by QA as QA3-1),
CR3-2 (low/medium), CR3-3 (low/low), CR3-4 (low/low). **Cleanups (2):** CR3-5, CR3-6.

mutation-proven: marker removed from test-clean-checkout → load-sensitive-marker A, B, C → covered
mutation-proven: budget alternative dropped from PATTERN → direction A → covered
mutation-proven: clock census matches nothing → direction C → covered
mutation-proven: refusal URL from first run → CR2-2 case → covered
mutation-proven: loose `--repo` regex → isRepoSlug + CLI cases → covered
mutation-proven: offset lower bound removed → CR-1/CR2-3 unit case → covered
CR2-4, CR2-5: not-run — race / env-only paths with no committed test (QA3-1 is the consequence).

All six re-run by QA against the committed tree; `git status` unchanged after.

## Regression Testing

`npm run ci:fast` on the cycle-2 fix: 4478 tests, 0 failures.

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Next Steps**: route classifier decides between a fix cycle for QA3-1 and 5c.
