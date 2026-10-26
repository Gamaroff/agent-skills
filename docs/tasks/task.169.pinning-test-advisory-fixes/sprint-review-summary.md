# Sprint Review Summary - Close the four advisory findings on the reference-doc pinning test

**Story/Task ID:** task.169
**Epic:** none (standalone task; follow-up to task.142)
**Completed Date:** 2026-10-26
**Completed By:** Lorien Gamaroff (via `/develop-next`)
**Pull Request:** [#758](https://github.com/Gamaroff/agent-skills/pull/758)

---

## Summary

The guard that pins every command, flag and skill named in the reference pages to a real skill is
stricter and cheaper. It closes the four advisory findings task.142's QA left open.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A row flag that a skill documents only as a longer flag now fails the flag test
- [x] Every activation-table flag is checked against its skill (3 checked, floor 2)
- [x] An empty `SKILL.md` reports "is empty" and a missing one "does not exist", on both pages
- [x] The corpus is resolved once per run
- [x] The existing cost tests stay green
- [x] `node:test` + `node:assert` only; Prettier clean; `npm test` green with skills symlinks aside
- [x] Each fix mutation-proven
- [x] `CHANGELOG.md` `[Unreleased]` records the change
- [x] No consumer-facing change

### Key Features Implemented

- **Whole-token flag match**: `documentsFlag(body, flag)` replaces `body.includes(flag)` at both call sites.
- **Activation flags checked**: a standalone `--flag` span attaches to the skill span before it.
- **Empty vs missing**: `null` means missing, a blank body means empty, on both pages.
- **One resolution per run**: a memoised `getCorpus()` serves both live test groups.

---

## Technical Details

### Files Modified/Created

- `tests/reference-doc-skill-pinning.test.js` - the four fixes and 11 new tests (29 total)
- `CHANGELOG.md` - `[Unreleased]` entry

### Architecture/Design Decisions

The fixes stay inside the test file. No reference page changed: the live corpus passes the stricter checks as measured.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 29 tests in `tests/reference-doc-skill-pinning.test.js`
- **Integration Tests:** n/a
- **Test Coverage:** argued by 8/8 QA mutation proofs

### Code Review

- **Reviewers:** QA cycle 1 diff review; Step 5c PR review
- **Approval Status:** ✅ Approved (gate PASS 100; PR review APPROVE)
- **Review Comments Addressed:** 2 low advisory points recorded as follow-ups (CR-1, CR-2)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — test-only change; no secrets, no unsafe patterns, no dependency change; not a boundary.

### Compliance Review

— **Not applicable** — no personal data, payment, UI or health-data scope.

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` `[Unreleased]`

### Documentation Links

- [Task document](./task.169.pinning-test-advisory-fixes.md)
- [DoD verification](./task.169.dod.1.pinning-test-advisory-fixes.md)

---

## Demo Notes

### How to Verify

1. `command node --test tests/reference-doc-skill-pinning.test.js`
2. Expect 29 pass, 0 fail.

---

## Impact & Value

### User Impact

None directly; consumers never receive this test.

### Technical Impact

The guard can no longer pass a flag documented only as a longer flag, misreport an empty skill, or skip activation-table flags.

---

## Known Limitations & Future Work

### Current Limitations

- CR-1: a non-skill span does not reset the "last skill", so a flag after a command or script is charged to an earlier skill. No live row triggers it.
- CR-2: a standalone flag span attaches only its first `--` token. No live span holds two.

### Suggested Follow-Up Stories

- A small task closing CR-1 and CR-2 with fixtures.

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** +288 / -58 (test + CHANGELOG)

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
