# Bug Report: Task 51 - Bulk read protocol is line-positional; a multi-line value silently escalates access

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-6
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2)
**Date Found**: 2026-08-17
**Introduced by**: the cycle-1 fix for MED-2 (batching six reads into one python spawn)

## Description

`config_bulk` promises one **line** per spec, but `print(v)` emits as many lines as the value
contains. `_rp_line` addresses answers by position (`sed -n "$1p"`), so any value containing a
newline shifts every later answer.

Proof the protocol is lossy — three specs in, five lines out:

```
$ printf 'summary: |\n  line one\n  line two\ntracker: jira\nvcs: bitbucket\n' > skills-config.yaml
$ config_bulk key:summary key:tracker key:vcs
1  line one
2  line two
3  (empty)
4  jira
5  bitbucket
```

## Steps to Reproduce

```yaml
tracker: "github\n\n\n"
access:
  tracker: manual
```

```bash
source shared/resources/resolve-platform.sh; echo "rc=$? AT=$ACCESS_TRACKER"
```

## Expected Behavior

`ACCESS_TRACKER=manual` plus the not-yet-enforced notice — or a loud rejection.

## Actual Behavior

`rc=0 T=github AT=full` — **silent escalation, no warning**. The operator asked to be locked down and
was not.

The awk tier halts correctly on the same file, so tier 1 — the authoritative one — is the unsafe one.
A shift-by-one variant fails closed but lies: `❌ access.tracker: "mapping" is not a recognised value`,
naming a value nobody wrote.

## Impact

The exact defect class this task exists to eliminate, reintroduced by the performance fix. Config
values are short enums today so real-world likelihood is low — but `read-config.sh` documents
`config_bulk` as generic ("this file knows nothing about which keys a particular caller wants"), so
the first caller that batches a description, path or template key inherits it.

## Recommendation

Make the protocol position-independent rather than trusting values to be single-line: prefix each
answer with its spec index and escape newlines, then address by index rather than by line number.
A value that still contains an escaped newline will fail enum validation loudly — fail-closed, which
is the correct direction.

---

## Developer Fix Cycle

### Iteration 1 — 2026-08-17

**Root cause**: position is not a safe key when the payload is arbitrary. `print(v)` emits one line
per line of the value; `sed -n "$Np"` assumes one line per spec.

**Fix**: each answer now comes back as `<index>\t<value>` with newlines escaped, and the caller
addresses by index (`sed -n "s/^N\t//p"`) rather than by line number. A value that still contains an
escaped newline fails enum validation loudly — fail-closed, the correct direction.

Verified: 3 specs → exactly 3 lines regardless of content; the escalation repro now returns rc=1
instead of rc=0/full.

**Files**: `shared/resources/read-config.sh`, `shared/resources/resolve-platform.sh`,
`shared/resources/tracker-access.test.sh` (§18)

**Mutations**: reverting to positional lines → 32 failures; removing the newline escaping → red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 2 — introduced by a cycle-1 fix |
| 2026-08-17 | Ready for QA | qa-fix | Fixed and mutation-proved |
