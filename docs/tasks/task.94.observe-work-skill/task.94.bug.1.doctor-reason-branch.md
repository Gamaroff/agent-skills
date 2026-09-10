# Bug Report: Task 94 - Session Start step 1 branches on a `doctor` reason the engine never emits

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-08

## Description

`SKILL.md` § "Session Start Protocol" step 1 tells the agent to run `observation-log.js doctor --json` and branch on `reason`, and its table lists a **"workspace missing"** row whose action is to run `init`.

The engine does not report a missing workspace through `reason`. It returns `reason: "ok"` and signals the condition through **`healthy: false`** plus a `checks[]` entry:

```json
{ "reason": "ok",
  "healthy": false,
  "checks": [ { "check": "workspace-exists", "ok": false,
                "detail": "…/skill-observations does not exist — run `init`" } ],
  "exitCode": 0 }
```

An agent following the table as written reads `reason: "ok"`, matches the first row ("Nothing"), and **never runs `init`**.

## Steps to Reproduce

```bash
W="$HOME/.probe"; rm -rf "$W"; mkdir -p "$W"
command node skills/observe-work/references/observation-log.js doctor --workspace "$W" --json
# → reason = "ok", healthy = false, exitCode = 0
command node skills/observe-work/references/observation-log.js scan --workspace "$W" --json
# → reason = "empty", exitCode = 0
```

## Expected Behavior

Step 1 detects the uninitialised workspace and runs `init` before step 2 scans.

## Actual Behavior

Step 1 reads `reason: "ok"` and proceeds. Step 2's `scan` then returns **`reason: "empty"`** against a workspace that does not exist — a clean, reassuring answer.

## Impact

**The two failures compound into a silent one.** The log is never created, and the very next step reports the log as empty and healthy. Nothing in the session distinguishes "there is nothing to find" from "there is nowhere to look" — which is the exact failure mode the observation-log contract's own section *"An empty result is a claim about the instrument"* exists to prevent. The contract enforces the distinction inside the engine; this skill reintroduces it at the caller.

This is the skill's first action in **every** session, so the blast radius is the whole feature: capture silently never happens, and the external diagnostic the skill itself offers ("if the observation-log directory does not exist after a few sessions, activation never happened") would be read as an *activation* failure rather than this.

## Recommendation

Branch on `healthy` and the `checks[]` array, not on `reason` alone. `reason` carries `ephemeral-workspace` and `fork-detected` correctly — those two rows are right and should stay — but "workspace missing" is a **check**, not a reason.

Replace the missing-workspace row with an explicit pre-branch: if `healthy` is false and `checks[]` contains `workspace-exists` with `ok: false`, run `init`, then re-run `doctor`.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-08

`doctor` was probed directly against a genuinely uninitialised workspace rather than reasoned about:

```
reason "ok" | healthy false | exitCode 0
checks[]: workspace-exists ok:false — "…/skill-observations does not exist — run `init`"
```

**Root cause**: a missing log is not an error — it is the normal state of a project that has never run the skill — so the engine reports it as a failing **check** while the *call* succeeds. The protocol read only `reason`, which is the field that answers "did the call work?", not "is the log there?".

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-08

**Fix**: Session Start step 1 now reads `healthy` first and `reason` second, and says why. The init row keys on `healthy: false` **and** the `workspace-exists` check. The `ephemeral-workspace` and `fork-detected` rows stay keyed on `reason`, because those *are* real reason values — verified by probing both.

A note records the trap explicitly: `reason` is `"ok"` and `exitCode` `0` on a workspace that does not exist, so branching on `reason` alone reintroduces at the caller exactly the `empty` vs `scan-broken` confusion the engine removes internally.

**Files Modified**:
- `skills/observe-work/SKILL.md` — Session Start step 1
- `skills/observe-work/tests/observe-work.test.js` — new regression assertion

**Testing**: The new assertion was **mutation-proved** — the original reason-keyed table was restored, the test went red naming the exact defect, and the fix restored green. 21/21.

**Verification Steps for QA**:
1. Run `doctor` against a fresh uninitialised workspace; confirm step 1's documented branch reaches `init`.
2. Restore the reason-keyed init row and confirm the suite goes red.

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | In Progress | qa-fix | Probed the engine directly |
| 2026-09-08 | Ready for QA | qa-fix | Fixed + regression test mutation-proved |
