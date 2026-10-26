---
id: task.234
title: "Probe sandbox teardown and process-group reap"
type: task
description: "Close task.232 QA gate 3's four low follow-ups in security-probe.mjs: a teardown that survives a tree deeper than PATH_MAX, the chmod symlink-swap race, a hardened QA2-1 test, and a reap of each case's process group before its path assertions are read."
tags: [security-probe, finalise, qa-task, testing]
category: testing
status: planned
priority: Low
created: 2026-10-26
updated: 2026-10-26
assignee:
estimated_effort_hours: 16
github_issue: 750
---

# Technical Task: Probe sandbox teardown and process-group reap

**Status:** Planned
**GitHub Issue**: [#750](https://github.com/Gamaroff/agent-skills/issues/750)

---

## 1. Overview

task.232's QA gate 3 (`task.232.gate.3.probe-expected-path-assertions.yml`, `recommendations.future`)
left four low-severity follow-ups in `shared/resources/security-probe.mjs`. All four concern what
happens around a case's run: tearing down its sandbox, and stopping its processes before its
results are read. This task closes all four:

| # | Gate 3 item | What goes wrong today |
| --- | --- | --- |
| A | CR-1: permission walk past PATH_MAX | A case that nests directories past PATH_MAX and leaves one mode 000 crashes the probe run |
| B | CR-2: chmod follows a swapped symlink | A still-running process can swap a directory for a symlink mid-walk, and `chmodSync` follows it out of the sandbox |
| C | CR-3, CR-4: QA2-1 test | The test does not check the sandbox is gone, and it passes silently under root instead of skipping |
| D | Gate 2 CR-2 (pre-existing): reap | A case's background grandchild can write after `absent`/`removed` are read, so the check passes on a side effect that lands later |

**Key deliverables:**

- `removeSandbox` removes a sandbox deeper than PATH_MAX with a mode-000 directory in it.
- The permission restore never follows a symlink out of the sandbox, or the residual race is listed
  as a stated limit.
- The QA2-1 test asserts no sandbox remains and reports a skip under root.
- Every case runs in its own process group, which is killed before the case's path assertions run.

---

## 2. Motivation

### Current Problems

- **A: the gate's suggested fix is not enough (measured 2026-10-26).** A tree of 30 × 200-byte
  directories with a mode-000 leaf, Node v26.8.2:
  - first `rmSync` → `EACCES` (it reaches the deep leaf, so `rmSync` itself handles the depth);
  - the permission walk → `ENAMETOOLONG` at `lstat`, because it builds absolute paths with `join`;
  - second `rmSync` → `EACCES` again, because the walk never reached the leaf.

  Gate 3 suggested "make the permission walk best-effort so only the final `rmSync` can throw". On
  this measurement that still throws, from the final `rmSync`. The walk has to reach the leaf, not
  just stop throwing. A shell `chmod -R u+rwx` (which descends by relative path) cleaned the same
  tree.
- **B: the walk is check-then-act.** `open()` calls `lstatSync(p).isDirectory()`, then recurses and
  calls `chmodSync(dir, 0o700)` by path (`security-probe.mjs:976`–`:981`). A process still running
  can replace `dir` with a symlink between the two calls. QA rated it low confidence.
- **C: the QA2-1 test proves less than its name.** `security-probe.test.mjs:7456`:
  - it asserts each case is `rejected`, but not that the sandbox under `tmpdir()` was removed;
  - `if (process.getuid?.() === 0) return;` (`:7458`) reports a pass under root. The same line is at
    `:7507`.
- **D: a detached write lands after the check.** Cases run under `spawnSync`
  (`security-probe.mjs:1908` for the module runner, `:2287` for the command forms). `spawnSync`
  returns when the direct child exits. A grandchild started with `&` keeps running and can write
  after `snapshotTree`, `absent` and `removed` have been read. The gate rated this pre-existing.

### Benefits

- A hostile case cannot crash the probe run by shaping its own directory tree.
- A `PASS` on `absent` means nothing wrote that path during the case, including a background child.
- The QA2-1 test fails if teardown leaves the sandbox behind, and says when it did not run.

---

## 3. Technical Background

### Current Architecture

- **Sandbox.** `runProbeSpec` creates it with `mkdtempSync(join(tmpdir(), "security-probe-"))`
  (`security-probe.mjs:1795`), and removes it with `removeSandbox(sandboxRoot)` (`:1974`).
- **Teardown.** `removeSandbox` (`:969`): try `rmSync`; on `EACCES`/`EPERM`, walk with `open()`
  (`chmodSync` 0o700, `readdirSync`, `lstatSync`, recurse), then `rmSync` again. Added by task.232
  QA2-1 (commit `dda2cbd2`).
- **Case processes.** `grep -n "spawnSync(" shared/resources/security-probe.mjs` returns 6 sites.
  Two run cases: `:1908` (the module runner) and `:2287` inside `watchedSpawn` (`:2278`), which
  snapshots the tree before and after. The other four (`:479`, `:1169`, `:1185`, `:3334`) are a git
  lookup, two shell probes and a `-n` syntax check. Phase 3 confirms that `runShellCase`,
  `runCliCase`, `runShellArgvCase` and `runFenceCase` all reach `watchedSpawn`.
- **`spawnSync` and process groups (measured 2026-10-26).** `spawnSync(..., { detached: true })`
  puts the child in its own process group: its pgid was its own pid, not the parent's. The result
  carries `pid`, so after the call returns, `process.kill(-pid, "SIGKILL")` reaches any group
  member still running. `ESRCH` means none is left.

### Target Architecture

- **A.** The permission restore reaches every directory however deep. Recommended: run
  `chmod -R u+rwx <root>` as a child process (`spawnSync`, argv form, no shell). GNU and BSD
  `chmod -R` both descend without following symlinks by default, and the measurement showed it
  clears the deep tree. The in-process walk is removed. An alternative the plan may choose instead:
  a walk using relative paths. Either way, the PATH_MAX test (§ 8) decides.
- **B.** With `chmod -R`, the in-process `lstat`-then-`chmod` race is gone. Any race left inside
  `chmod -R` is written into `probe-boundary-rule.md` as a stated limit (the doc already states
  limits this way, e.g. `:424`, `:584`; it has no process-group limit today). If the plan keeps an in-process walk, it re-`lstat`s after each
  `chmodSync` and compares `dev`/`ino`, per gate 3.
- **C.** The test points `TMPDIR` at a fresh directory for the run, asserts it is empty afterwards,
  and calls `t.skip("root reads through mode 000")` under root. The same change applies to the
  `:7507` test.
- **D.** Both case spawn sites pass `detached: true`, and right after `spawnSync` returns they kill
  the group (`process.kill(-child.pid, "SIGKILL")`, `ESRCH` ignored), **before** the after-snapshot
  and the path assertions. Limit, stated in the rule doc: a grandchild that calls `setsid` itself
  leaves the group and is not reaped.

### Important Clarifications

- `detached: true` also detaches the child from the controlling terminal. Cases read stdin from
  `input`, never a terminal, so no case behaviour changes. The full suite confirms this.
- Windows is not a target of the probe's shell forms. Phase D does not have to support it.

---

## 4. Scope

### In Scope

- `removeSandbox` and the permission restore (A, B).
- The QA2-1 test and the `:7507` root guard (C).
- Process-group reap at the two case spawn sites (D).
- The stated-limits text in `shared/resources/probe-boundary-rule.md`, plus bundled copies.
- CHANGELOG `[Unreleased]`.

### Out of Scope

- **Gate 2's CR-3 and CR-4** (a dangling outward ancestor symlink reads as `missing`, not
  `outside`; `removed` cannot name a directory the fixture creates implicitly). Gate 2 listed them
  under `recommendations.future`. Gate 3 did not carry them, and they are not in this bundle. They
  need their own decision.
- Timeouts and output limits for cases.
- A case that escapes its group with `setsid`. It is listed as a limit, not handled.

---

## 5. Breaking Changes

### Breaking Change 1: a background write that used to land after the check is now killed

A case that starts a background child which writes after the foreground exits used to pass `absent`
and leave the write behind. Now the child is killed before the check. No shipped case corpus relies
on that write landing: it is the false pass this task removes. **Migration:** none needed. A case
author who wants a background write checked must wait for it in the foreground.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.234.plan.probe-teardown-and-reap-hardening.md](task.234.plan.probe-teardown-and-reap-hardening.md)

### Phase 1: Teardown past PATH_MAX (A, B) (Risk: Medium)

- [ ] Red test: a case builds a tree deeper than PATH_MAX (relative `mkdir` + `cd` in the case
      script) with a mode-000 leaf. `runProbeSpec` must return its results and leave no sandbox.
      Confirm it throws on develop.
- [ ] Replace the in-process walk (recommended: `chmod -R u+rwx` via `spawnSync`, argv form).
- [ ] Guard test for B: a symlink to a directory outside the sandbox (created mode 0o500, so a
      followed `u+rwx` would change it), inside a mode-000 directory. After teardown, the outside
      directory is still 0o500. Measured 2026-10-26 on GNU coreutils 9.12: `chmod -R` leaves it,
      `chmod -R -L` changes it. This is green on develop too: the
      race needs a swap mid-walk, which a static fixture cannot time. The test holds the property
      for the new restore; mutation-prove it with `chmod -R -L` (follow symlinks), which must turn it red.
- [ ] Green; mutation-prove both by restoring the old walk.

### Phase 2: QA2-1 test hardening (C) (Risk: Low)

- [ ] Point `TMPDIR` at a fresh directory around the run; assert it is empty afterwards.
- [ ] `t.skip` under root at `:7458` and `:7507`.
- [ ] Mutation-prove: make `removeSandbox` a no-op and confirm the test goes red.

### Phase 3: Process-group reap (D) (Risk: Medium)

- [ ] Confirm every case form reaches `:1908` or `:2287`; list any other case spawn and include it.
- [ ] Red test per spawn site: a case starts `(sleep 0.3; touch <marker outside the sandbox>) &`
      and exits 0. After `runProbeSpec` returns, the test waits 0.6 s and asserts the marker is
      absent. Confirm it is present on develop.
- [ ] `detached: true` plus the group kill before the after-snapshot.
- [ ] Green; mutation-prove by removing the kill.

### Phase 4: Docs and validation (Risk: Low)

- [ ] `probe-boundary-rule.md`: the reap, and its `setsid` limit; any residual chmod race.
- [ ] `npm run bundle` and `bundle:check`; CHANGELOG `[Unreleased]`.
- [ ] `npm run ci` with `.agents/skills` moved aside.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `shared/resources/security-probe.mjs` — `removeSandbox` (`:969`); the spawn sites at `:1908` and
  `:2287`.

### Files to Modify (Tests)

- `shared/resources/tests/security-probe.test.mjs` — the QA2-1 test (`:7456`), the `:7507` guard,
  and new tests for A, B and D.
- `shared/resources/tests/fixtures/security-probe/` — new fixtures if a form needs a script file.

### Files to Modify (Documentation)

- `shared/resources/probe-boundary-rule.md` — stated limits.
- `CHANGELOG.md`.

### Generated

- Bundled copies in `skills/{finalise,qa-story,qa-task,review-security}/references/` (the set
  task.232 touched; the bundler decides).

---

## 8. Testing Strategy

### Unit Tests

- **A:** a case that nests past PATH_MAX with a mode-000 leaf. `runProbeSpec` returns, and the
  `TMPDIR` used for the run is empty afterwards.
- **B:** an outward symlink inside a mode-000 directory. The outside target's mode is unchanged after
  teardown. A guard, green before and after; its red is the `-L` mutation (Phase 1).
- **C:** the hardened QA2-1 test, red when `removeSandbox` is a no-op.
- **D:** a delayed background write to a marker outside the sandbox, for each case spawn site. The
  marker is absent 0.6 s after `runProbeSpec` returns.

### Regression

- The full `security-probe.test.mjs` file (265 tests at task.232's close). Every existing case
  outcome stays the same.
- task.227's two cleanup cases, run with `removed`.

### Timing

- The D tests wait 0.6 s each. Keep them to one per spawn site.

---

## 9. Success Criteria

### Functional

- [ ] A case that nests past PATH_MAX with a mode-000 leaf no longer crashes `runProbeSpec`, and its
      sandbox is removed.
- [ ] Teardown never changes the mode of anything outside the sandbox.
- [ ] A background write that lands after the foreground exits is killed before `absent`/`removed`
      are read.
- [ ] The A, C and D tests are red on develop and green after their phase. The B guard is green on
      both and red under its mutation.

### Performance

- [ ] The suite's wall time grows by no more than the D tests' waits (about 0.6 s per spawn site).

### Code Quality

- [ ] Each fix is mutation-proved.
- [ ] `npm run ci` (with `.agents/skills` aside), `bundle:check` and `scripts/lint-shell.sh` pass.

### Migration

- [ ] `probe-boundary-rule.md` states the reap and its `setsid` limit.
- [ ] CHANGELOG `[Unreleased]` records the change.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

- **`detached: true` changes a case's environment.** Mitigation: the full probe suite and task.227's
  cases must give identical outcomes. Any difference is a HALT, not a fixture edit.
- **`chmod -R` differs between GNU and BSD.** Mitigation: use only `-R` and `u+rwx`, which both
  support. CI runs on Linux; note in the plan that macOS was not run.

### Low Risk Areas

- **The D tests are timing-sensitive.** Mitigation: the marker check waits twice the write delay.
  Under load, raise the wait, never lower it.
- **Killing a group that has already gone.** `ESRCH` is expected and ignored. Any other error is
  reported, not swallowed.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

Revert the merge commit. The teardown and spawn sites return to task.232's code.

### Partial Rollback (1–2 hours)

Phases are independent. Revert Phase 3's commit alone if `detached: true` changes a case outcome
that was not caught before merge.

### Forward Fix (< 4 hours)

If `chmod -R` misbehaves on a platform, switch Phase 1 to the relative-path walk; the PATH_MAX test
stays as the judge.

### Rollback Triggers

- Any existing probe case changes outcome.
- The D tests flake in CI more than once.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-26 | 1.0 | Initial draft — cut from task.232 QA gate 3 future recommendations | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Teardown past PATH_MAX
- [ ] Red tests (A, B)
- [ ] Permission restore replaced
- [ ] Mutation proof

### Phase 2: QA2-1 test hardening
- [ ] `TMPDIR` assertion, `t.skip`
- [ ] Mutation proof

### Phase 3: Process-group reap
- [ ] Spawn sites confirmed
- [ ] Red tests (D)
- [ ] Group kill
- [ ] Mutation proof

### Phase 4: Docs and validation
- [ ] Rule doc, bundle, CHANGELOG, `npm run ci`

---

## References

- `docs/tasks/task.232.probe-expected-path-assertions/task.232.gate.3.probe-expected-path-assertions.yml` — `recommendations.future`
- `docs/tasks/task.232.probe-expected-path-assertions/task.232.qa.3.probe-expected-path-assertions.md` — CR-1 to CR-4
- `docs/tasks/task.232.probe-expected-path-assertions/task.232.gate.2.probe-expected-path-assertions.yml` — CR-2 (reap), and CR-3/CR-4 (out of scope here)
- `shared/resources/probe-boundary-rule.md` — the probe's stated limits

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then `npm run bundle`.
- Move `.agents/skills` aside before trusting a local `npm run ci`, and restore it with a trap.
- `timeout` cannot run `command node`; use `timeout N "$(type -P node)" …`.

### Known Issues

- Gate 2's CR-3 and CR-4 are not carried by any gate or task. See § 4 Out of Scope.
