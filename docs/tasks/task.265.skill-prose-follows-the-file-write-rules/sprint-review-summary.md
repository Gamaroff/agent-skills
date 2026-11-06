# Sprint Review Summary - Skill prose follows the file-write rules

**Story/Task ID:** task.265
**Completed Date:** 2026-11-06
**Completed By:** Lorien Gamaroff (pipeline run)
**Pull Request:** [#849](https://github.com/Gamaroff/agent-skills/pull/849)

---

## Summary

The repository's rule against heredocs and interpreter-script edits is now written down once, with a ready recipe for each job it blocks, and a test stops new payload heredocs from entering the shipped skill text. Moving the 32 existing ones is a separate task (284).

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The rule is stated once in `shared/resources/file-write-rules.md` and cited by fragment from the inline-implementation section, the QA loop and the mutation recipe.
- [x] `mutation-proving.md` no longer names an interpreter edit; it points to the "Mutation revert" recipe.
- [x] `qa-task` and `qa-story` state how the gate is written; `qa-fix` Step 7 holds a freshness assertion and the two-call rule.
- [x] `npm test` wall time is within 10% of `develop` (ABBA series: +1.1%).
- [x] A ratchet test fails when a payload heredoc is added and passes at the committed count (mutation-proved).
- [x] `bundle --check` reports 0 problems and `npm test` passes in CI.
- [x] `quick_validate.py` passes for each skill edited.
- [x] The follow-up task for the 32 sites is filed (task 284).
- [x] The split is noted in `docs/tasks/task-registry.md`.

### Key Features Implemented

- **One rule, four recipes**: edit, mutation revert, gate write and fresh-body post, in `shared/resources/file-write-rules.md`.
- **Fresh-body guard**: `qa-fix` Step 7 refuses to post a comment body that does not carry this cycle's fix commit.
- **Payload-heredoc ratchet**: a test that counts payload heredocs in shipped prose and fails when the count moves.

---

## Technical Details

### Files Modified/Created

- `shared/resources/file-write-rules.md` - the rule and its recipes (new; 11 bundled copies)
- `shared/resources/tests/payload-heredoc-ratchet.test.mjs` - the ratchet (new, 7 tests)
- `skills/qa-fix/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/review-pr/SKILL.md` - cite the rule; qa-fix gains the freshness guard
- `shared/resources/mutation-proving.md` and the develop-pipeline step docs - cite the recipes
- `docs/contributing/traps.md` - load-sensitive test list

### Architecture/Design Decisions

The rule lives in one shared source and is cited by fragment, so a skill that cites it does not inherit the whole closure of the hub. The ratchet freezes the count at 32 and is a floor to move down, not a ban, because migrating the remaining sites is its own task.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 7 tests in `shared/resources/tests/payload-heredoc-ratchet.test.mjs`
- **Full suite:** 7946 tests, 0 failed (`ci:fast`); CI green on the PR head

### QA

- **Gate:** PASS 95/100 after 3 cycles (80 → 90 → 95); every medium finding fixed
- **PR review (conformance lens):** CONCERNS, no open coverage finding
- **Open advisory:** T265-QA-8 (the widened pattern also counts a here-string; fails loudly, no tracked file hits it)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — no secrets, no unsafe patterns. The qa-fix stale-body guard was probed under bash and zsh: 6 runs, none reproduced. Two recommendations for the owner (the guard accepts an empty `{sha}`, and matches as a regex rather than a fixed string).

### Compliance Review

Not applicable: internal skill prose and test tooling.

---

## Follow-ups

- Task 284: migrate the 32 allow-listed heredoc sites to the file tool.
- T265-QA-8: exclude the here-string from the ratchet pattern.
- A test that every bundled copy citing `file-write-rules.md` carries it.
- Optional: refuse an empty `{sha}` in the qa-fix freshness guard.
