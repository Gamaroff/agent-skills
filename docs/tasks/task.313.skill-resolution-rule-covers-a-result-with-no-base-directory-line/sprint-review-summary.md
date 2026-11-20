# Sprint Review Summary - The skill-resolution rule covers a Skill result with no Base directory line

**Story/Task ID:** task.313
**Completed Date:** 2026-11-17
**Pull Request:** [#917](https://github.com/Gamaroff/agent-skills/pull/917)

---

## Summary

The rule that every develop pipeline follows after loading a skill now says what to do when the load result has no `Base directory` line: skip the check, log it, and carry on with the loaded copy.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The rule states the no-`Base directory`-line case and does not tell the reader to fix a call.
- [x] The three bundled copies carry the same paragraph (`bundle:check` reports 0 problems).
- [x] `format:check` passes. It reads no Markdown, so the checks that do reach the files are recorded in the task.
- [x] The fast gate passes: green on the PR's CI for the final head.
- [x] `CHANGELOG.md` cites task 313.

### Key Features Implemented

- **No-line case**: one paragraph under the rule's table, matching how the rule already treats an unreadable base directory.

---

## Technical Details

### Files Modified/Created

- `shared/resources/skill-resolution.md` - the new paragraph
- `skills/develop-{bug,story,task}/references/skill-resolution.md` - regenerated copies
- `CHANGELOG.md` - one line under Unreleased

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none. The engine and its exit codes are unchanged.

---

## Testing & Quality Assurance

- **QA:** 2 cycles. Gate 1 CONCERNS (90), one medium finding fixed. Gate 2 PASS (95).
- **PR review:** APPROVE at low effort, two low findings, both closed at finalise.
- **Known limitation:** the local fast gate had one load-sensitive failure that passes alone; CI on the final head is green.

---

## Security & Compliance

Not applicable: documentation only.
