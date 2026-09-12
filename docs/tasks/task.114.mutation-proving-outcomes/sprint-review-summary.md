# Sprint Review Summary - mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you

**Story/Task ID:** task.114
**Epic:** — (standalone technical task)
**Completed Date:** 2026-09-12
**Completed By:** Claude (develop-task pipeline via /develop-next)
**Pull Request:** [#400](https://github.com/Gamaroff/agent-skills/pull/400)

---

## Summary

`shared/resources/mutation-proving.md` — the repo's instrument-audit doc — is rewritten around **what a mutation run can tell you**: a thirteen-row outcomes table (what you saw · what it may mean · discriminating question · then do · outcome token), six instrument rules, and a seventh vacuity shape, folding in twelve QA-cycle observations that each produced a false finding live. Its three consumers point at it without restating a count, `qa-task`/`qa-story` Step 3c record an outcome token per proof, and a parity test keeps the pointers, the token lists and the doc's own count honest.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The doc names every §2 outcome with a rule and the discriminating question — 13 rows + 6 rules + 1 check rule + shape 7
- [x] No consumer states a count of the doc's shapes; a test asserts it — `mutation-proving-pointers-parity.test.mjs` test 1, red on 10 distinct mutations
- [x] Step 3c's record distinguishes "reds a committed test" from "development-time only" — `covered` vs `dev-only`; test 3 asserts both consumers' token lists equal the table
- [ ] Observations #16, #18, #19, #26, #29, #32, #37, #41, #42, #45, #47, #55 close naming this PR — **post-merge operator action** (11 parked until merge)

### Key Features Implemented

- **Outcomes table**: rows for the predicted red, the wrong test red, nothing red (mutation void / dead / load-bearing / no fixture / absorbed), not run, wrong thing mutated, data-dependent, dev-only, and a restore that took the fix
- **Instrument rules**: `cp` snapshot never `git checkout --`; baseline green between mutations; assert applied (exit-code discriminated, `set -e`-safe, prints the diff); predict the red test; "what would this probe print if broken?"; helpers return `{ok, value}`; a check is blind to what it does not iterate
- **Seventh shape**: no fixture instantiates the input class — the one no mutation can reveal
- **Recording vocabulary**: nine tokens; only `covered` means a committed test went red

---

## Technical Details

### Files Modified/Created

- `shared/resources/mutation-proving.md` — rewritten (+ six bundled copies via `npm run bundle`)
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Step 3c / Mutation-Proof Spot Check record `<reverted> → <test red> → <outcome>`
- `skills/develop/SKILL.md` — pointer drops the count; carries the snapshot rule
- `evals/shared/tests/mutation-proving-pointers-parity.test.mjs` — new: pointer count guard, heading/entries agreement, consumer token-list parity
- `CHANGELOG.md` — Changed entry

### Architecture/Design Decisions

- The table is the single definition; consumers quote the token list and a test asserts the quotation (the enumeration-drift class in `docs/reference/anti-patterns.md`).
- Guards carry non-vacuity floors and report `scan-broken` rather than a clean zero.
- The applied-check snippet reads `diff`'s exit code (1 applied / 0 not / other = no snapshot) with `|| rc=$?` so it survives `set -e`, and prints the hunk for the row-10 re-read — each property found by executing the previous draft.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 3 tests in `evals/shared/tests/mutation-proving-pointers-parity.test.mjs` (per-PR lane via `npm test`)
- **Suite:** `npm run ci:fast` — 3233 pass / 0 fail; bundle 0 problems
- **Mutation proofs:** 14 across authoring, three QA cycles and finalise; one recorded `mutation-void` (lazy anchor) fixed and re-proved

### Code Review

- **Reviewers:** pipeline Step 3b (three cycles) and Step 5c `/review-pr` (advisory)
- **Approval Status:** ✅ APPROVE (5c); QA gate PASS 95/100
- **Review Comments Addressed:** 12 findings across three QA cycles, all closed (5 bug reports, Closed); 5c's 4 low findings — 2 applied, 2 operator/finalise notes

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — task type; no secrets, no unsafe patterns, no dependency change; `boundary: false` recorded explicitly (documentation lint, not a runtime control).

### Compliance

NOT_APPLICABLE — no data, payment, UI or healthcare surface.

---

## Documentation Updates

- `CHANGELOG.md` Changed entry
- Canonical doc + consumers + six bundled copies in sync

---

## Demo Notes

Open `shared/resources/mutation-proving.md` at "What a mutation run can tell you"; run the parity test; reinstate "the four shapes" in any consumer and watch test 1 name the file and line.

## Impact

QA cycles stop burning fix iterations on false findings; "mutation-proven: yes" is no longer written for a development-time-only proof.

## Known Limitations and Future Work

- Per-collection non-vacuity floors and skipping AUTO-GENERATED copies in the scan (gate 3 `recommendations.future`).
- The 4b snippet engine runs blocks without `set -e`, which is why the `set -e` defect was found by the reviewer rather than by execution.
- Observations to close after merge (criterion 4).
