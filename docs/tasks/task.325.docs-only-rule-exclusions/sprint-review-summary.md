# Sprint Review Summary - The docs-only CI rule can exclude a path

**Story/Task ID:** task.325
**Completed Date:** 2026-11-26
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#954](https://github.com/Gamaroff/agent-skills/pull/954)

---

## Summary

The pipelines stop waiting for CI when a head differs from a green ancestor only by documentation, as `ci.docsOnly.patterns` defines it. Until now a project could narrow those patterns but not take one tested document out of them. Task 325 lets the list hold an exclusion, a glob that starts with `!`: a path any exclusion matches is code, in any list order.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every row of the § 8 table holds in a test
- [x] `git grep -nE 'matchesAnyGlob' -- shared/resources` shows no new caller
- [x] Performance: not applicable, no bound is claimed
- [x] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [x] `npm run test:remote` and `npm run bundle:check` pass
- [x] The reference states the syntax, that an exclusion wins in any order, and the usage errors
- [x] `CHANGELOG.md` `[Unreleased]` names both changes of § 5

### Key Features Implemented

- **Exclusions in `isDocsPath`**: a `!` pattern makes the paths it matches code, whatever the other patterns say
- **Usage errors (exit 2)**: a list of exclusions only, a bare `!`, an exclusion not in git's path form, and dialect syntax (braces, classes, `@(`, `!(`, `+(`, `|`) are refused, each naming `ci.docsOnly.patterns`
- **One definition of path form**: `hasPathFormDefect` holds `isDocsPath`'s pre-match refusals, and the configuration check asks it about each exclusion

---

## Technical Details

### Files Modified/Created

- `shared/resources/ci-tree-equivalence.js` - the exclusion, `hasPathFormDefect`, the configuration refusals
- `shared/resources/tests/ci-tree-equivalence.test.mjs`, `push-policy.test.mjs`, `reenter-qa-after-finalise.test.sh` - the § 8 cases and controls
- `docs/reference/configuration.md`, `docs/runbooks/ci-docs-only-skip.md`, `qa-docs-only-review-prompt.md` - the syntax, the any-order rule, the grammar and the usage errors
- `CHANGELOG.md`, plus the bundled copies under `skills/{finalise,qa-story,qa-task}/`

### Architecture/Design Decisions

The negation lives in `isDocsPath` only. `glob-match.js` is unchanged, so `qa.testArtifactGlobs` and every other glob reader keep their meaning; a test pins that.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** a `!` entry now excludes (it used to be a literal pattern that matched nothing); the new usage errors refuse configurations that would silently exclude nothing

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** the four engine suites 235/235; `reenter-qa-after-finalise.test.sh` 85/85; the full suite 8904 tests, 8901 pass, 0 fail (CI-parity container)
- **CI:** SUCCESS @ `6e0523417` on all 6 checks
- **Mutations:** exclusion removed, order-dependent, usage errors removed, negation moved into `glob-match.js` — each turned a named test red (qa.1)

### Code Review

- **Reviewers:** pipeline review (5c `/review-pr`); no host review required
- **Approval Status:** ✅ APPROVE
- **QA:** 5 cycles, gate 5 PASS (96/100), 2 LOW deferred

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets or unsafe patterns introduced
- [x] No dependency changes
- [x] Boundary probed: 40 candidates under the `git-name` sink (the corpus and three inline controls), 0 reproduced
- [x] DoD run 1's two `path`-sink reproductions were a sink mismatch, closed by task 329

### Compliance Review

✅ **Not applicable** - internal CI tooling, with no personal, payment, UI or health data.

---

## Documentation

### Updated Documentation

- [x] `docs/reference/configuration.md` (`ci.docsOnly.patterns` row, condition 3, worked example)
- [x] `docs/runbooks/ci-docs-only-skip.md`
- [x] `CHANGELOG.md` [Unreleased] (task 325)

---

## Demo Notes

### How to Verify

1. Put `ci.docsOnly.patterns: ["docs/**", "!docs/catalogue.md"]` in `skills-config.yaml`
2. A head that changes only `docs/a.md` is docs-only; one that changes `docs/catalogue.md` is code
3. Replace the list with `["!docs/catalogue.md"]` and expect exit 2 naming `ci.docsOnly.patterns`

---

## Impact & Value

### User Impact

A project can keep one tested document under the CI wait while the rest of its docs skip it.

### Technical Impact

The exclusion is confined to one predicate, and every refused spelling fails closed.

---

## Known Limitations & Future Work

### Current Limitations

- T325-CR-501: the refusal of a bracketed literal exclusion advises listing the path, which names the same refused path; `?` works in its place
- T325-CR-502: the CHANGELOG says "extglob", where only `@(`, `!(` and `+(` are refused

### Suggested Follow-Up Stories

- Fix the two LOW wording findings above
- `finalise-rerun-scope.js` carried CI-state criterion #5 across a code-moving merge

---

## Metrics _(if applicable)_

- **Time to Complete:** 2 days (2026-11-25 to 2026-11-26), 5 QA cycles and 2 DoD runs
- **Lines of Code Changed:** +857 / -60 outside `docs/tasks/` (19 files, generated copies included)

---
