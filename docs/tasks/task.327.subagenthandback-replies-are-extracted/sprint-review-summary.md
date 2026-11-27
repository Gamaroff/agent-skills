# Sprint Review Summary - SubagentHandback replies are extracted, not hand-copied

**Story/Task ID:** task.327
**Completed Date:** 2026-11-27
**Completed By:** develop-task pipeline (develop-next, autonomous)
**Pull Request:** [#959](https://github.com/Gamaroff/agent-skills/pull/959)

---

## Summary

`/finalise` now takes an async agent's reply out of its transcript when the agent answered with a `SubagentHandback` call rather than a final text turn. The probe plan and AC YAML extracts no longer fall back to an unverified hand copy.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A transcript whose only reply is a `SubagentHandback` call answers `extracted`, `reply: "handback"`, byte-exact (#1). A text reply still answers `reply: "text"` (#2).
- [x] Of a text reply and a hand-back, the later one in the transcript is read. A block only in an earlier turn is not (#3, #4).
- [x] Only the exact tool name `SubagentHandback` with a non-empty string message is read (#5).
- [x] Any answer but `extracted` leaves no file at `--out`, even a stale one, for all six reasons (#6).
- [x] An `--out` that names the transcript is a usage error and leaves the transcript alone (#7).
- [x] `finalise-rerun-scope.js extract` plus `merge --sha256` records `verified: true` for a hand-back (#8). Proved live: DoD run 2's AC YAML was extracted from a real hand-back.
- [x] Test-evidence, CI, docs and CHANGELOG criteria (#9–#14).

### Key Features Implemented

- **Hand-back reply reading** in `shared/resources/agent-reply-block.js` (the `reply` field, the newest-reply rule).
- **`--out` hygiene**: the stale file is removed before any non-extracted answer. `--out` = transcript (by file identity) and a directory `--out` are refused.

---

## Technical Details

### Files Modified/Created

- `shared/resources/agent-reply-block.js` (+ bundled `skills/finalise/references/agent-reply-block.js`): reply selection and `--out` handling
- `shared/resources/tests/agent-reply-block.test.mjs`: 20 tests
- `shared/resources/tests/finalise-rerun-scope.test.mjs`: CLI hand-back and stale `--out` tests
- `skills/finalise/SKILL.md`: the fallback paragraphs say a failed extract leaves no `--out` file
- `CHANGELOG.md`: `[Unreleased]` entry (task 327)

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **QA cycles:** 4 gates (CONCERNS → FAIL → PASS 92 → PASS 100), with 2 fix cycles and 1 DoD re-entry
- **Mutation evidence:** mutations (a)–(n) recorded across qa.1–qa.4. Each went red on its named test.
- **Regression:** ci:fast on the LAN server, 8926 tests, 0 fail. CI SUCCESS on `24ce5725c`.
- **PR review:** pr-review.2, CONCERNS with no coverage finding. Both findings are closed.

---

## Security & Compliance

✅ Security PASS. The probe plan ran 3 controls: 23 probes executed, 0 reproduced, 0 escaped. Compliance is not applicable (internal tooling).

---

## Known Limitations / Future Work

- CR-1: the stale `--out` coverage check trusts the module's own `REASONS` list. It was measured and is not a present defect.
- CR-2: a reason mismatch in that test stops at the first case.
