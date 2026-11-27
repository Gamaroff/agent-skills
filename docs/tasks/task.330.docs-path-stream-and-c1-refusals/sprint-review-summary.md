# Sprint Review Summary - isDocsPath refuses the NTFS .git stream and C1 controls

**Story/Task ID:** task.330
**Completed Date:** 2026-11-27
**Completed By:** develop-task pipeline (dispatched by /develop-next)
**Pull Request:** [#961](https://github.com/Gamaroff/agent-skills/pull/961)

---

## Summary

`isDocsPath` now reads a `.git:` NTFS alternate-stream segment and a C1 control character as code, not documentation, so the docs-only CI rule no longer skips CI for those paths. Four deferred wording findings from tasks 325 and 329 are fixed as well.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every row of the § 8 table holds in a test
- [x] `isDotGitSegment` has no new caller (one call, in `isDocsPath`)
- [x] Performance: not applicable (no bound claimed)
- [x] Every § 8 mutation recorded in the QA report with the test it turned red
- [x] `npm run test:remote` and `npm run bundle:check` pass
- [x] CHANGELOG `[Unreleased]` names both § 5 changes and the extglob openers `@(`, `!(`, `+(`
- [x] The bracket message and the runbook say to write each `[` or `]` as `?`

### Key Features Implemented

- **`.git:` stream fold**: `isDotGitSegment` drops a `:` suffix before comparing, so `.git:$DATA` and `.git::$INDEX_ALLOCATION` read as `.git`
- **C1 refusal**: the path-form check uses `\p{Cc}`, so C0, DEL and C1 controls all make a path code; a C1 control in an exclusion is a usage error
- **Corpus**: three new hostile `git-name` cases and one legitimate case (`docs/a:b.md`), plus a mechanical `dotGitStream` mutation row

---

## Technical Details

### Files Modified/Created

- `shared/resources/ci-tree-equivalence.js` — the fold, the `\p{Cc}` class, the bracket message
- `shared/resources/security-input-corpus.mjs` / `.md` — new cases, regenerated tables, `␤` glyph for U+0085
- `shared/resources/tests/*.test.mjs` — four new `task.330:` tests, updated corpus and probe tests
- `CHANGELOG.md`, `docs/runbooks/ci-docs-only-skip.md` — wording
- `skills/*/references/` — 16 bundled copies regenerated

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** a `.git:` stream segment or a C1 control is now code (pipelines wait for CI); an exclusion holding a C1 control is a usage error (exit 2)

---

## Testing & Quality Assurance

- **Tests:** `ci:fast` 8955 tests, 0 fail; four targeted suites 521/521
- **Mutation proofs:** three hand mutations, all covered
- **QA Gate:** PASS 100/100 (`task.330.gate.1.docs-path-stream-and-c1-refusals.yml`)
- **PR review (5c):** APPROVE, 0 findings

---

## Security & Compliance

✅ **Security Review Completed** — `isDocsPath` probed through the `git-name` sink: 26 executed, 0 reproduced, 0 escaped (QA and DoD runs).

Compliance: not applicable (internal CI tooling).

---

## Demo Notes

`isDocsPath(".git:$DATA/x.md", ["**"])` is now `false`; `isDocsPath("docs/a:b.md", ["docs/**"])` stays `true`.

## Known Limitations / Future Work

None recorded.
