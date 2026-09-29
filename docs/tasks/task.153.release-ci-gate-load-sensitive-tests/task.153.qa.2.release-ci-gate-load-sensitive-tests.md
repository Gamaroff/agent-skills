# QA Report: Task 153 - Release gate reads CI's verdict; load-sensitive tests name themselves (cycle 2)

**Task**: [task.153.release-ci-gate-load-sensitive-tests.md](./task.153.release-ci-gate-load-sensitive-tests.md)
**Gate File**: [task.153.gate.2.release-ci-gate-load-sensitive-tests.yml](./task.153.gate.2.release-ci-gate-load-sensitive-tests.yml)
**Previous**: [task.153.qa.1.release-ci-gate-load-sensitive-tests.md](./task.153.qa.1.release-ci-gate-load-sensitive-tests.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

---

## Re-Review Context

Re-review scope: unscoped — cycle 2 is always a full-branch refute pass (qa-task Step 3b); the
security axis of gate 1 read `PASS measured`, so no safety re-probe.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 enclosingAssert span check | FIXED (partially — see CR2-3, advisory) | new unit case; mutation-proven |
| CR-2 gh without `-R` | FIXED | `--repo`/`-R`; fetchRuns, CLI and release.sh cases; mutation-proven |
| CR-3 inline `on:` | FIXED | `readable` flag + parity case; mutation-proven |
| CR-4 dead DEFINER filter | FIXED | removed |
| CR-5 releases.md numbering | FIXED | prose names step 2 and the script's 1b label |

## New Findings This Cycle

- **[medium]** `tests/load-sensitive-marker.test.js:37` — CR2-1: the pattern sees `Date.now() - x <`
  and `elapsed <` only. Three existing whole-file budgets —
  `tests/test-clean-checkout.test.js:46`, `tests/bundle-missing-source.test.js:46`,
  `evals/shared/tests/consumer-root.test.mjs:35`, each `ms < FILE_BUDGET_MS` over `process.hrtime`
  (added by task.154 after this task's 2026-09-24 enumeration) — are load-sensitive, unmarked and
  unlisted. Verified with
  `git grep -nE 'FILE_BUDGET_MS|hrtime|performance\.now' -- '*.test.js' '*.test.mjs' ':!skills/*/references/*'`.
  The guard header and `traps.md` claim the guard fails on any unmarked wall-clock assertion, and
  `release.sh` now tells the operator an unmarked red is real. → widen by clock source; mark and list.
- **[low]** `scripts/release-ci-verdict.mjs` — CR2-2: the refusal names the first run with a URL,
  not the run that produced the verdict. → pick the causing run; two-run case.
- **[low]** `scripts/release-ci-verdict.mjs` — PRB2-1: `--repo ../x` accepted (probe reproduced).
  → GitHub owner/name rules; re-probe.
- Advisory: CR2-3 same-line hit after a closed marked call still credited (low/medium); CR2-4
  `forked` = pid file exists, not "holds a positive integer" (low/low); CR2-5 the `[3,6,12]`
  schedule caps retries at 2 (cleanup).

---

## Review Methodology

Direct tools plus one read-only Explore subagent (refute directive appended, full
`origin/develop...HEAD` diff, 14 files, 1673 lines). Step 4b: not applicable — no runnable prose.

## Implementation Verification

5/5 phases; phase 1 (`--repo` validator) and phase 3 (guard population) carry this cycle's findings.

## Breaking Changes Validation

Unchanged from cycle 1 — PASS.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 gated + 3 advisory

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 25 (record `task.153.qa.2.security.run.json`, `totals.executed`)
- `release-ci-verdict-sha`: engages, 13/13. `release-ci-verdict-repo`: present-but-inert — 11 of 12
  hostile refused, `../x` accepted. Exposure nil (the only caller passes a constant), but the
  validator admits a traversal segment. Recorded escapes are `gh`'s own `device-id` under the
  sandboxed HOME.

### Maintainability — CONCERNS
The checked load-sensitive list is incomplete (CR2-1).

## Code Review

**Correctness bugs (4):**
- [medium/high] `tests/load-sensitive-marker.test.js:37` — CR2-1 → **gate** (CR2-1)
- [low/high] `scripts/release-ci-verdict.mjs:113` — CR2-2 → **gate** (CR2-2)
- [low/medium] `tests/load-sensitive-marker.test.js:89` — CR2-3, advisory
- [low/low] `skills/session-handoff/tests/handoff-verify.test.js:1494` — CR2-4, advisory

**Cleanups (1):**
- `skills/session-handoff/tests/handoff-verify.test.js:1467` — CR2-5

Probe finding PRB2-1 → **gate**.

mutation-proven: span check removed (cycle-1 CR-1 fix) → load-sensitive-marker CR-1 case → covered
mutation-proven: `-R` dropped (cycle-1 CR-2 fix) → release-ci-verdict 2 cases → covered
mutation-proven: `--repo` not passed by release.sh → release-ci-gate red-CI case → covered
mutation-proven: `readable: true` (cycle-1 CR-3 fix) → release-ci-verdict CR-3 case → covered

## Regression Testing

`npm run ci:fast` on the cycle-1 fix: 4475 tests, 0 failures.

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM (rule 2); security and maintainability CONCERNS.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR2-1 fixed

**Next Steps**: `/qa-fix` cycle 2 for CR2-1, CR2-2, PRB2-1.
