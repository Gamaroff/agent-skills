# Sprint Review Summary - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones

**Story/Task ID:** task.160
**Epic:** — (standalone task)
**Completed Date:** 2026-09-27
**Completed By:** Claude (autonomous `/develop-task` run)
**Pull Request:** [#499](https://github.com/Gamaroff/agent-skills/pull/499)

## Summary

The develop pipelines end with a blocking Step 8 checklist. Its check 4 refused two unfinished states by name (`⏳ Pending` and `⏸ Paused`). A `❌ Failed`, `⚠️ Needs Attention` or empty Status cell passed, and so did a table with a header and no rows. Check 4 now admits only a finished Status, meaning a cell that starts with `✅` or reads `⏭️ Skipped`. It finds the Status column by its header and fails closed. Step 8 now writes its own report row before its commit, so checks 4 and 5 can both hold on a correct run.

## What Was Delivered

### Acceptance Criteria Met

- ✅ Every finished Status shape passes under bash and zsh
- ✅ Failed, Needs Attention, Cycle, paused-glyph Skipped and empty rows fail, and the failing row is named
- ✅ Bug-variant reports: the Status column is found by header, not by position
- ✅ A header-only table fails, and so does a table with no Status column, each with its own message
- ✅ Step 8's row is set before its commit, and nothing edits the report after it
- ✅ Every existing checklist case still passes. Each branch is mutation-proved and the gates are green
- ✅ CHANGELOG `[Unreleased]` entry citing (task 160)

### Key Features Implemented

1. **Allowlisted check 4**: one awk pass over the Pipeline Progress rows. It locates the Status cell by header and admits `✅…` or `⏭️ Skipped` only.
2. **Fail-closed table guards**: `no step rows under the header` and `no Status column in the header row` are separate failures. An awk failure is a failure, not an empty result.
3. **Step 8 ordering**: the report's final fields and Step 8's own row are written before `/commit-changes`. The post-commit hash write is gone, and the Step Transition Protocol's action 2 is a no-op after Step 8.
4. **Resume rule for a record at step 8** (added by QA): a lock, halt snapshot or orphaned claim at step 8 means the Step 8 row is not evidence. Resume goes back to the first unfinished row 1–7, and otherwise re-runs Step 8.

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-8-commit.md`: check 4 and Step 8 ordering, plus bundled copies
- `shared/resources/develop-pipeline-resume-contract.md`: the step-8 resume rule (Phase 0b), bundled into 9 skills
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`: Shared Resume Logic points at the rule
- `skills/develop-{task,story,bug}/SKILL.md`: Step 8 summaries, action 2 no-op after Step 8, recovery exception
- `shared/resources/tests/step-8-completion-checklist.test.mjs`: executed cases × bash/zsh, the real PreCompact hook, the lock helper and Cleanup
- `CHANGELOG.md`: `[Unreleased]` Fixed entry

### Architecture/Design Decisions

- Allowlist over deny-list. A deny-list passes every state it does not name, and there were 20+ finished shapes but an open-ended set of unfinished ones.
- The resume record decides Step 8, not the row or git. The row is `✅` before the commit, and the PreCompact hook commits and pushes the report, so neither can tell a paused Step 8 from a finished one.
- The pre-existing window after the Step 8 commit, where no record survives (`a284dfdd`), was deliberately kept out of scope → task.161.

### Dependencies

None. No breaking changes: check 4 admits every finished shape the report templates produce.

## Testing & Quality Assurance

### Test Coverage

- Executed checklist cases under bash and zsh in the per-PR `npm test` lane. `ci:fast`: 4322 pass, 0 fail.
- Mutation proofs: M1–M8 at develop, plus proofs on every QA fix cycle. Cycle 6 added two more: the Step 7 wording and `finalise) NEXT=8`.

### Code Review

- 6 QA cycles (3, then 2 and 1 granted after loop-limit escalations). The final gate.6 is PASS 100.
- Step 5c `/review-pr`: APPROVE, with 4 low advisory findings (PC-1, PC-2, CR-1, CR-2).

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- The boundary deliverable (check 4) was probed with the engine: 21 cases executed against the shipped block under bash and zsh, 0 reproduced, verdict `engages`
- No secrets, no unsafe exec, no new dependencies

### Compliance

Not applicable. This is internal developer tooling.

## Documentation Updates

- Step 8 step document, resume contract, step-0 doc, three orchestrator SKILL.md files, and CHANGELOG

## Demo Notes

- Run `node --test shared/resources/tests/step-8-completion-checklist.test.mjs`. The `[bash]`/`[zsh]` cases show each refused and admitted Status shape.

## Known Limitations / Future Work

- **task.161**: after the Step 8 commit no resume record survives, a Step 8 HALT writes no snapshot, and the detector recommends step 9. It also absorbs pr-review.1 CR-1 (a generic post-step Pipeline Progress line) and CR-2 (the order of the recovery exception).
- CR6-1: no Phase 2 completion template has a Commit field for Step 8's final hash.
- CR6-2: replace the non-discriminating before-commit case with the negative case.
