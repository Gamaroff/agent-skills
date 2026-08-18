# Bug Report: Task 51 - Multi-line flow-mapping `access:` resolves to `full` on the awk tier

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-7
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2)
**Date Found**: 2026-08-17
**Introduced by**: the cycle-1 fix for BUG-5b (awk flow-mapping support)

## Description

The new awk flow rule matches `^access:[[:space:]]*\{`, strips to the first `}`, then calls `next` —
it never sets `in_block`, so continuation lines are unreachable. The fix closed the single-line case
and left the multi-line case open.

## Steps to Reproduce

```yaml
access: {
  tracker: manual}
```

Also `access: {\n  tracker: manual,\n  vcs: full\n}`. Both parse cleanly under pyyaml.

## Expected Behavior

Both tiers agree: `ACCESS_TRACKER=manual`.

## Actual Behavior

| tier | rc / ACCESS_TRACKER |
|---|---|
| python | `0 / manual` |
| awk | `0 / full` |

## Impact

Tier-dependent silent privilege escalation — the precise thing test §13 was added to prevent. §13
only exercises the single-line form, which is why this passed.

## Recommendation

Do not extend the awk parser to multi-line flow syntax — that is a parser, and this tier explicitly
is not one. **Fail closed instead**: when the awk tier sees `access:` opening a flow map that does
not close on the same line, emit a sentinel that makes the resolver halt with "access is configured
in a form this tier cannot read — install pyyaml or use the block form". Guessing is what produced
the escalation.

---

## Developer Fix Cycle

### Iteration 1 — 2026-08-17

**Fix**: the awk tier now *refuses* rather than guessing. When it meets `access:` opening a flow map
that does not close on the same line, it emits `__UNREADABLE__` and the resolver halts with a message
naming both remedies (install pyyaml, or use the block form).

This deliberately does **not** extend the awk parser. Three of the four cycle-2 defects came from
teaching that tier one more YAML shape; it is documented as not a parser, and the right response to
syntax it cannot read is to refuse.

Verified: multi-line flow map → `manual` under python, **rc=1** under awk. Never `full`.

**Files**: `shared/resources/read-config.sh`, `shared/resources/resolve-platform.sh`,
`shared/resources/tracker-access.test.sh` (§19)

**Mutation**: making the flow rule guess again → 13 failures.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 2 — introduced by a cycle-1 fix |
| 2026-08-17 | Ready for QA | qa-fix | Fixed and mutation-proved |
