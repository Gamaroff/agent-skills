# Sprint Review Summary - Harden task.135's gate-head scoping

**Story/Task ID:** task.168
**Epic:** — (standalone task; follow-up to task.135)
**Completed Date:** 2026-10-03
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#562](https://github.com/Gamaroff/agent-skills/pull/562)

---

## Summary

This task closes the six advisory follow-ups that task.135 left in the QA loop. QA re-review now fails toward review on every malformed input:

- a gate head it cannot vouch for
- a file name that looks like pathspec magic
- a safety value an agent typed
- a fix still in the working tree
- a helper refusal
- a quoted head with trailing spaces

---

## What Was Delivered

### Acceptance Criteria Met

- ✅ A gate whose `head:` is not a 40-hex commit on this branch makes the trigger report `CODE_MOVED=1`
- ✅ A changed file whose name begins with `:` stays in the cycle-3+ patch
- ✅ After a security-FAIL gate, Step 3b runs whole-branch even when `SAFETY_REPROBE=false` is bound
- ✅ Step 3b HALTs when a tracked change outside the work item is uncommitted, on every re-review arm
- ✅ A `qa-cycle.sh` refusal in Phase 0 steps 2 and 5 is a HALT naming the helper's reason
- ✅ `field()` and the shipped shell sed read `head: '<sha>'  ` identically

### Key Features Implemented

- `shared/resources/qa-safety-clause1.sh` gives clause 1 of the safety re-probe one definition. The awk probe moved into it byte-for-byte, and both QA skills' Phase 0 and Step 3b call it.
- The uncommitted-fix HALT reads tracked changes only and warns on untracked files. It runs on every re-review arm.
- The QA loop's bounded fast-gate retry now commits its red attempt without pushing, so it agrees with the new HALT.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-re-review-scope.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`
- 🆕 `shared/resources/qa-safety-clause1.sh`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- Tests: `qa-scope-from-head.test.mjs` (L1–L15), 🆕 `qa-safety-clause1.test.mjs`, `gate-head-freshness.test.mjs`, `qa-re-review-scope-parity.test.mjs`
- Bundled `references/` copies; `CHANGELOG.md`

### Architecture/Design Decisions

- The shared rule calls the script as `.agents/skills/{qa-task|qa-story}/references/…`, so only the two QA skills bundle it.
- The rebinds read `qa-cycle.sh`'s own refusal reason rather than adding a second gate glob, so the helper stays the one definition (task.158).

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- 41 new tests in develop, plus 18 across the QA fix cycles. The four affected suites pass 176/176 under bash and zsh, including with `TMPDIR=/tmp`.
- Mutation proofs: one red proof per fix, across development and both fix cycles.
- `npm run ci:fast`: 5,260 tests, 0 failures.

### Code Review

- QA: three cycles. CONCERNS 80, then CONCERNS 90, then PASS 100; the last exited by route 2b.
- Step 5c `/review-pr`: APPROVE, with five LOW findings deferred.

---

## Security & Compliance

### Security Review

PASS. Clause 1 is `boundary: internal` because its only input is a pipeline-written gate file. No secrets, no unsafe patterns, no dependency changes.

### Compliance Review

Not applicable: this is internal QA-loop tooling.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]` › Fixed
- `qa-re-review-scope.md` (clause 1, literal paths, the uncommitted-fix HALT)
- `develop-pipeline-step-5-6-qa-loop.md` §5b step 0a

### Documentation Links

- Task: `task.168.gate-head-scoping-hardening.md`
- DoD: `task.168.dod.1.gate-head-scoping-hardening.md`

---

## Demo Notes

### How to Verify

1. `command node --test shared/resources/tests/qa-scope-from-head.test.mjs`. L1–L15 cover each fix under bash and zsh.
2. `command node --test shared/resources/tests/qa-safety-clause1.test.mjs`.
3. This task's own QA cycle 3 ran the new scoped arm on its own branch: "files changed since gate 2 (head deb5e7727be4; 20 files)".

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

A QA re-review can no longer skip, narrow or miss a fix because of a mistyped head, a `:`-named file, a stale safety flag or an uncommitted change.

### Technical Impact

Clause 1 now has one definition, and the two readers of `head:` agree. The QA loop's two contracts (the HALT and the red-gate exit) are reconciled.

---

## Known Limitations & Future Work

### Current Limitations

Six LOW items are deferred and listed in the task's Deferred Work:

- the trigger still counts a tracked `.claude/state` change
- the push-budget statements omit the red exit
- L15 cannot tell local HEAD from a pushed branch
- the red-exit commit does not name the hook-refusal path
- the guard's git exit status is unchecked
- one doc still places the probe in the shared rule

### Suggested Follow-Up Stories

One small follow-up task for the six deferred LOW items.

---

**Status:** ✅ **ACCEPTED**
