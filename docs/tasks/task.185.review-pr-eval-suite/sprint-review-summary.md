# Sprint Review Summary - review-pr eval suite (task.185)

**Pull Request:** [#574](https://github.com/Gamaroff/agent-skills/pull/574)
**Tracker:** [#573](https://github.com/Gamaroff/agent-skills/issues/573)
**Accepted:** 2026-10-05

## Summary

`/review-pr` now has an end-to-end eval. Four scenarios run the real skill against a hermetic
sandbox: a local bare origin, a fake `gh`, and the skill installed at `.agents/skills`. They run in
replay on every push and live on demand, where the result is a pass rate. The report number is now
computed by a script (`next-report-number.sh`), so a re-review never overwrites an earlier report
(obs #272).

## What Was Delivered

### Acceptance Criteria Met

All 13 success criteria. AC1's zsh arm is verified locally, as recorded by the operator's decision;
CI has no zsh, which matches task.176.

### Key Features Implemented

- `skills/review-pr/scripts/next-report-number.sh` returns the highest existing `{n}` plus 1, and
  Step 7 calls it.
- Shared eval harness:
  - opt-in `setup` hook, `cliArgs`, `liveAssertions`, `noFileMatching` and `EVAL_TIMEOUT_MS`;
  - a `git-sandbox` `dir` option;
  - `repeat.mjs`, a pass-rate runner that owns the exit contract (0 met, 1 below, 2 usage, 3 could
    not run).
- A fake `gh` (`evals/shared/lib/fake-gh.mjs`). It serves reads from fixtures and logs every call.
  It refuses everything that is not a served read in an unambiguous shape, so it fails closed.
- Four scenarios: `01-happy`, `02-renumber-gap`, `03-unanchored`, `04-planted-bug`.

## Technical Details

### Files Modified/Created

`skills/review-pr/` (script, SKILL.md Step 7, tests); `evals/shared/` (runner, repeat, assertions,
claude-cli driver, git-sandbox, fake-gh and tests); `evals/review-pr/` (setup hook, four scenarios,
replay goldens, README); `package.json`; `CHANGELOG.md`; `docs/contributing/evals/reference.md`;
`docs/architecture/concepts/tech-stack.md`.

### Architecture/Design Decisions

- Each harness addition is opt-in through a new `scenario.json` field, and the 39 existing scenarios
  run unchanged.
- The fake `gh` decides by **allow-list**. Three QA cycles of deny-list patches each missed one `gh`
  argv spelling (glued, clustered, aliased, flag-before-subcommand). Inverting the rule closed the
  class (obs #276).
- `repeat.mjs` reads the runner's verdict positively. Only an explicit failed-assertion code counts
  as a failed run, and every other outcome is "could not run".

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- `ci:fast` 5359 pass, 0 fail; `eval:all` 43 scenarios.
- Live N=5: 20/20 runs passed. The rewritten fake `gh` was rechecked live with 4/4 scenarios passing.
- 8 QA cycles; 7 bugs raised and closed; three 5c PR conformance reviews (CONCERNS, non-blocking).

### Code Review

Each QA cycle ran a diff code review, and 5c ran a code lens and a conformance lens three times. The
remaining findings are low or medium advisory items, listed below.

## Security & Compliance

### Security Review

PASS. The fake `gh` write refusal is a boundary on agent-chosen argv. 236 candidates were executed
against it: 195 write forms were refused and every review-pr read was served.

### Compliance Review

Not applicable (internal eval tooling).

## Documentation

### Updated Documentation

`evals/shared/README.md`, `evals/review-pr/README.md`, `CHANGELOG.md`,
`docs/contributing/evals/reference.md`, `docs/architecture/concepts/tech-stack.md`.

### Documentation Links

- `evals/review-pr/README.md` — what a green run means, the sandbox, the scenarios, live runs

## Demo Notes

### How to Verify

```bash
npm run eval:review-pr                                # replay, 4/4
env -u ANTHROPIC_API_KEY npm run eval:review-pr:cli   # live, N runs per scenario
```

### Screenshots/Visuals

Not applicable (CLI).

## Impact & Value

### User Impact

Changes to `/review-pr` now have an outcome-level check, and re-reviews number their reports
correctly.

### Technical Impact

Any future skill eval that needs a remote can reuse the setup hook, the fake `gh` and the pass-rate
runner.

## Known Limitations & Future Work

### Current Limitations

- Live runs load the user's own `~/.claude` configuration (documented).
- A live outcome eval cannot mutation-prove a prose fix the model already gets right (obs #274).

### Suggested Follow-Up Stories

1. Harness follow-up:
   - an unknown assertion fn and a never-settling promise are scored as verdicts (5c-3 CR-1, 5c-2 CR-1);
   - the fake `gh` `--version` short-circuit, a refusal reason field, `-R`/`--repo` on `api`;
   - the jq-missing exit; pick() field gaps.
2. Other skills still number reports by counting (qa-planning, review-bug, review-epic, review-task).
3. `pr-inline-comment.js` sends `gh api -f per_page=100` without `-X GET`, which real `gh` treats as
   a POST.
4. Review-pr eval scenarios 5–7 (planned in the task as a follow-up).

## Metrics _(if applicable)_

- `eval:all` wall time: 4.77 s → 7.59 / 7.92 s
- Live run time: 92–177 s per scenario
