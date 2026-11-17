# Sprint Review Summary - develop-next reads the world before it stops

**Story/Task ID:** task.279
**Completed Date:** 2026-11-17
**Completed By:** Lorien Gamaroff (with Claude)
**Pull Request:** [#918](https://github.com/Gamaroff/agent-skills/pull/918)

---

## Summary

`/develop-next` no longer stops on a recorded HALT that the evidence has already resolved. It now also says where its quality-gate worktree goes, and four orchestrators start observation themselves.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A halt whose document is `accepted` and whose PR is `MERGED` routes on; a halt missing either piece of evidence still stops, shown by named tests.
- [x] A quality gate run in a worktree beside the checkout passes `from-observation` and `test-clean-checkout`; a `/tmp` control fails, so the green is not vacuous.
- [x] The observe-work Session Start line is in `develop-next`, `develop-task`, `develop-story` and `develop-bug`, held by one test.
- [x] `CI=true npm test` wall time is within 10% of `develop` (median 732 s against 734 s, −0.3%).
- [x] The Step 0.1a check has a mutation proof.
- [x] `bundle --check` reports 0 problems and CI is green.
- [x] `quick_validate.py` passes for the skills touched.
- [x] A halted run with no merged PR still stops (migration pin unchanged).

### Key Features Implemented

- **Evidence read before a halt**: `halt-evidence.mjs` resolves a recorded HALT only when the document is `accepted`, the PR is `MERGED` and a PR number is recorded. Any other PR-state token reads `unknown` and the halt stands.
- **Gate worktree rule**: `develop-next` Step 3 says the quality-gate worktree goes beside the checkout, never under `/tmp`.
- **Session Start line**: a one-line observe-work activation in four orchestrators.

---

## Technical Details

### Files Modified/Created

- `skills/develop-next/scripts/halt-evidence.mjs` - new evidence reader and CLI
- `skills/develop-next/SKILL.md` - Step 0.1a and the Step 3 "Where the gate runs" rule
- `skills/develop-{task,story,bug}/SKILL.md` - Session Start line
- `evals/develop-next/unit/halt-evidence.test.mjs` - 13 tests
- `evals/shared/tests/observe-work-start-line.test.mjs` - 6 tests
- `CHANGELOG.md` - entry citing task 279

### Architecture/Design Decisions

The evidence read is a small script with a named test path, not prose, so the rule is held by a test. It fails closed: a failed PR query, an unreadable document or a missing PR number keeps the halt.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 19 new tests in `evals/develop-next/unit/halt-evidence.test.mjs` and `evals/shared/tests/observe-work-start-line.test.mjs`
- **Mutation proofs:** the merged-check guard and the develop-bug Session Start line, each red on revert with named tests
- **Full suite:** 8570 passed, 0 failed (8551 on `develop`)

### Code Review

- **Reviewers:** QA gate 2 (PASS, 100) and a PR conformance review (APPROVE)
- **Approval Status:** ✅ Approved
- **Review Comments Addressed:** one medium finding (CHANGELOG citation) fixed in cycle 1

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets, no `eval`/`exec`, no child process in the shipped script
- [x] The PR-state token is compared by exact equality with a closed set; anything else keeps the halt
- [x] No dependency change

### Compliance Review

✅ **Not applicable** — an internal tooling change with no data, payment, UI or health-data scope.

---

## Documentation

### Updated Documentation

- [x] `skills/develop-next/SKILL.md` updated for the behaviour change
- [x] CHANGELOG entry under `[Unreleased]`

---

## Demo Notes

### How to Verify

1. Run `node skills/develop-next/scripts/halt-evidence.mjs --state <run-state-file> --pr-state MERGED --json` against a state file with `halted: true`, a recorded `prNumber` and an `accepted` document: exit 0, the halt is resolved.
2. Repeat with `--pr-state OPEN`: exit 1, the halt stands.

---

## Impact & Value

### Technical Impact

A develop-next run that halted before its PR merged no longer needs a human to clear the halt once the work has landed.

---

## Known Limitations & Future Work

### Current Limitations

- The `--json` flag in `halt-evidence.mjs` is parsed and never read (low advisory CR-1).

### Suggested Follow-Up

- Drop or document the unread `--json` flag.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
