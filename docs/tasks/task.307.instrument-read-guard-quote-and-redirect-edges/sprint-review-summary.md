# Sprint Review Summary - Instrument-read guard quote and redirect edges

**Story/Task ID:** task.307
**Completed Date:** 2026-11-14
**Pull Request:** [#902](https://github.com/Gamaroff/agent-skills/pull/902)

---

## Summary

The test that guards against prose teaching `cmd; echo "rc=$?"` now agrees with the shell on two edge cases task 299 left open, and its header names the shapes it still does not see.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A single quote glued to a word or a closing quote is masked when a partner quote follows, so both missed shapes are flagged.
- [x] `&>`, `&>>`, `1>` and `1>>` count as redirects; their unredirected twins stay flagged.
- [x] Task 299's apostrophe controls behave as before.
- [x] The captured-status shape `x=$(cmd; echo $?)` has a recorded decision (kept flagged) and a fixture.

### Key Features Implemented

- **Glued-quote rule**: opens a quote only when a partner follows on the line, so prose apostrophes stay prose.
- **Redirect rule**: `&>`/`1>` forms are redirects; `2>&1` and `2>` are not.

---

## Technical Details

### Files Modified/Created

- `tests/orchestration-instrument-reads.test.js` - the guard, fixtures and header
- `CHANGELOG.md` - entry citing `(task 307)`

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Tests:** 5 in the guard file; remote `ci:fast` 8469 pass, 0 fail
- **Mutation proofs:** four, each red on a named fixture
- **QA gate:** PASS 95/100; PR review APPROVE

---

## Security & Compliance

Not applicable: a test-file change, no shipped behaviour.

---

## Known Limitations & Future Work

- Two apostrophes on one line pair up, so `it's cmd; echo "rc=$?"; don't` is not flagged. Named in the guard's header and held by a fixture.

---

**Status:** ✅ **ACCEPTED**
