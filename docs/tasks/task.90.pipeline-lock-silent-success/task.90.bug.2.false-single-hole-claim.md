# Bug Report: Task 90 - "single hole in an otherwise well-behaved validator" is false, and ships in CHANGELOG.md

**Task**: [task.90.pipeline-lock-silent-success.md](./task.90.pipeline-lock-silent-success.md)
**Bug ID**: TASK-90-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 1)
**Date Found**: 2026-09-04

## Description

The task's §2 rationale claims 18 executed `current_step` values — naming `null`, absent, `"abc"`, `-3`, `3.7`, `1e400`, malformed JSON, non-JSON — "all correctly preserve the lock and exit non-zero", concluding that the zero-byte case is "the single hole in an otherwise well-behaved validator".

Executed, **6 of the 8 named values advance and exit 0**.

## Steps to Reproduce

```bash
T=$(mktemp -d); S=shared/resources/advance-pipeline-lock.sh
printf '{"current_step": null}' > "$T/f"; PIPELINE_LOCK=$T/f bash $S 5; echo "rc=$?"; cat "$T/f"
# advance-pipeline-lock: step 0 → 5    rc=0    {"current_step":5}
```

| Input | rc | Lock |
|---|---|---|
| `{"current_step": null}` | **0** | rewritten |
| `{"other": 1}` (absent) | **0** | rewritten |
| `{"current_step": "abc"}` | **0** | rewritten |
| `{"current_step": -3}` | **0** | rewritten |
| `{"current_step": 3.7}` | **0** | rewritten |
| `{"current_step": 1e400}` | **0** | rewritten |
| `{"current_step": ` | 1 | preserved |
| `hello world` | 1 | preserved |

## Expected Behavior

Shipped prose states what actually holds.

## Actual Behavior

The false claim appears in three places, one of them user-facing:

1. `docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md` §2
2. `CHANGELOG.md`, Unreleased → Fixed
3. The PR #313 body

## Impact

`CHANGELOG.md` is user-facing and this repository holds a deliberate bar against overclaiming (`task.76` exists for precisely this). The false sentence is also the load-bearing justification for the fix's framing.

The claim was **inherited from task 77's DoD probe and carried forward unverified** — that is the failure mode, not the arithmetic.

## Recommendation

Replace with what holds: *unparseable* input fails closed; a parseable object with a garbage `current_step` advances to a valid step, which is defensible and is not what this task changes. Drop "single hole".

---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-04

**Fix Description**: Replaced the false claim in all three places with what actually holds. Before this task the script failed closed on input `jq` could not **parse** and advanced on everything else — which is why both the empty file and the bare `null` slipped through. After it, the script fails closed on anything that is not a **JSON object**; inside a valid object a garbage `current_step` still falls back to `0` and advances, which is deliberate and untouched here. "Single hole" is gone; the retraction names task 77's DoD as the unverified source.

**Files Modified**:
- `docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md` (§1, §2, §4, §9)
- `CHANGELOG.md` (Unreleased → Fixed)
- PR #313 body (via `gh pr edit`)

**Verification Steps for QA**: re-run the 8-input probe table; confirm each document states the parse/object distinction and that no document still claims "single hole" other than as a retraction.

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-04 | Ready for QA | qa-fix | Corrected in task doc, CHANGELOG and PR body |
