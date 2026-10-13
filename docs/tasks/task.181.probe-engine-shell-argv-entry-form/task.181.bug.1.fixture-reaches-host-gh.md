# Bug Report: Task 181 - a shell-argv: case fixture reaches the host gh

**Task**: [task.181.probe-engine-shell-argv-entry-form.md](./task.181.probe-engine-shell-argv-entry-form.md)
**Bug ID**: TASK-181-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-1 / TASK-181-001)
**Date Found**: 2026-10-12

## Description

`runShellArgvCase` honours a case's `fixture` (`env`, `files`) — the task says "exactly as `fence:` honours it" — but takes neither of the two `gh` hardenings `fence:` applies to those same strings: the pre-spawn `namesGh` text check over `fixture.env` values and `fixture.files` contents (TASK-180-019, gated on `isFenceForm` at `security-probe.mjs:1342`), and `ghFreePath`, which shadows every PATH directory holding the host `gh`. A fixture file sourced through `BASH_ENV` that resolves `gh` to a path (`type -ap gh`) runs the host binary — host PATH, host keychain — and the run is scored.

## Steps to Reproduce

`runProbeSpec({ entry: "shell-argv:plain.sh", argv: ["{input}"], cases: [{ …, fixture: { env: { BASH_ENV: "./helper.sh" }, files: { "helper.sh": "for p in $(type -ap gh); do case $p in *probe-harness*) ;; *) \"$p\" --version > ghran.txt; break;; esac; done" } }, expected: { exit: 0, absent: ["ghran.txt"] } }] })` where `plain.sh` never names `gh`.

## Expected Behavior

Declined `needs-fake-gh` before anything spawns, as `fence:` declines the same fixture.

## Actual Behavior

`verdict: absent`, `reproduced: ["cr1@bash"]`, detail `ghran.txt was created` — the host `gh` ran.

## Impact

A probe run can reach the network and the operator's `gh` credentials through a case fixture, which the engine's `gh` guard exists to prevent. The task's own claim of `fence:` parity is false for this path.

## Recommendation

Extend the `fence:` arm's fixture-string `namesGh` check to `shell-argv:` (its entry, setup, case inputs are argv data — but fixture env values and file contents can run), and apply `ghFreePath` to the shell-argv: PATH as `runFenceCase` does. Add a test with this fixture, mutation-proven.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 1

**Root Cause**: `runShellArgvCase` reused `fence:`'s fixture writer but not its two `gh` guards; the pre-spawn text check in `runProbeSpec` was gated on `isFenceForm` only, and the arm never called `ghFreePath`.

**Fix**: `runProbeSpec` runs the fixture-string `namesGh` check for `shell-argv:` over each case's `fixture.env` values and `fixture.files` contents (not the input, which is argv data) and declines `needs-fake-gh`; `runShellArgvCase` shadows every PATH directory holding a `gh` with `ghFreePath` before the trip-wire or fake goes first.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`; the `gh` statements in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, the engine header, `CHANGELOG.md` and the task document.

**Testing**: Two new tests with a planted fake `gh` on PATH (deterministic with or without a host `gh`): a fixture that names `gh` (BASH_ENV helper; an env value) is declined `needs-fake-gh` with nothing executed; a fixture that spells it `${G}h` finds no host `gh`. Mutations — text check off; `ghFreePath` off — each turn one of them red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-12 | New | qa-task | Found in QA cycle 1 (CR-1, reproduced) |
| 2026-10-12 | Ready for QA | qa-fix | Fix iteration 1 |
| 2026-10-13 | Closed | qa-task | Verified by task.181.qa.2.probe-engine-shell-argv-entry-form.md |
