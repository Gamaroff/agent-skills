# Sprint Review Summary - Eval harness hardening and task.185 leftovers (task.186)

**Pull Request:** [#576](https://github.com/Gamaroff/agent-skills/pull/576)
**Tracker:** [#575](https://github.com/Gamaroff/agent-skills/issues/575)
**Accepted:** 2026-10-06

## Summary

This task closes the advisory findings task.185 carried forward. The eval runner and `repeat.mjs`
no longer score a non-verdict as a verdict, and the fake `gh` fails closed in the cases it still
missed. `pr-inline-comment.js` now lists review comments with an explicit GET. Six skills compute
their next report number as highest + 1 through one shared helper, instead of counting files.

## What Was Delivered

### Acceptance Criteria Met

All 10 success criteria. The bash arm of the call-site test (AC6) runs per PR. Its zsh arm is
verified locally, as the operator decided; CI has no zsh, the same state as task.185 and task.176.

### Key Features Implemented

- **Runner and repeat verdicts**:
  - A run that never reaches its final line exits 1.
  - An unknown assertion `fn` is a usage error, raised before any run or driver.
  - A scenario with no assertion the driver runs is refused.
  - The opt-in exit codes move to 73/74/75, outside Node's own 0–5.
- **One assertion table**: `evals/shared/lib/assertion-dispatch.mjs` and `driver-name.mjs`, used by
  both the runner and `repeat.mjs`.
- **Fake `gh`**:
  - Every refusal carries `refusal: "write" | "not-a-served-read"`.
  - `version` is answered only as the whole argv.
  - `-R` is no longer treated as a read flag on `api`.
  - A missing `pick()` field is reported by name.
  - A missing `jq` skips a live run only; replay runs are still judged.
- **`pr-inline-comment.js`**: the comment listing sends `-X GET`, so `-f` no longer turns it into a POST.
- **`next_numbered`** in `shared/resources/newest-numbered.sh`:
  - It is called by review-pr, qa-planning (two sites), review-bug, review-epic, review-task and
    finalise.
  - It replaces `skills/review-pr/scripts/next-report-number.sh`.

## Technical Details

### Files Modified/Created

`evals/shared/` holds the runner, repeat, the claude-cli driver, fake-gh, two new lib modules,
tests and the README. `shared/resources/` holds `newest-numbered.sh`, `pr-inline-comment.js` and
their tests. Six `SKILL.md` files and their bundled `references/` copies changed, plus
`CHANGELOG.md`. One script was removed.

### Architecture/Design Decisions

- **Driver as data**: which assertions run, and whether `jq` is needed, is decided from the
  resolved driver in one place (`driverNameFrom`). Before this, each caller re-derived it, and the
  first `jq` fix wrongly skipped replay runs (C2-CR-1).
- **Highest + 1, refusals as exit 2**: `next_numbered` reads numbers in base 10 and refuses a
  non-directory, a missing kind, or a number past 18 significant digits. It never returns a guess.

### Dependencies

None added. No breaking changes for consumers. The opt-in exit codes changed only for callers that
set `EVAL_*_EXIT`.

## Testing & Quality Assurance

- **Tests**: 394 targeted tests (6 files), with `next-numbered.test.mjs` new; `npm run ci` green; PR CI green over 5 checks.
- **QA**: 3 cycles. The final gate was CONCERNS (90/100) with no open entry, through the Diminishing-returns exit.
- **Mutation proofs**: every QA fix was shown to turn red when reverted.
- **Step 5c `/review-pr`**: CONCERNS. The two document findings were fixed and two follow-ups were deferred.

## Security & Compliance

- **Security**: PASS. `next_numbered` was probed with 30 candidates and none reproduced. The fake
  `gh` classifier was hand-probed with 33 forms and none mismatched. No secrets or unsafe execution
  were found.
- **Compliance**: not applicable (internal tooling).

## Documentation

`evals/shared/README.md` states the exit codes and the `refusal` field. `CHANGELOG.md`
`[Unreleased]` has four task.186 entries.

## Known Limitations and Future Work

These are listed in the task's Deferred Work section:

- the no-jq meta-test has no pass floor (C3-CR-1);
- `review-story` numbering is not covered (CR-2);
- `next_numbered` reads a failed `find` or a missing predicate as an empty series (5c CR-1);
- a setup that never settles leaves its sandbox behind (CR-6);
- some README and test wording tidy-ups.
