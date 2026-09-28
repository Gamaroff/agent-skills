# Bug Report: Task 150 - a park vector resolves to the first same-prefix file in the whole log

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Bug ID**: TASK-150-BUG-4
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (QA cycle 3, safety re-probe code review CR-1 and CR-2)
**Date Found**: 2026-09-28

## Description

Cycle 2 keyed the seed's identity on the file prefix, and refuses a duplicate **among the selected
entries**. `set-status --id N` resolves through `findById` (`shared/resources/observation-log.js`),
which returns the **first file in the whole log** whose numeric prefix is N. When another file shares
the prefix, the vector parks that file instead. § 5 step 2b's "still open" re-check matches on the
scan `id`, not the file, so it reads the open target and lets the vector through.

## Steps to Reproduce

Scratch workspace: `0005-a-actioned.md` (frontmatter `id: 4`, `status: actioned`) beside
`0005-b-target.md` (`id: 5`, `status: open`). Select the target and seed it:

```
vector: ["set-status","--id","5","--status","parked",…]
set-status: {"reason":"ok","id":5,"file":"0005-a-actioned.md",…}
after: 0005-a-actioned.md parked   0005-b-target.md open
```

## Expected Behavior

An ambiguous id parks nothing. Either the seed refuses when any other file in the log shares the
target's prefix, or the engine refuses a `--id` that more than one file matches.

## Actual Behavior

An actioned entry is silently rewritten to `parked`, `set-status` reports `ok`, and the selected
entry stays open.

## Impact

A resolved observation's lifecycle is overwritten, and the review queue now carries a false record.
Duplicate prefixes arise only outside the engine's own writer (a hand-created file, or a consolidated
fork), which is exactly the state the engine's `fork-detected` handling exists for.

## Recommendation

Fix the root, which is shared by every `set-status` caller: `findById` should report `ambiguous-id`
when more than one file matches, and `set-status` should refuse with a non-zero exit. Then key the
§ 1.1 selection and the § 5 re-check on the scan entry's `file`.

## Developer Fix Cycle

### Iteration 1 (operator-directed fix after the QA loop escalation)

**Date**: 2026-09-28

**Root Cause**: `findById` returned the first file whose numeric prefix matched, and `set-status`
never read the current status. No seed-side check can see the whole log, so the fix belongs in the
engine.

**Fix Implementation**:

- `shared/resources/observation-log.js`: `findAllById` returns every match. `set-status` refuses
  `ambiguous-id` (exit 1, `files[]`) when there is more than one, and the new `--expect-status s`
  refuses `status-changed` (exit 1) when the entry no longer reads `s`. An unknown `s` is a usage
  error. The contract table documents both reasons.
- `skills/create-task/scripts/lib.js`: every park vector carries `--expect-status open`. The
  agreement check reads the raw frontmatter id from the entry's file text, closing cycle-3 CR-3
  (`7abc` in `0007-*.md`).
- `skills/create-task/SKILL.md`: § 1.1 selects by `file` and refuses an id that matches no file or
  several. § 5 step 2b relies on the engine's check and drops the by-hand re-scan (cycle-3 CR3-2).

**Testing**: engine: 2 new tests (the ambiguous two-file fixture, and `--expect-status`
mismatch/match/unknown). Seed: an end-to-end test through the real engine (a same-prefix sibling
answers `ambiguous-id`, and an entry changed after selection answers `status-changed`; neither file
is touched), plus the raw-id test. Mutation-proved: the engine first-match, no expect check, and no
expect validation each go red; the pre-fix seed, and a seed without the raw read, each go red.

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | --------------------------------------------------- |
| 2026-09-28 | New | QA | Cycle 3 unscoped review, reproduced |
| 2026-09-28 | Ready for QA | dev (operator-directed) | Root fix in the engine plus `--expect-status` |
| 2026-09-28 | Closed | QA | Cycle 4: the end-to-end park probe engages 10/10 |
