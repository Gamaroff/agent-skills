# QA Report: Task 296 - test:remote per-run lock and image-tag prune

**Task**: [Link to task document](./task.296.test-remote-per-run-lock-and-image-prune.md)
**Gate File**: [task.296.gate.1.test-remote-per-run-lock-and-image-prune.yml](./task.296.gate.1.test-remote-per-run-lock-and-image-prune.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Gate Status**: CONCERNS

---

## Executive Summary

The lock, `--unlock` and `--prune-images` work as specified, on the server as well as offline. Two of the new tests are weaker than they read: one assertion cannot fail, and no test holds the staleness margin. Both were reproduced by mutation, so both go to `/qa-fix`. Nothing else blocks.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL on the two test fixes

---

## Testing Scope

### Review Methodology

- Direct tools for the checks; one read-only Explore reviewer for the diff (Step 3b). Route: Diff review: code review. First review, so the whole branch diff (1471 lines).
- Reviewer dispatch and return: not timed by wall clock; duration reported by the completion notice as 94759 ms.
- Step 4b: not applicable. The change set holds no `SKILL.md` or `shared/resources` prompt with a fenced bash block.
- CI on fd8fbccd9459: green.

---

## New Findings This Cycle

Not a re-review; findings are listed under Code Review and Issues Found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The lock | PASS | Verified | take before sync, merged cleanup, held and stale messages, `--unlock` |
| Phase 2: The image prune | PASS | Verified | explicit tags only, fails closed |
| Phase 3: Tests and acceptance | CONCERNS | Partial | 45 tests green; two weak (T296-QA-1, -2) |
| Phase 4: Docs | PASS | Verified | `testing-remote.md`, CHANGELOG |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Second run on one branch exits non-zero before its sync, naming the owner | yes | `lockctl take` held (status 10) gives exit 1, no rsync, owner named (offline test, and live with a held lock) | PASS |
| Crashed run's lock cleared by `--unlock`; live lock not removed | yes | Live: `--unlock` on a live lock exit 32, removed nothing; owner start forced old: run refused and named `--unlock`, `--unlock` exit 0 | PASS |
| `--prune-images` removes an old tag, keeps current | yes | Live: five tags listed, current kept, four removed, exit 0 | PASS |
| No existing option changes | yes | the 23 pre-existing tests pass unchanged | PASS |
| One extra ssh round trip at most | yes | test asserts 7 calls against the old 6 | PASS |
| Load recorded before and after live runs | yes | server 0.22 then 0.86; laptop 0.77 then 1.10 (implementation report) | PASS |
| lint:shell, format:check, CI=true | clean | `shellcheck: clean`; prettier clean; 45/45 under `CI=true` | PASS |
| `ci:fast` green on the final tree via test:remote | green | 8428 pass, 0 fail, run before the owner-word fix; the fix is covered by the offline suite and CI is green on the head | PASS |

A real overlap during the sync window was not reproduced live: the second run reached the container layer first. The lock layer alone was proved by holding the lock directly.

---

## Breaking Changes Validation

None documented, none found. **Assessment:** PASS (not applicable).

---

## Issues Found

### MEDIUM Severity Issues (2)

**T296-QA-1: an assertion that cannot fail**
- **Observation**: `tests/test-remote-runner.test.js:707` asserts the live message does not match a pattern that matches neither message. Adding the wording it guards against leaves 45/45 green.
- **Recommendation**: assert it does not match `Clear it with` and does match `Wait for it to finish`.

**T296-QA-2: the margin and the strict inequality are held by no test**
- **Observation**: replacing `(tmo + $2)` with `(tmo + 0)` at `lockctl.sh:42` leaves 45/45 green.
- **Recommendation**: add boundary cases (30 minute timeout, margin 5, start 34 and 36 minutes ago).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0 (four advisory items under Code Review)

---

## NFR Assessment

### Performance — PASS
One extra round trip per run.

### Reliability — CONCERNS
A signal during the take ssh can leak a lock until it goes stale (CR-6). Prune refuses while any branch holds a lock and does not point at it (CR-3). Both are advisory and documented.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 38 (the run record `totals.executed`; `escaped` 0)
- The run-directory validator was probed with a cases file: 18 hostile names rejected under bash and zsh (the control for `take` is hostile-only, so its verdict reads `unverifiable` for the legitimate half; the `release` control engages with 20/20). The legitimate half of `take` was left out on purpose: it writes its lock under the shared `HOME`, which the probe reports as a sandbox write. The first, mixed run reported exactly that one write and it is the designed behaviour, not a defect.

### Maintainability — PASS
One server-side file, shellcheck clean, documented.

---

## Code Review

Diff review: code review. The reviewer's anchors were checked by reading each line at HEAD; all six named real lines.

**Correctness bugs (6):**
- [medium/high] `tests/test-remote-runner.test.js:707` — assertion cannot fail. Reproduced. Gate T296-QA-1.
- [medium/high] `tests/test-remote-runner.test.js:1087` — margin and `-gt` held by no test. Reproduced. Gate T296-QA-2.
- [medium/medium] `scripts/remote-test/lockctl.sh:107` — prune refuses on another branch's stale lock; `find` failure reads as "no locks". Advisory, not reproduced; documented behaviour (the docs say prune refuses while any run holds a lock).
- [low/medium] `scripts/remote-test/lockctl.sh:97` — race between the stale check and `rm`. Advisory; the window needs two `--unlock` calls and a new run in the same second.
- [low/low] `scripts/remote-test/lockctl.sh:127` — a stopped container using an old tag makes prune exit 42. Advisory.
- [low/low] `scripts/remote-test/run.sh:285` — a signal during the take ssh can leak the lock. Advisory.

mutation-proven: removed the margin from the staleness rule → no test went red → no-red-untested
mutation-proven: made the live message say "Clear it with" → no test went red → no-red-untested
Earlier, at develop: 12 mutations (lock release, merged trap, stale test, prune guard, `*.lock` skip, `--help` range, argument words) each turned a committed test red → covered. Those are the developer's record in the implementation report, not re-run here.

Probe record: `task.296.qa.1.security.run.json` (`probes_executed: 38`).

---

## Regression Testing

The 23 pre-existing runner tests pass unchanged. `ci:fast` green on the server.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/test-remote-runner.test.js      # 45 pass
CI=true command node --test tests/test-remote-runner.test.js
bash scripts/lint-shell.sh
./node_modules/.bin/prettier --check CHANGELOG.md docs/contributing/testing-remote.md tests/test-remote-runner.test.js
security-probe.mjs --sink filename --entry shell-argv:scripts/remote-test/lockctl.sh (release and take, cases file)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T296-QA-1 and T296-QA-2, tests only.

### Short-term Actions (Non-Blocking)
1. The four advisory items above, as a follow-up task if wanted.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL on T296-QA-1 and T296-QA-2.

**QA Report**: co-located at `task.296.qa.1.test-remote-per-run-lock-and-image-prune.md`
**Gate File**: co-located at `task.296.gate.1.test-remote-per-run-lock-and-image-prune.yml`
**Next Steps**: `/qa-fix` the two tests, then QA cycle 2.
