# QA Report: Task 153 - Release gate reads CI's verdict; load-sensitive tests name themselves

**Task**: [task.153.release-ci-gate-load-sensitive-tests.md](./task.153.release-ci-gate-load-sensitive-tests.md)
**Gate File**: [task.153.gate.1.release-ci-gate-load-sensitive-tests.yml](./task.153.gate.1.release-ci-gate-load-sensitive-tests.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: PASS (one open LOW entry — CR-1)

---

## Executive Summary

All five phases are in place and verified against the plan. `npm run ci` is green, the new release
boundary refuses every hostile `--sha` before `gh` runs, and the ten named mutations each turn a
committed test red. The diff review found one real LOW-severity hole in the new marker guard (CR-1),
promoted to the gate under `code_review_blocking`; four further items are advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (checkboxes ticked; two `npm run ci` boxes pending until this QA confirmed it)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#515)

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing
- [x] Security Review (boundary probe executed)
- [x] Code Review (diff, Explore subagent)

### Review Methodology

First review. Direct tools plus one read-only Explore subagent for the diff review (Step 3b), and the
traceability matrix from the Step 5 pre-step (`.summaries/qa-traceability-matrix.md`). Five phases
across `scripts/`, `shared/resources/`, `skills/session-handoff/`, `tests/` and `docs/` — the
default "direct tools first" strategy; no gap called for parallel agents.

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or
`shared/resources/*.md` changed; `docs/contributing/*.md` is outside the rule).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: CI verdict module | PASS | 29/29 | `ciVerdict`, `fetchRuns`, CLI, `WORKFLOWS` parity |
| 2: wire into `release.sh` | PASS | 10/10 | step 1b after the sync check; `--skip-ci-check`; `--dry-run` summary; wrapper on `test:clean-checkout`; `--retry` skip tested |
| 3: marker and list | CONCERNS | 3/3 | CR-1 — direction A can credit an unmarked comparison below a marked assert |
| 4: CR-6 | PASS | 37/37 (file) | precondition-miss retry; fixture fix makes the kill check non-vacuous (M10) |
| 5: docs and validation | PASS | — | `traps.md`, `releases.md`, CHANGELOG; CR-5 numbering nit |

**Overall Phase Completion**: 5/5 delivered; 4 PASS, 1 with a LOW finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Refuses before the local test on red/pending/unverifiable | npm marker absent | absent in 4 cases | PASS |
| `--skip-ci-check` proceeds, warns unverified | yes | yes | PASS |
| `--dry-run` prints verdict + *Would have REFUSED* | yes | yes | PASS |
| `ciVerdict` every table row; gh failure → unverifiable | yes | 15 reduction + 7 CLI cases | PASS |
| Local-test red prints the LOAD-SENSITIVE rule | yes | yes | PASS |
| CR-6 retries only a precondition miss; exhausted → marker | yes | 4 unit cases + CR-6 | PASS |
| Marker on every enumerated assertion; traps.md list equal | yes | A + B green | CONCERNS (CR-1) |
| CR-6 one 3 s attempt idle | yes | ~3.1 s | PASS |
| New tests make no network call | yes | gh/npm/curl stubbed | PASS |
| M1–M10 red | 10/10 | 10/10 (M10 after fixture fix) | PASS |
| `npm run ci` green | exit 0 | exit 0 | PASS |
| Docs + CHANGELOG | present | present | PASS |
| Live dry-run against real `main` recorded | yes | `✓ CI green for 398107e6` | PASS |

---

## Breaking Changes Validation

### Breaking Change: `release.sh` refuses where it used to proceed
Documented: Yes · Migration Path Provided: Yes (`--skip-ci-check`; wait for CI) · Migration Tested:
Yes (`release-ci-gate.test.js` skip cases) · Consumer Code Updated: N/A (maintainer-only script).
The one in-repo consumer that drives `release.sh`, `tests/test-clean-checkout.test.js`, was updated
with a green `gh` stub.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1 gated, 4 advisory)

- **CR-1** (gated, `bug/high`) — `tests/load-sensitive-marker.test.js` `enclosingAssert` returns the
  nearest `assert(` within five lines above the hit without checking that its span covers the hit, so
  `const ok = Date.now() - t0 < 100;` beneath a marked assert reads as marked. Verified by reading
  `enclosingAssert` (`:62`). Fix: record where the call closes; `null` when it closes above the hit;
  add the unit case.
- CR-2..CR-5 — see Code Review below.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 5 (1 gated)

---

## NFR Assessment

### Performance — PASS
One `gh` call precedes the local test; CR-6's idle path is one 3 s attempt; no threshold changed.

### Reliability — PASS
The module fails closed on every unreadable input; `pending` refuses with a re-run instruction;
`--retry` is untouched (tested); the local-test wrapper keeps `set -e` semantics and adds a message.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 13
- Boundary: `scripts/release-ci-verdict.mjs --sha` via the `cli:` form, argv
  `["--sha","{input}","--json"]`, cases file of 11 hostile + 2 legitimate. All hostile inputs (short,
  empty, 39/41 chars, uppercase, trailing newline, `HEAD`, `main`, `$(touch PWNED)`,
  `--repo=evil/evil`, embedded space) exit 2 before `gh` is spawned; both legitimate SHAs pass the
  argument check. Verdict `engages`, `reproduced: 0`. The engine exited 1 on one recorded escape:
  `home/.local/state/gh/device-id` — the real `gh` writing its own state under the sandboxed HOME,
  not the code under test. Record: `task.153.qa.1.security.run.json`.
- `release.sh` passes `$LOCAL` (from `git rev-parse HEAD`) quoted; the verdict JSON is parsed by
  `node`, never `eval`'d.

### Maintainability — PASS
One workflow table with a parity test, one load-sensitive list with a two-direction guard,
non-vacuity floors on both. `lint:shell` clean.

---

## Code Review

Diff review over `origin/develop...HEAD` excluding task docs and bundled copies — 14 files, 1557 lines.

**Correctness bugs (2):**
- [low/high] `tests/load-sensitive-marker.test.js:62` — CR-1, above → **promoted to gate `top_issues[]`**
- [low/medium] `scripts/release-ci-verdict.mjs` `fetchRuns` — CR-2: no `--repo`, so a clone with
  several remotes and no default makes `gh` fail and the release is refused as unverifiable → pass
  `-R` from `REPO_SLUG`. Advisory (medium confidence); fails closed, never open.

**Cleanups (3):**
- `tests/release-ci-verdict.test.js` `readWorkflow` — CR-3: an inline `on: push` / `on: [push, …]`
  reads as not push-triggered → flag inline forms.
- `tests/load-sensitive-marker.test.js` — CR-4: the `DEFINER` filter can never match under a
  `*.test.*` pathspec → drop it and fix the header.
- `docs/contributing/releases.md` — CR-5: prose says "step 1b", the list numbers it 2 → one numbering.

mutation-proven: `ciVerdict` red-check disabled (M1) → release-ci-verdict *a failure run is red* → covered
mutation-proven: no runs → green (M2) → release-ci-verdict *no runs for a required workflow* → covered
mutation-proven: CI block moved after the local test (M3) → release-ci-gate *red CI refuses before the local test runs* → covered
mutation-proven: CI block deleted (M4) → release-ci-gate (8 cases) → covered
mutation-proven: `WORKFLOWS` `Test`→`Tests` (M5) → release-ci-verdict both parity cases → covered
mutation-proven: `retryUntilForked` returns first attempt (M6) → handoff-verify 3 cases → covered
mutation-proven: retries a non-timeout miss (M7) → handoff-verify *not a timeout fails at once* → covered
mutation-proven: marker removed at `qa-execute-snippets:796` (M8) → load-sensitive-marker direction A → covered
mutation-proven: a `traps.md` line deleted (M9) → load-sensitive-marker direction B → covered
mutation-proven: `killGroup` kills only the leader (M10) → handoff-verify CR-6 → covered (only after the fixture fix; before it, `no-red-untested`)

M1, M2, M5–M9 re-run by QA against the committed tree (`git status` unchanged after). M3, M4, M10
from the develop step's log.

---

## Regression Testing

`npm run ci` (format, full `npm test`, `eval:all`, `validate:all`, `check:generated`,
`bundle:check`, `lint:shell`): exit 0. `npm run validate -- skills/<s>/` for finalise, qa-story,
qa-task, review-security, session-handoff: all ✓. The one pre-existing red —
`skills/qa-task/references/tests/qa-execute-snippets.test.mjs` run from its bundled location — fails
identically on `develop` with the change stashed; no test glob runs it.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci
npm run ci:fast
command node --test tests/release-ci-verdict.test.js tests/release-ci-gate.test.js tests/load-sensitive-marker.test.js skills/session-handoff/tests/handoff-verify.test.js
npm run validate -- skills/{finalise,qa-story,qa-task,review-security,session-handoff}/
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'cli:scripts/release-ci-verdict.mjs' --argv '["--sha","{input}","--json"]' --cases-file <cases> --name release-ci-verdict-sha --record docs/tasks/task.153.release-ci-gate-load-sensitive-tests/task.153.qa.1.security.run.json --json
```

### Coverage Report
Not instrumented (repository has no coverage tooling); coverage is argued per criterion above.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — `enclosingAssert` span check + unit case.

### Short-term Actions (Non-Blocking)
1. CR-2 `-R` from `REPO_SLUG`; CR-3 inline `on:`; CR-4 dead filter; CR-5 numbering.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no HIGH or MEDIUM finding, every NFR PASS; one gated LOW (CR-1) goes to qa-fix.
**Quality Score**: 95/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.153.qa.1.release-ci-gate-load-sensitive-tests.md`
**Gate File**: co-located at `task.153.gate.1.release-ci-gate-load-sensitive-tests.yml`
**Next Steps**: `/qa-fix` for CR-1 (and the advisory cleanups if cheap), then re-review.
