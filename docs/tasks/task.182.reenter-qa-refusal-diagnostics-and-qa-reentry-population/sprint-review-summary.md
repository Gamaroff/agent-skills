# Sprint Review Summary - reenter-qa refusal diagnostics and the `qa_reentry` reader population

**Story/Task ID:** task.182
**Completed Date:** 2026-10-13
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#642](https://github.com/Gamaroff/agent-skills/pull/642)

---

## Summary

A refused QA re-entry now says why, and an unreadable git tree can no longer pass as a clean one and route a code fix to `/finalise`. The `qa_reentry` lock field and the second writers of `qa_max_cycles` and `qa_phase` now reach every reader and describer task.170 missed.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The three `no-gate` causes (no gate, an unnumbered gate, two gates claiming one cycle) each relay `qa-cycle.sh`'s own reason as `reenter-qa:` lines
- [x] A failing `git status` refuses `git-unreadable` before any write
- [x] The resume contract's refusal list equals the script's reasons, `git-unreadable` included
- [x] The hooks doc and resume detector prompt name `qa_reentry`; the hooks doc names both `qa_max_cycles` writers
- [x] Performance: the gate-read path gains one `mktemp`, `sort` and `rm`, plus the cwd guard's three `git rev-parse` calls
- [x] ShellCheck, Prettier, `npm test`, `bundle:check` green
- [x] Every new case mutation-proven
- [x] CHANGELOG `[Unreleased]` › Fixed cites task 182
- [x] No consumer migration needed

### Key Features Implemented

- **Refusal diagnostics**: `no-gate` relays the cause; its route is back to the operator, never step 7
- **`git-unreadable` refusal**: a tree that cannot be read is never measured as clean
- **cwd usage guard**: running from anywhere but `<doc-dir>`'s repository root is a usage error (exit 2)
- **One statement of the `qa_phase` writer rule**: the pause reference's lock schema owns it; the hooks doc, the resume contract and both SKILL.md cite it, and a parity test derives the describer population by `git grep`

---

## Technical Details

### Files Modified/Created

- `shared/resources/reenter-qa-after-finalise.sh` - refusal relay, `git-unreadable`, cwd guard
- `shared/resources/reenter-qa-after-finalise.test.sh` - new cases (61 total)
- `shared/resources/develop-pipeline-resume-contract.md`, `develop-pipeline-hooks.md`, `develop-pipeline-pause.md`, `pipeline-resume-detector-prompt.md` - refusal list, routes, field writers
- `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` - never-step-7 set, `qa_phase` citation
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, `reenter-qa-refusals-parity.test.mjs` - parity guards
- 21 bundled `references/` copies regenerated

### Architecture/Design Decisions

The `qa_phase` rule was found restated wrongly at a new site in QA cycles 1, 2 and 3, so it was consolidated into one statement with a derived guard rather than patched a fourth time.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None for callers — exit codes unchanged; the cwd guard refuses only invocations that could not measure correctly

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** re-entry suite 61 cases; two parity tests
- **Test Coverage:** every refusal path covered; all new cases mutation-proven (four at `/finalise`, `task.182.dod.1.mutation-proofs.txt`)

### Code Review

- **Reviewers:** QA code reviewer each of 4 cycles; Step 5c `/review-pr`
- **Approval Status:** ✅ QA gate PASS 100/100; PR review CONCERNS (doc-only, fixed)
- **Review Comments Addressed:** all; TASK-182-005 (LOW) carried to Deferred Work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Refuse-by-default boundary probed: 8 candidates executed, 0 reproduced
- [x] No secrets, no unsafe patterns
- [x] Fails closed on an unreadable tree

### Compliance Review

✅ **Not applicable** — internal developer tooling, no personal, payment or health data, no UI

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` › Fixed
- [x] Resume contract, hooks doc, pause reference, detector prompt
- [x] Script header

---

## Demo Notes

### How to Verify

1. `bash shared/resources/reenter-qa-after-finalise.test.sh` → 61 passed
2. `command node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs evals/shared/tests/reenter-qa-refusals-parity.test.mjs` → green
3. Expected outcome: each `no-gate` cause prints its reason above `refused (no-gate)`; a failing `git status` prints `refused (git-unreadable)`
