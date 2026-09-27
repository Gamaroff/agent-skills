# Sprint Review Summary - Step 8 check 4 reads the Pipeline Progress table, not the whole report

**Story/Task ID:** task.159
**Epic:** — (standalone task)
**Completed Date:** 2026-09-27
**Completed By:** Claude (autonomous `/develop-task` run)
**Pull Request:** [#497](https://github.com/Gamaroff/agent-skills/pull/497)

## Summary

The develop pipelines end with a BLOCKING Step 8 checklist. Its check 4 searched the whole implementation report for `⏳ Pending`. The pause hook writes that token in prose, so every run that was paused and resumed failed Step 8 with every step done. Check 4 now reads only the Status cells of the Pipeline Progress table. It also refuses a `⏸️ Paused` row and a report with no table.

## What Was Delivered

### Acceptance Criteria Met

- ✅ A paused-and-resumed report passes the Step 8 checklist under bash and zsh
- ✅ A `⏳ Pending` or `⏸️ Paused` row fails check 4, and so does `⏸ Paused` written without U+FE0F
- ✅ A report with no Pipeline Progress table fails, naming the missing table
- ✅ Every existing Step 8 checklist case still passes
- ✅ Each branch is mutation-proved, and the gates are green
- ⏳ Observation #200 → `actioned` is a post-merge follow-up

### Key Features Implemented

1. **Table-scoped check 4**: one awk pass reads the `|` rows under `## Pipeline Progress` and nothing else.
2. **Status-cell match**: a row fails only when a whole cell reads `⏳ Pending` or `⏸ Paused`, with or without the variation selector. A Notes cell that mentions a state is prose and passes. The `/finalise` security probe found this edge and it was fixed in the run.
3. **Fail-closed on a missing table**: when the check cannot find the table, it fails rather than reporting that it found nothing.

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-8-commit.md`: check 4, plus its 3 bundled copies under `skills/develop-{story,task,bug}/references/`
- `shared/resources/tests/step-8-completion-checklist.test.mjs`: 7 new executed cases × bash/zsh, plus a non-vacuity guard
- `CHANGELOG.md`: `[Unreleased]` Fixed entry

### Architecture/Design Decisions

- The check reads the table rather than the hook prose being reworded. Rewording would remove one writer of the token, not the class of problem.
- The test fixture runs the hook's own append block, so a reword of the hook reaches the test.
- The awk braces are spaced, because an unspaced `{exit}` reads as a `{placeholder}` to the harness and to an agent.

### Dependencies

None.

## Testing & Quality Assurance

### Test Coverage

- Executed cases under bash and zsh: 43/43 in the file. `ci:fast` gives 4286 pass, 0 fail.
- Mutation proofs: 3 branches in QA cycle 1, plus the Status-cell fix at finalise, each red on revert.

### Code Review

- QA cycle 1 gate: PASS (100/100). Step 5c `/review-pr`: APPROVE.
- Advisory findings in `recommendations.future`: CR-1 (pre-existing; ❌ Failed / ⚠️ Needs Attention rows not refused) and CR-2 (a header-only table satisfies the guard).

## Security & Compliance

### Security Review

- The probe engine ran through a one-argument wrapper over the shipped block, with 9 cases. Pre-fix it was `present-but-inert`; on the fix head it is `engages` (0 reproduced).

### Compliance Review

- Not applicable: internal tooling, no personal, payment or health data, and no UI.

## Documentation

### Updated Documentation

- The Step 8 step document's check-4 comment block
- The CHANGELOG `[Unreleased]` entry

### Documentation Links

- DoD: `task.159.dod.1.step-8-check-4-reads-the-progress-table.md`
- QA: `task.159.qa.1.step-8-check-4-reads-the-progress-table.md`, gate `task.159.gate.1.step-8-check-4-reads-the-progress-table.yml`

## Demo Notes

### How to Verify

```bash
command node --test shared/resources/tests/step-8-completion-checklist.test.mjs
```

## Impact & Value

### User Impact

A pipeline run that was paused for context compaction and then resumed can now finish Step 8 without anyone rewording the report or bypassing a BLOCKING check.

### Technical Impact

Check 4 now reads the thing it makes a claim about, so no other writer's prose can trip it.

## Known Limitations & Future Work

### Current Limitations

- CI runs only the bash legs. The ubuntu runner has no zsh; the zsh legs run locally.

### Suggested Follow-Up Stories

- Refuse every non-`✅ Done` Status cell with an allowlist (CR-1)
- Base the no-table guard on a step row (CR-2)
- Mark observation #200 `actioned` after merge
