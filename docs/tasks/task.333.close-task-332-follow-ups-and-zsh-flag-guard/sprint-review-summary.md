# Sprint Review Summary - Close task 332's follow-ups and guard the zsh flag trap

**Story/Task ID:** task.333
**Epic:** none (standalone task)
**Completed Date:** 2026-11-28
**Completed By:** Lorien Gamaroff (pipeline: /develop-next → /develop-task)
**Pull Request:** [#966](https://github.com/Gamaroff/agent-skills/pull/966)

---

## Summary

The two review-story `${X:+--flag "$X"}` sites now use the array form, and a new guard test fails on any new instance. `/finalise` discloses every unverified AC hand copy, keys its re-run-at-head files by work item, says exactly what `merge` refuses, and parses the AC answer once.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] #1 The guard fails on the unfixed tree and names exactly `skills/review-story/SKILL.md:2398` and `:2483` (recorded in QA report 1)
- [x] #2 After the fix the guard passes; its zsh premise case shows 1 argument for the bad form and 2 for the array form
- [x] #3 Step 3c prints `AC_YAML_VERIFIED=false` after a hand copy and `true` after an extract, matching the record
- [x] #4 No Step 3a re-run-at-head path is keyed by `DOD_N` alone (stem-keyed; mutation M5 red)
- [x] #5 One `merge` CLI run calls `parseYamlSubset` exactly once
- [x] #6 Performance: not applicable, no bound claimed
- [x] #7 All six §8 mutations recorded in the QA report, each with its red test
- [x] #8 CI green on the PR head; `test:remote` 8987 pass, 0 fail
- [x] #9 The AC prompt's `story_file` rule matches `sameDocument`
- [x] #10 The CHANGELOG names the renamed files and the resume path
- [x] #11 `docs/contributing/traps.md` has the zsh entry, and the guard cites it

### Key Features Implemented

- **zsh flag-expansion guard**: `shared/resources/tests/zsh-flag-expansion-guard.test.mjs` scans every SKILL.md, every `shared/resources/*.md` and every hand-authored `skills/*/references/*.md` (generated copies are excluded by their marker). It also catches the whitespace form.
- **review-story fix**: both Jira blocks now pass `--doc-branch` through a `PIN_ARGS` array.
- **finalise hardening**: `AC_YAML_VERIFIED` disclosure, stem-keyed re-run-at-head files, exact `merge` refusal wording, and a single parse of the AC answer.

---

## Technical Details

### Files Modified/Created

20 files changed, +1461/−47 (including pipeline artefacts). Code and prose:

- `shared/resources/tests/zsh-flag-expansion-guard.test.mjs`: new guard test (7 cases)
- `skills/review-story/SKILL.md`: the two `PIN_ARGS` sites
- `skills/finalise/SKILL.md`: Steps 3a and 3c
- `shared/resources/finalise-rerun-scope.js`: `merge()` takes `opts.answer`
- `shared/resources/finalise-dod-ac-prompt.md`: the `story_file` rule wording (bundled copies regenerated)
- `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, `shared/resources/tests/finalise-rerun-scope.test.mjs`: tests
- `docs/contributing/traps.md`, `CHANGELOG.md`: docs

### Architecture/Design Decisions

The guard selects its population by marker, not by path. A generated `references/` copy carries the `AUTO-GENERATED` header, and a hand-authored one does not, so the guard scans the files people edit and leaves out the copies the bundler rewrites.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. The re-run-at-head state files were renamed, and the old ones are inert; the resume path is in the CHANGELOG.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** a new guard suite (7/7), plus extended blocks and engine tests
- **Full suite:** `test:remote` 8990 tests, 8987 pass, 0 fail, 3 skipped
- **Mutation proof:** M1–M6 (QA cycle 1) and M8–M10 (QA cycle 2), all red on revert

### Code Review

- **Reviewers:** QA loop code reviewer (2 cycles) and the Step 5c conformance lens
- **Approval Status:** gate 2 PASS 100/100. Step 5c CONCERNS, with 0 open coverage findings
- **Review Comments Addressed:** T333-QA-1 and T333-QA-2 fixed in `b30e42f94`; PC-1 fixed in the implementation report

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**: PASS, `boundary: internal` (`finalise-rerun-scope.js#merge` reads only pipeline-owned artefacts). There are no secrets, no unsafe exec and no dependency changes.

### Compliance

NOT_APPLICABLE: internal tooling with no personal, payment or health data and no UI.

---

## Known Limitations and Future Work

- review-story Step 9.6 and the Step 10 Jira blocks read the unbound `$PIN_BRANCH` and `$STORY_FILE_PATH`. This is pre-existing on `develop`.
- Calibrate the zsh guard: it flags the correct `${X:+--flag=$X}`, and it misses `${X+--flag "$X"}` and `${1:+-f "$1"}`. No live site uses any of these forms.
- finalise Step 3c should print the reason when `AC_YAML_VERIFIED=false`.
- The security-probe `fence:` form fills one slot, so a guard block with several placeholders cannot be probed.

---

**Detailed Verification Log:** `task.333.dod.1.close-task-332-follow-ups-and-zsh-flag-guard.md`
