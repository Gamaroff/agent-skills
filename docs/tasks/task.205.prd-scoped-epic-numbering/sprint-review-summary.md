# Sprint Review Summary - PRD-scoped epic numbering

**Story/Task ID:** task.205
**Epic:** none (a standalone task, roadmap T205; depends on task.202 and task.203)
**Completed Date:** 2026-10-15
**Completed By:** develop-task pipeline (autonomous run, dispatched by develop-next)
**Pull Request:** [#674](https://github.com/Gamaroff/agent-skills/pull/674)

---

## Summary

Epics are now numbered inside their parent PRD as `epic.{P}.{E}`, and every epic needs a PRD. The
global epic registry and the `epic-registry-manager` skill are retired, and every epic authoring,
review, index and tracker-sync skill uses `doc-id.js` instead.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `create-epic` names `epic.{P}.{E}` with `doc-id next epic` and stops when no parent PRD exists
- [x] `create-epics-from-shards` writes one directory per epic with consecutive `E`, and its Step 7 check refuses a missing, short, misnamed or mis-numbered batch
- [x] `review-epic` raises Critical on a failing `doc-id check` or an unresolvable `prd_source`; it resolves `1.3` to exactly one file and refuses a bare `3` with a P.E hint
- [x] `generate-prd-epic-index` indexes domain-level PRDs and prints `P.E`
- [x] Both Jira epic scripts produce `[Epic P.E]` through one shared helper
- [x] A GitHub milestone `Epic 3 — Foo` is renamed in place to `Epic 1.3 — Foo` (`tracker-issue --rename-from`), with no duplicate created and fail-closed on a failed lookup
- [x] `epic-registry-manager` is removed, and no shipped skill reads `epic-registry.md` (guarded by a test)
- [x] `generate-prd-epic-index --check` runs in under 1 s (0.18 s on the PR head)
- [x] CHANGELOG lists the six breaking changes with consumer migration steps

### Key Features Implemented

- **PRD-scoped allocation**: `doc-id.js next epic --prd-dir` and `epic-meta` are the single definition of an epic's id and tracker title
- **Self-contained skill blocks**: every new executable block derives its inputs from its own document and uses one path root, and a test runs each block
- **Milestone rename**: `tracker-issue.js --rename-from` renames only the epic's own milestone

---

## Technical Details

### Files Modified/Created

44 canonical files changed (+2472/−600), not counting bundled `references/` copies and this
directory. See the task document's §7 Files Summary. The main ones:

- `shared/resources/doc-id.js` — `next epic`, `epic-meta`, `epicSummary`, `stripIdPrefix`
- `shared/resources/generate-prd-epic-index.mjs` — domain-level PRD discovery
- `shared/resources/tracker-issue.js` — `--rename-from`, fail-closed
- `skills/{create-epic,create-epics-from-shards,review-epic,edit-epic,ensure-epic-github-issue,sync-github-epic,ensure-task-github-issue,sync-jira-epic,jira-epic-creator}/` — moved to `epic.{P}.{E}`
- `skills/epic-registry-manager/` — removed
- `tests/epic-numbering-retirement.test.js` — the retirement guard and the executed skill blocks

### Architecture/Design Decisions

One definition of an epic's id (`doc-id.js`) replaces the registry. Executable skill blocks are tested by running them, and the test finds blocks with the repository's shared fence reader.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** Yes — six, listed in `CHANGELOG.md` with migration steps (epic file names, mandatory parent PRD, tracker titles, the removed skill directory, `/review-epic P.E`, regenerating the index)

---

## Testing & Quality Assurance

### Test Coverage

- **Tests:** fast gate 5690 tests, 0 failures. CI `test` passed (6142 tests)
- **QA:** 7 cycles (5 budgeted + 2 granted re-entries), final gate 7 PASS 100/100, bugs 1–14 closed
- **Mutation proofs:** every new guard, recorded per cycle

### Code Review

- **Reviewers:** QA diff reviewer, every cycle; Step 5c conformance review (`task.205.pr-review.1`)
- **Approval Status:** ⚠️ CONCERNS (non-blocking). The repository requires no human review
- **Review Comments Addressed:** two scope findings recorded as follow-ups (PC-1, PC-2)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Three fenced guard blocks probed: 34 candidates, 0 reproduced
- [x] No secrets; new `gh` calls use argv arrays with no shell
- [x] No dependency changes

### Compliance Review

⚠️ Not applicable (internal tooling refactor)

---

## Documentation

### Updated Documentation

- [x] CHANGELOG breaking entry
- [x] `docs/standards/epic-registry.md` turned into a retired notice
- [x] Skill files, skill catalog and README skill count updated

---

## Demo Notes

### How to Verify

1. `command node shared/resources/doc-id.js next epic --prd-dir docs/prd/onboarding/prd.1.onboarding --json` prints the next `epic.1.{E}`
2. `command node shared/resources/generate-prd-epic-index.mjs --check` exits 0
3. `command node --test tests/epic-numbering-retirement.test.js` passes 17/17

---

## Impact & Value

### User Impact

Epic numbers can no longer collide across PRDs, and an epic always traces to its PRD.

### Technical Impact

A global registry and its skill are gone. One id definition serves every epic skill and both trackers.

---

## Known Limitations & Future Work

### Current Limitations

- `documentation-standards-validator/SKILL.md` examples are half-converted (PC-1). They are left for the task.207 prose sweep
- Under zsh, the Step 7 presence loop fails closed without its message when an epic is missing

### Suggested Follow-Up Stories

- task.207: repository-wide prose sweep and CI corpus test
- A repository-wide check that every SKILL.md fence closes where it opens
- One path root per skill, not just per block, in the GitHub epic skills

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
