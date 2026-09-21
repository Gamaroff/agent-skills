# Bug Report: Task 125 - 6b's implementation-report glob keys on the short bug id, but develop-bug names the report with the full filename stem — so on every recent real bug run the glob matches nothing and bug mode HALTs

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-13
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-4 review CR-1 (reviewer confidence high; verified by QA by executing the 6b glob against real bug directories — see Steps to Reproduce)
**File**: `skills/finalise/SKILL.md:1493`

## Description
The cycle-3 fix for BUG-12 derives the bug's verdict in-block from `ls {document-directory}/${STEM}.implementation.*.md`, where `STEM` is the bug prefix bound at 6a (`bug.14`, `task.67.bug.3`). develop-bug's own spec agrees on the prefix (`SKILL.md:184` — the id is `bug.{N}` / `task.{id}.bug.{n}`), but the reports it actually writes carry the **full** filename stem: the three most recent runs (bug.13, bug.14, bug.15 — 2026-09-12) are all `bug.14.precompact-hook-bare-tracker-comment.implementation.1.*.md`, as are bug.1 and bug.8; five older runs use the short id. `bug-doc.js` `findRelatedBugDocs` already documents that both shapes exist and matches on `[bugStem, bugId]`. The 6b glob matches only the short shape, so on a full-stem report `IMPLEMENTATION_REPORT` is empty and the BUG-12 HALT fires (`no **Verdict**: line found`) on a run that has a verdict. The fixture in `finalise-bug-mode.test.mjs` names its report `task.67.bug.3.implementation.1.run.md` (short shape) and so cannot see this.

Same line, second defect (CR-3, low): `awk '{print $(2)}'` publishes the raw second token, and 9 of the 25 `**Verdict**:` lines in real reports are written `**Verdict**: **PASS**` — `FINAL_GATE` then reads `**PASS**` in the PR comment and the tracker `done` comment.

## Steps to Reproduce
```bash
for STEM in bug.14 bug.12; do
  D=$(ls -d docs/bugs/${STEM}.*/)
  R=$(ls ${D}${STEM}.implementation.*.md 2>/dev/null | sort | tail -1)
  echo "STEM=$STEM -> IMPLEMENTATION_REPORT='${R}'"
  grep -E '^\*\*Verdict\*\*:' "${R:-/dev/null}" | tail -1 | awk '{print $(2)}'
done
# bug.14 -> ''            (full-stem report; 6b HALTs)
# bug.12 -> '**PASS**'    (short-id report; verdict carries the asterisks)
```

## Expected Behavior
6b finds the report in either shape (`${STEM}.implementation.*.md` **or** `${STEM}.*.implementation.*.md`, or the `bug_stem` from `bug-doc.js` beside `bug_id`), normalises the verdict to a bare `PASS|FAIL` token, and the fixture test carries a full-stem report so the mismatch is pinned. The `qa-reports` marker and the `<IMPL_REPORT>` prose follow the same rule, and develop-bug's `{bug-prefix}` and finalise's `STEM` are reconciled to one meaning.

## Actual Behavior
`bug.14` → empty report → HALT exit 1; `bug.12` → `**PASS**` published as the final gate.

## Impact
`/finalise --bug` — the only DoD path develop-bug has after this task — halts on every spec-conformant recent bug run, which is the pipeline this task exists to make work; the fixture test is green on the shape the pipeline no longer produces.

## Recommendation
Glob both prefixes in 6b; strip `*` / take the first `PASS|FAIL` token from the verdict line and HALT when it is neither; add a full-stem fixture report to the 6b test (and keep the short-stem one); apply the same two-shape rule to the Step 2 `qa-reports` marker and the `<IMPL_REPORT>` prose; note the two shapes beside develop-bug `SKILL.md:336` so the next writer does not pick one.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 4)

**Root Cause**: The cycle-3 fix keyed the report on `${STEM}` — the short prefix develop-bug's Step 1 defines — and develop-bug's own runs have written the report under the bug file's full stem since bug.13 (its Step 0 resume glob has the same defect, and would find nothing on resume). The two shapes are both real (`bug-doc.js` matches `[bugStem, bugId]` for that reason); a reader that accepts one is wrong on half the corpus. A second `ls` glob is not a fix either: zsh aborts a command whose glob matches nothing, and one of the two shapes is always absent, so two globs HALT on every bug under zsh.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b resolves the report with `find {dir} -maxdepth 1 \( -name "${STEM}.implementation.*.md" -o -name "${STEM}.*.implementation.*.md" \)` — quoted patterns, identical under bash and zsh, the same two prefixes `bug-doc.js` accepts — and extracts the verdict as the first `PASS|FAIL` token of the last `**Verdict**:` line (`grep -oE`), HALTing when the line names neither (CR-3). The `<IMPL_REPORT>` prose in Step 3 names both shapes. develop-bug's Step 0 resume glob takes the same `find`, and its File References line states that `{bug-prefix}` is the short prefix, that earlier runs wrote the full stem, and that every reader accepts both. (CR-2 in the same block: a STEM that is a bug prefix with `--bug` absent from the block's args is a HALT, not a task.)

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b block (`find` over both shapes; bare verdict token; STEM-vs-flag cross-check); Step 3 `<IMPL_REPORT>` prose
- `skills/develop-bug/SKILL.md` — Step 0 resume `find`; File References line for the report
- `evals/shared/tests/finalise-bug-mode.test.mjs` — `sixBFixture({ shape: "full" })`; 4 new executed cases × bash + zsh: full-stem report found; bolded verdict → bare token; neither-token verdict → HALT; bug STEM without `--bug` → HALT; the no-verdict HALT message pinned to its new text

**Testing**: 8 new cases green under bash + zsh; mutations: `find` reverted to the short-only `ls` glob → 2 red; `grep -oE` reverted to `awk '{print $(2)}'` → 4 red; STEM cross-check removed → 2 red. `npm run ci:fast` 3705/3705 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. `for STEM in bug.14 bug.12; do D=$(ls -d docs/bugs/${STEM}.*/); find $D -maxdepth 1 \( -name "${STEM}.implementation.*.md" -o -name "${STEM}.*.implementation.*.md" \); done` — both found, under bash and zsh.
2. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; revert the `find` to the short-only glob and confirm the full-stem cases go red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 4 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
