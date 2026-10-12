# Bug Report: Task 180 - the fence: gh text check misses what a case's fixture runs

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-10
**Severity**: HIGH
**Priority**: P1
**Status**: New
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

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New    | QA Engineer | QA cycle 6 — reproduced on 243bc237 |
