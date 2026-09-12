# Sprint Review Summary - develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Story/Task ID:** task.113
**Epic:** _(standalone task)_
**Completed Date:** 2026-09-12
**Completed By:** Claude (develop-task pipeline under `/develop-next`)
**Pull Request:** [#398](https://github.com/Gamaroff/agent-skills/pull/398)
**Tracker:** [#397](https://github.com/Gamaroff/agent-skills/issues/397)

---

## Summary

Three `develop-next` bookkeeping steps assumed a roadmap-sourced, `PASS`-gated item. Now the registry path is the default and `/finalise` accepts a CONCERNS gate with no open finding, so each step was rewritten to branch on a fact the pipeline already has — `item.source`, finalise's `accepted` verdict, and the tracker key as it stands after the review — and the registry write became a tested engine mode instead of a hand-typed edit.

## What Was Delivered

### Success Criteria Met

- [x] SC1 — Step 4 "Record the acceptance" branches on `item.source`; the task-registry arm calls `registry-tick.js --annotate` (notes + Issue cell only, never Status); the bug-registry arm records there is no cell; a re-run is idempotent on row, commit and push
- [x] SC2 — Step 3 merges `accepted` + `CONCERNS`/`WAIVED` with no open finding (seven-row matrix; waiver clause makes the WAIVED row reachable); still halts on `FAIL`, an open finding, a non-accepted document or a missing gate
- [x] SC3 — Step 2 re-reads the tracker key after the review, updates the lock, fires `work-started` once when the key went from empty to set; second run `already` (verified live on this run)
- [x] SC4 — develop-batch mirrors the matrix, the three arms, the dirty check and the push; `batch[]` items carry `source`
- [ ] SC5 — observations #13, #30, #31, #34, #35, #46, #52, #53 close naming this PR — after merge, by design

### Key Features Implemented

- `shared/resources/registry-tick.js --annotate --pr <n> [--issue <ref>]` — header-resolved notes cell, `DATA_COLUMN_NAMES` refusal, row-status gate (the notes cell is parsed for dependencies), full `--issue` validation, uniform payload keys, selector-aligned empty-cell spellings; 34 fixtures
- develop-next Step 3 gate matrix + Step 4 arms; develop-batch mirror; step-2 "Re-read the Tracker Key"
- Shape tests with per-row floors in three eval suites; the old PASS clause asserted absent

## Technical Details

### Files Modified/Created

`shared/resources/registry-tick.js`, `shared/resources/tests/registry-tick.test.mjs`, `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`, `shared/resources/develop-pipeline-step-2-review.md` (+ bundled copies), `evals/develop-next/protocol/skill-shape.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs`, `evals/develop-task/protocol/step-contract.test.mjs`, `docs/standards/task-registry.md`, `CHANGELOG.md`, and the task's co-located artifacts.

## Testing & QA

- Fast gate `npm run ci:fast`: 3230 pass / 0 fail on `ab2d939f`; CI rollup SUCCESS (5/5 jobs)
- Four QA cycles: CONCERNS 70 → 80 → 85 → **PASS 95**; 16 findings, six bug reports, all closed; every reproduction re-executed after its fix (bash + zsh for prose; sandbox registries and scratch git clones for the engine)
- 22 mutations proven red by name across engine and prose
- Step 5c `/review-pr`: CONCERNS (advisory) — six findings, all applied

## Security & Compliance

- Security: PASS — boundary deliverable probed with 89 candidates; held on every table-breaking or shape-invalid input; no secrets, unsafe patterns or dependency changes
- Compliance: not applicable (internal tooling)

## Documentation Updates

CHANGELOG `[Unreleased] > Changed`; develop-next / develop-batch SKILLs; step-2 shared doc; `docs/standards/task-registry.md` item 6; engine header.

## Demo Notes

This task's own pipeline run was the live case: it was registry-sourced, had no tracker issue at Step 1, and the Step 2 re-fire moved #397 onto the board (`transitioned` → `already`). The Step 4 annotate call runs for real on row 113 after this PR merges.

## Known Limitations / Future Work

- The `qa-gate` tracker-comment marker is per-stage, so only the first cycle's gate reached the issue — observation candidate, not part of this task.
- The registry's notes cell is parsed for dependencies by the selector; existing accepted rows already carry phantom `task.<PR#>` references that are inert only because accepted rows are skipped first — observation candidate.
