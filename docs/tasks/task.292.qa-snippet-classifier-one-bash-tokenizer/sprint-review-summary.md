# Sprint Review Summary - One bash tokenizer for the QA snippet classifier

**Story/Task ID:** task.292
**Completed Date:** 2026-11-10
**Pull Request:** [#869](https://github.com/Gamaroff/agent-skills/pull/869)

---

## Summary

The QA snippet classifier now reads bash's blanks, quotes, escapes and line joins from one tokenizer instead of several regex copies, and it refuses (`mutating`) anything it cannot read. This closes the owner-waived T290-QA-3 write gap.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A CR, FF, VT, NBSP or U+2028 before `#` no longer reads as a blank (T290-QA-3 closed).
- [x] Every scan reads lexical facts from the one tokenizer; a test counts the consumers.
- [x] Every change is mutation-proven with the red test named.
- [x] 240000 differential blocks wrote nothing under real bash; 0 blocks newly runnable in the docs scan.
- [x] Docs scan 30% faster than `develop` (median 367 ms against 527 ms); the differential slice runs in about 2.9 s.

### Key Features Implemented

- **One tokenizer**: `tokenize` in `shared/resources/qa-execute-snippets.mjs`, read by `cutJoins`, `maskSubstitutions`, `collapseQuotedSpans` and `stripProse`.
- **Fail-closed reading**: unmodelled shapes (`$[ ]`, `<<` inside `(( ))`, a command substitution inside `$(( ))`) are refused.
- **Two maintainer scripts**: `qa-snippets:differential` and `qa-snippets:docscan`.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` - the tokenizer and the scans that read it
- `shared/resources/tests/qa-execute-snippets.test.mjs` - 379 tests, including the consumer count and the blank-normalisation rows
- `scripts/qa-snippets-differential.mjs`, `scripts/qa-snippets-docscan.mjs` - differential run and docs scan
- `shared/resources/qa-runnable-prose-detection.md` and its generated copies

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit Tests:** 379 tests in `shared/resources/tests/qa-execute-snippets.test.mjs`, all passing under `CI=true`.
- **QA gate:** CONCERNS, 90/100 (`task.292.gate.4`), no open blocking finding.
- **Security probe:** 31 executed, 0 reproduced, 0 escaped.

## Known Limitations and Future Work

Three pre-existing indirect-evaluation holes (T292-CR-1..3: `printf -v` and similar subscripts, PS4 and `${x@P}`, quoted data re-evaluated as arithmetic) are identical on `develop` and are not fixed here. A follow-up task is recommended.
