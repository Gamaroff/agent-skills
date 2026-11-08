# Sprint Review Summary - finalise accepts what the record already shows

**Story/Task ID:** task.271
**Completed Date:** 2026-11-08
**Pull Request:** [#859](https://github.com/Gamaroff/agent-skills/pull/859)

---

## Summary

`/finalise` no longer halts on work that its own evidence already clears. It now accepts a measured figure taken on a code-identical earlier commit, allows one re-run of a red CI that is outside the PR diff, and accepts a probe reproduction the owner deferred in a recorded `deferrals.json`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Each arm accepts its matching case and refuses its unmatched control, with named tests
- [x] Every accepted case writes its basis into the DoD record
- [x] With no matching record, `finalise` behaves as before
- [x] `npm test` wall time is within 10% of `develop` (+0.0%, median of five alternating runs)
- [x] Each arm has a mutation proof in the QA report
- [x] The bundle check and `CI=true npm test` pass
- [x] The DoD prompt contract test passes
- [x] The fixture-vanish cause is recorded as not found, with the commands tried

### Key Features Implemented

- **Arm 1, tree equivalence**: `finalise-delta.js docs-only` accepts a measurement when only documentation changed since the commit it was taken on.
- **Arm 2, one bounded re-run**: `finalise-delta.js rerun-eligible` allows a single re-run, only for a red outside the PR diff over a docs-only delta.
- **Arm 3, owner-approved deferral**: `finalise-deferral-match.js` reads a `deferrals.json` with `JSON.parse` and matches by case id, a follow-up task and the configured owner (`finalise.deferralApprover`).

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-delta.js` - Arms 1 and 2
- `shared/resources/finalise-deferral-match.js` - Arm 3
- `skills/finalise/SKILL.md` - wiring for all three arms
- `shared/resources/finalise-dod-ac-prompt.md` - Arm 1 wording
- `shared/resources/tests/finalise-delta.test.mjs`, `finalise-deferral-match.test.mjs`, `finalise-acceptance-blocks.test.mjs` - tests

### Architecture/Design Decisions

Arm 3 first read YAML and Markdown. Four QA cycles kept finding gaps between the hand-written parser and real YAML, so the owner approved moving the facts to JSON, which the platform parses. The whole class of spelling gaps is closed by removal.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** accept and control tests for every arm, plus mutation proofs
- **Full suite:** `ci:fast` 8059 tests, 0 failed; CI green on the PR (6 of 6 checks)

### Code Review

QA gate 17 PASS (90/100) after 17 gates. The 5c `/review-pr` report is CONCERNS; both findings were fixed.

---

## Security & Compliance

### Security Review

PASS. 41 probes against both engines, 0 reproduced. Every accept path is a closed allow-list (exact approver, real past date, `task.N` id, no repeated or unknown key).

### Compliance Review

Not applicable (internal tooling).

---

## Documentation

### Updated Documentation

- `CHANGELOG.md`, `docs/reference/configuration.md` (`finalise.deferralApprover`), `skills/finalise/SKILL.md` item 5a

---

## Demo Notes

### How to Verify

- `CI=true node --test shared/resources/tests/finalise-delta.test.mjs shared/resources/tests/finalise-deferral-match.test.mjs`

---

## Impact & Value

### Technical Impact

Fewer pointless halts in `/develop-*` pipelines, each now backed by a recorded basis rather than a judgement call.

---

## Known Limitations & Future Work

### Current Limitations

- The wording of the two-attempt CI re-run line is prose; no test pins its text.
- A "measured-criteria" card (finalise takes the measurement itself) is the follow-up.
