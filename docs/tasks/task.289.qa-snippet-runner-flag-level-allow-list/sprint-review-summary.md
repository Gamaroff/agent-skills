# Sprint Review Summary - QA snippet runner allows flags, not just commands

**Story/Task ID:** task.289
**Completed Date:** 2026-11-09
**Completed By:** develop-task pipeline (owner: Lorien Gamaroff)
**Pull Request:** [#864](https://github.com/Gamaroff/agent-skills/pull/864)

---

## Summary

The QA snippet runner no longer lets a command through just because its name is on a list. Each allowed command now has a table of the flags and operands it may carry, and anything outside the table is refused. Seven known ways a "read-only" block could write a file are closed.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The seven known gaps classify as `mutating`, each by a named test, and each control stays runnable
- [x] A flag or operand outside a table entry is refused (`flag-not-allowed`), with a test per command; a command with no entry is refused
- [x] `uniq in out` and `file -C -m magic` are refused, by named tests
- [x] The blocks the old engine ran and the new one refuses are listed in the QA report (19; 18 already refused on `develop`, one new)
- [x] Full-suite time within 10% of `develop` (ratio 1.009); docs-scan time +1.4%
- [x] Each fix has a mutation proof recorded in the QA report
- [x] Bundle check clean, full CI green, CHANGELOG cites the task, owner decision on the refused blocks recorded

### Key Features Implemented

- **Per-command flag allow-list (`SAFE_FLAGS`)**: explicit entries for `sed`, `find`, `sort`, `uniq`, `file`, `diff`, `date` and `tail`; every other allowed command is audited as taking any flag.
- **Substitution-aware scan**: each `$(…)`, backtick and process substitution is read as one word before the command is judged, so none can cut a command's arguments. The end of a substitution is found the way the shell finds it (quotes, escapes, nesting, comments).
- **Fail closed**: a substitution the scan cannot read is refused for any word.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` - the classifier
- `shared/resources/tests/qa-execute-snippets.test.mjs` - 300 tests, gap and control tables
- `shared/resources/qa-runnable-prose-detection.md`, `shared/resources/probe-boundary-rule.md` - the rule's prose, with bundled copies under `skills/*/references/`
- `CHANGELOG.md` - the entry for task 289

### Architecture/Design Decisions

A deny-list names what is forbidden and misses the next spelling; an allow-list names what is permitted and refuses the rest. Six QA gates each found a new way the scan read a construct differently from the shell, which is why the second half of the work replaced the substitution handling rather than patching it.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** 19 documentation blocks that the old engine ran are now refused (17 decided by the owner; `tail -f` is the one new refusal). The owner accepted the refusal and chose not to track variable values.

---

## Testing & Quality Assurance

- **Unit Tests:** 300 tests in `shared/resources/tests/qa-execute-snippets.test.mjs`, all run per pull request
- **Security probe:** 31 hostile and legitimate cases executed against the classifier, 0 reproduced, 0 escaped
- **QA gates:** six, ending WAIVED by the owner at 82/100; five fix cycles
- **Pull request:** #864, PR review verdict CONCERNS with every finding resolved

---

## Known Limitations and Future Work

Two findings stay open on purpose, because they are identical on `develop` and outside what this task changed: a `#` after an escaped space is read as a comment, and a 20,000-deep nesting throws instead of being refused. Both are filed as [task.290](../task.290.qa-snippet-runner-comment-after-escaped-space/task.290.qa-snippet-runner-comment-after-escaped-space.md).

A test per behaviour would hold three initial checks better: they share one combined test today (recorded in the QA report).
