# Bug Report: Task 241 - Guarding the bare key `enforce` refuses unrelated consumer configs

**Task**: [Link](./task.241.finalise-changelog-checks-opt-in.md)
**Bug ID**: TASK-241-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-3, confirmed as a regression against `origin/develop`)
**Date Found**: 2026-10-28

## Description

To satisfy `tracker-access.test.sh` § 44, the task added `changelog|enforce` to
`_CONFIG_GUARDED_KEYS` in `shared/resources/read-config.sh`. The subset scan applies its local rules
(refuse a quoted key, `key :` spacing, and so on) to **every** line whose key name is in that list,
whatever block the line sits under. `enforce` is a generic leaf name. A consumer whose config has a
quoted `"enforce":` under some unrelated block now has the whole file refused on the awk tier. Every
reader then returns `__UNSUPPORTED__`, including `tracker`, `vcs` and `access`, for keys this change
never meant to touch.

## Steps to Reproduce

```bash
printf 'tracker: github\nother:\n  "enforce": 1\n' > skills-config.yaml
git show origin/develop:shared/resources/read-config.sh > /tmp/base-read-config.sh
AGENT_SKILLS_CONFIG_TIER=awk bash -c 'source /tmp/base-read-config.sh && read_config_key tracker'          # github
AGENT_SKILLS_CONFIG_TIER=awk bash -c 'source shared/resources/read-config.sh && read_config_key tracker'   # __UNSUPPORTED__
```

With pyyaml present (tier 1), the same file still reads `github`, so the regression shows only where
pyyaml is absent.

## Expected Behavior

Guarding `changelog.enforce` does not change how any other key is read.

## Actual Behavior

A config that `origin/develop` reads correctly is refused outright on the awk tier, and every skill that
sources `resolve-platform.sh` halts there.

## Impact

- Narrow trigger: no pyyaml, plus a quoted key named `enforce` anywhere in the file.
- Wide effect: tracker and VCS resolution fails for every skill in that repository.
- The reviewer rated this `low`. QA raised it to `medium` because it is a confirmed regression against
  the base.

## Recommendation

Scope the local rules for `enforce` to lines under the `changelog:` parent. One way is to guard
`parent.child` pairs rather than bare leaf names. Another is to rename the key to something unlikely
to collide. Then add the reproduction above as a regression test that compares against a
non-`changelog` parent.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: the subset scan's LOCAL rules test `consumed(name)`, which matches a bare name at any
depth. `enforce`, and `changelog` too, are generic enough to collide with a consumer's unrelated
blocks.

#### Fix Implementation (In Progress → Ready for QA)

**Fix description**: `read-config.sh` adds `_CONFIG_GUARDED_SCOPES='changelog:-,enforce:changelog'`.
- The awk scan tracks the top-level key each line sits under.
- `consumed()` counts a scoped name only at its own position: `changelog` at the top level,
  `enforce` only under `changelog:`.
- Unscoped keys behave exactly as before.
- Both names stay in `_CONFIG_GUARDED_KEYS`, so the § 44 pin and duplicate detection are unchanged.
- The subset table in `platform-detection.md` now cites the list instead of restating a stale copy
  of it, which predated this task and was missing four keys.

**Files modified**: `shared/resources/read-config.sh` (and its 49 bundled copies),
`shared/resources/platform-detection.md`, `shared/resources/tests/changelog-enforce.test.mjs`.

**Testing**: 6 new awk-tier cases, both directions.
- Should stay readable (`tracker` → `github`): `"enforce":` and `enforce :` under another block, and
  `"changelog":` nested elsewhere.
- Should be refused (→ `__UNSUPPORTED__`): `"enforce":` and `enforce :` under `changelog:`, and a
  quoted top-level `"changelog":`.

**Mutation proof**: emptying `_CONFIG_GUARDED_SCOPES` turned 3 red: the three readable-direction
cases.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 1 (`task.241.qa.1.finalise-changelog-checks-opt-in.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA fix cycle 1) |
| 2026-10-28 | Ready for QA | qa-fix | Guard scoped to changelog.enforce; both directions tested |
| 2026-10-28 | Closed | qa-task | Verified by task.241.qa.2.finalise-changelog-checks-opt-in.md |
