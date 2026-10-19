# Sprint Review Summary - Read-back checks this cycle's verdict

**Story/Task ID:** task.192
**Completed Date:** 2026-10-19
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#688](https://github.com/Gamaroff/agent-skills/pull/688)

---

## Summary

QA's read-back check now confirms that the verdict a QA cycle wrote into a document is that cycle's own. If the document still shows the previous cycle's verdict, the check stops the cycle before it posts. A brief `.git/index.lock` held by another git process is now retried rather than reported as a failure.

## What Was Delivered

### Acceptance Criteria Met

- ✅ Every `**Gate Decision**` line in the QA section must name this cycle's gate token
- ✅ The newest `QA gate …` row written by QA must name the token. A `qa-fix` row after it halts. QA `Status →` rows and `finalise` rows are ignored
- ✅ A missing decision line, QA section or `QA gate` row halts
- ✅ A held `index.lock` is retried at 200/400/800 ms, once per run; any other failure is reported at once
- ✅ The retry adds at most 1.4 s, and only on the persistent-lock path
- ✅ `npm test`, `bundle:check` and `prettier --check .` pass
- ✅ The CHANGELOG entry names both checks and the retry

### Key Features Implemented

- Verdict checks in `qa-read-back.js` (`verdictProblems`)
- Lock-aware `stage()` retry, with `stageAttempts` in the `--json` output

## Technical Details

### Files Modified/Created

- `shared/resources/qa-read-back.js` (bundled to qa-task and qa-story)
- `shared/resources/tests/qa-read-back.test.mjs` (50 tests)
- `tests/qa-read-back-block.test.js`
- `skills/qa-task/SKILL.md` Step 12b and `skills/qa-story/SKILL.md` 3e
- `CHANGELOG.md`

### Architecture/Design Decisions

- The verdict row is the newest qa-* row whose description starts `QA gate`, so status rows and later `finalise` rows never mask it (QA2-2)
- A `qa-fix` row after that row means this cycle wrote no row of its own. That shape halts even when the token repeats (QA2-1)

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- 162 targeted tests (engine, bundled copies, SKILL.md blocks under bash and zsh)
- ci:fast: 5897 tests, 0 failures (qa-fix cycle 2)
- Security probes: 22 in QA cycle 3 and 28 at DoD; 0 reproduced

### Code Review

- 3 QA cycles: CONCERNS 90 → CONCERNS 80 → PASS 100. Bugs 1–3 closed
- 5c PR review: CONCERNS (doc wording only; fixed and carried)

## Security & Compliance

### Security Review

PASS. No shell or eval; argv-array spawns only. The boundary fails closed and was probed.

### Compliance Review

Not applicable (internal tooling).

## Documentation

### Updated Documentation

- CHANGELOG [Unreleased] › Fixed
- qa-task and qa-story SKILL.md read-back lists

### Documentation Links

- [Task document](./task.192.read-back-checks-this-cycles-verdict.md)
- [DoD verification](./task.192.dod.1.read-back-checks-this-cycles-verdict.md)

## Demo Notes

### How to Verify

`node --test shared/resources/tests/qa-read-back.test.mjs`. The VERDICT_HALTS and lock tests cover each rule.

## Impact & Value

### Technical Impact

A QA cycle can no longer post a summary over a document that still shows the previous cycle's verdict.

## Known Limitations & Future Work

### Current Limitations

- CR-1 (low): the token is matched anywhere in the row, so a contrived row naming two `QA gate` tokens passes
- CR-2 (low): the engine header comment still states the old row rule

### Suggested Follow-Up Stories

- One task for gate 3's `recommendations.future` (CR-1 to CR-5)
