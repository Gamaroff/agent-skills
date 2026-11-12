# Sprint Review Summary - test:remote per-run lock and image-tag prune

**Story/Task ID:** task.296
**Completed Date:** 2026-11-12
**Completed By:** develop-task pipeline (autonomous, `/develop-next`)
**Pull Request:** [#891](https://github.com/Gamaroff/agent-skills/pull/891)

---

## Summary

`npm run test:remote` now takes an atomic per-run lock on the LAN test server, so two overlapping runs on one branch can no longer disturb each other, and it can prune old `agent-skills-test` image tags without a global prune.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A second overlapping run exits non-zero before its sync and names the first run; the first run is undisturbed (live run recorded in QA report 5).
- [x] `--unlock` clears a crashed run's stale lock and never a live one (live run recorded in QA report 1).
- [x] `--prune-images` keeps the current and in-use tags, removes the rest with `docker rmi <repo:tag>`, and never calls a global prune (live run recorded in QA report 1).
- [x] No existing option's behaviour changed; the lock costs one extra ssh round trip, counted from the stub's call log.
- [x] Load on both hosts is recorded before and after the live runs.
- [x] Shell lint, formatting and the offline guard pass under `CI=true`; `ci:fast` is green.
- [x] `docs/contributing/testing-remote.md` and `CHANGELOG.md` describe the lock and its staleness rule.

### Key Features Implemented

- **Per-run lock**: `mkdir` of `$HOME/<run dir>.lock` on the server, with an owner file (host, pid, server start time, timeout). Exit status says taken, held, or owner unreadable.
- **Staleness rule**: a lock is stale only when no container of that name runs and the server clock is past start plus the owner's timeout plus a margin (`TEST_REMOTE_LOCK_MARGIN_MIN`).
- **`--unlock`**: removes a stale lock only.
- **`--prune-images`**: removes unused old tags of the `agent-skills-test` repository, refusing while any lock exists or when `docker` fails.

---

## Technical Details

### Files Modified/Created

- `scripts/remote-test/lockctl.sh` - new server-side lock, unlock and prune logic, sent over ssh stdin so it is testable offline
- `scripts/remote-test/run.sh` - lock take and release, one cleanup function for the exit traps, `--unlock`, `--prune-images`
- `tests/test-remote-runner.test.js` - 48 offline cases, each new behaviour mutation-proved
- `docs/contributing/testing-remote.md`, `CHANGELOG.md` - operator documentation

### Architecture/Design Decisions

The lock logic lives in one file run on the server, so a test can call it directly. The container-name check stays as a second layer. The digit checks in `lockctl.sh` are capped and read as decimal, so a leading zero cannot turn into octal.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Offline tests:** 48 in `tests/test-remote-runner.test.js`, all passing under `CI=true`.
- **Live runs on the server:** two-run overlap, stale-lock `--unlock` and live prune, each recorded in the QA reports.
- **QA gate:** PASS, 96/100 (five cycles). Step 5c PR review: APPROVE.
- **CI:** 5 of 5 checks green on PR #891.
- **Security:** boundary probe of the lock's inputs, 28 candidates, 0 reproduced, 0 escaped.

---

## Known Limitations and Future Work

Four advisory reliability items (CR-3 to CR-6) remain recorded in the gate's `recommendations.future`. The probe's legitimate-input cases for `take` are held by the offline tests rather than the probe record.
