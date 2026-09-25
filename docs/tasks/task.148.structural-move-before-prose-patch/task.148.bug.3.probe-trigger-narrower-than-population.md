# Bug Report: Task 148 - Step 3.5 probe trigger is narrower than its population

**Task**: [task.148](./task.148.structural-move-before-prose-patch.md)
**Bug ID**: TASK-148-BUG-3 (QA cycle 2 code review CR-1)
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 2, refute pass)
**Date Found**: 2026-09-25

## Description

Cycle 1 (bug 1) widened qa-fix Step 3.5's population command to include the 70 hand-authored `skills/*/references/*.md`. The paragraph that decides whether the documentation probes run at all still says "When the fix touches a `SKILL.md` or a `shared/resources/*.md`". A fix that edits only a hand-authored reference therefore never reaches row 1, and never writes a `Probe:` block. The same set is stated twice, and cycle 1 edited only one of the two statements.

## Steps to Reproduce

`sed -n 670,672p skills/qa-fix/SKILL.md`: the trigger names two file classes; the population block below it names three.

## Expected Behavior

The trigger covers every executed document the population covers.

## Actual Behavior

A fix to `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` skips the documentation probe.

## Impact

The obs #174 class survives in exactly the files cycle 1 added.

## Recommendation

Widen the trigger, and hold the two sets equal with a test. The set is stated twice, which is the Step 2.6 consolidate shape.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

Confirmed at `skills/qa-fix/SKILL.md:671`. Qa-fix Step 2.6 trigger (b) applies, by judgement: this finding is on the subject the previous cycle's fix edited. The set of executed documents was stated twice, once in the trigger sentence and once in the population command, and cycle 1 edited only one of them.

```
Narrowing residue: the set of executed documents the documentation probe covers (repeat subject)
Move: consolidate — the population command becomes the one definition; the trigger names it and a test holds the two equal
```

(The pipeline offer itself did not fire: `medium-files-differ` across gates 1 and 2.)

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

The trigger now reads "an **executed document** — any file the population command below searches", names the three sets, and calls the command the one definition. A new test extracts the command's three `:(top,glob)` globs and asserts that the trigger names each one. Reproduced advisory findings taken in the same cycle: QA2 CR-2 (`:(top,glob)` pathspecs plus `--full-name`, so the result is the same from any cwd; "a population of 0 means the probe did not run — never record 0") and QA2 CR-4 (the engine answers `cycle-missing` for a non-integer cycle; the snippet maps `cycle-missing`, `high-counts-missing`, `gate-unreadable` and `input-unreadable` to `SIGNAL=error`). Also taken: CR-3 (the offer runs only on gate-driven entry to 5b), CR-5 (the prose names the real binders), CR-6 (escaping rule for the Step 7 paste) and CR-9 (test header). Deferred: CR-7 (`:line` suffix — the gate schema forbids it) and CR-8 (marker position — no such file exists today).

**Files Modified**:

- `skills/qa-fix/SKILL.md`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (+ bundled copies)
- `shared/resources/qa-diminishing-returns.js` (+ bundled copies)
- `tests/qa-fix-structural-move.test.js`, `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`, `shared/resources/tests/qa-narrowing-residue.test.mjs`

**Testing**: 121/121. Seven mutations, each red on its named test.

```
Probe: population command for 'executed document' / 'engine did not run' / 'hand-authored'
  skills/qa-fix/SKILL.md — updated (the one statement of the set)
  shared/resources/develop-pipeline-step-5-6-qa-loop.md — updated (the error message now says "could not look")
  other hits (code-review-prompt, probe-boundary-rule, document-change-log, scaffold-tracker-workflow, create-skill, resume-detector) — unaffected — the same words on unrelated subjects
Population: 1 per subject
Move: consolidate (see above)
```

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-25 | New | QA Engineer | QA cycle 2 (refute pass) |
| 2026-09-25 | Ready for QA | qa-fix | Consolidated; mutation-proved |
