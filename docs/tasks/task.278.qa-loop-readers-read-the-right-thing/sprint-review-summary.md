# Sprint Review Summary - QA loop readers read the right thing

**Story/Task ID:** task.278
**Completed Date:** 2026-11-17
**Completed By:** Lorien Gamaroff (pipeline run)
**Pull Request:** [#915](https://github.com/Gamaroff/agent-skills/pull/915)

---

## Summary

Three QA-loop readers took a decision from the wrong input. Each now reads the right one, with a control test per reader. Nothing else in the loop changed, except one expectation that had encoded the defect.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The three motivating shapes classify correctly, shown by named tests.
- [x] Each control keeps its old result.
- [x] Every other consumer of `readTopIssues` passes its fixtures unchanged, except the one expectation the owner approved moving (criterion 3 amended 2026-11-17).
- [x] Wall time within 10% of `develop`: median 770 s against 722 s, +6.6%, re-measured at the head.
- [x] Each change has a mutation proof in the QA reports.
- [x] `bundle --check` reports 0 problems; the full suite passes (8533 tests).
- [x] `qa-narrowing-residue.test.mjs` passes.
- [x] Pre-change gates read the same status (1021 gates, 14 differ, all explained).

### Key Features Implemented

- **Gate reader**: reads `status` and `category` at key position, so quoted finding text no longer sets them.
- **Narrowing-residue fold**: a code file and its own test file count as one subject, cut only at a named test kind.
- **5c carry (`fix_path`)**: a clean `.md` directly in the work-item directory clears a code-anchored finding; `fixPathTarget` normalises the directory.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-diminishing-returns.js` - gate reader and fold
- `shared/resources/ci-tree-equivalence.js` - `fixPathTarget`
- `shared/resources/tests/qa-gate-reader-top-level.test.mjs`, `qa-narrowing-residue.test.mjs`, `acceptance-commit-carries-5c.test.mjs` - control tests
- `tests/fixtures/probe/fix-path-target.cases.json` - probe corpus (12 cases)
- Step 5-6 QA-loop doc, findings ingester and conformance prompts, `review-pr/SKILL.md`, `CHANGELOG.md`

### Architecture/Design Decisions

The test-file fold applies only when `testArtifactGlobs` is set; unconfigured consumers keep `medium-files-differ`. `fix_path` counts only for a `.md` directly in the work-item directory that is a docs path.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Tests:** 8533 pass, 0 fail, 3 skipped on the cycle 2 tree, tree-equivalent to the head. Hosted CI all green at `ce14eebb6c72`.
- **Mutation proofs:** every change reverted and a test went red (QA reports 1-3).

### Code Review

- **Reviewers:** PR conformance review (`task.278.pr-review.1`) APPROVE.
- **QA gate:** PASS 95/100 after four cycles.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets (diff searched)
- [x] `fixPathTarget` boundary probed with 12 candidates, 0 reproduced
- [x] No dependency change

### Compliance

NOT_APPLICABLE: internal QA-loop tooling, no personal data, payments or UI.

---

## Notes

The criterion-3 deviation (T278-QA-2) was resolved by the owner's amendment, not a code change. The measured-performance figure was re-taken after cycle 2 changed code.
