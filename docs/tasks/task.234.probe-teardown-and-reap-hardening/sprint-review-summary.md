# Sprint Review Summary - Probe sandbox teardown and process-group reap

**Story/Task ID:** task.234
**Completed Date:** 2026-10-31
**Completed By:** Lorien Gamaroff (pipeline: /develop-next → /develop-task)
**Pull Request:** [#800](https://github.com/Gamaroff/agent-skills/pull/800)

---

## Summary

The security probe engine now cleans up after hostile cases. It removes any sandbox a case leaves behind, however deep or locked. It stops a case's background processes before reading their results. And it never lets a case outlive the probe that started it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A mode-000 leaf nested past `PATH_MAX` no longer crashes `runProbeSpec`, and the sandbox is removed (#1).
- [x] Teardown never changes the mode of anything outside the sandbox. Symlinks are not followed, and a swapped root is removed without being followed (#2).
- [x] A background write that lands after the foreground exits is killed before `absent`/`removed` checks are read (#3).
- [x] The A, C and D tests are red on develop and green after; the B guard is red under mutation (#4).
- [x] Wall time: amended. The leash costs +1.7 to +3.2 s (about 7–10%), and the owner approved that cost on 2026-10-31 (#5).
- [x] Each fix is mutation-proved (#6). `npm run ci`, `bundle:check` and lint-shell pass (#7).
- [x] `probe-boundary-rule.md` states the reap and its `setsid` limit (#8). The CHANGELOG records the change (#9).

### Key Features Implemented

- **Resilient teardown**: if removal fails with `EACCES`/`EPERM`/`ENAMETOOLONG`, it falls back to `chmod -R u+rwx` plus `rm -rf`, after an `lstat` check on the root.
- **Process-group reap**: each case runs `detached`, and its group is killed before its side effects are snapshotted.
- **Leash**: a watcher in each case's process group kills the group once the probe is gone. The case keeps its own argv0 and environment. The leash runs on absolute host `PATH` entries only.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — teardown fallback, `reapGroup`, `leashed`/`leashEnv`
- `shared/resources/tests/security-probe.test.mjs` — the A–D tests, plus the QA-3/4/7–12 tests
- `shared/resources/probe-boundary-rule.md` — § 5 now covers the reap, the leash and the teardown limits
- Bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`
- `CHANGELOG.md` — `[Unreleased]` entry

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit Tests:** the security-probe suite passes 274/274 on Node 22, and `ci:fast` runs 6924 tests with 0 failures.
- **QA:** 7 gates (a budget of 5 plus 2 granted cycles); gate 7 is PASS at 95/100. TASK-234-QA-1 to QA-12 are closed.
- **Code Review:** the 5c `/review-pr` came back CONCERNS, with two doc-only findings that are now fixed. The repo requires no reviewers.

---

## Security & Compliance

- The security checklist is clean: no secrets, argv-form spawns, a fixed leash script and an absolute-only `PATH`.
- The DoD classed the root guard as a boundary that no engine form can probe. The owner approved a recorded override, resting on the QA-4 unit test and the race limit stated in the docs.
- Compliance: not applicable (internal tooling).

---

## Known Limitations & Future Work

- A grandchild that calls `setsid` escapes the reap. This is stated in `probe-boundary-rule.md`.
- `reapGroup` treats `EPERM` as "nothing left", and pid reuse could kill a grandchild early.
- The `forceRemoveTree` root guard is not reachable by any probe-engine form. Making it reachable would replace the override with a real probe.
- `ci-tool-skips` fires only under `CI=true`. Running the local fast gate with `CI=true` would catch it before a push.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done._
