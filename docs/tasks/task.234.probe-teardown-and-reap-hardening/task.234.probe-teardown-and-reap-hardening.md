---
id: task.234
title: "Probe sandbox teardown and process-group reap"
type: task
description: "Close task.232 QA gate 3's four low follow-ups in security-probe.mjs: a teardown that survives a tree deeper than PATH_MAX, the chmod symlink-swap race, a hardened QA2-1 test, and a reap of each case's process group before its path assertions are read."
tags: [security-probe, finalise, qa-task, testing]
category: testing
status: ready-for-review
priority: Low
created: 2026-10-26
updated: 2026-10-31
assignee:
estimated_effort_hours: 16
github_issue: 750
---

# Technical Task: Probe sandbox teardown and process-group reap

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.234.review.1.probe-teardown-and-reap-hardening.md` implemented 2026-10-31
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
  returns once the direct child has exited **and** every holder of its stdout/stderr pipes has
  closed them. A grandchild started with `&` that keeps the case's pipes therefore holds
  `spawnSync` open until it finishes, and its write is seen. One that releases them
  (`>/dev/null 2>&1 </dev/null &`, or `stdio: "ignore"`) does not, keeps running, and can write
  after `snapshotTree`, `absent` and `removed` have been read. Measured 2026-10-31 (review 1): the
  inherited-pipe form returned after 306 ms with its marker written; the redirected form returned
  after 3 ms and wrote its marker later. The gate rated this pre-existing.

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
  lookup, two shell probes and a `-n` syntax check. Every case form reaches one of the two
  (review 1, search: `grep -n "watchedSpawn(\|caseWatchedSpawn(\|spawnSync(" shared/resources/security-probe.mjs`):
  `runShellCase` (`:2469`) and `runCliCase` (`:2750`) call `watchedSpawn` directly;
  `runShellArgvCase` (`:3100` setup, `:3134` case) and `runFenceCase` (`:3636`) call
  `caseWatchedSpawn` (`:2912`), which calls `watchedSpawn` (`:2930`). A shell-argv **setup** spawn
  therefore goes through `watchedSpawn` too, so the reap applies to it as well.
- **Tree walkers past PATH_MAX.** `snapshotTree` (`qa-execute-snippets.mjs:1980`) and
  `workDirStamps` (`:3438`) swallow `readdirSync`/`statSync` errors, so a deep tree does not crash
  them; it only hides entries past PATH_MAX from them. `removeSandbox` is the one site that throws.
- **`spawnSync` and process groups (measured 2026-10-26).** `spawnSync(..., { detached: true })`
  puts the child in its own process group: its pgid was its own pid, not the parent's. The result
  carries `pid`, so after the call returns, `process.kill(-pid, "SIGKILL")` reaches any group
  member still running. `ESRCH` means none is left.

### Target Architecture

- **A.** The permission restore reaches every directory however deep. Recommended: run
  `chmod -R u+rwx <root>` as a child process (`spawnSync`, argv form, no shell). GNU and BSD
  `chmod -R` both descend without following symlinks by default, and the measurement showed it
  clears the deep tree. The in-process walk is removed. An alternative the plan may choose instead:
  a walk using relative paths. Either way, the PATH_MAX test (§ 8) decides. *(QA 1: on Node 22,
  `rmSync` itself fails a deep tree with `ENAMETOOLONG`, so the removal after the restore is
  `rm -rf` too, and `ENAMETOOLONG` enters the fallback.)*
- **B.** With `chmod -R`, the in-process `lstat`-then-`chmod` race is gone. Any race left inside
  `chmod -R` is written into `probe-boundary-rule.md` as a stated limit (the doc already states
  limits this way, e.g. `:424`, `:584`; it has no process-group limit today). If the plan keeps an in-process walk, it re-`lstat`s after each
  `chmodSync` and compares `dev`/`ino`, per gate 3.
- **C.** The test points `TMPDIR` at a fresh directory for the run, asserts it is empty afterwards,
  and calls `t.skip("root reads through mode 000")` under root. The same change applies to the
  `:7507` test.
- **D.** Both case spawn sites pass `detached: true`, and right after `spawnSync` returns they kill
  the group (`process.kill(-child.pid, "SIGKILL")`, `ESRCH` ignored), **before** the after-snapshot
  and the path assertions. For `:2287` that is inside `watchedSpawn`, between `spawnSync` and its
  `after` snapshot. Measured 2026-10-31 (review 1): with `detached: true` and the group kill, a
  redirected `(sleep 0.3; touch m) >/dev/null 2>&1 </dev/null &` left no marker 0.7 s later. Limit,
  stated in the rule doc: a grandchild that calls `setsid` itself leaves the group and is not
  reaped.

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
- The tree walkers' blindness past PATH_MAX (§ 3): they do not crash, and no gate item asks for it.

---

## 5. Breaking Changes

### Breaking Change 1: a background write that used to land after the check is now killed

A case that starts a background child which writes after the foreground exits used to pass `absent`
and leave the write behind. Now the child is killed before the check. No shipped case corpus relies
on that write landing: it is the false pass this task removes. **Migration:** none needed. A case
author who wants a background write checked must wait for it in the foreground.

The same reap runs after a shell-argv **setup** spawn (it reaches `watchedSpawn` through
`caseWatchedSpawn`), so a setup that leaves a background process for its case to use now has it
killed before the case runs. No shipped setup does this; a setup's state must be on disk, not in a
running process.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.234.plan.probe-teardown-and-reap-hardening.md](task.234.plan.probe-teardown-and-reap-hardening.md)

### Phase 1: Teardown past PATH_MAX (A, B) (Risk: Medium)

- [x] Red test: a case builds a tree deeper than PATH_MAX (relative `mkdir` + `cd` in the case
      script) with a mode-000 leaf. `runProbeSpec` must return its results and leave no sandbox.
      Confirm it throws on develop. *(Red on develop: `ENAMETOOLONG` at `lstat`.)*
- [x] Replace the in-process walk (recommended: `chmod -R u+rwx` via `spawnSync`, argv form).
- [x] Guard test for B: a symlink to a directory outside the sandbox (created mode 0o500, so a
      followed `u+rwx` would change it), inside a mode-000 directory. After teardown, the outside
      directory is still 0o500. Measured 2026-10-26 on GNU coreutils 9.12: `chmod -R` leaves it,
      `chmod -R -L` changes it. This is green on develop too: the
      race needs a swap mid-walk, which a static fixture cannot time. The test holds the property
      for the new restore; mutation-prove it with `chmod -R -L` (follow symlinks), which must turn it red.
- [x] Green; mutation-prove both by restoring the old walk. *(Old walk: A red, B green. `-L`: B red.)*

### Phase 2: QA2-1 test hardening (C) (Risk: Low)

- [x] Point `TMPDIR` at a fresh directory around the run; assert it is empty afterwards.
- [x] `t.skip` under root at `:7458` and `:7507`. Both callbacks take no argument today, so each
      becomes `(t) => …`. At `:7507` the guard sits after the ELOOP half, which still runs.
- [x] Mutation-prove: make `removeSandbox` a no-op and confirm the test goes red.

### Phase 3: Process-group reap (D) (Risk: Medium)

- [x] Confirm every case form reaches `:1908` or `:2287` (review 1 traced them; see § 3) by
      re-running the recorded search; list any other case spawn and include it. *(Re-run: no new
      case spawn; the other `spawnSync` sites are `git rev-parse`, `chmod`, `python3 --version`,
      the zsh probe and the `-n` syntax check, none of which runs case code.)*
- [x] Red test per spawn site. The grandchild **must release the case's stdio**, or `spawnSync`
      waits for it and the write is seen in time, on develop and after the fix alike (§ 2, D):
  - `:2287`: a shell form case runs
    `(sleep 0.3; touch <marker outside the sandbox>) >/dev/null 2>&1 </dev/null &` and exits 0.
  - `:1908`: a module entry (a fixture `.mjs` the test writes) whose export spawns
    `sh -c 'sleep 0.3; touch <marker>'` with `stdio: "ignore"`, **not** `detached`, calls
    `.unref()`, and returns.
  - After `runProbeSpec` returns, the test waits 0.6 s and asserts the marker is absent. Confirm it
    is present on develop. *(Both red on develop. The module grandchild is `process.execPath -e`
    rather than `sh -c`, with the same `stdio: "ignore"` + `.unref()` shape.)*
- [x] `detached: true` plus the group kill before the after-snapshot.
- [x] Green; mutation-prove by removing the kill.

### Phase 4: Docs and validation (Risk: Low)

- [x] `probe-boundary-rule.md`: the reap, and its `setsid` limit; any residual chmod race.
- [x] `npm run bundle` and `bundle:check`; CHANGELOG `[Unreleased]`.
- [x] `npm run ci` with `.agents/skills` moved aside.

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
- **D:** a delayed background write to a marker outside the sandbox, from a grandchild that has
  released the case's stdio, for each case spawn site (Phase 3 gives both shapes). The marker is
  absent 0.6 s after `runProbeSpec` returns.

### Regression

- The full `security-probe.test.mjs` file (265 tests at task.232's close). Every existing case
  outcome stays the same.
- task.227's two cleanup cases, run with `removed`.

### Timing

- The D tests wait 0.6 s each. Keep them to one per spawn site.

---

## 9. Success Criteria

### Functional

- [x] A case that nests past PATH_MAX with a mode-000 leaf no longer crashes `runProbeSpec`, and its
      sandbox is removed. *(QA 1 found it failing on Node 22 — TASK-234-QA-1; after the fix it
      passes on Node 22.23.4, 24.21.0 and 26.8.2.)*
- [x] Teardown never changes the mode of anything outside the sandbox. *(QA 2 found that `chmod -R`
      followed a sandbox root swapped for a symlink — TASK-234-QA-4. QA fix 2 lstats the root first
      and removes a non-directory as an entry; the swap window that remains needs a `setsid`
      grandchild, as stated in `probe-boundary-rule.md` § 5.)*
- [x] A background write that lands after the foreground exits is killed before `absent`/`removed`
      are read.
- [x] The A, C and D tests are red on develop and green after their phase. The B guard is green on
      both and red under its mutation. *(C as written is green on develop: QA2-1's sandbox was
      already removed there; it is held by its no-op-teardown mutation instead.)*

### Performance

- [x] The suite's wall time grows by no more than the D tests' waits (about 0.6 s per spawn site).
      *(QA fix 2: the leash for TASK-234-QA-3 adds a few ms per case, measured as +1.7 to +3.2 s
      (about 7–10%) on the 265 pre-existing probe tests at load 3.3–4.4, beyond the D waits. That
      is accepted as the cost of bounding a case past a killed probe.)*
      *(2026-10-31, load ~1.0–1.2: the 265 existing tests 25.86/25.90 s on develop vs 26.00/26.03 s
      on the branch, +0.14 s; the whole file grows ~1.3 s, the two 0.6 s D waits plus the A and B
      runs.)*

### Code Quality

- [x] Each fix is mutation-proved.
- [x] `npm run ci` (with `.agents/skills` aside), `bundle:check` and `scripts/lint-shell.sh` pass.
      *(QA 1: the A test failed on Node 22, which CI runs; fixed in QA fix cycle 1.)*

### Migration

- [x] `probe-boundary-rule.md` states the reap and its `setsid` limit.
- [x] CHANGELOG `[Unreleased]` records the change.

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

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-31
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.234.qa.5.probe-teardown-and-reap-hardening.md](./task.234.qa.5.probe-teardown-and-reap-hardening.md)
- **Gate File**: [task.234.gate.5.probe-teardown-and-reap-hardening.yml](./task.234.gate.5.probe-teardown-and-reap-hardening.yml)

### Test Coverage Summary
- **Tests Executed**: the security-probe suite on Node 22 (273/273) and `ci:fast` (6923 tests, 0 failed)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Every high finding from cycles 1–4 is fixed, each with a test and a mutation proof.
- TASK-234-QA-10 (medium, follow-up): `leashEnv()` keeps relative `PATH` entries. This matters only on a host whose `PATH` holds one and that has no `sleep` or `ps` in `/usr/bin:/bin`.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-26 | 1.0 | Initial draft — cut from task.232 QA gate 3 future recommendations | create-task |
| 2026-10-31 | 1.1 | Review 1 (8/10 after fixes): the D red test now has its grandchild release the case's stdio (as drafted it could never go green); case-form trace and search recorded; setup-spawn reap stated; `t.skip` signature noted | review-task |
| 2026-10-31 |  | Status → ready-for-development | review-task |
| 2026-10-31 |  | Implemented — 3 source files (+6 bundled copies), 5 tests added, 2 hardened | develop |
| 2026-10-31 |  | QA gate FAIL (70/100) — 2 findings (1 high: A fails on Node 22) | qa-task |
| 2026-10-31 |  | QA findings fixed — TASK-234-QA-1 (Node 22 teardown), QA-2 (D positive controls), 1 iteration | qa-fix |
| 2026-10-31 |  | QA gate FAIL (70/100) — 4 findings (1 high: a group-killed probe orphans its case) | qa-task |
| 2026-10-31 |  | QA findings fixed — TASK-234-QA-3 (case leash), QA-4 (root lstat), QA-5 (EPERM), QA-6 (B control), 1 iteration | qa-fix |
| 2026-10-31 |  | QA gate CONCERNS (80/100) — 2 medium findings in the leash (argv0, leash env) | qa-task |
| 2026-10-31 |  | QA findings fixed — TASK-234-QA-7 (case keeps its argv0), QA-8 (leash shell under a fixed env), 1 iteration | qa-fix |
| 2026-10-31 |  | QA gate CONCERNS (90/100) — 1 medium finding (leash PATH drops the host PATH) | qa-task |
| 2026-10-31 |  | QA findings fixed — TASK-234-QA-9 (leash PATH is the probe's own), 1 iteration | qa-fix |
| 2026-10-31 |  | QA gate CONCERNS (90/100) — 1 medium follow-up (relative PATH entries reach the leash shell); QA budget exhausted | qa-task |
| 2026-10-31 |  | QA findings fixed — TASK-234-QA-10 (leash PATH keeps absolute entries only), 1 iteration; one QA cycle granted | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Teardown past PATH_MAX
- [x] Red tests (A, B)
- [x] Permission restore replaced
- [x] Mutation proof

### Phase 2: QA2-1 test hardening
- [x] `TMPDIR` assertion, `t.skip`
- [x] Mutation proof

### Phase 3: Process-group reap
- [x] Spawn sites confirmed
- [x] Red tests (D)
- [x] Group kill
- [x] Mutation proof

### Phase 4: Docs and validation
- [x] Rule doc, bundle, CHANGELOG, `npm run ci`

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
