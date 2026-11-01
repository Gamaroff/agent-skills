# Sprint Review Summary - QA applies the finalise DoD's rules before finalise does

**Task:** task.248
**Status:** Accepted
**Accepted:** 2026-11-01
**PR:** [#803](https://github.com/Gamaroff/agent-skills/pull/803) → `develop`
**Tracker:** [#801](https://github.com/Gamaroff/agent-skills/issues/801)

---

## Summary

The QA skills now apply the four rules `/finalise`'s DoD agents apply, each from one definition. These are the boundary classification of the Success Criteria, the per-member quantifier rule, the ban on unapproved criterion amendments, and the CHANGELOG citation. A failure on any of them now shows up in the QA loop, where a fix is cheap, instead of halting `/finalise` after the whole pipeline has run.

## What Was Delivered

### Acceptance Criteria Met

All 10 success criteria PASS (see `task.248.dod.1.qa-applies-finalise-rules.md`, Step 2).

### Key Features Implemented

- `probe-boundary-signals.mjs --doc`: a CLI that classifies a document's Success Criteria as boundary or not, from the shared vocabulary.
- `criteria-drift.js`: detects criteria changed since review and classifies each change as reworded, appended, approved or clean.
- `changelog-cites.sh`: one CHANGELOG-citation check (opt-in, file, citation, exit codes 0–4), used by `/finalise` 6d, `develop` and the QA docs check.
- `qa-read-back.js` check 6: a gate that omits a `boundary_reason`, or omits drift the engine can find, is refused.

## Technical Details

### Files Modified/Created

83 files changed (+10,360/−148), including generated `references/` copies, QA records and tests. The source changes are in `shared/resources/` (engines and tests) and in the SKILL.md files of qa-task, qa-story, qa-fix, develop and finalise.

### Architecture/Design Decisions

- Each rule has one definition. The QA skills cite the DoD AC prompt's rule 6 instead of restating it.
- The gate read-back checks went into `qa-read-back.js`, not into separate blocks in each skill.
- 6d gains one new HALT, `changelog-stem`. Its existing messages are unchanged and pinned by a test.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

New suites for all four engines plus a wiring test that runs the QA skills' fenced blocks under bash and zsh. The clean-checkout `npm run ci` gave 6965 pass and 0 fail. Each engine fix was mutation-proved.

### Code Review

4 QA cycles. Gate 4 is PASS at 100/100. The 5c PR review returned APPROVE with one low finding (PC-1), fixed at acceptance.

## Security & Compliance

### Security Review

PASS. Every child process takes an argv array, with no shell. `changelog-cites.sh` was probed with 9 cases (1 legitimate, 8 hostile): 0 reproduced, 0 escaped.

### Compliance Review

NOT_APPLICABLE — internal tooling only.

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]` (task 248)
- `docs/runbooks/task-development.md` (the new HALT, `/finalise halts with changelog-stem`)
- SKILL.md files: qa-task, qa-story, qa-fix, develop, finalise

### Documentation Links

- Task: `task.248.qa-applies-finalise-rules.md`
- DoD: `task.248.dod.1.qa-applies-finalise-rules.md`

## Demo Notes

### How to Verify

- `command node shared/resources/probe-boundary-signals.mjs --doc <task.md> --json`
- `command node shared/resources/criteria-drift.js --doc <task.md> --base-from-review --json`
- `bash shared/resources/changelog-cites.sh task.248` (exit 0 when cited)

### Screenshots/Visuals

Not applicable (CLI tooling).

## Impact & Value

### User Impact

Fewer `/finalise` halts in hands-free pipelines. These failures are now caught and fixed inside the QA loop.

### Technical Impact

One definition per rule shared by QA and the DoD, so the two can no longer disagree.

## Known Limitations & Future Work

### Current Limitations

`(bug N)` changelog citations are not enforced yet.

### Suggested Follow-Up Stories

Gate 4's advisory items CR-2, CR-3 and CR-4.
