# Bug Report: Task 209 - an unknown --link-agents id stops the full wizard after it has written files

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-10-14

## Description

The cycle-1 fix for TASK-209-BUG-1 made `link_agents` return 1 on an unknown id
(`scripts/setup-consumer.sh:2030`). In the full wizard that stops the run under `set -e` at step 8b,
after steps 1–8 have written config, registries and skills, so `install_hooks` never runs. The summary
then still advises checking `settings.json` for the hooks. The ids are only checked once the run is
half done.

## Expected Behavior

An unknown id is refused when the flags are parsed, before any step writes, and the run exits 1 with
nothing changed.

## Actual Behavior

The full wizard writes steps 1–8, stops before the hooks, and prints success-style advice.

## Recommendation

Validate `--link-agents` against `AGENT_TABLE` in flag parsing and exit 1 there.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-14

**Root Cause**: validation lived inside link_agents, which runs at step 8b, after steps 1-8 have written.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-14

**Fix Description**:

- New `_check_link_agents` validates `--link-agents` against `AGENT_TABLE`; `main()` calls it first,
  before the banner and before any step. Nothing is recorded yet, so `_on_exit` exits 1 without a
  summary and the project is untouched.
- The check inside `link_agents` stays as a backstop and is now unreachable for an unknown id.

**Files Modified**: `scripts/setup-consumer.sh`, `shared/resources/tests/setup-consumer-agent-links.test.mjs`

**Testing**: `an unknown id stops the FULL wizard before any step writes`: no `--links-only`; exit non-zero,
  no step runs, `git status` unchanged. Removing the up-front call turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 2 refute pass, CR-1 — introduced by the cycle-1 fix |
| 2026-10-14 | In Progress | qa-fix | Root cause found |
| 2026-10-14 | Ready for QA | qa-fix | Unknown ids are checked before any step runs |
