# Bug Report: Task 113 - Step 4 registry-arm snippet passes `--issue` as one word under zsh

**Task**: [Link](./task.113.develop-next-registry-bookkeeping.md)
**Bug ID**: TASK-113-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-12

## Description

`skills/develop-next/SKILL.md` Step 4 (`item.source = task-registry`) passes the optional issue
reference as `${ISSUE_REF:+--issue "$ISSUE_REF"}`. Under **zsh** — the operator's default shell on
this repository — a parameter expansion is not word-split, so the whole `--issue [#397](…)` string
arrives as **one** argument. `registry-tick.js` rejects it as an unknown argument and exits 2, so the
registry arm fails on exactly the case the `Issue` cell exists for (the run created an issue).

Found by QA Step 4b: the snippet was executed under bash and zsh with `ISSUE_REF` set and unset.
bash: `dry-run / notes written / issue written`. zsh: `unknown argument "--issue [#397](…)"`.

## Steps to Reproduce

```zsh
ISSUE_REF='[#397](https://github.com/Gamaroff/agent-skills/issues/397)'
node .agents/skills/develop-next/references/registry-tick.js --annotate \
  --file docs/tasks/task.113.develop-next-registry-bookkeeping/task.113.develop-next-registry-bookkeeping.md \
  --pr 398 ${ISSUE_REF:+--issue "$ISSUE_REF"} --dry-run --json
```

## Expected Behavior

`reason: dry-run`, `issue: written` under both shells.

## Actual Behavior

zsh: exit 2, `registry-tick: unknown argument "--issue [#397](...)"`.

## Impact

The registry arm's Issue-cell fill silently never works for zsh operators; the step then HALTs on
the usage error (exit 2 is not in the exit-0 family the step tolerates).

## Recommendation

Build the optional argument as an array, which both shells expand per element:

```bash
ISSUE_ARGS=()
[ -n "$ISSUE_REF" ] && ISSUE_ARGS=(--issue "$ISSUE_REF")
node … --pr <PR#> "${ISSUE_ARGS[@]}" --json
```

Add a shape assertion that the `:+` form is absent from the step and that the array form is present.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: as described above — confirmed by re-running the reproduction before the change.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**: Step 4 registry arm now builds `ISSUE_ARGS=()` / `ISSUE_ARGS=(--issue "$ISSUE_REF")` and expands `"${ISSUE_ARGS[@]}"`; the `:+` form is gone and a shape assertion forbids it.

**Files Modified**: skills/develop-next/SKILL.md · evals/develop-next/protocol/skill-shape.test.mjs

**Testing**: Executed the invocation under bash and zsh with `ISSUE_REF` set and unset — all four `dry-run / issue written|not-requested`. Mutation: restoring the `:+` form reds the shape test.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Filed (QA cycle 1)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |
| 2026-09-12 | Closed       | QA         | Verified by re-executing the reproduction (QA cycle 2) |
