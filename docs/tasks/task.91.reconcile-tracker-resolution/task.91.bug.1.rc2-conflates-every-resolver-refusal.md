# Bug Report: Task 91 - rc 2 conflates every resolver refusal with a bad `tracker:` value

**Task**: [Link](./task.91.reconcile-tracker-resolution.md)
**Bug ID**: TASK-91-BUG-1
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-05

## Description

`_resolve_install_tracker` maps **any** non-zero return from `resolve-platform.sh` to rc 2, which both
call sites report as *"skills-config.yaml declares a tracker the resolver refuses"* followed by
*"Fix the 'tracker:' key (legal values: jira, github, auto)"* — and then abort the install.

But the resolver returns non-zero from at least five places that have nothing to do with `tracker:`:

- `access.vcs` not `full` (`resolve-platform.sh:500`)
- `validate_access_mode` rejecting `access.tracker`
- the `access:`-as-a-scalar guard (`:487`)
- an unreadable `SKILLS_CONFIG_FILE` redirect (`:200`)
- the fail-closed unparseable-with-access branch (`:407`)

## Steps to Reproduce

```bash
d=$(mktemp -d); printf 'tracker: github\n' > "$d/skills-config.yaml"; cd "$d"
env -u JIRA_URL -u SKILLS_CONFIG_FILE -u TRACKER \
    AGENT_SKILLS_ACCESS_VCS=read-only SETUP_CONSUMER_NO_MAIN=1 \
  bash -c "source /path/to/scripts/setup-consumer.sh >/dev/null 2>&1
           rc=0; v=\$(_resolve_install_tracker 2>/dev/null) || rc=\$?
           echo \"rc=\$rc value='\$v'\""
```

## Expected Behavior

A `tracker: github` config is valid. The install proceeds, or — if the run genuinely cannot continue —
it fails naming `access.vcs`, the key actually at fault.

## Actual Behavior

`rc=2 value=''`. The installer aborts and tells the operator to fix `tracker:`, which is already
correct. Confirmed: the resolver's own stderr says
`❌ access.vcs: "read-only" is accepted as a key but not supported as a value.`

## Impact

**This is an install-blocking regression, not a cosmetic one.** Before this change the installer never
sourced the resolver, so a repo with a restricted `access.*` — or an operator running with the
documented `AGENT_SKILLS_ACCESS_*` env vars set for a locked-down run — installed normally. It now
cannot install at all, and the diagnosis points at the wrong key. The operator's most likely next
action (editing a `tracker:` key that is already valid) cannot fix it.

## Recommendation

Reserve rc 2 for a genuine **tracker** rejection. Have the subshell report the resolved tracker and the
status separately so the caller can tell "this config's `tracker:` is illegal" from "this config is
unusable for some other reason". At minimum, drop the "Fix the 'tracker:' key" line so the message
cannot contradict the stderr immediately above it.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-05

**Root Cause**: `_resolve_install_tracker` ran the resolver as
`source "$1" || exit 1` and mapped *any* non-zero status onto rc 2. The exit status alone cannot say
*which* key was refused, so every refusal became a tracker error.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: The subshell now prints the resolver's **exit status and its `TRACKER` together**,
and `TRACKER` is printed even when the status is non-zero. Identity is resolved *before* access in
`resolve-platform.sh`, so the discriminator falls out of the resolver's own semantics:

| rc | `TRACKER` | Meaning | Installer |
|---|---|---|---|
| 0 | any | resolved normally | proceed |
| ≠0 | `jira` / `github` | refusal was about some **other** key | proceed, warn on stderr |
| ≠0 | anything else | `tracker:` itself rejected, or nothing resolved | rc 2, halt |

No string matching against the resolver's messages — that would break the first time anyone reworded
one. The "Fix the `tracker:` key" line was removed from both call sites so a message can no longer
contradict the stderr it points at.

**Files Modified**: `scripts/setup-consumer.sh`

**Testing**: `a non-tracker refusal does not block the install and does not blame ``tracker:```, paired
with `an illegal ``tracker:`` is still refused even when nothing else is wrong` — the pair matters,
because a fix for the first alone could pass by accepting everything.

**Mutation-proven**: yes — making the legal-tracker branch unreachable turns exactly that one test red.
