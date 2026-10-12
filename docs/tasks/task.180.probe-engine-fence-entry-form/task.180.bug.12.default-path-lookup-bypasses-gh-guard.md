# Bug Report: Task 180 - a default-path lookup (command -p gh, env -u PATH gh) bypasses the gh PATH guard

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 7 safety re-probe, code review CR-1 / TASK-180-019)
**Date Found**: 2026-10-12

## Description

`ghFreePath` rewrites `$PATH`. `command -p gh`, and `env -u PATH gh` / `env -i gh`, look `gh` up in the default path (`/bin:/usr/bin`) and skip both the shadowed PATH and the trip-wire. The `gh` text check catches these spellings in the block and inputs. It does not catch them in a fixture script, the `BASH_ENV` channel of TASK-180-017. On a host whose `gh` is `/usr/bin/gh` (GitHub-hosted Ubuntu runners, Arch `github-cli`), the real binary runs and the case is scored. The docs claim no lookup reaches the host `gh`.

## Steps to Reproduce

The cycle-6 `BASH_ENV` fixture test with `init.sh` = `env -u PATH gh --version`, on a host with `/usr/bin/gh`. This host has no `/usr/bin/gh`. The mechanism was confirmed with `ls`: `command -p -v ls` → `/bin/ls` under `PATH=/nonexistent`.

## Expected Behavior

Declined `needs-fake-gh`, or the limit stated.

## Recommendation

Add the fixture's `env` values and `files` contents to the `gh` text check, and state the default-path lookup as a limit beside the absolute path.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 7

**Fix**: the `gh` text check now also reads every case's `fixture.env` values and `fixture.files` contents, so `command -p gh` / `env -u PATH gh` written in a fixture script is declined `needs-fake-gh` before anything runs. The default-path lookup is named as a stated limit (engine header, `ghFreePath` doc comment, `probe-boundary-rule.md` §5) for a spelling no checked text writes out. Also CR-2 (advisory): `ghFreePath` resolves a relative PATH entry against the case directory before the `gh` test.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`.

**Testing**: New test: three fixtures (`env -u PATH gh`, `command -p gh`, a `PROMPT_COMMAND` env value) each declined with no case run. `ghFreePath` unit gains the relative-entry pair. Mutations (fixtures not checked; relative entries not resolved) each red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 7 — mechanism confirmed on cba2750b |
| 2026-10-12 | Ready for QA | qa-fix      | Fixture text checked; limit stated; mutation-proven |
