# Bug Report: Task 51 - Tier-2 lint grades valid YAML as malformed, hard-halting on pyyaml-less hosts

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-2
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-17

## Description

The tier-2 structural lint in `shared/resources/read-config.sh:84-100` accepts a non-indented line
only if it matches `/^[A-Za-z_][A-Za-z0-9_.-]*:/`. Several **legal** YAML shapes fail that test:

- a root-level block sequence (`devLoadAlwaysFiles:` then `- docs/a.md` at column 0)
- a quoted key (`"my key": 1`)
- a key containing `/` or a space (`paths/root: x`)

Any of these is graded `malformed`. When the file also has an `access:` block, the fail-closed
branch fires and the resolver **hard-halts** — on any host without python+pyyaml, i.e. exactly the
hosts where the awk tier is the only tier.

The outcome therefore depends on whether the machine has pyyaml: the same file resolves cleanly on
one developer's laptop and bricks the pipeline on another's.

## Steps to Reproduce

```bash
printf 'access:\n  tracker: manual\ndevLoadAlwaysFiles:\n- docs/a.md\n' > skills-config.yaml
python3 -c "import yaml;print(yaml.safe_load(open('skills-config.yaml')))"   # parses fine
AGENT_SKILLS_CONFIG_TIER=python bash -c 'source read-config.sh; config_file_status'  # ok
AGENT_SKILLS_CONFIG_TIER=awk    bash -c 'source read-config.sh; config_file_status'  # malformed
AGENT_SKILLS_CONFIG_TIER=awk    bash -c 'source resolve-platform.sh; echo $?'        # 1
```

## Expected Behavior

Valid YAML resolves identically under both tiers.

## Actual Behavior

`python → ok`, `awk → malformed`, resolver exits 1 with *"access is configured but unreadable"* on a
file that is not, in fact, unreadable.

## Impact

A legitimate config brings down every guarded call site on half the fleet. The lint was written to
make the fail-closed branch work on awk-only hosts; instead it manufactures false positives.

## Recommendation

The lint is explicitly "not a parser", so it should only reject shapes that are unambiguously broken.
Narrow it to the leading-`:` rule it was built for, and accept root-level sequence entries
(`^- ` / `^-$`) and quoted/odd keys. Add the three shapes above as fixtures. Then reconsider whether
a heuristic should be authoritative enough to halt at all — an alternative is to treat
`unverified + access:` as a warning and only halt on the leading-`:` shape.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress) — 2026-08-17

The lint required every non-indented line to match `/^[A-Za-z_][A-Za-z0-9_.-]*:/`. That is a
description of *most* YAML keys, not of valid YAML, so it rejected root-level sequences, quoted
keys, and keys containing `/`, spaces or a leading digit.

#### Fix Implementation (In Progress → Ready for QA) — 2026-08-17

Narrowed the lint to the one shape it can actually prove invalid: a line whose first non-space
character is `:`. The "must look like a key" catch-all is gone. Block-scalar tracking stays, so a
free-form body is still never graded as YAML.

The principle now written into the comment: *a heuristic that is not a parser must not invent
malformation it cannot prove.* Failing closed is right for a file we know is broken; it is not a
licence to guess.

**Files**: `shared/resources/read-config.sh`, `shared/resources/tracker-access.test.sh`

**Testing**: new §14 asserts four legal shapes (root sequence, quoted key, slash key, digit key)
resolve cleanly under the awk tier with an `access:` block present, and that a genuinely broken file
still fails closed under both tiers.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-17 | In Progress | qa-fix | Investigation started |
| 2026-08-17 | Ready for QA | qa-fix | Fix implemented, covered by new assertions |
