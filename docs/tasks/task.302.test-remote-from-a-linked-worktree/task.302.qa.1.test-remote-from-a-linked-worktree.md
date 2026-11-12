# QA Report: Task 302 - test:remote from a linked worktree

**Task**: [Link to task document](./task.302.test-remote-from-a-linked-worktree.md)
**Gate File**: [task.302.gate.1.test-remote-from-a-linked-worktree.yml](./task.302.gate.1.test-remote-from-a-linked-worktree.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Gate Status**: PASS

---

## Executive Summary

`scripts/remote-test/run.sh` now syncs a linked worktree's common git directory as `.git` and lays the worktree's own `HEAD` and `index` over it, so the server's `npm ci` `prepare` hook no longer exits 128. All 23 offline tests pass; the new one fails on the old `run.sh`.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools, one inline pass. The Step 3b diff review was done inline by the QA agent, not by a dispatched reviewer, so independent review did not run for this cycle. Diff review: code review (the change set holds code).

Re-review scope: not applicable (first review).

CI on eba242d2: the `test` job was pending at the time of the read; shellcheck, link-check and secret-scan passed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: choose the approach | PASS | n/a | Option (a) with the per-worktree HEAD and index overlay; option (b) rejected on its stated cost, not trialled by hand (recorded in the task Decision paragraph) |
| Phase 2: implement | PASS | Verified | `run.sh` common-dir sync plus overlay; no-`.git` case keeps its warning |
| Phase 3: tests and docs | PASS | 23 pass | Two new tests; doc paragraph and CHANGELOG updated |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Linked worktree runs `ci:fast` to the same result as the main checkout | same | Live run from a real linked worktree: exit 0, 8407 tests, 8404 pass, 0 fail, 3 skipped | PASS (residual) | No side-by-side main-checkout run. Counterpart: the PR CI `test` job, pending at read. Recorded as a future recommendation |
| Offline test fails on the old path | red | `from a linked worktree the server gets…` fails (22 pass, 1 fail) with the develop-branch `run.sh` | PASS | mutation-proven: old `run.sh` restored → the new worktree test → covered |
| Normal checkout unchanged | 21 before, all still pass | 21 before (`git show origin/develop:…`), 23 after, 23 pass | PASS | `a normal checkout still syncs its own .git directory` holds it |
| Load on both hosts before and after the live run | recorded | In the implementation report (laptop 4.00 to 1.93; server 10.24 to 14.84 at 1 min). QA-time read: laptop 1.53, server 4.22 | PASS | Server also hosts other containers |
| `lint:shell`, `format:check`, `ci:fast` pass | green | `lint:shell` clean; prettier clean on the three changed formattable files (`run.sh` has no parser); `ci:fast` green in the live run | PASS | |
| Doc and CHANGELOG updated | yes | `docs/contributing/testing-remote.md` step 3 and a CHANGELOG entry citing (task 302) | PASS | |

---

## Breaking Changes Validation

None. A normal checkout syncs its `.git` as before.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0.

---

## NFR Assessment

### Performance — PASS
One extra rsync of two small files; the common-dir copy is the same order as a normal checkout.

### Reliability — PASS
Unresolvable directories fail closed with a message; a missing worktree index is tolerated.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- Nothing is written outside the run directory; the criteria carry no accept/reject signal (`boundary_signals: []`), and `run.sh` is not a predicate (`boundary: false`).

### Maintainability — PASS
The block is commented with why the overlay exists.

---

## Code Review

Inline pass over the `run.sh` diff (no dispatched reviewer).

**Correctness bugs (0):** none found. Checked: a relative `--git-common-dir`, a detached HEAD, a worktree with no index yet, `--delete` against the excluded `worktrees/`, `HEAD` and `index` (excluded paths are protected on the receiver, then overwritten by the overlay).

**Cleanups (0):** none.

mutation-proven: restored the develop `run.sh` → `from a linked worktree the server gets the common git dir with this worktree's HEAD and index` went red → covered

boundary: false (run.sh is a sync script, not an accept/reject predicate); probes_executed: 0; escaped: 0

---

## Regression Testing

`node --test tests/test-remote-runner.test.js` with `CI=true`: 23 pass, 0 fail. The run.sh restore was confirmed with `cmp` and a clean `git status` for `scripts/`.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test tests/test-remote-runner.test.js
npm run lint:shell
./node_modules/.bin/prettier --check tests/test-remote-runner.test.js CHANGELOG.md docs/contributing/testing-remote.md
grep -cE '^\s*(test|it)\(' tests/test-remote-runner.test.js
```
`npm run validate -- skills/` was not applicable: no skill changed.

---

## Recommendations

### Short-term Actions (Non-Blocking)
1. Confirm the PR CI `test` job is green; it is the main-checkout counterpart of the live run.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED
