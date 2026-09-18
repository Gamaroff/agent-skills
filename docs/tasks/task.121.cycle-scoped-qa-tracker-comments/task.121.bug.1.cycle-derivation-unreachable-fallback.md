# Bug Report: Task 121 - Cycle derivation prints the whole path on a non-numeric gate name, so the documented fallback to `1` is unreachable and the stage becomes invalid

**Task**: [Link](./task.121.cycle-scoped-qa-tracker-comments.md)
**Bug ID**: TASK-121-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-18

## Description

The three cycle derivations introduced/promoted by task.121 —
`skills/qa-task/SKILL.md` (`QA_CYCLE`, ~:1273), `skills/qa-story/SKILL.md` (`QA_CYCLE`, ~:1863) and
`skills/qa-fix/SKILL.md` (`FIX_CYCLE`, :820) — use
`sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'` **without `-n`/`p`**. When the newest gate filename has no
numeric segment, `sed` prints the input line unchanged, so the variable holds the **full path** rather
than the empty string, and `${QA_CYCLE:-1}` / `${FIX_CYCLE:-1}` never fires. qa-story's own File
Naming Conventions section (~:2882) still documents the number-less form
`story.[epic].[story].gate.[descriptive-name].yml` / `task.[number].gate.[descriptive-name].yml`.

Before this task a bad cycle only dropped a slot (the stage was always the valid bare name). Now the
cycle is the stage suffix, so a path-valued cycle yields `--stage "qa-gate-/abs/path/…yml"`:
`stakeholder-summary-cli.js` exits 2 (verified), the `|| exit 1` aborts the PR-comment block, and the
tracker call also exits 2 — the fix made a previously degraded path into an aborting one.

## Steps to Reproduce

```bash
echo "/x/task.121.gate.yml" | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'     # prints the path
echo "/x/task.121.gate.yml" | sed -nE 's/.*\.gate\.([0-9]+)\..*/\1/p'   # prints nothing → fallback reachable
command node shared/resources/stakeholder-summary-cli.js --stage "qa-gate-/x/task.121.gate.yml"; echo $?   # 2
```

## Expected Behavior

A gate filename without a numeric segment leaves the cycle empty, the `:-1` fallback fires, and both
comments post under `qa-gate-1` / `qa-fix-1`.

## Actual Behavior

The cycle holds the path; the lead CLI rejects the stage (exit 2); the PR-comment block aborts on
`|| exit 1`; the tracker comment exits 2 and posts nothing.

## Impact

Latent: `qa-gate` writes numbered gates today and no number-less gate exists in the corpus. But the
fallback the adjacent comment promises ("an unfound gate falls back to 1") is unreachable for the
non-match case, and the failure mode is a silent-to-the-reader abort of the QA comment block.

## Recommendation

Use the printing form at all three sites — `sed -nE 's/.*\.gate\.([0-9]+)\..*/\1/p'` — so a
non-match yields the empty string and the existing `${VAR:-1}` fallback is reached. Add one line to
the qa-fix/qa-task/qa-story tests (or a snippet-level check) asserting the derivation is empty on a
number-less name. Found by the Step 3b diff reviewer as CR-1 and verified by QA.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-18
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root Cause Analysis**: `sed -E 's/…/\1/'` is a substitution in *print-every-line* mode — on a
line the pattern does not match, `sed` prints the line unchanged. The derivation piped the newest
gate's full path through it, so a number-less name came out as the path, `${VAR:-1}` saw a non-empty
value, and the suffix became a path. The three sites were written to the same shape from the
pre-existing `qa-fix` derivation, which had the same defect but no consequence while its output was
only a lead slot (dropped on non-numeric) rather than a stage.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-18

**Fix Description**:
- `sed -nE 's/…/\1/p'` at all three sites — `-n` suppresses the default print, `p` prints only on a
  match, so a non-match yields the empty string and the existing `:-1` fallback fires.
- One sentence beside each derivation says why `-n … p` is load-bearing.

**Files Modified**:
- `skills/qa-task/SKILL.md` — derivation (~:1276) + comment
- `skills/qa-story/SKILL.md` — derivation (~:1866) + comment
- `skills/qa-fix/SKILL.md` — derivation (:821) + comment
- `tests/qa-cycle-derivation.test.js` — **new**: extracts the shipped derivation lines from each
  SKILL.md and runs them in `bash` against fixture directories — newest-by-mtime gate → its number;
  empty dir → `1`; number-less gate → `1` (the BUG-1 case); plus a same-shape assertion across the
  three sites so a fix applied at one and not the others fails before QA finds it.

**Testing**:
- `tests/qa-cycle-derivation.test.js`: 10/10 pass.
- Mutation proof: the non-printing `sed` restored at `qa-story` → its BUG-1 test **and** the
  same-shape test go red; restored → green.
- `npm run ci:fast` green (3426 tests, 3425 pass, 1 skipped).

**Verification Steps for QA**:
1. `command node --test tests/qa-cycle-derivation.test.js` — 10 pass.
2. `printf '/x/task.121.gate.yml' | sed -nE 's/.*\.gate\.([0-9]+)\..*/\1/p'` prints nothing.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-18 | New | QA Engineer | Found as CR-1 by the Step 3b diff reviewer; verified by QA |
| 2026-09-18 | In Progress | qa-fix | Investigation — print-every-line sed |
| 2026-09-18 | Ready for QA | qa-fix | Fix at three sites + pinning test |
