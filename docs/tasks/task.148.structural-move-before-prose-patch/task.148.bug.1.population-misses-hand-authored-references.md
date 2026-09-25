# Bug Report: Task 148 - Step 3.5 population misses hand-authored skills/*/references/*.md

**Task**: [task.148](./task.148.structural-move-before-prose-patch.md)
**Bug ID**: TASK-148-BUG-1 (code review CR-1)
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, diff code review)
**Date Found**: 2026-09-25

## Description

qa-fix Step 3.5 row 1's population command searches `skills/*/SKILL.md` and `shared/resources/*.md`, and its comment says `skills/*/references/` holds generated copies. 70 of the 478 tracked `skills/*/references/*.md` files carry no AUTO-GENERATED marker. They are hand-authored executed documents. One example is `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, which runs `/qa-fix`. Row 1 promises "every executed document that restates the subject", and it leaves these files out.

## Steps to Reproduce

```bash
n=0; for f in $(git ls-files 'skills/*/references/*.md'); do head -5 "$f" | grep -q AUTO-GENERATED || n=$((n+1)); done; echo $n   # 70
```

## Expected Behavior

The population includes every hand-authored executed document, and excludes generated copies by their marker rather than by their directory.

## Actual Behavior

Hand-authored reference documents are never searched. The fixture test cannot notice, because its references decoy (`skills/a/references/x.md`) could not match a `SKILL.md` glob in any case.

## Impact

The obs #174 cross-file pattern can recur in any skill whose rules live in a hand-authored reference.

## Recommendation

Add `':(glob)skills/*/references/*.md'` to the population and drop the files that carry the AUTO-GENERATED marker. In the test, use a generated decoy and a hand-authored file that must count.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

Reproduced: 70 of 478 tracked `skills/*/references/*.md` have no `^<!-- AUTO-GENERATED — DO NOT EDIT` line. The line appears at line 1 or line 5 in all 408 generated copies and in no `SKILL.md` or `shared/resources/*.md`, so it cleanly identifies a generated copy.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

Population command rewritten as `comm -23 <(git grep -l … SKILL.md, references/*.md, shared/resources/*.md | sort) <(git grep -l '^<!-- AUTO-GENERATED — DO NOT EDIT' -- references/*.md | sort)`. Generated copies are removed by their marker, not by their directory. The comment names the 70 hand-authored files and avoids a `shared/resources/<path>` literal: the bundler had rewritten the earlier comment's `shared/resources/tests/fixtures/**` to `references/tests/fixtures/**`. CHANGELOG entry updated.

**Files Modified**:

- `skills/qa-fix/SKILL.md` — Step 3.5 population block
- `tests/qa-fix-structural-move.test.js` — fixture repo gains a hand-authored reference (counts) and a generated copy carrying the marker at line 5 (must not); expected hits 3 → 4
- `CHANGELOG.md`

**Testing**: Mutation-proved: dropping the `references/*.md` glob → population test red; replacing the marker-filter arm with `<(true)` → population test red. Both shells agree (population run under bash and zsh).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-25 | New | QA Engineer | QA cycle 1 |
| 2026-09-25 | In Progress | qa-fix | Root cause confirmed by reproduction |
| 2026-09-25 | Ready for QA | qa-fix | Fixed in QA cycle 1; mutation-proved |
| 2026-09-25 | Closed | QA Engineer | Verified in QA cycle 2 (refute pass) |
