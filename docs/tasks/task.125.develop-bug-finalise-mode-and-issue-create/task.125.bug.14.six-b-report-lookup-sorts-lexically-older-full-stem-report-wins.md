# Bug Report: Task 125 - 6b's two-shape report lookup orders candidates lexically, so when both shapes coexist the OLDER full-stem report wins over a newer short one

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-14
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-5 review CR-1 (reviewer confidence high; reproduced by QA: `find` over a fixture with `bug.14.precompact-hook.implementation.1.old.md` beside `bug.14.implementation.2.new.md` → the `.1.` report)
**File**: `skills/finalise/SKILL.md:1510`

## Description
The cycle-4 fix resolves the report with `find … | sort | tail -1`. `sort` orders by the whole path, so a full-stem name (`bug.14.precompact-hook.implementation.1.*`) sorts after a short one (`bug.14.implementation.2.*`) whenever the bug's name sorts after `i` — and a bug that had a pre-task.125 run (full stem) and is re-run after it (short prefix) has both on disk. The older report's verdict is published as the bug's. The same pick drives develop-bug's Step 0 resume `find` (`SKILL.md:83`) and Step 3's `<IMPL_REPORT>`.

## Steps to Reproduce
```bash
D=$(mktemp -d); touch "$D/bug.14.precompact-hook.implementation.1.old.md" "$D/bug.14.implementation.2.new.md"
find "$D" -maxdepth 1 \( -name "bug.14.implementation.*.md" -o -name "bug.14.*.implementation.*.md" \) | sort | tail -1   # → …implementation.1.old.md
```

## Expected Behavior
The highest `.implementation.{N}.` wins regardless of shape (order by N, or by mtime), at every site that picks a report; an executed case with both shapes on disk and the short one newer.

## Actual Behavior
The lexically-last path wins; with both shapes on disk that is the older report.

## Impact
A re-run bug publishes (and resumes from) a stale verdict — a `FAIL` from the first loop over a `PASS` from the second.

## Recommendation
Extract N with `sed -E 's/.*\.implementation\.([0-9]+)\..*/\1 &/' | sort -n | tail -1 | cut -d' ' -f2-` (or equivalent) at 6b and develop-bug Step 0; add the two-shapes-coexist fixture case to the 6b test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 5)

**Root Cause**: `sort` orders the whole path; the two shapes put a different token after the prefix (`implementation` vs the bug's name), so the report number never decided the order.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b and develop-bug Step 0 extract the `.implementation.{N}.` number with `sed -E 's/^(.*\.implementation\.)([0-9]+)(\..*)$/\2 \1\2\3/'`, `sort -n` on it, and `cut` the path back — the highest N wins whatever the shape.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b report lookup ordered by N
- `skills/develop-bug/SKILL.md` — Step 0 resume lookup ordered by N
- `evals/shared/tests/finalise-bug-mode.test.mjs` — both shapes on disk, short one newer → `implementation.2` wins (× bash + zsh)

**Testing**: executed cases green under bash + zsh; mutation: numeric ordering reverted to a plain `sort` → 2 red. `npm run ci:fast` 3724/3724 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 5 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
