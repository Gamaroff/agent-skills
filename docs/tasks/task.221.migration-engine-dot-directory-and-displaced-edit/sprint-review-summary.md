# Sprint Review Summary - Migration engine: dot-directory references and displaced-block edits

**Story/Task ID:** task.221
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff
**Pull Request:** [#714](https://github.com/Gamaroff/agent-skills/pull/714)

---

## Summary

Fixes the two low findings that task.211 carried out of QA gate 6 in the doc-numbering migration engine. A root-relative path into a dot-directory is now detected as a stale reference. An edit aimed at a displaced or unclosed frontmatter block now leaves the file untouched.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `outsideReferences` flags `.docs/prd.md`, `${ROOT}/.docs/prd.md` and `$ROOT/.docs/prd.md` (CR-1)
- [x] `outsideReferences` still returns `[]` for `docs/prd.md` and keeps `./.docs/…` relative to the file
- [x] `editFrontmatter` returns displaced and unclosed input byte-for-byte (CR-2)
- [x] Existing rows and the linearity row pass unchanged, with no new pass over the input
- [x] Each fix mutation-proven; `bundle:check` 0 problems; `npm run ci` green
- [x] CHANGELOG `[Unreleased]` Fixed entry naming both findings

### Key Features Implemented

- **Dot-directory root resolution (CR-1)**: a token that does not start with `./` or `../` is now also compared at the repository root, so `.docs/x.md` is no longer read only as relative to the file that cites it.
- **Displaced-block guard (CR-2)**: `editFrontmatter` returns early on an `unclosed` or `displaced` block. Before this fix, a direct caller could write a field above the real block.

---

## Technical Details

### Files Modified/Created

- `shared/resources/migrate-doc-numbering.mjs` - the `forms` predicate in `outsideReferences`; the state guard in `editFrontmatter`
- `shared/resources/tests/migrate-doc-numbering.test.mjs` - two rows, `task.221 CR-1` and `task.221 CR-2`
- `skills/review-prd/references/migrate-doc-numbering.mjs` - bundled copy regenerated
- `CHANGELOG.md` - Fixed entry

### Architecture/Design Decisions

Both changes move toward the safe side. CR-1 can only add stale-reference blockers. CR-2 can only turn an edit into a no-op. Neither function signature changed.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 2 rows added; engine suite 70/70
- **Test Coverage:** both fixes mutation-proven. Reverting either fix alone fails only its own row.

### Code Review

- **Reviewers:** pipeline QA (gate 1 PASS 100/100) and the Step 5c PR review (APPROVE, 0 findings)
- **Approval Status:** ✅ Approved
- **Review Comments Addressed:** 1 advisory. It was already on develop before this task and is carried to future work.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets or unsafe patterns introduced
- [x] Change direction is fail-safe
- [x] Nothing delivered is a boundary, so no probe was needed

### Compliance Review

✅ **Compliance Requirements Met** — not applicable (internal engine fix)

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` Fixed entry
- [x] Bundled skill copy regenerated

---

## Demo Notes

### How to Verify

1. `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`
2. Look for the `task.221 CR-1` and `task.221 CR-2` rows
3. Expected: 70/70 pass

---

## Impact & Value

### Technical Impact

A repository that names a moved document through a dot-directory path now sees the stale-reference blocker instead of a silent dangling path. A direct `editFrontmatter` call can no longer corrupt a file whose frontmatter is displaced.

---

## Known Limitations & Future Work

### Suggested Follow-Up Stories

- `linkPass` drops the `./` prefix when it rewrites a `./.docs/x.md` link. The target still resolves. This behaviour was already on develop and is listed in the gate's `recommendations.future`.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
