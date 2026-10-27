# Sprint Review Summary - select-next honours an external precondition

**Story/Task ID:** task.235
**Completed Date:** 2026-10-27
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#761](https://github.com/Gamaroff/agent-skills/pull/761)

---

## Summary

`develop-next`'s registry fallback used to select a task that was waiting on work in another
repository, because that blocker could only be written as free text the selector never reads. A
task may now carry `blocked_on_external: "<condition>"`, and the selector passes such a row over and
names it, instead of selecting it and paying a full pipeline setup to reach the task's own HALT.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A `planned` task with a non-empty `blocked_on_external:` and no other blocker is not selected
- [x] The held row's `passedOver` entry carries `eligible: false`, `externalBlock` and a reason naming the condition and the document
- [x] `—`, `none`, `n/a`, `tbd`, an empty value and the YAML nulls `null` / `~` do not hold a row
- [x] A held row ranked above the selected row is named, with its condition, in the selected rationale
- [x] An `accepted` or `cancelled` document with the field reports its status cause, not the hold
- [x] When every candidate is held, `selectNext` returns `stop` / `roadmap-complete` and the detail names each held row
- [x] On the real tree, `select-next.mjs --lint` lists T174 as held
- [x] Each candidate document is read at most once per run (read-count test)
- [x] Unit-suite wall time on the PR head within 110% of `develop`'s (104.5% on bf03f4ec)

### Key Features Implemented

- **`blocked_on_external:` frontmatter field**: checked after the eligibility floor and before dependencies.
- **Rationale by cause**: rejections are counted as document status, dependencies, or external precondition, and each held row is named.
- **`makeRegistryLoader`**: the registry loader is extracted and exported, and reads each document once.
- **Quote-aware frontmatter reader** (QA cycle 1 fix): a quoted ` #` stays in the value.

---

## Technical Details

### Files Modified/Created

- `skills/develop-next/scripts/select-next.mjs` - `externalBlockOf`, `makeRegistryLoader`, frontier check, rationale, quote-aware `frontmatterScalar`
- `evals/develop-next/unit/select-next.test.mjs` - new tests (186 total in the file)
- `skills/develop-next/references/roadmap-selection.md` - "External preconditions" subsection
- `docs/standards/task-documents.md` - the `blocked_on_external` frontmatter row
- `docs/tasks/task-registry.md`, `skills/create-task/SKILL.md` - write the field, not only free text
- `docs/tasks/task.174.ci-docs-only-classifier-template/…` - carries the field
- `CHANGELOG.md` - `[Unreleased]` entry

### Architecture/Design Decisions

The field is not a park value: a park is a decision made in this repository, while an external
precondition is a fact about another one, so it is checked as its own cause and reported as such.
`--batch` and the roadmap path are unchanged.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 186 tests in `evals/develop-next/unit/select-next.test.mjs`, each new behaviour mutation-proven
- **Test Coverage:** every success criterion held by a named test; `npm run ci` green with the skills symlinks moved aside

### Code Review

- **Reviewers:** QA cycle 1 and 2 diff reviewers (`code_review_blocking=true`); Step 5c `/review-pr` conformance lens
- **Approval Status:** ✅ Approved (gate PASS 100/100; PR review APPROVE)
- **Review Comments Addressed:** CR-1 fixed in cycle 1; CR2-1 carried as deferred work; PC-1 and PC-2 closed at finalise

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] `externalBlockOf` probed as a boundary deliverable (QA cycle 2: 21 executed, 0 escaped)
- [x] No secrets or unsafe patterns introduced
- [x] No dependency changes

### Compliance Review

✅ **Compliance Requirements Met** — not applicable (internal developer tooling; no personal data, payments, UI or health data)

---

## Documentation

### Updated Documentation

- [x] `skills/develop-next/references/roadmap-selection.md`
- [x] `docs/standards/task-documents.md`, `docs/tasks/task-registry.md`
- [x] `skills/create-task/SKILL.md`
- [x] `CHANGELOG.md`

---

## Demo Notes

### How to Verify

1. `command node skills/develop-next/scripts/select-next.mjs --lint`
2. T174 appears as held, with its condition (`tinker-city task.127 (#982) merged …`).
3. `command node --test evals/develop-next/unit/select-next.test.mjs` passes.

---

## Impact & Value

### User Impact

`/develop-next` no longer starts a full pipeline on a task that cannot proceed, and a held row is
always named, never silently skipped.

### Technical Impact

A cross-repository blocker is now machine-readable, and the selector's rationale says why each row
was passed over.

---

## Known Limitations & Future Work

### Current Limitations

- TASK-235-CR2-1 (low): an escaped (`\"`) or doubled (`''`) quote ends a quoted value early. No tracked value is affected (0 of 522).
- CR-2 (advisory): `blocked_on_external: false` holds the row on a condition named "false".

### Suggested Follow-Up Stories

- Unescape `\"` and `''` in `frontmatterScalar`, with both inputs added to the 235 CR-1 test.
- Treat YAML `false` / `no` as unset, or reject it as a filing error.

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** `select-next.mjs` +106/−18; tests +285

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
