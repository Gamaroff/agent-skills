# Sprint Review Summary - Skill and test tooling see what ships

**Story/Task ID:** task.280
**Completed Date:** 2026-11-18
**Pull Request:** [#919](https://github.com/Gamaroff/agent-skills/pull/919)

---

## Summary

Three repository checks now look at what actually ships: a lint for a quote inside a `${NAME:?message}` guard, a fence-balance check with a ratchet that keeps tests on the one fence reader, and a `bundle:check` scan of skill-owned reference docs for unvendored scripts.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Each check fails on its defect and passes its control, shown by named tests.
- [x] No unbalanced fence in tracked `SKILL.md` and shared resources.
- [x] `bundle:check` fails on the task.238 shape, shown by a test that recreates it.
- [x] Wall time within 10% of `develop`, on a stated bound (new tests about 0.5 s of a 757.9 s suite). The method was amended with the owner's approval.
- [x] Each check has a mutation proof in the QA report.
- [x] `bundle -- --check` reports 0 problems and the suite passes.
- [x] Ten parallel runs of the two racing test files pass.
- [x] No un-allowlisted hand-written fence reader remains in `tests/` (2 migrated, 17 allowlisted with reasons).

### Key Features Implemented

- **Quote lint**: flags an unescaped quote in a `:?` guard word.
- **Fence balance and ratchet**: `fenceProblems` beside `extractBlocks`; a ratchet fails on an unlisted hand-written fence reader.
- **Bundle discovery**: `skill_owned_invocations` and the `UNVENDORED` class scan `references/**/*.md` and `*.sh`.

---

## Technical Details

### Files Modified/Created

- `skills/create-skill/scripts/bundle_skill.py` - invocation discovery and `UNVENDORED`
- `shared/resources/qa-execute-snippets.mjs` - `fenceProblems` (7 bundled copies regenerated)
- `tests/fence-balance.test.js`, `tests/fence-reader-ratchet.test.js`, `tests/unbound-default-reads.test.js`, `tests/bundle-check-mode.test.js` - new and extended tests
- `skills/create-skill/SKILL.md`, `CHANGELOG.md` - rules and entry

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Server gate:** 8591 tests, 0 failed.
- **QA:** 4 gates (CONCERNS, CONCERNS, PASS, PASS 95). PR review: CONCERNS, then APPROVE.
- **Known follow-ups** (gate 4, not blocking): nested invocation path capture, `UNVENDORED` breadth, nested same-name doc skip, ratchet scanner gaps, quote lint breadth.

---

## Security & Compliance

Security PASS (no input boundary). Compliance not applicable.
