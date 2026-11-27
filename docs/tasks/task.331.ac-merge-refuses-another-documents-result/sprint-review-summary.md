# Sprint Review Summary - The AC merge refuses another document's result

**Story/Task ID:** task.331
**Completed Date:** 2026-11-27
**Completed By:** develop-task pipeline (dispatched by /develop-next)
**Pull Request:** [#962](https://github.com/Gamaroff/agent-skills/pull/962)

---

## Summary

`finalise-rerun-scope.js merge` now refuses an AC result whose `story_file` names another document, and with `--doc` it refuses a scope computed for another document. `/finalise` names its AC result and merged-result state files by work item as well as DoD run number, so two items finalised in one checkout cannot share them. One item's verdicts can no longer become another's record, as happened in task 329's DoD run 1.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every row of the § 8 table holds in a finalise-rerun-scope test
- [x] The Step 3c merge and Step 6 action 2a blocks, run as substituted, read the stem-keyed paths
- [x] `skills/finalise/SKILL.md` names every AC result and merged path with the stem
- [x] Performance: not applicable (no bound claimed)
- [x] Every § 8 mutation recorded in the QA report with the test it turned red
- [x] `npm run test:remote` and `npm run bundle:check` pass
- [x] Step 3c's `case` has a `result-document-mismatch` arm that HALTs and names the remedy
- [x] CHANGELOG `[Unreleased]` names both § 5 changes

### Key Features Implemented

- **`result-document-mismatch`**: `merge` compares the result's `story_file` with the scope's document (realpath-resolved) and merges nothing on a mismatch
- **`scope-document-mismatch`**: `merge --doc` refuses a scope another item's Step 3a overwrote (T331-CR-1)
- **Stem-keyed state paths**: `finalise-ac-result-{stem}-{N}.yaml` and `finalise-ac-merged-{stem}-{N}.json`
- **Step 3c arms**: each refusal HALTs with its own remedy

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-rerun-scope.js` (and the bundled copy) — the two refusals
- `skills/finalise/SKILL.md` — Step 3c and Step 6 action 2a blocks and prose
- `shared/resources/tests/finalise-rerun-scope.test.mjs`, `finalise-deferred-ci.test.mjs`, `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` — new and updated tests
- `CHANGELOG.md`

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** a result or scope for another document now HALTs Step 3c instead of merging; the AC state files have new names

---

## Testing & Quality Assurance

- **Tests:** fast gate on the final code head 8968 tests, 0 fail; CI green on `7af1c0a2705e` (6 checks)
- **Mutation proofs:** every § 8 mutation recorded (QA 1); the run-1 DoD gap's test mutation-proven in QA 4
- **QA Gate:** PASS 95/100 (`task.331.gate.4.ac-merge-refuses-another-documents-result.yml`), 4 QA cycles
- **PR review (5c):** APPROVE, 0 findings
- **DoD:** run 1 found one gap (#7, the untested arm); run 2 accepted

---

## Security & Compliance

✅ **Security Review Completed** — boundary recorded as internal: the refusals read only pipeline-written artefacts, and no probe sink models them.

Compliance: not applicable (internal tooling).

---

## Known Limitations / Future Work

- A result with no `story_file` merges without the document check (security spec challenge)
- `--doc` is optional, so a caller that omits it skips the scope check (gate 3 CR-4 recommends making it required)
- Gate 3's other advisories are carried in gate 4's `future`
