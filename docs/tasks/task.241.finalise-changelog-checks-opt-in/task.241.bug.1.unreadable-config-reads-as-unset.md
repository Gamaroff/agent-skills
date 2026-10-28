# Bug Report: Task 241 - An unreadable config resolves to a silent `off`

**Task**: [Link](./task.241.finalise-changelog-checks-opt-in.md)
**Bug ID**: TASK-241-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-1, confirmed by reproduction)
**Date Found**: 2026-10-28

## Description

`changelog-enforce.sh` reads the key with the non-strict `read_nested_config_key`. That reader returns
empty in two different cases:
- the key is not set
- the reader could not read the file at all, because the tier-2 subset scan refused it (an anchor, an
  alias, or a quoted key anywhere in the file)

The resolver handles empty as the quiet default, `off`, so both cases report the same value. In a
repository that sets `changelog.enforce: true`, as this one does, any out-of-subset construct anywhere
in `skills-config.yaml`, on a host without pyyaml, turns the 6d HALT off. Nothing is printed. The
resolver's own header says an unexpected value is reported, not silent.

## Steps to Reproduce

```bash
printf 'defaults: &d\n  x: 1\nchangelog:\n  enforce: true\n' > skills-config.yaml
AGENT_SKILLS_CONFIG_TIER=awk bash shared/resources/changelog-enforce.sh            # off, no stderr
AGENT_SKILLS_CONFIG_TIER=awk bash -c 'source shared/resources/read-config.sh && read_nested_config_key_strict changelog enforce'   # __UNSUPPORTED__
```

## Expected Behavior

"Could not read the configuration" is distinguishable from "the key is not set". At minimum, it prints
one stderr line naming the cause.

## Actual Behavior

`off` with no output, which is identical to a project that never opted in.

## Impact

An opted-in repository can silently lose the 6d `no-changelog-entry` guard. That only happens on a
host without pyyaml, and only when the config holds a construct outside the subset.

## Recommendation

Read the key with `read_nested_config_key_strict`. Handle `__UNSUPPORTED__`, `__UNREADABLE__` and
`__MAP__` apart from an empty value, each with a stderr line naming it. Decide whether an unreadable
existing config should fail closed. Add a test case for an anchor elsewhere in the file, forced to the
awk tier.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root cause**: `changelog-enforce.sh:33` called `read_nested_config_key`, whose contract maps every
"could not read" sentinel to `""` so that path roots keep their safe defaults. The resolver then read
`""` as "not set".

#### Fix Implementation (In Progress → Ready for QA)

**Fix description**: the resolver reads with `read_nested_config_key_strict`.
- `__UNSUPPORTED__` / `__UNREADABLE__` print one stderr line naming the sentinel and the config file.
- `__MAP__` prints one line saying the key holds a mapping.
- The answer stays `off`. The checks are opt-in, so a config the reader cannot read has not opted in
  as far as it can tell; failing closed would put changelog checks on consumers, which is the outcome
  the task removes. This follows the resolver's existing rule for an unrecognised value.

The same edit closes PROBE-1: a block scalar (`|` / `>`) on the awk tier now says it is a block
scalar. The header's "same answer under every tier" is scoped to single-line values.

**Files modified**:
- `shared/resources/changelog-enforce.sh`
- `shared/resources/tests/changelog-enforce.test.mjs`, with 5 new cases: anchor elsewhere [awk] →
  off naming `__UNSUPPORTED__`; the same config [python] → on; mapping ×2 tiers; block scalar [awk].

**Mutation proof**: switching back to the plain reader turned 3 tests red.

**Verification steps for QA**: run the Steps to Reproduce above. Expect `off` plus a stderr line
naming `__UNSUPPORTED__`.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 1 (`task.241.qa.1.finalise-changelog-checks-opt-in.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA fix cycle 1) |
| 2026-10-28 | Ready for QA | qa-fix | Strict reader; each sentinel named on stderr |
