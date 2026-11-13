# Sprint Review Summary - test:remote from a linked worktree

**Story/Task ID:** task.302
**Completed Date:** 2026-11-12
**Pull Request:** [#890](https://github.com/Gamaroff/agent-skills/pull/890)

---

## Summary

`npm run test:remote` now works from a linked git worktree. Before, the server's `npm ci` `prepare` hook exited 128 there, so a parallel agent fell back to running heavy tests on the laptop.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A linked worktree runs `ci:fast` to a clean pass (8407 tests, 0 failed); the PR CI `test` job is green on the same code.
- [x] An offline test fails when the old path is restored.
- [x] A normal checkout behaves as before (21 tests before, 23 after, all pass).
- [x] Load on both hosts recorded before and after the live run.
- [x] `lint:shell`, `format:check` and `ci:fast` pass.
- [x] The doc and CHANGELOG say what changed.

### Key Features Implemented

- **Linked-worktree sync**: the route syncs the common git directory as `.git`, excludes `worktrees/`, `HEAD` and `index`, then lays the worktree's own `HEAD` and `index` over it. The server sees a real repository at the worktree's commit.

---

## Technical Details

### Files Modified/Created

- `scripts/remote-test/run.sh` - the linked-worktree path
- `tests/test-remote-runner.test.js` - two new tests (linked worktree, normal checkout)
- `docs/contributing/testing-remote.md`, `CHANGELOG.md` - the behaviour change

### Architecture/Design Decisions

Option (a), syncing the git directory, was chosen over `npm ci --ignore-scripts` because that option skips every dependency's install script and leaves history-backed tests without a `.git`. Option (b) was not trialled by hand. A bare main repository is not handled and the doc says so.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit Tests:** 23 in `tests/test-remote-runner.test.js` (2 added)
- **QA gate:** PASS, 95/100, one cycle, no findings
- **PR review:** APPROVE (two low findings, trail and coverage, both closed by this acceptance)
- **Independent review:** did not run; QA, the PR review and this DoD were done inline

---

## Known Limitations

- No hand-run side-by-side comparison against the main checkout; the green CI `test` job is the counterpart.
