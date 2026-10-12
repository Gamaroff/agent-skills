# Bug Report: Task 180 - the fence: form skips the pre-spawn gh text check, so a path-resolved gh runs the host binary

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-8
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
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

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 5

**Root cause**: the `fence:` arm skipped `namesGh` because it reads a whole file, and the doc is not the script. The PATH trip-wire then answered only a PATH-resolved `gh`.

**Fix**: `namesGh` takes an optional `text` in place of the file. With no `--fake-gh`, `runProbeSpec` runs it over the extracted block plus every case's input (the slot is source), after the cases are resolved and before anything spawns, and declines `needs-fake-gh`. A `source` in the block still resolves from the doc's directory.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`.

**Testing**: New test: a `type -ap gh` block, and a plain block with a `$(gh --version)` input, are each declined with no case run; a block and input that only contain the letters (`ghost/bin/gh`) are scored (`engages`). Mutations (check removed; inputs not checked) each red — the second only after the test asserted no case ran, since the run-time trip-wire also declines a PATH-resolved `gh`.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 5 — reproduced on f21c0552 |
| 2026-10-12 | Ready for QA | qa-fix      | gh text check over the extracted block and inputs; mutation-proven |
