# Bug Report: Task 51 - Resolver returns 1 on every config under zsh

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-1
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-17

## Description

`shared/resources/resolve-platform.sh:94` uses `env_val="${!env_name:-}"`, a **bash-only** indirect
expansion. zsh raises `bad substitution`, `resolve_access` returns non-zero, and line 149's
`|| return 1` fires — so the resolver fails on **every** config, valid or not.

This is a regression: the same file on `develop` returns 0 under zsh.

It matters more than a shell-portability nit for two reasons, both created by this task:

1. The file adds a zsh fallback for `BASH_SOURCE` six lines earlier (L47-53, *"macOS logins are
   zsh"*), so zsh is a **claimed** host that the file then fails on.
2. The `|| exit 1` guards this task added convert the failure from a printed message into a **hard
   exit at all guarded call sites**.

The Bash tool in this environment runs `/bin/zsh` (`SHELL=/bin/zsh`, `ZSH_VERSION=5.9`), which is
how skills execute their shell blocks. This is the primary execution path, not an edge case.

## Steps to Reproduce

```bash
mkdir /tmp/z && cd /tmp/z && git init -q && git remote add origin https://github.com/a/b.git
printf 'tracker: jira\n' > skills-config.yaml
zsh -c 'source /path/to/shared/resources/resolve-platform.sh; echo "rc=$? T=$TRACKER AT=$ACCESS_TRACKER"'
```

## Expected Behavior

`rc=0 T=jira AT=full` — identical to bash, and identical to the pre-task resolver.

## Actual Behavior

```
resolve_access:4: bad substitution
rc=1 T=jira AT=
```

A real bundled call site, run the way the Bash tool runs it:

```
❌ CALL SITE EXITED — rc=1
```

## Impact

Every guarded call site aborts on macOS with a legal configuration. Directly falsifies Success
Criterion 7 ("byte-identical to today").

## Recommendation

Replace with a portable indirect read — validated in both shells:

```bash
eval "env_val=\${$env_name:-}"
```

`env_name` is derived from the literals `tracker`/`vcs`, so there is no injection surface. Add zsh
coverage to `tracker-access.test.sh` (see TASK-51-BUG-5) — every `run_case` currently goes through
`bash -c`, which is structurally why 61 green assertions missed this.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress) — 2026-08-17

`${!env_name:-}` is bash's indirect expansion. zsh has no such form (its equivalent is `${(P)name}`),
so it raises `bad substitution`, `resolve_access` returns non-zero, and the caller's `|| exit 1`
fires. Confirmed the Bash tool runs `/bin/zsh` (`ZSH_VERSION=5.9`), so this is the primary path.

#### Fix Implementation (In Progress → Ready for QA) — 2026-08-17

Replaced with `eval "env_val=\${$env_name:-}"`, which works in both shells. `env_name` is built from
the literals `tracker`/`vcs`, so there is nothing to inject.

A **second** zsh incompatibility surfaced while testing the fix: `$ACCESS_MODES` was passed unquoted
to `validate_enum`, relying on word splitting — which zsh does not do for unquoted parameter
expansions, so the whole legal set arrived as one candidate and every legal value was rejected.
Replaced with `validate_access_mode`, which passes the set as separate literal arguments. That also
closes CR-7 (a bash caller with a custom `IFS` would have hit the same thing).

**Files**: `shared/resources/resolve-platform.sh`, `shared/resources/tracker-access.test.sh`

**Testing**: new §12 runs the resolver under zsh — clean config, env override, and invalid value —
and SKIPs loudly if zsh is absent. Verified identical output in both shells, for the source file and
for a bundled copy in a temp dir.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-17 | In Progress | qa-fix | Investigation started |
| 2026-08-17 | Ready for QA | qa-fix | Fix implemented, covered by new assertions |
