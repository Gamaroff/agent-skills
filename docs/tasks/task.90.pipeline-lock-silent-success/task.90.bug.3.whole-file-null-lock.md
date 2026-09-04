# Bug Report: Task 90 - A whole-file `null` lock still reports a fabricated advance

**Task**: [task.90.pipeline-lock-silent-success.md](./task.90.pipeline-lock-silent-success.md)
**Bug ID**: TASK-90-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 1)
**Date Found**: 2026-09-04

## Description

A lock file whose entire content is the 4 bytes `null` prints `advance-pipeline-lock: step 0 → 5`, exits 0, and writes `{"current_step":5}` — **fabricating an object from a lock that held none**. This is the same silent-success shape the task exists to close.

## Steps to Reproduce

```bash
T=$(mktemp -d); printf 'null' > "$T/lk"
PIPELINE_LOCK=$T/lk bash shared/resources/advance-pipeline-lock.sh 5; echo "rc=$?"; cat "$T/lk"
# advance-pipeline-lock: step 0 → 5    rc=0    {"current_step":5}
```

## Expected Behavior

Either fail closed like the empty case, or be recorded as a known, deliberate exclusion.

## Actual Behavior

Reports success for a lock that carried no state.

## Pre-existing

Byte-identical behaviour on `origin/develop` — **not a regression introduced by this task**, and outside its stated §4 scope ("empty or whitespace-only").

## Impact

Bounded: the resulting lock is *valid*, so the state machine is not left corrupt as it was in the zero-byte case. But it is the counterexample that falsifies the §2 "single hole" rationale (see TASK-90-BUG-2), and it sits one predicate away from the guard just added.

## Recommendation

Either extend `require_parsable_lock`:

```bash
jq -e 'type == "object"' "$LOCK" >/dev/null 2>&1 || { echo "…not a JSON object…" >&2; exit 1; }
```

plus a test scenario — **or** record the exclusion explicitly in §4 Out of scope. Either is acceptable; leaving it unstated is not.

---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-04

**Fix Description**: Fixed rather than recorded as out of scope — it is the same defect class, one predicate away, and leaving it would have made the corrected §2 incoherent.

`require_parsable_lock` now decides on a **single** predicate, `jq -e 'type == "object"'`, which rejects empty, whitespace-only, malformed, and parseable-but-not-an-object input alike. Scope §4 and success criteria §9 widened to match.

**A second finding came out of fixing this one.** The first attempt *appended* the type check after the existing emptiness check. The suite went green — and the original mutation proof quietly stopped holding: neutering the emptiness branch left all 30 tests passing, because the type predicate already covers empty input (`jq -e` exits 4 on empty). That branch had become control flow no test could falsify. Resolved by restructuring to one decision predicate, with the emptiness test demoted to choosing the error message.

**Files Modified**:
- `shared/resources/advance-pipeline-lock.sh`
- `shared/resources/advance-pipeline-lock.test.sh` (scenario 12, 4 shapes × 2 interpreters)
- 9 × `skills/*/references/advance-pipeline-lock.sh` (re-bundled, content-verified)

**Testing**: 30/30 bash, 30/30 zsh. Mutation proof: removing the predicate turns 6 red (empty, whitespace, `null` × 2 shells); reverting `mktemp` turns 2 red.

**Honest limit**: scenario 12's `[]`, `"str"` and `42` shapes are asserted but **not** mutation-proved against the predicate — they already failed closed via the write path. They document intent rather than bind it.

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-04 | Ready for QA | qa-fix | Fixed + scenario 12; guard restructured on mutation-proof evidence |
