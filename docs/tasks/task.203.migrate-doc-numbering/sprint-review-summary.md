# Sprint Review Summary - Migrate documents to hierarchical numbering

**Story/Task ID:** task.203
**Epic:** n/a (standalone task; Phase 11 of the project completion roadmap)
**Completed Date:** 2026-10-15
**Completed By:** Lorien Gamaroff (pipeline: /develop-next → /develop-task)
**Pull Request:** [#671](https://github.com/Gamaroff/agent-skills/pull/671)

---

## Summary

Task 203 ships a one-shot, dry-run-by-default migration. It renames an existing PRD, its epics and its stories to the hierarchical `prd.{P}` / `epic.{P}.{E}` / `story.{P}.{E}.{S}` scheme that task 202 defined. The run rewrites their frontmatter, gate fields and relative links, and appends the PRD to the PRD registry.

The migration was run on this repository's onboarding PRD. It now lives at `docs/prd/onboarding/prd.1.onboarding/`, with epics `1.1`–`1.4` and 17 stories `story.1.E.S`. The global epic registry is retired to a pointer.

---

## What Was Delivered

### Acceptance Criteria Met

- ✅ The dry run maps 1 PRD, 4 epics, 17 stories and 146 files, and writes nothing.
- ✅ `--apply` moves every file once and rewrites frontmatter, gate `story:` fields and links. A second run reports `already`.
- ✅ The blockers all stop the run before anything is written: no PRD, in-flight, target exists, dirty path, link would break, registry missing or stale, id collision, and others.
- ✅ `--check` exits 1 while a migration is pending and 0 once it is done.
- ✅ The 146-file dry run takes 0.501 s, against a 5 s bound.
- ✅ No relative link that resolved before the run is dead after it, repository-wide.
- ✅ The epic registry is a pointer and keeps the historical mapping `1`–`4` → `1.1`–`1.4`.

### Key Features Implemented

- **`shared/resources/migrate-doc-numbering.mjs`**: discover → plan → blockers → apply → post-check. Every identifier goes through `doc-id.js`, and a single `touchRecord` drives the dirty check, apply and the scoped revert.
- **A safe part-way failure**: apply is wrapped, a failure returns `post-check-failed`, and the revert command names only the paths the run touched.
- **Root containment**: `checkPrdRoot` judges realpaths, and it refuses the repository root, `.git` and `node_modules`.
- **`doc-id.js`**: recognises the `validate` artifact kind and adds `appendPrdRow`.

---

## Technical Details

### Files Modified/Created

- `shared/resources/migrate-doc-numbering.mjs` (new) and its test (44 tests)
- `shared/resources/doc-id.js`, `shared/resources/finalise-fix-and-recheck.mjs` (the `validate` kind), and the test for each
- `docs/prd/onboarding/**`: 146 files moved and rewritten; `docs/prd/prd-registry.md` (new)
- `docs/development/epic-registry.md` (retired to a pointer); three standards sentences corrected
- `CHANGELOG.md`; `shared/resources/tests/doc-links.test.mjs` (ratchet tightened by 10)

### Architecture/Design Decisions

- **Dry run by default.** `--apply` writes nothing until every blocker has passed.
- **Dead links stay byte-identical during the run.** Ten links in four onboarding artifacts were already dead before the migration. They were repaired separately after the run, because CI's link check reads renamed files.

### Dependencies

- Builds on task 202 (`doc-id.js`, the PRD registry). Tasks 204–207 move the skills onto the new scheme.

---

## Testing & Quality Assurance

### Test Coverage

- Engine: 44 tests. Every blocker and every QA fix is mutation-proven.
- Full hermetic suite green. CI is green on every check: test, validate, link-check, shellcheck and branch policy.

### Code Review

- 4 QA cycles. The final gate is CONCERNS 90/100 with nothing open, and all 6 bugs are closed.
- The Step 5c PR conformance review approved the PR (`task.203.pr-review.2`).

---

## Security & Compliance

### Security Review

- ✅ PASS. The boundary `checkPrdRoot` was probed with 11 cases (including a symlink escape, a null byte and encoded traversal), and none reproduced.

### Compliance Review

- Not applicable: an internal documentation migration.

---

## Documentation

### Updated Documentation

- CHANGELOG `[Unreleased]`: task 203 entries under Added and Changed.
- `docs/standards/epic-registry.md`, `docs/standards/file-naming.md` and `docs/architecture/concepts/coding-standards.md`.

### Documentation Links

- Task: `task.203.migrate-doc-numbering.md`
- DoD: `task.203.dod.2.migrate-doc-numbering.md`

---

## Demo Notes

### How to Verify

```bash
command node shared/resources/migrate-doc-numbering.mjs --check   # exit 0, reason: already
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs
```

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

- A consumer project can move its existing PRD tree onto hierarchical ids with one command. The dry run tells it what will change and what blocks it before anything is written.

### Technical Impact

- Epic numbers are now scoped to their PRD, so two PRDs no longer race for one global counter.

---

## Known Limitations & Future Work

### Current Limitations

- The revert command does not flag an untracked file that the run both moved and rewrote.
- A part-way failure leaves its new empty directories unnamed in the revert command.
- Neither case can occur in this repository. Both are advisory.

### Suggested Follow-Up Stories

- Tasks 204–207: move the skills onto the new numbering.
- Mark the CHANGELOG blocker list as examples, or complete it (8 of the 12 codes are listed).
- Correct "eight blocker codes" in the task document (the engine ships twelve).
