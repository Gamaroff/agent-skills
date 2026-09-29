# Sprint Review Summary - qa-fix and the QA loop: offer a structural move before another prose patch

**Story/Task ID:** task.148
**Completed Date:** 2026-09-25
**Completed By:** Claude (develop-task pipeline via develop-next)
**Pull Request:** [#492](https://github.com/Gamaroff/agent-skills/pull/492)

---

## Summary

A QA loop used to spend its whole budget narrowing one mechanism at HIGH 0, with nothing to prompt a
change of approach. `qa-fix` now offers a **structural move** (consolidate the contract, or scope the
claim) before it patches the same subject again. The QA loop now **detects that narrowing shape** and
hands the offer to the fixer. It remains an offer, not a route or an escalation.

## What Was Delivered

### Acceptance Criteria Met

- The predicate fires on task.143's real gates at cycles 2, 3 and 6, and nowhere else.
- It declines when a HIGH is present, when the files differ, when a MEDIUM has no `file:`, and when
  input is unreadable or unbound. It counts closed MEDIUMs.
- The route classifier is unchanged. This is pinned by route rows, a source read, and deep-equal
  pairs on a PASS gate.
- The loop snippet runs from a consumer-shaped cwd under bash and zsh.
- qa-fix Step 2.6 carries its triggers, its four moves and a fixed summary shape.
- The Step 3.5 probe population covers every executed document, from any cwd. Row 1 requires a
  `Probe:` record.

### Key Features Implemented

- `classifyNarrowingResidue` / `describeNarrowingResidue` in `shared/resources/qa-diminishing-returns.js`
- A *Narrowing-residue offer* in the QA loop's 5b. It reports "could not look" as `SIGNAL=error`, and
  runs only on gate-driven entry.
- qa-fix **Step 2.6**, which offers the structural move before another patch.
- qa-fix **Step 3.5 row 1**: a population command that is the one definition of the executed-document
  set (`:(top,glob)`, `--full-name`, generated copies excluded by marker), plus a `Probe:` block.

## Technical Details

### Files Modified/Created

- `shared/resources/qa-diminishing-returns.js`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/qa-fix/SKILL.md` (+ bundled copies)
- Tests: `shared/resources/tests/qa-narrowing-residue.test.mjs`, `shared/resources/tests/qa-loop-route.test.mjs`, `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`, `tests/qa-fix-structural-move.test.js`
- Fixtures: `shared/resources/tests/fixtures/qa-narrowing-residue/` (task.143 gates 1–7 and task.117 gates 1–3, copied byte for byte, plus 3 synthetic gates)
- `CHANGELOG.md`

### Architecture/Design Decisions

- **Offer, not route.** Keyed on `file:`, the signal cannot tell narrowing a side mechanism apart
  from refining the deliverable. task.117 gates 1→2 fire, and patching was the right answer there. So
  `patch` stays on the menu, and nothing escalates on the signal.
- **HIGH is an input.** The engine still counts no HIGH itself (source guard, group 7).

## Testing & Quality Assurance

### Test Coverage

121 tests across the affected suites. `ci:fast`: 4152/0. Every rule is mutation-proved (29 mutants
across develop and two QA cycles).

### Code Review

Three QA cycles found 3 bugs, all fixed and closed: gate 1 CONCERNS, gate 2 CONCERNS (refute pass),
gate 3 PASS 100. The Step 5c `/review-pr` verdict was CONCERNS, advisory.

## Security & Compliance

### Security Review

PASS. The engine is not a boundary; QA and the DoD agent agreed independently.

### Compliance Review

NOT_APPLICABLE.

## Documentation

### Updated Documentation

qa-fix SKILL.md, the QA-loop document and CHANGELOG `[Unreleased]`.

## Demo Notes

### How to Verify

```bash
command node --test shared/resources/tests/qa-narrowing-residue.test.mjs evals/shared/tests/qa-narrowing-offer-wiring.test.mjs tests/qa-fix-structural-move.test.js
```

## Impact & Value

### Technical Impact

A fixer whose finding repeats the previous cycle's subject now gets a named alternative to a third
patch. The first real use of Step 2.6 was on this task's own QA cycle 2 finding: move
**consolidate**.

## Known Limitations & Future Work

### Current Limitations

- The Step 3.5 population can still be trusted too far:
  - "never record 0" is wrong when a fix removes the phrase, or when the edited file is untracked
    (gate 3 advisory).
  - `git grep -F` misses a phrase wrapped across a line (5c CR-1).
- Three minor advisory cleanups (gate 3).

### Suggested Follow-Up Stories

- One task: make the Step 3.5 population trustworthy. Cover the phrase choice (a token that cannot
  wrap), the untracked-file and removed-phrase cases, and backslash escaping.
- Open Question 2 from the task: an authoring-side exact-versus-best-effort declaration (obs #172,
  improvement 3).
- Post-merge: set observations #167, #172, #174 and #177 to `actioned`.

---

**Status:** ✅ **ACCEPTED**
