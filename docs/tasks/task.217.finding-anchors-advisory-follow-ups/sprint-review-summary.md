# Sprint Review Summary - Finding-anchors advisory follow-ups

**Story/Task ID:** task.217
**Completed Date:** 2026-10-24
**Completed By:** Lorien Gamaroff (develop-task pipeline, via /develop-next)
**Pull Request:** [#745](https://github.com/Gamaroff/agent-skills/pull/745)

---

## Summary

The review skills now post or edit only what the anchor checker has actually verified. Before this task, `--inline` trusted any `anchor_check` string, a non-object finding crashed the checker, and `review-code --staged --fix` could edit a tree the checker never read. Now the checker stamps every file it annotates. Both `--inline` guards refuse a file with no stamp or a stale one, and `--fix` applies only the list the checker itself returns.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A non-object finding (`null`, `"x"`) is refused as `usage`, naming its position, and `--annotate` writes nothing
- [x] `--annotate` stamps `anchor_checked` with the total finding count across both lenses
- [x] Both `--inline` guards HALT on a missing stamp, a stale count or an unknown verdict
- [x] Both inline selectors split on the last colon and post the trimmed path the checker verified
- [x] review-code's `--inline` block runs with only its documented placeholders substituted
- [x] `--staged --fix` skips a file whose working tree differs from the reviewed index, and says why
- [x] The blocks test derives the dispatcher population from the tree and fails on an unlisted fifth
- [x] A refusal reads no files, and each distinct path is still read once per run
- [x] Every fix is mutation-proven; CHANGELOG names both breaking changes; bundled copies are regenerated

### Key Features Implemented

- **The checker's stamp**: `--annotate` writes `anchor_checked: {by, findings, tree, root}`. The guards check it, so a reviewer-written `anchor_check` or a file that has gained findings since the run is refused.
- **`finding-anchors.js --fix-list`**: review-code Step 5 asks the checker which findings may be applied. The tree and root come from the stamp, so `--staged` never edits a working tree that differs from the index it reviewed. This was hardened over QA cycles 1–3: the stamp guard, the target check, and failing closed outside the repository root.
- **One anchor grammar**: the inline selectors use the checker's own `(\S+):(-?\d+)` parse, so the path that is posted is the one that was verified.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finding-anchors.js` (+4 bundled copies) - non-object refusal, the stamp, `--fix-list`
- `skills/review-pr/SKILL.md`, `skills/review-code/SKILL.md` - stamp guards, the selector grammar, the Step 5 fenced block
- `shared/resources/tests/finding-anchors.test.mjs`, `skills/review-code/tests/review-code.test.js`, `skills/review-pr/tests/review-pr.test.js`, `evals/shared/tests/finding-anchors-blocks.test.mjs` - tests, including the shipped blocks run against temp repositories
- `CHANGELOG.md` - the [Unreleased] › Fixed entry

### Architecture/Design Decisions

The rule that decides what `--fix` may touch lives in the engine (`--fix-list`), not in shell prose. Three QA cycles showed that a guard written as a fenced block drifts from the checker it depends on. A single CLI answer is testable from any directory, so it cannot drift.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** The `--inline` guards require the checker's stamp. A non-object finding is refused as `usage`. Both are in the CHANGELOG with a migration path.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 255 tests across the four targeted suites, 0 fail; the full fast gate 6273/6287 (0 fail, 14 skipped)
- **Integration Tests:** the shipped SKILL.md blocks are extracted and run under bash against temp git repositories
- **Test Coverage:** every success criterion has a code citation and a per-PR test (DoD 1)

### Code Review

- **Reviewers:** four QA cycles (gate 4 PASS 100/100); the Step 5c PR conformance review (APPROVE)
- **Approval Status:** ✅ Approved (the repository requires no reviews)
- **Review Comments Addressed:** 12 of 12 promoted findings across cycles 1–3; BUG-1 to BUG-5 closed

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The three boundary guards were probed with the engine: 73 executed, 0 reproduced, 0 escapes (`task.217.dod.1.security.run.json`)
- [x] No secrets, no `eval`/shell execution added in shipped code
- [x] No dependency changes

### Compliance Review

✅ **Compliance Requirements Met**

- [x] Not applicable — internal skill tooling; no personal, payment, UI or health data

---

## Documentation

### Updated Documentation

- [x] `skills/review-pr/SKILL.md` and `skills/review-code/SKILL.md` — the guards, the stamp and `--fix-list`
- [x] `CHANGELOG.md` — [Unreleased] › Fixed (task 217), both breaking changes named

### Documentation Links

- [DoD verification](./task.217.dod.1.finding-anchors-advisory-follow-ups.md)
- [QA report, cycle 4](./task.217.qa.4.finding-anchors-advisory-follow-ups.md)

---

## Demo Notes

### How to Verify

1. Run `/review-code --inline` on a findings file that has no `anchor_checked` stamp: it HALTs and posts nothing.
2. Stage a file, edit it again in the working tree, then run `/review-code --staged --fix`: the finding is skipped with "working tree differs from the staged content that was reviewed".
3. Expected outcome: no comment or edit reaches a line the checker did not verify.

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

Inline review comments land on the line they describe, and `--fix` never edits a file the review did not see.

### Technical Impact

Nine advisory items from task.195's QA gates are closed. The trust boundary is now enforced by the checker and held by tests that run the shipped blocks.

---

## Known Limitations & Future Work

### Current Limitations

- `--fix-list` trusts the stored `anchor_check` verdicts rather than re-binding anchor content in the stamp (gate 3/4 future)
- review-code Step 4.3 reads `$SUMMARY_FILE` with no binding in the block — pre-existing (gate 2 CR-4, gate 4 CR-1)

### Suggested Follow-Up Stories

- Bind `SUMMARY_FILE` in review-code Step 4.3, drop the dead `select($m != null)` and the unfirable `PR_NUMBER` guard (gate 4 CR-1–CR-3)
- Bring the task document's §3 / Phase 3 / Breaking Change 2 in line with `--fix-list` (PR review PC-1)

---

## Metrics _(if applicable)_

- **Story Points:** — (estimated 16 h)
- **Time to Complete:** 2 days (2026-10-23 to 2026-10-24)
- **Lines of Code Changed:** +2455 / -114 outside `docs/tasks/` (12 files)
- **Test Coverage Delta:** not measured

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
