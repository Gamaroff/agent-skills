# Bug Report: Task 44 - `review-task` Step 8.5 Change Log item is mis-numbered and mis-placed

**Task**: [Link](./task.44.change-log-review-and-edit.md)
**Bug ID**: TASK-44-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-12
**Fixed**: 2026-08-12

## Description

In `skills/review-task/SKILL.md`, Step 8.5 ("Offer to Implement Fixes") now reads as a numbered list in the order **1, 2, 4, 3**:

```
1. Use `AskUserQuestion` to ask:
2. **If "Yes, apply all critical + important fixes"** or **"Yes, critical fixes only"**:
4. **Append a Change Log row** to the task recording the review outcome…
3. **If "No, I will fix manually"**:
```

The new Change Log instruction was inserted after item 2's sub-bullets and numbered `4`, which places it physically *between* the "Yes" branch (2) and the "No" branch (3) while claiming a position after both.

Every other skill edited by this task numbers correctly — `edit-story` (1-4), `edit-epic` (1-4), `review-epic` (1-7) and `enforce-standards` (1-7) were all verified clean. This is isolated to `review-task`.

## Expected Behavior

The verdict row is written on **every** review outcome, not only when fixes were applied. It should therefore appear as a properly-ordered step that is unambiguously outside both conditional branches — item `4`, positioned after item `3`.

## Actual Behavior

It appears as item `4` positioned before item `3`, nested visually inside the "Yes" branch's territory.

## Impact

Two consequences, one cosmetic and one functional:

1. **Cosmetic** — markdown renderers will renumber the list, producing 1, 2, 3, 4 in an order that does not match the authored intent, so the "No" branch renders as step 4 and the Change Log write as step 3.

2. **Functional, and the reason this is not LOW** — an agent reading the file top-to-bottom sees the Change Log instruction sitting under the "Yes, apply fixes" branch and can reasonably conclude the write is conditional on fixes having been applied. That would mean a **clean review with no findings writes no row** — precisely the gap this task exists to close.

   It also undermines the currency check this same task adds. `review-task` check 4b states: *"A no-findings review still writes a row (Step 8.5), so the quiet case is already covered by a writer rather than exempted here."* The narrow currency heuristic is justified **by** the writer firing unconditionally. If the writer is read as conditional, that justification no longer holds and quiet documents could be flagged stale.

## Steps to Reproduce

```bash
sed -n '/^### Step 8.5/,/^### Step 8.6/p' skills/review-task/SKILL.md | grep -E '^[0-9]+\. '
```

Observe the emitted order: `1.`, `2.`, `4.`, `3.`

## Recommendation

Move the `4. **Append a Change Log row**` block so it follows the `3. **If "No, I will fix manually"**` block, leaving the sequence 1, 2, 3, 4. No wording change is needed — the item's text is already correct and already says the row records "the review outcome" rather than "the fixes applied".

Optionally strengthen the first sentence to close the ambiguity explicitly, e.g. "Append a Change Log row **regardless of which option was chosen above**…", matching the "regardless of tracker platform" emphasis the same block already carries.

## Verification

After the fix, re-run the reproduce command and confirm the order is `1, 2, 3, 4`.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-12

**Root Cause Analysis**

The Change Log block was inserted immediately after item 2's trailing sub-bullet (`**Mark recommendations as implemented**`) rather than after item 3. Because item 2's sub-bullets are indented and the new block was not, the block became a *sibling* of items 2 and 3 while sitting physically between them — so the authored number (`4`) was correct for its intended position but wrong for its actual one.

The deeper cause is that the intended position was never explicit. The block was written as "a step in Step 8.5" without deciding whether it belonged inside the "Yes" branch, inside the "No" branch, or after both. The numbering error was the visible symptom; the ambiguity was the defect.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-12

**Fix Description**

Moved the entire `4. **Append a Change Log row**` block to follow the `3. **If "No, I will fix manually"**` block, giving the sequence 1, 2, 3, 4.

Also applied the optional wording change the report recommended, because the ordering alone would have left the ambiguity addressable only by inference:

- Opening now reads "…recording the review outcome — **regardless of which option was chosen above** — and bump frontmatter `updated`…"
- Added an explicit statement of the quiet case: "A review that found nothing still writes a row (`Review passed (9/10) — no changes required`): the verdict is the event being recorded, not the edits."
- Added the dependency that makes it load-bearing: "Check 4b's currency heuristic depends on this being unconditional."
- Tightened "Skip when" → "**Skip only when** `change-log.enabled: false`".
- Adjusted the following blockquote's opener to "regardless of tracker platform **too**", so the two independent "regardless" clauses read as additive rather than as a repetition.
- Extended the step's **Output** line to state that a Change Log row is written in both branches: "…or unchanged (if user declined) — and in both cases a Change Log row recording the review verdict."

**Files Modified**

- `skills/review-task/SKILL.md` — Step 8.5 block moved and wording strengthened

**Testing**

- Reproduce command now emits `1.`, `2.`, `3.`, `4.` in order
- `npm test` — 1175/1175 pass, 0 fail
- `npm run bundle` — still idempotent (tree identical across runs)
- Verified the sibling lists that were already correct did not regress: `edit-story` (1-4), `edit-epic` (1-4), `review-epic` (1-7), `enforce-standards` (1-7)

**Verification Steps for QA**

1. Run `sed -n '/^### Step 8.5/,/^### Step 8.6/p' skills/review-task/SKILL.md | grep -E '^[0-9]+\. '` and confirm the order is 1, 2, 3, 4.
2. Confirm item 4 carries the phrase "regardless of which option was chosen above".
3. Confirm `npm test` is 1175/1175.

---

## Status History

| Date       | Status       | Changed By   | Notes                                                   |
| ---------- | ------------ | ------------ | ------------------------------------------------------- |
| 2026-08-12 | New          | QA Engineer  | Bug created — list order 1,2,4,3 with ambiguous scope   |
| 2026-08-12 | In Progress  | qa-fix       | Root cause identified: block inserted after item 2      |
| 2026-08-12 | Ready for QA | qa-fix       | Block moved after item 3; wording made unconditional    |
