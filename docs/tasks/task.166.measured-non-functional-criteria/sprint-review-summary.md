# Sprint Review Summary - Give measured non-functional criteria a defined path through review and finalise

**Story/Task ID:** task.166
**Completed Date:** 2026-10-02
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#550](https://github.com/Gamaroff/agent-skills/pull/550)

---

## Summary

A measured non-functional criterion — a runtime, size or count bound — now has a defined path: finalise's AC prompt passes it against a stated bound and a committed, cited measurement, and review-task flags at review time a criterion that neither a planned test nor such a measured bound holds.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] finalise's AC prompt names three test-free kinds; the measured kind's `PASS` needs a stated bound, a measurement meeting it and its command; an unbounded criterion fails unless a per-PR test holds it (pinned)
- [x] the closing sentence covers all three kinds and routes a test-assertable bound to the behaviour path (pinned)
- [x] review-task Step 6 check 4 flags, at Important, a non-functional criterion held by neither a planned test nor a measured bound (pinned)
- [x] obs #204's documentation kind is now pinned
- [x] review-task check 4 flags a behaviour criterion with no planned test and a criterion met only after merge, at Important (pinned)
- [x] each new test file runs in under 1s — measured: 0.28s / 0.23s at the PR head (`time node --test`)
- [x] `ci:fast`, `bundle:check` and `validate` pass; every Phase 4 mutation goes red; CHANGELOG cites (task 166)

### Key Features Implemented

- **Measured criterion kind** (`shared/resources/finalise-dod-ac-prompt.md` § Step 3): a third test-free kind with its own bar; the prompt now states its count once.
- **review-task bound rule** (`skills/review-task/SKILL.md` Step 6 check 4): one statement, split by bound type — a test-assertable bound is held only by its planned test, an untestable bound by a numeric bound plus its measuring command, an unbounded criterion by its planned test; citable N/A lines are exempt; the post-merge rule still applies.
- **Pins**: `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `tests/review-task-measured-criterion.test.js`, and the shared `tests/lib/count-of-kinds.js` pattern both use.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-dod-ac-prompt.md` (+ bundled copies under `skills/finalise/references/` and, new, `skills/review-task/references/`) — the measured kind
- `skills/review-task/SKILL.md` — check 4 rules and Issues to Flag
- `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `tests/review-task-measured-criterion.test.js`, `tests/lib/count-of-kinds.js` — pins (new)
- `CHANGELOG.md` — `[Unreleased]` › Changed

### Architecture/Design Decisions

The bound rule is stated once, in review-task check 4, and every other site — the task document, the CHANGELOG, the Issues to Flag line — cites it. QA cycles 1–4 each found a restatement left stale by the previous fix; consolidating ended that.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None to any interface. A finalise run with a bounded, measured, cited non-functional criterion now returns `PASS` for it.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 11 tests across the two pin files, plus shared fixtures in both directions
- **Mutation proofs:** 14 at implementation, then every QA-cycle fix proven red-on-revert

### Code Review

- **QA loop:** 5 cycles plus a gate-the-last-fix half-cycle; final gate PASS 100/100
- **PR review (Step 5c):** ⚠️ CONCERNS — one medium design follow-up (should finalise re-measure a measured criterion rather than read a self-reported value?), recorded, not blocking
- **Approval Status:** single-maintainer repository — no GitHub review decision; the pipeline's 5c review stands in

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — no boundary delivered; no secrets, unsafe patterns or dependency changes.

### Compliance Review

✅ **Not applicable** — internal prompt prose and tests; no data, payment, UI or health surface.

---

## Demo Notes

The first live use of the new kind is this task's own Performance criterion: its DoD cites it as `NOT_APPLICABLE: measured criterion` against a < 1s bound, with the command and a committed measurement.

## Known Limitations / Future Work

- 5c CR-1: finalise reads the cited measurement but does not re-run it — a follow-up task.
- gate.6 advisory: worked-example wording, N/A exemption narrowing, a task-doc remedy quote, exotic count-pattern shapes.
- gate 1 CR-3: make "whether a per-PR test could assert that bound" concrete.
- Post-merge: set observations #206 and #222 to actioned.
