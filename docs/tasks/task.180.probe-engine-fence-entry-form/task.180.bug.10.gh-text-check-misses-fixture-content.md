# Bug Report: Task 180 - the fence: gh text check misses what a case's fixture runs

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-10
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (QA cycle 6 safety re-probe, code review CR-1 / TASK-180-017)
**Date Found**: 2026-10-12

## Description

The cycle-5 fix runs the `gh` text check over the extracted block and the case inputs. A case's `fixture.files` contents and `fixture.env` values also run: a fixture script reached through `BASH_ENV`, or a block's own `source ./x.sh` resolved against the case directory. Neither is in the checked text, and the block's sourced paths are resolved from the doc's directory, not the case directory.

## Steps to Reproduce

Block `X='<slot>'` + a `case` guard. Legitimate case with `fixture: {env: {BASH_ENV: "./init.sh"}, files: {"init.sh": "p=$(type -ap gh | tail -1); \"$p\" --version"}}`. No `--fake-gh`.

## Expected Behavior

Declined `needs-fake-gh` before anything runs.

## Actual Behavior

Not declined; the cases run, and `type -ap gh` resolves the host binary (`~/.local/bin/gh`). Reproduced on 243bc237.

## Recommendation

Enumerating more text into the check repeats the cycle-5 shape. Prefer one structural fix: build each case's `PATH` without any directory that holds a `gh` executable, so `type -ap gh` and `command -v gh` find only the trip-wire, whatever the text. An absolute path stays the stated limit. Otherwise, decline any `fence:` case that carries a fixture unless `--fake-gh` is given.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 6

**Root cause**: the cycle-5 fix enumerated the text that would run, and under `fence:` everything a case carries can run.

**Fix (structural, replacing the enumeration as the guarantee)**: `ghFreePath` replaces every absolute `PATH` directory that holds an executable `gh` with a copy of it without `gh`, a directory of symlinks under the harness dir, built once and reused. `runFenceCase` applies it to each case's final `PATH` (`fixture.env`'s `PATH` included) before the trip-wire or `--fake-gh` goes first. A lookup from the block, an input or a fixture script finds only the stub. The text check stays as the fast path. An absolute path, and a `PATH` the block prepends itself, remain the stated limits.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`.

**Testing**: New tests: `ghFreePath` unit (directory with gh copied without it; others and relative entries kept; copy reused); a fence run with a stand-in host `gh` first on the inherited `PATH` and a `BASH_ENV` fixture that runs every `type -ap gh` hit — the stand-in never runs, and the run is declined `needs-fake-gh`. Mutations (guard not applied; copy keeps gh) each red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 6 — reproduced on 243bc237 |
| 2026-10-12 | Ready for QA | qa-fix      | Structural PATH guard; mutation-proven |
| 2026-10-12 | Closed       | QA Engineer | QA cycle 7 — verified on cba2750b |
