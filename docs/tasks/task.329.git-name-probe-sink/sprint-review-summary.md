# Sprint Review Summary - A git-name sink for classifiers of repository names

**Story/Task ID:** task.329
**Completed Date:** 2026-11-26
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#956](https://github.com/Gamaroff/agent-skills/pull/956)

---

## Summary

The security probe had no sink for a function that only compares a git-printed name against patterns, so `isDocsPath` was probed under `path`, whose decoding and symlink cases cannot apply to a name. That stopped task 325's Definition of Done. Task 329 adds a `git-name` sink to the security input corpus and tells the DoD and review prompts, and the probe boundary rule, when to choose it over `path`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every row of the § 8 table holds in a test
- [x] `corpusFor("path")` is unchanged, held by a test that pins its ids and directions as at `684b2db38`
- [x] Performance: not applicable, no bound is claimed
- [x] Every § 8 mutation is recorded in the QA report with the test it turned red
- [x] `npm run test:remote` and `npm run bundle:check` pass
- [x] Both prompts and `probe-boundary-rule.md` say when to choose `git-name` over `path`
- [x] `CHANGELOG.md` `[Unreleased]` names the sink and the routing rule

### Key Features Implemented

- **`git-name` corpus sink**: 14 hostile and 8 legitimate cases modelling what `git diff --name-only` prints
- **Routing rule**: a name passed to a filesystem call is `path`; a name only compared against patterns is `git-name`
- **Mutation-checked probe test**: removing each `isDocsPath` refusal line reproduces exactly its listed `git-name` cases

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-input-corpus.mjs` and `security-input-corpus.md` - the `git-name` sink, its cases and the generated tables
- `shared/resources/finalise-dod-security-prompt.md`, `security-review-prompt.md`, `probe-boundary-rule.md` - the sink list and the routing rule
- `shared/resources/tests/security-input-corpus.test.mjs`, `security-probe.test.mjs` - floors, the `path` pin, the enumeration test and the `isDocsPath` mutation test
- `CHANGELOG.md`, plus the bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`

### Architecture/Design Decisions

A name classifier is probed with names, not paths: the `git-name` sink drops the decoding and symlink cases that only a filesystem call can meet. The `path` sink is pinned unchanged, so existing probes score as before.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 4 task tests; the full suite has 8902 tests, 8899 pass, 0 fail (CI-parity container, at `d71760925`)
- **Mutations:** M8–M12 recorded in qa.3. M12, `git-name` dropped from the review prompt's list, survived at first; the DoD's fix `d71760925` makes it turn the enumeration test red

### Code Review

- **Reviewers:** pipeline review (5c `/review-pr`); no host review required
- **Approval Status:** ⚠️ CONCERNS, no open coverage finding
- **Review Comments Addressed:** PC-1 (`pr_number`) and PC-2 (criteria ticks) applied

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets or unsafe patterns introduced
- [x] The mutation test writes only into an `mkdtempSync` root and removes it
- [x] No dependency changes
- [x] Not a boundary (`boundary: false`): the change adds corpus data and prose

### Compliance Review

✅ **Not applicable** - internal developer tooling, with no personal, payment, UI or health data.

---

## Documentation

### Updated Documentation

- [x] Both security prompts and `probe-boundary-rule.md`
- [x] `shared/resources/security-input-corpus.md` (new `### git-name` section)
- [x] `CHANGELOG.md` [Unreleased] (task 329)

---

## Demo Notes

### How to Verify

1. Run `command node --test shared/resources/tests/security-input-corpus.test.mjs` and expect 24/24 to pass
2. Drop `git-name` from the sink list in `shared/resources/security-review-prompt.md` and re-run it
3. Expect "every sink is named in each prompt's sink enumeration" to fail, then restore the file

---

## Impact & Value

### User Impact

A DoD run that probes a name classifier now uses cases that fit it, instead of stopping on path cases that cannot apply.

### Technical Impact

Unblocks task 325's DoD, which re-runs with `--sink git-name`.

---

## Known Limitations & Future Work

### Current Limitations

- `isDocsPath` accepts the NTFS `.git:` stream spelling and U+0085 (pre-existing, identical on develop)
- T329-QA-9: the `plus-signs` glob-compiling clause is not exercised, because the sink probes with `**`
- T329-QA-10: the `IS_DOCS_LINES` comment says every refusal has two spellings, but `dotGit` and `config` have one

### Suggested Follow-Up Stories

- A task for the `isDocsPath` gaps and T329-QA-9/10
- A task to make the AC merge check that a result's `story_file` matches the document it is merged for

---

## Metrics _(if applicable)_

- **Time to Complete:** 1 day (2026-11-26), 3 QA cycles and 1 DoD run with one fix-and-recheck
- **Lines of Code Changed:** +420 / -9 in the § 7 source, test and doc files (generated copies and pipeline records excluded)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
