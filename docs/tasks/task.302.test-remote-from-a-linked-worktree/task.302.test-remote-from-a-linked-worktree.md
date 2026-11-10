---
id: task.302
title: "test:remote from a linked worktree"
type: task
description: "Make npm run test:remote work from a linked git worktree, where .git is a file and npm ci's prepare hook exits 128 on the server."
tags: [infrastructure, testing, developer-tooling, remote-test]
category: infrastructure
status: planned
priority: Low
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: test:remote from a linked worktree

**Status:** Planned

Follow-up to task.295 (merged, PR #872). Found independently by two sessions on 2026-11-10.

---

## 1. Overview

From a linked worktree `npm run test:remote` fails: `.git` is a file there, so `npm ci`'s `prepare` hook (`git config core.hooksPath .githooks && bash scripts/link-skills.sh`) exits 128 on the server. The route already warns about linked worktrees, then fails anyway. Either sync the real git directory, or run `npm ci --ignore-scripts` plus `link-skills.sh` on the server.

## 2. Motivation

A parallel agent working in a linked worktree cannot use the route, so it falls back to the laptop, which is what the route exists to prevent. Two sessions hit it on the same day: one from `agent-skills-precompact`, and this one, which worked around it with a scratch clone.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- The warning: `scripts/remote-test/run.sh:180-188` ("`.git` is not a directory here (linked worktree): history is not synced, so history-backed tests may fail or skip remotely.").
- The failing step: the container runs `npm ci` when `package-lock.json` is present (`docs/contributing/testing-remote.md` step 4). The `prepare` script in `package.json` runs `git config core.hooksPath`, which fails when the synced tree has no `.git` directory.

**Options.** (a) Resolve the real git dir (`git rev-parse --git-common-dir`) and sync it as `.git`: history-backed tests then work, at the cost of syncing a shared object store. (b) `npm ci --ignore-scripts` then `bash scripts/link-skills.sh` in the container: simpler, but the remote run no longer matches a clean checkout's `prepare`, and history-backed tests still skip. Phase 1 chooses and records why.

## 4. Scope

**In scope:** ✅ the choice ✅ the fix in `run.sh` ✅ an offline test ✅ the doc.

**Out of scope:** ❌ the per-run lock and image prune (task 296) ❌ any change for a normal checkout.

## 5. Breaking Changes

None for a normal checkout. Behaviour from a linked worktree changes from failing to running.

## 6. Implementation Plan

### Phase 1: Choose — Risk: Low

- [ ] Try both options by hand from a linked worktree; record which tests pass or skip under each.

### Phase 2: Fix — Risk: Medium

**Files:** `scripts/remote-test/run.sh`

- [ ] Implement the chosen option, replacing the warning-then-fail path.
- [ ] Never sync a path outside the repository or write anything to the server's C: drive.

### Phase 3: Test and docs — Risk: Low

**Files:** `tests/test-remote-runner.test.js`, `docs/contributing/testing-remote.md`

- [ ] An offline test with a stub: in a linked-worktree-shaped tree the runner takes the new path. Mutation-prove it.
- [ ] A live run from a linked worktree, recorded in the QA report with `uptime` on both hosts.
- [ ] Update the doc's linked-worktree paragraph.

## 7. Files Summary

1. ✅ `scripts/remote-test/run.sh`
2. ✅ `tests/test-remote-runner.test.js` (its timeouts come from `spawnBudget`, never a literal)
3. ✅ `docs/contributing/testing-remote.md`, `CHANGELOG.md`

## 8. Testing Strategy

Offline: stubbed `ssh` and `rsync`, a fixture whose `.git` is a file. Live: a real linked worktree run to green. Mutation-prove by restoring the old path. Run `lint:shell` as well as `ci:fast`.

## 9. Success Criteria

**Functional**

- [ ] `npm run test:remote` from a linked worktree runs `ci:fast` to the same result as from the main checkout, recorded in the QA report.
- [ ] The offline test fails when the old path is restored.
- [ ] A normal checkout's behaviour is unchanged: the existing 19 guard tests still pass.

**Performance**

- [ ] Load on both hosts is recorded before and after the live run (`uptime`, QA report).

**Code quality**

- [ ] `lint:shell`, `format:check` and `ci:fast` pass.

**Migration**

- [ ] The doc and `CHANGELOG.md` say what changed.

## 10. Risk Assessment

**High:** none. **Medium:** syncing a shared git directory could expose another worktree's objects. Mitigation: option (b) avoids it; Phase 1 weighs it. **Low:** history-backed tests skip remotely under option (b), which the doc must say.

## 11. Rollback Plan

Revert the commit. Triggers: a normal-checkout run that regresses (Critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 3

## References

- task.295 and `docs/contributing/testing-remote.md`
- the handoff `handoff-precompact-keep-lock.md`, item 2
