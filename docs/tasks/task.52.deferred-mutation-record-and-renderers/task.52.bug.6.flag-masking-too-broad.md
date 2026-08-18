# Bug Report: Task 52 - `-u` and `-p` are masked unconditionally

**Task**: [Link](./task.52.deferred-mutation-record-and-renderers.md)
**Bug ID**: TASK-52-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (diff code review, reproduced)
**Date Found**: 2026-08-18

## Description

`SECRET_FLAGS` contains `-u` and `-p`, and `redactArgv` masks the following element with no reference
to `argv[0]`. Both flags have extremely common non-secret uses.

## Steps to Reproduce

```bash
node -e '
const dm=require("./shared/resources/defer-mutation.js");
const t=dm.buildEnvTable({});
console.log(JSON.stringify(dm.redactArgv(["git","push","-u","origin","HEAD"],t)));
console.log(JSON.stringify(dm.redactArgv(["mkdir","-p","docs/tasks"],t)));'
```

## Expected Behavior

`-u` before `curl` credentials is a secret; `-u` before `git push` is a remote name. Only the former
should be masked.

## Actual Behavior

**Verified**:
- `["git","push","-u","«redacted»","HEAD"]`
- `["mkdir","-p","«redacted»"]`

## Impact

The generated script runs `git push -u '«redacted»' HEAD`, which fails or pushes to a branch named
`«redacted»`. The checklist shows the operator a masked value where a plain remote name belongs, with
no indication anything was altered.

## Recommendation

Make the `-u` / `-p` rule client-aware — treat them as secret-bearing only when `argv[0]` is a known
client that uses them that way (`curl`, `mysql`, `psql`, …) — or, for `-u`, mask only the portion
after the first `:`.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-18

Root cause confirmed by reproducing the failure exactly as described in the report above, before any
change was made.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-18

**Fix**: `-u` and `-p` were removed from the unconditional `SECRET_FLAGS` set. They are now honoured only when `argv[0]` is a client that uses them for credentials (`curl`, `mysql`, `psql`, …).

**Files Modified**: `shared/resources/defer-mutation.js`, `shared/resources/tests/handover-render.test.mjs`

**Testing**: §16 BUG-6 asserts `git push -u origin HEAD` and `mkdir -p docs/tasks` are untouched, `curl -u admin:pass` is masked, and an explicit `--token` still masks for any client and any length. Mutation-proven.

**Verification for QA**: run the reproduction command in this report — it now produces the expected
behaviour — then `npm test` (1351 node + 394 shell, all green).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-18 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-18 | In Progress | qa-fix | Reproduced and root-caused |
| 2026-08-18 | Ready for QA | qa-fix | Fixed with a mutation-proven regression test |
