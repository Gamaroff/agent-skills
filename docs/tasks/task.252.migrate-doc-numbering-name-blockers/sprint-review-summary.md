# Sprint Review Summary - migrate-doc-numbering: name every document it cannot classify

**Story/Task ID:** task.252
**Completed Date:** 2026-11-03
**Pull Request:** [#817](https://github.com/Gamaroff/agent-skills/pull/817)

---

## Summary

`migrate-doc-numbering` no longer skips a document silently. Any document under the PRD root that it cannot classify is now named as a blocker in the dry run and in `--check`, and the output reports how many documents were classified and how many were skipped.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Dry run and `--check` name every bad document on the fixture repo
- [x] `--apply` exits 1 and changes no file when a name is bad
- [x] After the names are fixed, `--apply` succeeds and `--check` answers `already`
- [x] `--json` carries `classified` and `skipped` counts
- [x] Discovery is not repeated (the directory-read count is pinned by a test)
- [x] The test file passes (91 tests); `npm test` and `bundle:check` are green in CI
- [x] Reverting the emission turns the new test red (mutation-proven)
- [x] `CHANGELOG.md` records the blocker and the exit-code change
- [x] This repository's own `docs/prd` reports 0 skipped (22 classified)

### Key Features Implemented

- **`unclassified-document` blocker**: raised in `plan()`, so the early `already` branch cannot bypass it.
- **Exemptions**: `README.md`, `index.md`, `prd-registry.md`, dot-directories, underscore-prefixed directories and `assets/`. Sharded PRDs (a directory holding `index.md`) are not scanned for loose files.
- **Classified/skipped count** in text and `--json` output.

---

## Technical Details

### Files Modified/Created

- `shared/resources/migrate-doc-numbering.mjs` - discovery records unclassified documents; `plan()` raises the blocker
- `shared/resources/tests/migrate-doc-numbering.test.mjs` - new tests, including both QA-cycle regressions
- `skills/review-prd/references/migrate-doc-numbering.mjs` - regenerated bundled copy
- `skills/review-prd/SKILL.md`, `CHANGELOG.md` - documented

### Architecture/Design Decisions

The blocker lives in `plan()`, not `verify()`. A shard exemption keyed on `index.md` means a stray file beside an index is silent; this trade-off is recorded in the task and in the gate's future recommendations.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** a tree with an unclassified document now exits 1 (`blocked` or `needs-migration`) where it used to pass silently.

---

## Testing & Quality Assurance

- **Unit Tests:** 91 in `shared/resources/tests/migrate-doc-numbering.test.mjs`
- **QA:** 3 gates (CONCERNS 90, PASS 100, PASS 100); PR review CONCERNS then APPROVE
- **Security:** static checks pass; the probe engine could not run this CLI, and the owner accepted the task's own tests as the boundary evidence (recorded in the DoD file)
- **Compliance:** not applicable

## Known Limitations and Future Work

- A stray `.md` beside an `index.md` is not named.
- Under a scope, an unclassified entry beneath an epics directory with no owning PRD is dropped (CR-2).
- Per-PRD rescan could be grouped once (CR-4).
- The probe engine cannot probe a CLI that needs a git repository.
