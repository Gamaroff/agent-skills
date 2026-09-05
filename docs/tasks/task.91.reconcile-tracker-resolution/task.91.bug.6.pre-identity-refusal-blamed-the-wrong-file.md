# Bug Report: Task 91 - a pre-identity refusal was documented as covered, and blamed the wrong file

**Task**: [Link](./task.91.reconcile-tracker-resolution.md)
**Bug ID**: TASK-91-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-09-05

## Description

The comment on `_resolve_install_tracker` claimed its discriminator ("rc≠0 but `TRACKER` is legal →
proceed") covered five non-tracker refusal paths, naming an unreadable `SKILLS_CONFIG_FILE` redirect and
the fail-closed unparseable branch among them.

**It covers neither.** `resolve-platform.sh` `unset`s `TRACKER` at line 186 and does not assign it until
line 429. Every refusal *before* that point leaves `TRACKER` empty, so the branch cannot fire.

## Steps to Reproduce

```bash
d=$(mktemp -d); printf 'tracker: github\n' > "$d/skills-config.yaml"; cd "$d"
env SKILLS_CONFIG_FILE=/tmp/nope.yaml SETUP_CONSUMER_NO_MAIN=1 \
  bash -c 'source /path/to/setup-consumer.sh >/dev/null 2>&1
           rc=0; v=$(_resolve_install_tracker 2>&1) || rc=$?; echo "rc=$rc"'
```

## Expected Behavior

Halting is correct — the resolver could not read a config at all, so every skill would refuse at run
time too. But the message must not blame `skills-config.yaml`, and the code comment must not claim a
coverage it does not have.

## Actual Behavior

`rc=2`, and the installer printed *"No usable tracker could be resolved from skills-config.yaml"* — a
file that is present and perfectly valid. The real complaint was about `/tmp/nope.yaml`.

## Impact

Documentation that is confidently wrong about its own failure surface is worse than none: it tells the
next reader the case is handled. Combined with an error naming the wrong file, an operator is sent to
edit a config that has nothing wrong with it.

## Recommendation

Split the comment into COVERED and NOT COVERED lists, naming the specific refusals in each. Make the
rc-2 message say "see the resolver's message above" and name no file of its own, adding that it may name
a file other than `skills-config.yaml`.

---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-05

**Fix Description**: the enumeration comment now lists COVERED (`vcs:` enum, `access:`-as-scalar,
`resolve_access`/`validate_access_mode`, `access.vcs != full`) and NOT COVERED (the
`SKILLS_CONFIG_FILE` redirect, the poisoned-value halt, the exists-but-unreadable halt, the fail-closed
unparseable+access halt, the tier-2 subset refusal) separately, and states why the second group cannot
be covered. Both rc-2 messages stop naming `skills-config.yaml`.

**Files Modified**: `scripts/setup-consumer.sh`

**Testing**: `a refusal that happens BEFORE identity is resolved still stops the install` — the case no
test reached.
