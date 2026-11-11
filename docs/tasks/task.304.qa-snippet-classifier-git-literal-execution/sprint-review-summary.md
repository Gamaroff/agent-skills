# Sprint Review Summary - QA snippet classifier refuses git literal execution

**Story/Task ID:** task.304
**Completed Date:** 2026-11-11
**Completed By:** Lorien Gamaroff
**Pull Request:** [#876](https://github.com/Gamaroff/agent-skills/pull/876)

---

## Summary

The QA snippet classifier no longer treats git commands that run a plain string as safe to execute. It refuses them, and still runs the ordinary read-only git commands.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `git -c`, `--config-env`, `GIT_*=` prefixes, `--upload-pack` / `--exec` and `--exec-path=<dir>` are refused, each shown to write under real bash.
- [x] Safe git blocks stay runnable.
- [x] The differential run writes nothing on the new git set (0 of 20000).
- [x] The docs scan reports 0 newly runnable and 0 newly refused blocks.
- [x] Docs-scan time is within +10% of `develop` (now 826 ms against 875 ms).
- [x] The test file and `format:check` are green; `bundle:check` reports 0 problems.
- [x] Every refusal is mutation-proven; `-c` is proven by outcome rows (amendment approved).
- [x] `CHANGELOG.md` cites (task 304); the reference doc names the forms and why they are refused.

### Key Features Implemented

- **Fail-closed git flag scan**: an unknown flag before the subcommand is refused; only `-C` with one plain word is read.
- **One reading of the subcommand**: a line whose two readings disagree is refused.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs`, its test file, `scripts/qa-snippets-differential.mjs`.
- `shared/resources/qa-runnable-prose-detection.md` and the regenerated `skills/*/references/` copies.
- `CHANGELOG.md`.

### Architecture/Design Decisions

The classifier refuses on the form, never the value, because the value is the string git will run.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

405 tests pass in `qa-execute-snippets.test.mjs`. QA ran seven gates; the last is PASS (95/100).

### Code Review

PR review: CONCERNS, three medium and three low findings, all documentation, fixed.

---

## Security & Compliance

### Security Review

The boundary held: 62 probes run, 0 reproduced, 0 escaped.

### Compliance Review

Not applicable.

---

## Documentation

### Updated Documentation

`shared/resources/qa-runnable-prose-detection.md` § 2a-iii, `CHANGELOG.md`.

### Documentation Links

See `docs/tasks/task.304.qa-snippet-classifier-git-literal-execution/`.

---

## Demo Notes

### How to Verify

`CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`, then `node scripts/qa-snippets-docscan.mjs`.

---

## Impact & Value

### Technical Impact

A QA run can no longer be made to execute an attacker-chosen string through a git option.

---

## Known Limitations & Future Work

### Current Limitations

`-c` is held by three overlapping layers, so no single revert turns a test red; the outcome rows prove it.
