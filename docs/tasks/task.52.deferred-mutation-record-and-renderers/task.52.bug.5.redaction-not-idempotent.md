# Bug Report: Task 52 - Double redaction destroys the variable names the script needs

**Task**: [Link](./task.52.deferred-mutation-record-and-renderers.md)
**Bug ID**: TASK-52-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (diff code review, reproduced)
**Date Found**: 2026-08-18

## Description

Redaction runs twice by design — `defer()` on write, `render()` again on read as defence in depth.
It is not idempotent. The first pass replaces a secret with its variable name (`$GITHUB_TOKEN`); the
second pass sees a value in a secret-bearing position that the sweeps do not alter, concludes it is
an unrecognised secret, and masks it to `«redacted»`.

`maskOrName` is fail-closed by design — "unchanged by the sweeps" means "nothing recognised this" —
but a `$NAME` produced by the previous pass is exactly that shape.

## Steps to Reproduce

```bash
node -e '
const dm=require("./shared/resources/defer-mutation.js");
const t=dm.buildEnvTable({});
const once=dm.redactArgv(["--token","$GITHUB_TOKEN"],t);
console.log("pass 1:",JSON.stringify(once));
console.log("pass 2:",JSON.stringify(dm.redactArgv(once,t)));'
```

## Expected Behavior

`$GITHUB_TOKEN` survives every subsequent pass. The whole point of substituting the **name** is that
the output stays actionable.

## Actual Behavior

**Verified**: pass 1 → `["--token","$GITHUB_TOKEN"]`; pass 2 → `["--token","«redacted»"]`.

## Impact

Under `command` mode — the mode whose entire purpose is handing an operator a runnable script — the
committed `.sh` contains `--token «redacted»` and cannot run. The operator cannot even tell which
variable to export.

The §6 credential test passes because it asserts on `verify.cmd`, a plain string that keeps its
`$JIRA_API_TOKEN`; it never asserts a name survives inside `command.argv` after both passes.

## Recommendation

Make `maskOrName` treat an already-substituted value as terminal:

```js
if (/^\$[A-Za-z_][A-Za-z0-9_]*$/.test(raw) || raw === REDACTED) return raw;
```

Add a test that renders a record twice through the full write→render path and asserts the variable
name survives.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-18

Root cause confirmed by reproducing the failure exactly as described in the report above, before any
change was made.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-18

**Fix**: `maskOrName` now treats a value already equal to `«redacted»` or matching `$IDENT` as terminal, via a new `alreadyRedacted` helper.

**Files Modified**: `shared/resources/defer-mutation.js`, `shared/resources/tests/handover-render.test.mjs`

**Testing**: §16 BUG-5 asserts `redactArgv` is a fixed point on its own output and that `$GITHUB_TOKEN` survives the full write→render path while the secret value does not. Mutation-proven: removing the guard turns it red.

**Verification for QA**: run the reproduction command in this report — it now produces the expected
behaviour — then `npm test` (1351 node + 394 shell, all green).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-18 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-18 | In Progress | qa-fix | Reproduced and root-caused |
| 2026-08-18 | Ready for QA | qa-fix | Fixed with a mutation-proven regression test |
