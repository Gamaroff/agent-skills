# Bug Report: Task 114 - The document's own applied-check prints MUTATION APPLIED when the snapshot is missing

**Task**: [Link](./task.114.mutation-proving-outcomes.md)
**Bug ID**: TASK-114-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 4b snippet execution, QA-1)
**Date Found**: 2026-09-12

## Description

Step 4 of the procedure in `shared/resources/mutation-proving.md` (and the repeat in "Validate the
probe before you trust the matrix", check 3) asserts the mutation applied with

```bash
diff /tmp/pre-mutation.ts path/to/source.ts || echo "MUTATION APPLIED"
```

`diff` exits 1 when the files differ and **2 when an operand is missing**; `||` fires on both. So on
the one run where the operator forgot step 1 (no snapshot), the check prints `MUTATION APPLIED` — the
instrument rule 3 depends on reports success on exactly the run it was written to catch. Found by the
4b engine executing the block under both shells: stderr `diff: /tmp/pre-mutation.ts: No such file or
directory`, stdout `MUTATION APPLIED`, status 0.

## Steps to Reproduce

```bash
rm -f /tmp/pre-mutation.ts
diff /tmp/pre-mutation.ts shared/resources/mutation-proving.md || echo "MUTATION APPLIED"
# → MUTATION APPLIED
```

## Expected Behavior

A missing snapshot is a HALT ("no snapshot — nothing to compare"), not a pass. Exit 1 → applied;
exit 0 → NOT applied; anything else → the instrument is broken.

## Actual Behavior

Prints `MUTATION APPLIED`.

## Impact

This is instrument rule 5 ("ask what the probe would print if it were broken") violated by the
document that states rule 5, in the snippet that implements rule 3. The text was inherited from
task.100, but this diff promoted it to a numbered rule and repeated it, so it is attributable here.

## Recommendation

Discriminate on `$?`:

```bash
diff -q /tmp/pre-mutation.ts path/to/source.ts >/dev/null 2>&1
case $? in
  1) echo "MUTATION APPLIED" ;;
  0) echo "NOT APPLIED — the edit did not land; the green below proves nothing" ;;
  *) echo "NO SNAPSHOT / diff error — step 1 was skipped; stop" ;;
esac
```

Apply the same shape in the "Validate the probe" block, and cite this bug as the worked example under
rule 5 — it is the shortest one the repository has.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: `diff a b || echo APPLIED` fires on exit 1 (differ) and exit 2 (operand missing) alike.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**:
- Step 4 snippet and the Validate-the-probe check 3 both discriminate `$?`: 1 → APPLIED, 0 → NOT APPLIED, other → NO SNAPSHOT / diff error, stop.
- A paragraph under step 4 says why the exit code is read rather than the `||`; rule 5 cites this as its shortest example.

**Files Modified**:
- `shared/resources/mutation-proving.md` (+ six bundled copies via `npm run bundle`)

**Testing**: executed the new snippet under bash and zsh for all three states — missing snapshot → `NO SNAPSHOT — stop`; identical → `NOT APPLIED`; differing → `APPLIED`.

**Verification Steps for QA**: `rm -f /tmp/pre-mutation.ts` then run the step-4 block; expect the stop message, not APPLIED.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Found (QA-1, via 4b)  |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |
