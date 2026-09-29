# Bug Report: Task 150 - seedFromObservations' id guard accepts ids that park a different entry

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Bug ID**: TASK-150-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, security probe)
**Date Found**: 2026-09-28

## Description

`seedFromObservations` (`skills/create-task/scripts/lib.js`) reads each entry's id with
`Number(frontmatter.id)` and refuses it only when `!Number.isInteger(id)`. `Number()` accepts hex,
exponent, signed, padded and empty strings, so the guard is **present but inert** for exactly the
malformed ids it exists to refuse. The id becomes the `--id` argument of a `set-status` park vector,
so a malformed id parks a **different** observation.

## Steps to Reproduce

```bash
command node -e '
const lib=require("./skills/create-task/scripts/lib.js");
const e={frontmatter:{id:"0x10",title:"create-task: t",status:"open",skill:["create-task"]},body:""};
console.log(JSON.stringify(lib.seedFromObservations([e],{taskId:150}).park[0]));'
# → ["set-status","--id","16","--status","parked",…]
```

The engine's own frontmatter parser returns `id: 0x10` as the **string** `"0x10"`
(`observation-log.js` `parseFrontmatter`), so a hand-edited entry reaches the seed in this shape.

Probe run (`task.150.qa.1.security.run.json`, control `seedAcceptsId`): verdict
`present-but-inert`, 9 cases executed, 6 hostile cases accepted: `""` → 0, `"0x10"` → 16,
`"1e2"` → 100, `"-3"`, `"0"`, `" 12 "`.

## Expected Behavior

Only a positive base-10 integer id (a number, or a string of digits with no leading zero) is
accepted. Everything else throws, naming the entry.

## Actual Behavior

Six malformed ids are accepted and are converted to a different, valid-looking id.

## Impact

`--from-observation` parks an unrelated observation on the new task. That entry leaves the review
queue silently, which is the exact loss the entry exists to prevent.

## Recommendation

Accept `typeof id === "number" && Number.isInteger(id) && id >= 1`, or a string matching
`/^[1-9][0-9]*$/`. Throw otherwise. Add the six probe inputs as refusal cases in
`skills/create-task/tests/from-observation.test.js`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-28

**Root Cause**: `Number()` is a coercion, not a parse. It reads `0x10` as 16, `1e2` as 100, `""` as 0
and `" 12 "` as 12, and `Number.isInteger` then accepts every one. The guard was written against
non-numeric strings and never met a numeric-looking malformed one.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: a new `observationId(raw)` accepts only a positive integer number, or a string
matching `/^[1-9][0-9]*$/`, and returns `null` otherwise. `seedFromObservations` throws on `null`.

**Files Modified**:

- `skills/create-task/scripts/lib.js`: `observationId`, used by the seed
- `skills/create-task/tests/from-observation.test.js`: 12 refused ids (the probe's six plus
  `"1.5"`, `0`, `-1`, `1.5`, `null`, `undefined`) and 3 accepted

**Testing**: the new test goes red with the pre-fix `lib.js` restored from a snapshot and green on the
fix. `from-observation.test.js` passes 9/9.

**Verification Steps for QA**: re-run the `seedAcceptsId` probe. All hostile ids should be rejected.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ------------------------------- |
| 2026-09-28 | New | QA | Found by the QA cycle 1 probe |
| 2026-09-28 | Ready for QA | qa-fix | Strict positive-integer id guard |
| 2026-09-28 | Closed | QA | Raw-input guard verified by the cycle 2 re-probe; the scan-path bypass is TASK-150-BUG-3 |
