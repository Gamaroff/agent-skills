# Sprint Review Summary - Gap body: refuse an empty section; correct task.222's Deferred Work line

**Story/Task ID:** task.223
**Epic:** none (standalone task, follow-up to task.222)
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff
**Pull Request:** [#720](https://github.com/Gamaroff/agent-skills/pull/720)

---

## Summary

`dod-gap-count.sh --body` now refuses an empty gaps section. It exits 1 with a `HALT:` line instead of printing its internal marker `S`. task.222's Implementation Summary also now names its deferred finding instead of saying "none".

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A gaps section with no lines makes `--body` exit 1 with empty stdout and a `HALT:` line naming the section as empty.
- [x] A section holding only blank or whitespace lines is refused the same way.
- [x] A heading-only section still prints with exit 0. Count mode still HALTs with "lists no gap".
- [x] The existing populated-section `--body` test passes unchanged.
- [x] task.222's Deferred Work line names QA-222-13 and points at its `## Deferred Work` section.
- [x] The guard is mutation-proven. bundle:check reports 0 problems, shellcheck is clean, `npm test` is green, and the CHANGELOG entry is present.

### Key Features Implemented

- **Empty-section refusal**: `--body` removes the `S` marker and refuses a body with no non-blank line. This matches the script's other refusals.

---

## Technical Details

### Files Modified/Created

- `shared/resources/dod-gap-count.sh`: the `--body` guard and its header comment
- `skills/finalise/references/dod-gap-count.sh`: the bundled copy, regenerated
- `shared/resources/tests/finalise-gaps-path.test.mjs`: one new test covering three empty shapes plus a heading-only control
- `docs/tasks/task.222.finalise-gaps-path-fixes/task.222.finalise-gaps-path-fixes.md`: the Deferred Work line corrected
- `CHANGELOG.md`: an `[Unreleased]` Fixed entry

### Architecture/Design Decisions

The check runs on the output the helper already captures, so the section is not scanned a second time. Both callers in `finalise` Step 8.5 already stop on a non-zero exit, so neither caller changed.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. An input that used to produce a malformed body is now refused.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 1 test (4 shapes) in `shared/resources/tests/finalise-gaps-path.test.mjs`. The file runs 18/18.
- **Probe:** The probe engine (`shell-argv:` form) ran 11 cases at QA and again at DoD: 0 reproduced, 0 escaped. With the guard reverted, it flagged 4 cases.
- **Mutation proof:** Reverting the guard turns the new test red.

### Code Review

- **Reviewers:** QA diff reviewer (0 findings). `/review-pr` conformance lens: ✅ APPROVE, 0 findings.
- **Approval Status:** ✅ Approved. The repository requires no human reviews.
- **Review Comments Addressed:** None raised.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Boundary probed: 11 executed, 0 reproduced, 0 escaped
- [x] No secrets, eval or exec. The document path is never evaluated.
- [x] No dependency change

### Compliance Review

✅ **Not applicable.** This is internal skill tooling with no PII, payment, UI or PHI.

---

## Documentation

### Updated Documentation

- [x] The helper header comment states the new refusal
- [x] CHANGELOG `[Unreleased]` entry
- [x] task.222 record corrected

---

## Demo Notes

### How to Verify

1. Write a document whose `## Definition of Done - Gaps Identified` heading is directly followed by `## Change Log`.
2. Run `bash shared/resources/dod-gap-count.sh <doc> --body`.
3. Expect exit 1, no stdout, and a `HALT: … is empty` line on stderr.

---

## Impact & Value

### User Impact

A `/finalise` gaps run can no longer post a PR comment whose gap list is a lone `S`.

### Technical Impact

The `--body` mode now follows the same refuse-or-print rule as count mode. This closes task.222's last carried finding.

---

## Known Limitations & Future Work

### Current Limitations

- None known.

### Suggested Follow-Up Stories

- None.

---

## Metrics

- **Time to Complete:** 1 day
- **Lines of Code Changed:** +79 / -6 (excluding this task's own records)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
