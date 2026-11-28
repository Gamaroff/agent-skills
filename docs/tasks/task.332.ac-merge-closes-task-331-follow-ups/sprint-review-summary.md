# Sprint Review Summary - The AC merge closes task 331's follow-ups

**Story/Task ID:** task.332
**Completed Date:** 2026-11-28
**Completed By:** Lorien Gamaroff (pipeline: /develop-task)
**Pull Request:** [#964](https://github.com/Gamaroff/agent-skills/pull/964)

---

## Summary

`/finalise`'s AC merge now refuses every answer it cannot tie to the work item being finalised. Each refusal names its own cause and its remedy, and the merge's state files are keyed by work item, so two items finalised in one checkout never share one.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every row of the § 8 table is held by a `finalise-rerun-scope` test
- [x] The substituted Step 3c block reads the stem-keyed scope and extract paths
- [x] No run-number-keyed scope or extract path is left in `skills/finalise/SKILL.md`
- [x] Performance: not applicable (no bound claimed)
- [x] All 7 § 8 mutations are recorded in the QA report with the test each turned red
- [x] `npm run test:remote` and `npm run bundle:check` pass
- [x] Step 3c has `result-document-unnamed` and `scope-document-missing` arms that HALT with remedies
- [x] CHANGELOG `[Unreleased]` names the three changes and each resume path

### Key Features Implemented

- **`merge` requires `--doc`**: a merge with no document is a usage error (exit 2), and nothing is written.
- **`result-document-unnamed`**: an AC answer that names no `story_file` is refused, not merged.
- **`scope-document-missing`**: a scope that names no document (one written before task 331) is told apart from another document's scope.
- **Stem-keyed state files**: the scope, extract, result and merged files carry the work item's stem.
- **Hand copy after an extract** (QA cycle 2): the remedy removes the old extract record, and `result-hash-mismatch` has its own arm.
- **zsh `--sha256` fix** (QA cycle 2): an array replaces `${X:+--flag "$X"}`, which zsh passed as one word.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-rerun-scope.js`: the merge refusals and `--doc`
- `shared/resources/finalise-dod-ac-prompt.md`: the exact-path `story_file` rule
- `skills/finalise/SKILL.md`: the Step 3a/3c paths, arms and remedies
- `shared/resources/tests/finalise-rerun-scope.test.mjs`: the CLI tests
- `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`: Step 3c under bash and zsh (20/20)
- `CHANGELOG.md`: the task 332 entry
- Bundled `references/` copies under finalise, review-story and review-task

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** `merge` requires `--doc`; the scope and extract file names changed. The resume path is in the CHANGELOG.

---

## Testing & Quality Assurance

- **Full suite (LAN server):** 8,977/8,980 pass, 0 fail, 3 skipped
- **QA:** 3 cycles; gate 3 PASS 100/100, with every fix mutation-proven
- **Code Review:** /review-pr APPROVE (`task.332.pr-review.1`); CI 6/6 green

---

## Security & Compliance

- Security: PASS. `boundary: internal`, because the merge reads only pipeline-written artefacts.
- Compliance: not applicable (internal tooling).

---

## Known Limitations & Future Work

These are gate 3's future recommendations:

- CR3-1: a DoD disclosure line for a hand copy over an extract (merged as `verified: false`)
- CR3-2: assert `result.verified === false` in the hand-copy test
- The same zsh `${X:+--flag "$X"}` pattern at `skills/review-story/SKILL.md:2398` and `:2483`
- CR-2, CR-3, CR-4: prompt wording, the rerun-at-head files keyed by `DOD_N` alone, and the double YAML parse
