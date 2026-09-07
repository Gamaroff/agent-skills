# Bug Report: Task 81 - The engaged fixture's loopback guard claims more than it does

**Task**: [Link](./task.81.review-security-skill.md)
**Bug ID**: TASK-81-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-09-07

## Description

`skills/review-security/tests/fixtures/redis-tls/engaged.mjs` carries the comment:

> An external destination must not resolve to the machine running the code: loopback and private
> ranges reach services that are unauthenticated precisely because they were assumed unreachable.

The code below it only recognises **dotted-quad** IPv4 (`octets.length === 4`). Every other standard
encoding of 127.0.0.1 is accepted.

## Steps to Reproduce

```bash
node --input-type=module -e "
const {buildRedisOptions} = await import('./skills/review-security/tests/fixtures/redis-tls/engaged.mjs');
for (const h of ['127.0.0.1','127.1','0177.0.0.1','2130706433'])
  console.log(h, buildRedisOptions(h) === false ? 'REJECTED' : 'ACCEPTED');
"
```

## Expected Behavior

Given the stated intent, a host that resolves to the local machine is refused.

## Actual Behavior

| Input | Resolves to | Result |
| --- | --- | --- |
| `127.0.0.1` | loopback | REJECTED ✅ |
| `127.1` | loopback (valid shorthand) | **ACCEPTED** |
| `0177.0.0.1` | loopback (octal) | **ACCEPTED** |
| `2130706433` | loopback (bare decimal) | **ACCEPTED** |
| `1.2.3.4.5` | not an address | **ACCEPTED** |

## Impact

Low in absolute terms — this is a test fixture, and it still scores `engages` against the corpus,
which is its functional job.

**High in context, which is why this is MEDIUM.** This fixture is the artifact that models *what a
control that engages looks like*. It ships inside a skill whose entire subject is controls that are
present, are believed, and do not do what their surrounding text says they do. A reader who copies
this guard inherits a loopback bypass, having been told by the comment that it covers loopback.
Shipping a miniature `present-but-inert` inside the instrument built to name `present-but-inert` is
the one defect this task cannot afford.

Found by the cycle-2 refute pass, which asks which claim in the change set is false rather than
whether the change works. The steady-state suite could not have found it: every corpus case still
passes.

## Recommendation

Fail closed on anything that looks like an IP literal but is not a clean dotted quad. If the host
consists only of digits and dots, require exactly four decimal octets ≤ 255 — otherwise reject.
`127.1`, `0177.0.0.1`, `2130706433` and `1.2.3.4.5` are then all refused, while
`db.internal.example.com` and `8.8.8.8` are unaffected.

Then narrow the comment so it states what the code actually guarantees.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-07

Confirmed by direct call. The guard tested `octets.length === 4`, so a host that is *not* a
four-part dotted quad fell through to the accept path entirely — including three standard spellings
of loopback. The previous prefix-based version had the same gap in a different form (it also accepted
`127.1`), so this was not introduced by the cycle-1 fix; that fix corrected one inaccuracy and left
this one visible.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-07

**Fix Description**: treat anything made only of digits and dots as an IP-literal **attempt** and
judge it as one — require a clean four-octet dotted quad, and **fail closed** on anything else. A
hostname is unaffected.

**Files Modified**:
- `skills/review-security/tests/fixtures/redis-tls/engaged.mjs` — fail-closed IP-literal branch; the
  overclaiming comment narrowed to state that DNS is not resolved, so a hostname *pointing* at
  127.0.0.1 still passes
- `skills/review-security/tests/review-security.test.js` — regression test locking all 15 cases

**Testing** — all 15 expectations met:

| Refused | Accepted |
| --- | --- |
| `127.0.0.1`, `127.000.000.001`, `127.1`, `0177.0.0.1`, `2130706433`, `1.2.3.4.5`, `10.0.0.5`, `192.168.1.1`, `172.20.0.1`, `localhost` | `8.8.8.8`, `172.32.0.1`, `db.internal.example.com`, `10.example.com`, `172.20.example.com` |

**Mutation-proven** — two ways, each reding the new regression test and nothing else:
- flip the fail-closed branch to `return true` → 1 red
- disable the digits-and-dots gate entirely → 1 red

**Verification Steps for QA**: call `buildRedisOptions('2130706433')` and confirm `false`.

## Status History

| Date | Status | Note | Author |
| ---- | ------ | ---- | ------ |
| 2026-09-07 | New | Found during QA cycle 2 (mandatory refute pass) | qa-task |
| 2026-09-07 | In Progress | Confirmed: length-4 check let three loopback spellings through | qa-fix |
| 2026-09-07 | Ready for QA | Fail-closed IP-literal branch + regression test; mutation-proven twice | qa-fix |
| 2026-09-07 | Closed | Verified by direct call across 15 cases — all loopback spellings refused, all legitimate hosts accepted | qa-task |
