# Bug Report: Task 120 - Healing a duplicate spelling removes the whole matcher group, including a consumer's unrelated hook

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Bug ID**: TASK-120-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle-2 refute pass)
**Date Found**: 2026-09-16

## Description

`unpatch_hook_exact` removes every **matcher group** in which *any* `hooks[].command` equals the target: `map(select(any(.hooks[]?; .command == $cmd) | not))`. That was latent — the retired candidate loop only ever pointed it at the bare-relative legacy form. `heal_hook` now routes every non-canonical spelling of our hooks through it, so a hand-edited group of the shape `{matcher: "*", hooks: [<duplicate spelling>, <consumer's own hook>]}` loses the consumer's hook along with ours. Reproduced: a PreCompact group holding the `.claude/skills/…` spelling and `echo consumer-hook-keep-me` → after the installer, only the canonical entry remains; the consumer's hook is gone. Scenario 2's byte-identical assertion did not catch it because its unrelated hook sits in its own group.

## Steps to Reproduce

1. `settings.json` with one PreCompact group whose `hooks[]` holds the `.claude/skills/develop-story/scripts/on-precompact.sh` spelling and a second, unrelated command.
2. Run the installer.
3. `jq '[.hooks.PreCompact[].hooks[].command]'` — the unrelated command is absent.

## Expected Behavior

Only the matching `hooks[]` element is removed; the group is dropped only when its `hooks[]` becomes empty. The strip list's promise — "a consumer's unrelated hook is never touched" — must hold inside a shared group as well as across groups.

## Actual Behavior

The whole group is removed.

## Impact

Silent deletion of a consumer's hook on any re-run of the installer or wizard against a hand-edited settings file. No error, no diff shown outside `--dry-run`.

## Recommendation

Change `unpatch_hook_exact` (and the wizard's `_unpatch_hook_exact`) to `map(.hooks |= map(select(.command != $cmd))) | map(select(.hooks | length > 0))` (prune the event key when empty, as now); add a scenario with the shared-group fixture asserting the consumer's hook survives. `unpatch_hook` (regex, PostToolUse migration) has the same shape — apply the same element-level removal there for consistency.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-16
**Developer**: qa-fix (develop-task pipeline, cycle 2)

**Root Cause**: Both `unpatch_hook_exact` and `unpatch_hook` filtered at the matcher-group level — `map(select(any(.hooks[]?; …) | not))` — so a group was dropped whenever any hook in it matched. Latent while only the legacy loop called it; `heal_hook` made it reachable for every duplicate spelling.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-16

**Fix Description**:
- `unpatch_hook_exact` and `unpatch_hook` (installer) and `_unpatch_hook_exact` / `_unpatch_hook` (wizard): `map(.hooks |= map(select(<not matching>))) | map(select((.hooks|length) > 0))` — remove the matching element, drop a group only when it empties, drop the event key only when no group remains. The `present` pre-check counts elements, not groups.

**Files Modified**:
- `shared/resources/develop-pipeline-install-hooks.sh`
- `scripts/setup-consumer.sh`
- `shared/resources/develop-pipeline-install-hooks.test.sh` — Scenario 7

**Testing**:
- Scenario 7: a PreCompact group holding our `.claude/skills/…` spelling plus `echo consumer-hook-keep-me`, and a PostToolUse group holding `on-skill-return.sh` plus `echo consumer-post-tool-use-keep-me` → both consumer hooks survive, both of ours are removed. 9/9.
- mutation-proven: exact removal reverted to group-level → scenario 7 red; regex removal reverted to group-level → scenario 7 red (PostToolUse assertion) → **covered** ×2

**Verification Steps for QA**:
1. Re-run the reproduction from the Description: `echo consumer-hook-keep-me` survives.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-16 | New | QA Engineer | Filed from QA cycle 2 refute pass |
| 2026-09-16 | In Progress | qa-fix | Investigation — group-level jq filter |
| 2026-09-16 | Ready for QA | qa-fix | Element-level removal in all four helpers; scenario 7 |
