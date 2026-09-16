# Bug Report: Task 110 - The runner only defaults `CI` when unset, so an inherited `CI=false` lets `npx jest` write snapshots with no flag at all

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-20
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (reviewer CR-4, confirmed by execution)
**Date Found**: 2026-09-15

## Description

`defaultRunner` spawns the child with `env: { ...process.env, CI: process.env.CI ?? "1" }`. The
`??` only fills an **unset** `CI`; a reader whose shell exports `CI=false` — which `ci-info` treats
as an explicit "not CI" — passes it straight through. jest then runs with `ci=false`, so
`updateSnapshot` is `'new'` and every missing snapshot is **written**, with no flag in the handoff
line at all. SKILL.md promises "the runner is non-TTY with `CI=1`"; the promise is conditional.

**Executed** (QA cycle 14): `npx jest --silent` through the CLI under `env -i … CI=false` in the
consumer-shaped project → `confirmed`, `1 snapshot written`, `__snapshots__/zz.test.js.snap`
created. Under `CI=1` the same line writes nothing.

## Expected Behavior

`CI` is forced to `"1"` in the child environment unconditionally — the runner's promise, not the
reader's shell, decides.

## Actual Behavior

`CI=false` (or `CI=""`) in the reader's environment reaches the child unchanged.

## Impact

A write through read mode that depends on the reader's shell rather than the handoff line —
invisible in the document and in the whitelist. MEDIUM: it needs jest and a snapshot test lacking
its snapshot, and a reader who exports `CI=false`.

## Recommendation

`env: { ...process.env, CI: "1" }`; a runner test that spawns `node -e 'console.log(process.env.CI)'`
under an inherited `CI=false` and reads `1`. Mutation: the `??` restored → red.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 14)

**Root Cause**: `defaultRunner` filled `CI` only when unset (`process.env.CI ?? "1"`), so a reader's exported `CI=false` reached the child unchanged; ci-info reads that as an explicit "not CI" and jest then writes new snapshots.

**Fix**: `env: { ...process.env, CI: "1" }` — forced, not defaulted.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — the runner's env line and its comment
- `skills/session-handoff/tests/handoff-verify.test.js` — new runner test: with `process.env.CI = "false"` the child prints `1`
- `skills/session-handoff/SKILL.md` — npx row states the promise as forced

**Testing**: 32/32. Mutation-proved red: the `??` restored. Re-executed through the fixed verifier under `env -i … CI=false`: `npx jest --silent` fails on the missing snapshot instead of writing it; no `__snapshots__/`.

**Verification Steps for QA**:
1. Spawn any child through `defaultRunner` with `CI=false` exported → `process.env.CI` in the child reads `1`.
2. Through the CLI under `CI=false` with a snapshot test lacking its snapshot: no snapshot written.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 14 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | CI forced to 1 in the child env; runner test under an inherited CI=false |
| 2026-09-15 | Closed | QA Engineer | QA cycle 15 — `npx jest --silent` through the clone's own verifier under `env -i … CI=false` fails on the missing snapshot instead of writing it; no `__snapshots__/`. Mutation M4 (`??` restored) → the new runner test red — `covered` |
