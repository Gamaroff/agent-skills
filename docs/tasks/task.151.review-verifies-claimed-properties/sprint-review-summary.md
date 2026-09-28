# Sprint Review Summary - review-task: stack-neutral pre-pass, executed invariants, released-shape diff

**Story/Task ID:** task.151
**Completed Date:** 2026-09-28
**Completed By:** Claude (develop-task pipeline, dispatched by develop-next)
**Pull Request:** [#511](https://github.com/Gamaroff/agent-skills/pull/511)

---

## Summary

The review skills now check that the properties a document claims actually hold, not only that the
things it names exist: the architecture pre-pass measures against the repository's own standards,
claimed invariants are executed, and compatibility handling is diffed against the released shape.

---

## What Was Delivered

### Success Criteria Met

- [x] SC1–SC5: `prepass-axes.js` derives Agent B's domains and axes from `concepts/` H2s; both prompt files take slots and return `axes_checked`; both review skills dispatch from the prompt file
- [x] SC6: Invariant verification (obs #161) at 5 sites — review-task check 11 + Detection Rule 7, review-story check 8 + Rule 6, create-task 3.5
- [x] SC7: Released-shape diff (obs #170) at 3 sites — review-task check 12, review-story check 9, create-task 3.5
- [x] SC8–SC15: timing, read bound, mutation proofs, CI-equivalent gates, engine conventions, CHANGELOG, hand runs, bundle

### Key Features Implemented

- **Stack-neutral pre-pass**: a shell/Node repository is no longer measured against "backend / frontend / payments"
- **Invariant verification**: a claimed ordering, uniqueness, idempotence or round-trip is run on the proposed inputs; falsified → Critical
- **Released-shape diff**: legacy handling is scoped from `git show <tag>:<path>`, not from the finding that prompted it

---

## Technical Details

### Files Modified/Created

- `shared/resources/prepass-axes.js` — new pure helper + CLI (`atxH2` CommonMark heading reader)
- `shared/resources/jira-sync.js` — exports `makeFenceTracker`
- `shared/resources/review-{task,story}-prepass-prompts.md` — Agent B slots, `axes_checked`
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md` — the checks
- `shared/resources/tests/prepass-axes.test.mjs`, `tests/review-property-checks.test.js` — new tests
- `tests/lib/markdown-section.js` — shared per-item reader (moved from the task.145 test)

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** Agent B's output adds a required `axes_checked` (prompt and validator ship together)

---

## Testing & Quality Assurance

- **Unit Tests:** 26 new tests; `ci:fast` 4363 pass / 0 fail
- **Mutation proofs:** 22 recorded, each red by name
- **QA:** 3 cycles — gate 3 PASS 95; TASK-151-BUG-1 (empty concepts file) and -BUG-2 (empty heading) fixed and closed
- **Hand runs:** task.141 as created → Critical under check 11; task.143 as created → Important under check 12 citing `v0.51.0`

---

## Known Limitations and Future Work

Deferred Work in the task document: U+2028 in a heading (C3-CR-2), headings inside HTML comments,
a mistyped `--arch` reads as the no-docs fallback, joiner characters inside headings.
