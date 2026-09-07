# Bug Report: Task 81 - The engaged fixture's loopback guard claims more than it does

**Task**: [Link](./task.81.review-security-skill.md)
**Bug ID**: TASK-81-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
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

## Status History

| Date | Status | Note | Author |
| ---- | ------ | ---- | ------ |
| 2026-09-07 | New | Found during QA cycle 2 (mandatory refute pass) | qa-task |
