# Sprint Review Summary - Numbered PRDs in the PRD skills

**Task:** task.204 · **Status:** Accepted (2026-10-15) · **PR:** [#675](https://github.com/Gamaroff/agent-skills/pull/675) · **Issue:** #647

---

## Summary

The PRD skills now write, check and migrate registry-numbered PRDs. `create-prd` allocates a PRD
number from `${PRD_ROOT}/prd-registry.md` and writes `prd.{P}.{feature}/prd.{P}.{feature}.md`;
`review-prd` reports numbering defects as Critical and offers the task-203 migration; `shard-prd`
explodes a numbered PRD in place.

## What Was Delivered

### Acceptance Criteria Met

16 of 16 success criteria (two amended at acceptance: the `docs/prd.md` grep exclusions, and the
mutation-evidence criterion narrowed to the per-cycle counts that were recorded).

### Key Features Implemented

- `create-prd`: number allocation with registry bootstrap, numbered output in both modes, the
  registry row, a blocking `doc-id check`, and continuation that keeps `P`.
- `review-prd`: Critical findings for the four numbering classes, a migration plan and apply, the
  numbered review-report name, and a migration guard that withholds the offer for shapes the engine
  cannot yet carry.
- `shard-prd`: in-place explode of a numbered PRD; refusal of a legacy one.
- Every PRD-path block refuses a path that resolves outside `${PRD_ROOT}` through a symlink.

## Technical Details

### Files Modified/Created

`skills/create-prd/SKILL.md`, `skills/review-prd/SKILL.md`, `skills/review-prd/scripts/migration-guard.mjs`
(new), `skills/shard-prd/SKILL.md`, `skills/new-product-prd/SKILL.md`, both PRD templates, ten reader
sites, `shared/resources/migrate-doc-numbering.mjs` (three engine edits, recorded as a scope
deviation), `evals/shared/tests/prd-skill-numbering.test.mjs` (new, 41 rows), CHANGELOG and five
reference docs.

### Architecture/Design Decisions

- Registry rows are written through `doc-id.js appendPrdRow`; the CLI has no row writer.
- The migration guard fails closed (any mention of a moved monolith blocks the offer) until task.211
  lets the engine re-point those mentions.

## Testing & Quality Assurance

### Test Coverage

41 behavioural rows run per PR; each QA fix cycle recorded its mutations (16, 11, 6, 2, 5, 4, 5, 8, 4,
2). `npm run ci:fast` 5717/0; CI green on `ec926081`.

### Code Review

Ten QA cycles (three budget grants and one re-entry after a finalise DoD gap); two Step 5c
conformance reviews (CONCERNS, no high findings).

## Security & Compliance

### Security Review

The allocation fence was probed with 24 hostile and legitimate inputs; none reproduced. No secrets,
no shell spawns. Compliance: not applicable.

## Documentation

### Updated Documentation

CHANGELOG `[Unreleased]`; `docs/concepts/quickstart-story.md`, `docs/reference/configuration.md`,
`docs/reference/pipeline-artifacts.md`, `docs/runbooks/story-development.md`; the interim notes in
`docs/standards/prd-documents.md`, `prd-registry.md` and `file-naming.md`.

## Demo Notes

### How to Verify

`command node --test evals/shared/tests/prd-skill-numbering.test.mjs` — 41 rows, each slicing the live
SKILL.md block it tests.

## Impact & Value

### Technical Impact

PRDs carry a registry-backed number, so epic (`epic.{P}.{E}`) and story ids can hang off it; a legacy
PRD is reported and migratable rather than silently read.

## Known Limitations & Future Work

### Current Limitations

The migration offer is withheld for a frontmatter-less PRD, a domain-less PRD, and a monolith that
files outside the PRD root mention.

### Suggested Follow-Up Stories

- task.211 (#676): migration-engine fixes that lift those refusals.
- One shared PRD-path containment predicate in `doc-id.js` (recorded in gates 4–10).
- Recovery for a PRD written without its registry row (gate 2).
