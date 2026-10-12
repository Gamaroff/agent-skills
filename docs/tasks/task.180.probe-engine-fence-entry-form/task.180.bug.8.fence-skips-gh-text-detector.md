# Bug Report: Task 180 - the fence: form skips the pre-spawn gh text check, so a path-resolved gh runs the host binary

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-8
**Severity**: HIGH
**Priority**: P1
**Status**: New
**Found By**: QA Engineer (QA cycle 5 safety re-probe, code review CR-1 / TASK-180-015)
**Date Found**: 2026-10-12

## Description

Every shell form runs the `namesGh` text check before it spawns and declines `needs-fake-gh` when the script names `gh`. The `fence:` form skips that check (`security-probe.mjs:1199`; the comment says it would read the whole document) and relies on the PATH trip-wire alone. The trip-wire answers only a PATH-resolved `gh`. A block that resolves `gh` to a path (`type -ap gh`, `command -v gh`, an absolute path) runs the host binary, with the host keychain, and the run is scored.

## Steps to Reproduce

A `fence:` block `X="<slot>"`, then `real=$(type -ap gh | tail -1); "$real" --version`, then a guard. Run without `--fake-gh`.

## Expected Behavior

Declined `needs-fake-gh`, nothing scored, as the shell forms decline a script that names `gh`.

## Actual Behavior

The host `gh` runs (reproduced on f21c0552: `ran-real-gh` on stdout). `fakeGh` is null, and the run is scored.

## Impact

A probe of a guard block can run the real `gh` against the host's credentials. Measured plausibility: no shipped `SKILL.md` or `shared/resources/*.md` resolves `gh` to a path today (`git grep -E '(command -v|type -a?p|which) gh'` → 0 hits). The reviewer's severity (high) is kept.

## Recommendation

When `fakeGhDir` is null, run `GH_COMMAND_WORD` / `GH_VARIABLE` over the extracted block text (not the whole document) and decline `needs-fake-gh` on a match. Add a regression test with the `type -ap gh` block.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New    | QA Engineer | QA cycle 5 — reproduced on f21c0552 |
