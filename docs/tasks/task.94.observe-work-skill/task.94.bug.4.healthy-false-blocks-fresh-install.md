# Bug Report: Task 94 - The cycle-1 fix blocks capture in every fresh install

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-4
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-09-08

## Description

**Introduced by the fix for TASK-94-001.** That fix correctly moved the missing-workspace branch onto `healthy`, and then added a catch-all row:

| `healthy: false` for any other failing check | Surface the check's `detail`; do not write until it is resolved |

`healthy` is `failed.length === 0` over **four** checks — `workspace-exists`, `anchor-durable`, `no-fork`, and **`activation-configured`**. The last of these fails whenever no `AGENTS.md` / `CLAUDE.md` in the cwd mentions the observation log.

That is the state of **every project on first install**. So the catch-all instructs the agent not to write observations in exactly the projects the skill most needs to work in — and Session Start step **4**, which is what suggests adding the activation instruction, runs *after* step 1. The protocol blocks before reaching its own remedy.

## Steps to Reproduce

```bash
P="$HOME/probe"; mkdir -p "$P"; cd "$P"       # no AGENTS.md
command node …/observation-log.js init   --workspace "$P" --json
command node …/observation-log.js doctor --workspace "$P" --json
```

```
reason  = ok
healthy = False
  ok   workspace-exists       …/skill-observations
  ok   anchor-durable         …
  ok   no-fork                no second workspace found at another plausible anchor
  FAIL activation-configured  no agent-instruction file mentions the observation log
```

A correctly initialised, entirely healthy log — and `healthy: false`.

## Expected Behavior

A missing activation instruction is noted and handled by step 4. Capture proceeds.

## Actual Behavior

Step 1's catch-all tells the agent not to write until it is resolved.

## Impact

Silent total loss of capture on every fresh install, from a rule that reads like a safety measure. It is the same *shape* as the defect it was introduced to fix — an agent following the protocol literally does nothing, and nothing says so.

Note what is **not** wrong: `anchor-durable` and `no-fork` failing are already carried by `reason` (`ephemeral-workspace`, `fork-detected`, both exit 1) and genuinely should stop a write. The catch-all's only *unique* case is `activation-configured`, and it gives it the worst available instruction.

## Recommendation

Replace the catch-all with the four checks named explicitly:

- `workspace-exists` false → `init`, then re-run `doctor`
- `activation-configured` false → **note it and continue**; step 4 owns it. Never blocks a write
- `anchor-durable` / `no-fork` false → already reported through `reason`; act on those rows

State plainly that `healthy: false` on its own is **not** a reason to stop writing — only specific checks are.


---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-08

**Fix**: the catch-all row is gone. Step 1 now enumerates the four checks and says what each means:

| Failing check | Action |
|---|---|
| `workspace-exists` | `init`, then re-run `doctor` |
| `activation-configured` | **Note and continue** — step 4 owns it; never stops a write |
| `anchor-durable` | Also reported as `reason` `ephemeral-workspace` |
| `no-fork` | Also reported as `reason` `fork-detected` |

A note states the rule directly: **`healthy: false` is not by itself a reason to stop writing.** Only `workspace-exists` demands an action here; only `reason` demands a halt.

The cycle-1 fix's ordering rationale — read `healthy` before `reason`, and why — was deliberately **kept**. It was correct; only the catch-all was wrong.

**Files Modified**:
- `skills/observe-work/SKILL.md`
- `skills/observe-work/tests/observe-work.test.js` — new regression assertion

**Testing**: **Mutation-proved.** Restoring the catch-all row turns the new assertion red, naming the defect ("step 1 must name `activation-configured` explicitly — it is the one check that fails on a healthy log, and the one a catch-all gets wrong"); reverting restores green. 22/22.

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | Ready for QA | qa-fix | Catch-all replaced with per-check treatment; mutation-proved |
