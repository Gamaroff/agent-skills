# Bug Report: Task 125 - `{bug-prefix}` has two definitions — the full filename stem in develop-bug's Step 0, the short id everywhere else — so writers and readers of a bug's artefacts disagree by construction

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-18
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-6 review CR-1 (reviewer confidence high; verified by QA by reading `develop-bug-step-0-resolve-bug.md:22` against `develop-bug/SKILL.md:184`, finalise 6a `STEM`, and `bug-doc.js` `bug_id`/`bug_stem`; the corpus confirms the split — `.review.` and `.implementation.` files exist in both shapes, every `.dod.` file is short)
**File**: `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:22`

## Description
Step 0's resolver returns `{bug-prefix}` as "the filename stem before `.md`, e.g. `bug.7.stale-token`" — the full stem. `SKILL.md:184` defines the id as the short prefix (`bug.{N}`, `task.{id}.bug.{n}`), finalise binds `STEM` to the short prefix and names the DoD `bug.14.dod.1.*`, `bug-doc.js` reports them separately as `bug_id` and `bug_stem`, and the cycle-5 note at `SKILL.md:344` asserted the short form "that Step 1 defines" — but Step 1 defines nothing; Step 0 does, and it says full. Every `{bug-prefix}` consumer then inherits whichever meaning the agent picked: the implementation report and the review report were written in both shapes across 15 real bug runs; the lock's `task_or_story_id`, the report's `bug:` field and the `docs({bug-prefix}):` commit scopes carry the full stem; step-7's `./{bug-prefix}.md` links *need* the full stem (they point at the bug file); step-7's `{bug-prefix}.dod.{N}.*.md` check *needs* the short one (finalise writes it). The cycle-4/5 "both shapes" contract was applied to the readers, and the enumeration test greps reader lines — neither looked at the definition the readers key on.

## Steps to Reproduce
`grep -n 'bug-prefix' skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` (line 22: full stem) vs `grep -n 'id\*\* = the bug prefix' skills/develop-bug/SKILL.md` (short). `find docs -name '*bug*.review.*'` → both shapes; `find docs -name '*bug*.dod.*'` → short only.

## Expected Behavior
One meaning: `{bug-prefix}` is the short id `bug-doc.js` reports as `bug_id` — matching finalise's `STEM` and the DoD it writes — and a second placeholder, `{bug-file-stem}`, is the full filename stem for the two places that address the bug file itself. The resolver returns both. Readers of artefacts that earlier runs wrote in the other shape (`.implementation.`, `.review.`) accept both; the enumeration test asserts the definition line as well as the reader lines.

## Actual Behavior
Two definitions; each consumer picks one; artefacts drift by run.

## Impact
Resume, the fix-commit exclude and the DoD check can each miss the artefact a different step just wrote — the class of defect BUG-13/14/17 fixed one reader at a time.

## Recommendation
Rewrite step-0 line 22 (short id + `{bug-file-stem}`), the step-7 links (`./{bug-file-stem}.md`), the step-2 review globs (two-shape `find`), `SKILL.md:344` ("Step 0 defines"); extend the enumeration test to the definition line and to `.review.*` readers.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 6)

**Root Cause**: `{bug-prefix}` was defined in `develop-bug-step-0-resolve-bug.md` as the full filename stem when the skill was written, and every later consumer (the lock id, the DoD that `finalise --bug` names on `STEM`, `bug-doc.js`'s `bug_id`, `SKILL.md`'s own id line) meant the short id. Two definitions, no reader of the definition — the readers were fixed one at a time (BUG-13/14/17) while the split stayed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: Step 0 now returns two named values and defines each once: `{bug-prefix}` is the short id (`bug-doc.js` `bug_id`; keys every artefact the pipeline writes; = finalise's `STEM`) and `{bug-file-stem}` is the full filename stem (`bug_stem`; addresses the bug file). Step 7's two bug-file links use `{bug-file-stem}`; Step 2's review-report lookups use a two-shape `find` ordered by N (review-bug's own `BUG_PREFIX` is the full stem, so its reports are full-stem by spec and older ones are short); `SKILL.md:344` cites Step 0 and names `{bug-file-stem}`. The enumeration test now reads `.review.*` readers too and asserts the definition lines themselves (one short-id definition with `bug_id`, one full-stem definition with `bug_stem`, no line in develop-bug that still says "the filename stem before .md", no `./{bug-prefix}.md` link).

**Files Modified**:
- `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` — the two definitions
- `skills/develop-bug/references/develop-bug-step-7-close-bug.md` — links on `{bug-file-stem}`
- `skills/develop-bug/references/develop-bug-step-2-review.md` — two-shape review lookups (×2)
- `skills/develop-bug/SKILL.md` — File References note
- `evals/shared/tests/finalise-bug-mode.test.mjs` — enumeration extended to `review`; definition test

**Testing**: definition test + enumeration green; mutations: step-0 definition reverted to the full stem → 1 red; step-7 link back to `{bug-prefix}` → 1 red; step-2 find back to one shape → 1 red. `npm run ci:fast` 3729/3729 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. `grep -n 'bug-prefix\|bug-file-stem' skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` — one definition each.
2. Revert step-0's short-id line and confirm the definition test goes red.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 7 (Re-Review Context table of `task.125.qa.7.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: one definition line each for {bug-prefix} and {bug-file-stem}; definition test green.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 6 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 7 — one definition line each for {bug-prefix} and {bug-file-stem… |
