# Sprint Review Summary - finalise fix-and-recheck reads test names, scope entries and run logs as written

**Story/Task ID:** task.258
**Completed Date:** 2026-11-04
**Completed By:** Lorien Gamaroff
**Pull Request:** [#832](https://github.com/Gamaroff/agent-skills/pull/832)

---

## Summary

Four edge cases in the `/finalise` Step 8a evaluator are closed. It now reads test-file names, Files Summary entries and run logs the way people and runners write them. Each fix is held by a test that goes red when the fix is reverted.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Test-file names in any spelling or case (`x.TEST.js`, `x_test.go`, `tests/x.sh`, `test_foo.py`) are refused as a mutation proof (CR2-1).
- [x] A Files Summary entry written `./src/a.js`, `/src/a.js` or in backticks means `src/a.js`; the candidate guard is unchanged (CR2-2).
- [x] A CRLF run log proves its test like an LF one (CR2-3).
- [x] The `:<digit>` boundary applies to a `.md` proof path only (CR2-4).
- [x] Four mutations recorded in the QA report, each turning its named test red.
- [x] Bundle, CHANGELOG entry and the Step 8a sentence updated.

### Key Features Implemented

- **`isTestFileName`**: replaces the old regex; case-insensitive; a name with whitespace is still a title.
- **`normaliseEntry`**: brings an entry to canonical form for `pathInScope` and `entryPatterns`.
- **CRLF and `.md` boundary**: `split(/\r?\n/)` and `pathy` limited to `.md`.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-fix-and-recheck.mjs` - the four fixes
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs` - five tests added (59 pass)
- `skills/finalise/references/finalise-fix-and-recheck.mjs` - generated bundle copy
- `skills/finalise/SKILL.md` - Step 8a sentence naming the refused shapes
- `CHANGELOG.md` - one entry under `[Unreleased]`

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** A mutation-proof record that names a test file (`tests/x.sh`, `test_foo.py`) now halts on `mutation-proved`; name the test by its title.

---

## Testing & Quality Assurance

- **Unit Tests:** 59 evaluator tests, plus 87 in three consumer suites; 0 fail.
- **Mutation proof:** 4 of 4 reverted fixes turned their named test red.
- **QA gate:** PASS, 95/100. **PR review (5c):** APPROVE. **CI:** SUCCESS on the PR head.

---

## Security & Compliance

- `pathInScope`, the scope boundary, was probed with the engine: 11 executed, 0 reproduced, 0 escaped (QA cycle 1 and the DoD run).
- Compliance: not applicable (internal evaluator change).

---

## Known Limitations & Future Work

- CR-1 (low): `isTestFileName` reads `.md` case-insensitively and `subjectNames` case-sensitively. Routed to `recommendations.future`.
- CR-4 and CR-6 from task 257 stay open by design.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
