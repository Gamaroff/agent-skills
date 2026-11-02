# Sprint Review Summary - Shared-checkout-safe guards and staging

**Story/Task ID:** task.245
**Completed Date:** 2026-10-30
**Pull Request:** [#796](https://github.com/Gamaroff/agent-skills/pull/796)

---

## Summary

When two sessions work in the same checkout, one session's uncommitted edit to a shared file no longer rides into the other's commit, and no longer stops the other's QA review. The task registry is now staged one row at a time, and the QA re-review only stops for files it actually reads.

---

## What Was Delivered

### Acceptance Criteria Met

All 15 success criteria (SC-1 to SC-15) are met; see `task.245.dod.2.shared-checkout-safe-guards-and-staging.md`.

### Key Features Implemented

- `registry-tick.js --stage` stages only the row it wrote, finding it by id, and reports a `stageReason` (staged, already-staged, row-not-in-index, not-tracked, unmerged, not-a-repo, not-attempted). It always exits 0 and makes no network call.
- `/finalise` 6a, `develop-next` Step 4 and the `develop-batch` merge lane commit the registry through `--stage`, not a whole-file add.
- The QA re-review's dirty-tree HALT fires only on tracked changes in the review's change set or beside a changed file, and warns on the rest.

---

## Technical Details

### Files Modified/Created

- `shared/resources/registry-tick.js` and its tests in `shared/resources/tests/`
- `shared/resources/qa-re-review-scope.md` and the generated copies in the qa-task and qa-story skills
- `skills/finalise`, `skills/develop-next`, `skills/develop-batch` (prose)
- `docs/standards/task-registry.md`, `CHANGELOG.md`

### Architecture/Design Decisions

The row is located by id in the index copy, not by line number, so a working file with extra lines above it still stages the right line. The HALT matches an exact directory name, never a prefix.

---

## Testing & Quality Assurance

### Test Coverage

Fast gate: 6913 tests, 0 fail. New tests cover staging, every `stageReason`, the network-free property, the 6a block under bash and zsh, and the HALT cases. Each fix was mutation-proved.

### Code Review

Seven QA gates (CONCERNS 90, 80, 90, 90, then PASS 100 three times) and a Step 5c PR review (CONCERNS, no open finding).

---

## Security & Compliance

### Security Review

The dirty-tree HALT was probed with 14 hostile and legitimate inputs; none reproduced. `stageRow` runs git with argument arrays only.

### Compliance Review

Not applicable.

---

## Documentation

### Updated Documentation

`docs/standards/task-registry.md` (the staging rule), the five skills' prose, and `CHANGELOG.md`.

---

## Impact & Value

### Technical Impact

Parallel sessions on one checkout stop contaminating each other's commits. `npm test` time is unchanged (+0.6% against develop).

---

## Known Limitations & Future Work

### Current Limitations

None blocking.

### Suggested Follow-Up

Low-severity items from the gates: a single-stage `unmerged` case; a wider network preload; the develop-batch `already` arm wording; a trap for the DIRTY_Z temp file; a distinct stageReason for a failed `hash-object` or `update-index`.

---

**Status:** ✅ **ACCEPTED**
