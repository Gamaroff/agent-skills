---
id: task.302
title: "test:remote from a linked worktree"
type: task
description: "Make npm run test:remote work from a linked git worktree, where .git is a file and npm ci's prepare hook exits 128 on the server."
tags: [infrastructure, testing, developer-tooling, remote-test]
category: infrastructure
status: accepted
priority: Low
created: 2026-11-10
updated: 2026-11-12
completed_date: 2026-11-12
pr_number: 890
estimated_effort_hours: 4
---

# Technical Task: test:remote from a linked worktree

**Status:** Accepted

Follow-up to task.295 (merged, PR #872). Found independently by two sessions on 2026-11-10.

---

## 1. Overview

From a linked worktree `npm run test:remote` fails: `.git` is a file there, so `npm ci`'s `prepare` hook (`git config core.hooksPath .githooks && bash scripts/link-skills.sh`) exits 128 on the server. The route already warns about linked worktrees, then fails anyway. Either sync the real git directory, or run `npm ci --ignore-scripts` plus `link-skills.sh` on the server.

## 2. Motivation

A parallel agent working in a linked worktree cannot use the route, so it falls back to the laptop, which is what the route exists to prevent. Two sessions hit it on the same day: one from `agent-skills-precompact`, and this one, which worked around it with a scratch clone.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- The warning: `scripts/remote-test/run.sh:183-191` ("`.git` is not a directory here (linked worktree): history is not synced, so history-backed tests may fail or skip remotely."; re-find it with `grep -n 'is not a directory' scripts/remote-test/run.sh`). The premise is reproducible offline: `git config core.hooksPath x` in an empty directory exits 128 (`fatal: not in a git directory`).
- The failing step: the container runs `npm ci` when `package-lock.json` is present (`docs/contributing/testing-remote.md` step 4). The `prepare` script in `package.json` runs `git config core.hooksPath`, which fails when the synced tree has no `.git` directory.

**Options.** (a) Resolve the real git dir (`git rev-parse --git-common-dir`) and sync it as `.git`: history-backed tests then work, at the cost of syncing a shared object store. (b) `npm ci --ignore-scripts` then `bash scripts/link-skills.sh` in the container: simpler, but the remote run no longer matches a clean checkout's `prepare`, and history-backed tests still skip. Phase 1 chooses and records why.

**Decision (Phase 1): option (a), with the two per-worktree files laid over the common directory.** Option (a) as written is wrong on its own: `--git-common-dir` is the main checkout's git directory, so its `HEAD` and `index` name the main checkout's commit and staged state, not the worktree's. The route syncs the common directory with `--exclude=/worktrees/ --exclude=/HEAD --exclude=/index`, then copies the worktree's own `HEAD` and `index` (from `git rev-parse --absolute-git-dir`) into `.git/`. The server then has a real repository at the worktree's commit, `prepare` runs as in a clean checkout, and nothing is skipped. Option (b) was rejected because `--ignore-scripts` skips every dependency's install script as well as `prepare`, so the remote run stops matching a clean checkout, and history-backed tests would have no `.git` to read. The synced common directory is this repository's own git directory, not an unrelated path. A bare main repository is not handled and is documented as such.

## 4. Scope

**In scope:** ✅ the choice ✅ the fix in `run.sh` ✅ an offline test ✅ the doc.

**Out of scope:** ❌ the per-run lock and image prune (task 296) ❌ any change for a normal checkout.

## 5. Breaking Changes

None for a normal checkout. Behaviour from a linked worktree changes from failing to running.

## 6. Implementation Plan

### Phase 1: Choose — Risk: Low

- [x] Try both options by hand from a linked worktree, in a scratch directory on the server (never the C: drive); record which tests pass or skip under each. Option (a) was run live from a real linked worktree (8407 tests, 0 failed, 3 skipped). Option (b) was **not** trialled by hand; it was rejected on its stated cost, and the Decision paragraph says so.
- [x] For option (a), record what `git rev-parse HEAD` and `git rev-parse --abbrev-ref HEAD` read in the container against the worktree's own. The common git directory's `HEAD` is the main checkout's, not the worktree's, so a synced common dir can make history-backed tests read the wrong commit. Also record what the common dir carries from other worktrees (`worktrees/`, their refs and objects). If option (a) cannot give the container the worktree's HEAD, say so in the choice.

### Phase 2: Fix — Risk: Medium

**Files:** `scripts/remote-test/run.sh`

- [x] Implement the chosen option, replacing the warning-then-fail path.
- [x] Never sync a path outside the repository or write anything to the server's C: drive.

### Phase 3: Test and docs — Risk: Low

**Files:** `tests/test-remote-runner.test.js`, `docs/contributing/testing-remote.md`

- [x] An offline test with a stub: in a linked-worktree-shaped tree (a fixture repo whose `.git` is a file) the runner takes the new path. Mutation-prove it.
- [x] The fixture directory is created with the file's existing helpers and removed in the test's `t.after` (`scripts/test-tmpdir.mjs` rejects a new leaking prefix); a plain `fs.mkdtempSync` with no removal fails `npm test`.
- [x] A live run from a linked worktree, recorded in the QA report with `uptime` on both hosts. (Run once at develop; the evidence is in the implementation report. QA re-records it.)
- [x] Update the doc's linked-worktree paragraph.

## 7. Files Summary

1. ✅ `scripts/remote-test/run.sh`
2. ✅ `tests/test-remote-runner.test.js` (its timeouts come from `spawnBudget`, never a literal)
3. ✅ `docs/contributing/testing-remote.md`, `CHANGELOG.md`

## 8. Testing Strategy

Offline: stubbed `ssh` and `rsync`, a fixture whose `.git` is a file. Live: a real linked worktree run to green. Mutation-prove by restoring the old path. Run `lint:shell` as well as `ci:fast`.

## 9. Success Criteria

**Functional**

- [x] `npm run test:remote` from a linked worktree runs `ci:fast` to the same result as from the main checkout, recorded in the QA report.
- [x] The offline test fails when the old path is restored.
- [x] A normal checkout's behaviour is unchanged: every test that was in `tests/test-remote-runner.test.js` before this task still passes (`node --test tests/test-remote-runner.test.js`; the QA report records the before and after counts, measured with `grep -cE '^\s*(test|it)\(' tests/test-remote-runner.test.js`, which read 21 on 2026-11-12).

**Performance**

- [x] Load on both hosts is recorded before and after the live run (`uptime`, QA report).

**Code quality**

- [x] `lint:shell`, `format:check` and `ci:fast` pass.

**Migration**

- [x] The doc and `CHANGELOG.md` say what changed.

## 10. Risk Assessment

**High:** none. **Medium:** syncing a shared git directory could expose another worktree's objects. Mitigation: option (b) avoids it; Phase 1 weighs it. **Low:** history-backed tests skip remotely under option (b), which the doc must say.

## 11. Rollback Plan

Revert the commit. Triggers: a normal-checkout run that regresses (Critical).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-12
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.302.qa.1.test-remote-from-a-linked-worktree.md](./task.302.qa.1.test-remote-from-a-linked-worktree.md)
- **Gate File**: [task.302.gate.1.test-remote-from-a-linked-worktree.yml](./task.302.gate.1.test-remote-from-a-linked-worktree.yml)

### Test Coverage Summary
- **Tests Executed**: 23
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Residual: the side-by-side main-checkout run was not done; the PR CI test job is its counterpart.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA Report:** `task.302.qa.1.test-remote-from-a-linked-worktree.md`, gate PASS 95/100.

- ✅ **Success criteria:** all six met. The same-result criterion rests on a clean live run from a real linked worktree (8407 tests, 0 failed) and the PR CI `test` job, green on `b9a342a3`.
- ✅ **Tests:** 23 offline tests (21 before); the worktree test goes red on the old `run.sh`.
- ✅ **PR review:** `task.302.pr-review.1` APPROVE.
- ✅ **Docs:** `docs/contributing/testing-remote.md` and `CHANGELOG.md`.
- ⚠️ **Security / compliance:** not applicable.

The four parallel DoD agents did not run; the checks were done inline and the file says so.

**Detailed Verification Log:** `task.302.dod.1.test-remote-from-a-linked-worktree.md`

**Task marked as ACCEPTED on:** 2026-11-12
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-10 | 1.0     | Initial draft | create-task |
| 2026-11-12 | 1.1     | Review passed (8/10): re-anchored the run.sh lines, added the option (a) HEAD check to Phase 1, a fixture-cleanup line to Phase 3, and replaced the stale "19 tests" figure with its definition and command | review-task |
| 2026-11-12 |         | Status → ready-for-development | review-task |
| 2026-11-12 |         | Implemented — 5 files, 2 tests added | develop |
| 2026-11-12 |         | QA gate PASS (95/100) — 0 findings | qa-task |
| 2026-11-12 | 1.2 | DoD passed — accepted (PR #890) | finalise |
<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 3

## References

- task.295 and `docs/contributing/testing-remote.md`
- the handoff `handoff-precompact-keep-lock.md`, item 2
