# Bug Report: Task 54 — `--print-plan` skips moment validation when combined with `--probe-board` / `--check`

**Task**: [task.54.github-board-interception.md](./task.54.github-board-interception.md)
**Bug ID**: TASK-54-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA (qa-task cycle 1)
**Date Found**: 2026-08-19

## Description

`gh-stage.js` validates `--stage` against `tw.MOMENTS` and lowercases it inside the
`if (!args.probeBoard) { … }` block. `--print-plan` was added **after** that block, so any flag that
sets `probeBoard` skips the validation and the new mode then runs on an unvalidated stage.

Three flags set it: `--probe-board` directly, and `--check` / `--init-workflow` which set it
internally (`if (args.check) args.probeBoard = true;`).

## Steps to Reproduce

```bash
# Validated path — correct
node shared/resources/gh-stage.js --stage nonsense --print-plan
# → Error: unknown moment "nonsense". Known: work-started, in-review, …   (exit 2)

# Bypassed path — wrong
node shared/resources/gh-stage.js --probe-board --stage nonsense --print-plan
# → {"stage":"nonsense","reason":"plan","enabled":false,"targets":null, …}   (exit 0)

# Canonicalisation is skipped too
node shared/resources/gh-stage.js --stage DONE --print-plan            # → "stage": "done"
node shared/resources/gh-stage.js --probe-board --stage DONE --print-plan  # → "stage": "DONE"
```

## Expected Behavior

An unknown moment exits 2 with the "unknown moment" message regardless of which other flags are
present, and the emitted `stage` is always the canonical lowercase form.

## Actual Behavior

With `probeBoard` set, a typo'd moment returns `enabled: false, targets: null` and **exit 0**, and
the echoed `stage` preserves the caller's casing.

## Impact

`enabled: false, targets: null` is the same payload a **legitimately disabled** moment produces —
one that the consumer deliberately omitted from `pipeline:`. A caller cannot tell the two apart, so a
typo reads as "this moment is switched off" and the corresponding board move is silently dropped from
a manual checklist. That is the failure mode this task exists to remove, reintroduced through a flag
combination.

Reachability is limited but real: `--check` is documented as the CI mode, so
`gh-stage.js --check --stage done --print-plan` is a plausible script and hits the bypass.

The casing half is cosmetic on its own, but it means the JSON's `stage` field can disagree with the
canonical vocabulary every other payload in this CLI uses.

## Recommendation

Validate the moment for `--print-plan` on its own terms rather than relying on the non-probe branch —
the two modes have genuinely different argument requirements (`--print-plan` needs no `--issue`), so
sharing one gate was the mistake. Either:

- hoist the `MOMENTS` check + lowercase so it runs whenever `args.stage` is set, or
- add the check to the `if (args.printPlan)` block before it resolves.

Add a test asserting exit 2 for an unknown moment **with** `--probe-board` present, and one asserting
the emitted `stage` is lowercase on that path. Without the first, this regresses silently the next
time a mode is added above the validation block.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-19

Root cause is placement, not logic. The `MOMENTS` check and the lowercasing live inside
`if (!args.probeBoard) { … }`, and `--print-plan` was added below that block. Three flags set
`probeBoard`: `--probe-board` directly, `--check` and `--init-workflow` internally.

The deeper reason it was wrong to share that gate: `--print-plan` and the move path have genuinely
**different argument requirements** — `--print-plan` needs no `--issue`. One condition covering both
had to be weakened to accommodate that, and weakening it dropped the validation the new mode still
needed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-19

**Fix**: validate the moment and canonicalise the casing inside the `if (args.printPlan)` block, on
its own terms. The comment records why the check is duplicated rather than shared, so a later reader
does not "de-duplicate" it back into the bug.

**Files modified**:

- `shared/resources/gh-stage.js` — validation at the head of the `--print-plan` block
- `shared/resources/tests/stage-access-gate.test.mjs` — 7 new tests

**Testing** — 6 parameterised tests across all three bypass flags, plus a guard:

| Case | Result |
| ---- | ------ |
| Unknown moment, no extra flag / `--probe-board` / `--check` | exit 2 for all three |
| `--stage DONE` canonicalises to `done`, all three | ✅ |
| `--probe-board` **without** `--print-plan` still reaches the board read | ✅ |

That last one is the regression guard: the obvious wrong fix is to hoist the check so it always runs,
which would make `--stage` mandatory for the probe path that legitimately takes none.

**Mutation-proved**: reverting the validation turns the suite red (13 pass / 24 fail).

**Noted, not fixed**: `--check --print-plan` resolves the plan and skips the check. That ordering
predates this fix and is unchanged by it; combining a validator with a resolver is ambiguous either
way, and `--check` alone was verified still to validate normally (exit 0 on a clean file).

**Verification steps for QA**:

1. `gh-stage.js --check --stage nonsense --print-plan` → exit 2, "unknown moment"
2. `gh-stage.js --probe-board --stage DONE --print-plan` → `"stage": "done"`
3. `gh-stage.js --probe-board` (no `--stage`) → still probes the board

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-19 | New | QA | Found in qa-task cycle 1 |
| 2026-08-19 | In Progress | qa-fix | Root cause: shared validation gate, differing arg requirements |
| 2026-08-19 | Ready for QA | qa-fix | Validated on its own path; 7 tests; mutation-proved |

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-08-19 · **Verified by**: QA cycle 2

Re-ran this report's own verification steps rather than reading the diff. All passed. See
[task.54.qa.2.github-board-interception.md](./task.54.qa.2.github-board-interception.md).

| 2026-08-19 | Closed | qa-task | Verified by re-execution in QA cycle 2 |
