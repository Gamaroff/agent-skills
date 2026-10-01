# Sprint Review Summary - One docs-only CI rule at every pipeline CI wait

**Story/Task ID:** task.172
**Completed Date:** 2026-10-01
**Completed By:** develop-task pipeline
**Pull Request:** [#543](https://github.com/Gamaroff/agent-skills/pull/543)

---

## Summary

A shared engine now decides when a pending CI reading is satisfied because every file changed since a green ancestor is documentation. `/finalise` readings 1 and 2, `/develop-next` Step 3 and `/develop-batch` Step 3 all ask it, and record `SUCCESS (tree-equivalent to <sha>)`, never plain `SUCCESS`, so a docs-only tail no longer costs a full CI wait and the record still names the commit CI verified.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A PENDING head with docs-only commits over a green ancestor is recorded as tree-equivalent at all four sites
- [x] A FAILURE head is never tree-equivalent; a code path in the delta is `code-changed`; a Bitbucket 403 is `unverifiable`
- [x] `ci.docsOnly.enabled: false` restores the old behaviour
- [x] Performance: one engine call per ancestor, no poll sleep before the first call
- [x] Code quality: the fix-driven tests are mutation-proved, `validate` and `bundle:check` clean
- [x] CHANGELOG and `configuration.md` document the behaviour change, the opt-out and the five keys

### Key Features Implemented

- **Tree-equivalence engine**: a pure core plus CLI that walks first-parent ancestors, reads each ancestor's rollup (GitHub and Bitbucket), and answers `tree-equivalent` only when every changed path is documentation; exit 0 for that and nothing else.
- **Strict configuration reader**: `ci.docsOnly` is read from the commit judged, never the working tree; an unknown key, a near-miss spelling, a block scalar or a row the parse does not account for is exit 2, not the defaults.
- **Bounded optional local check**: `ci.docsOnly.checkCommand` runs as the leader of its own process group with a timeout, and is refused over uncommitted code.
- **A matcher that cannot backtrack**: the glob matcher is a token walk, linear in tokens times path length.

---

## Technical Details

### Files Modified/Created

- `shared/resources/ci-tree-equivalence.js`: the engine; `shared/resources/glob-match.js`: the moved, rewritten matcher; `shared/resources/bb-auth.js`: the Bitbucket auth header, moved out of `pr-inline-comment.js`
- `shared/resources/tests/ci-tree-equivalence.test.mjs`: 97 tests (unit, CLI against real temporary git repositories, wiring, the executed prose blocks)
- `skills/finalise/SKILL.md`, `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`: the four call sites; generated copies under each skill's `references/`
- `docs/reference/configuration.md`, `CHANGELOG.md`, `skills-config.yaml`, `docs/contributing/traps.md`

### Architecture/Design Decisions

The rule fails closed everywhere: any answer but `tree-equivalent` exits 1 and the site waits as before. Seven QA cycles and two DoD runs closed one family of defect: reading `skills-config.yaml` through a lenient YAML subset. The structural answer was a completeness check scoped to the `ci` block, the part the engine reads.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** a behaviour change on upgrade (the rule is on by default); `ci.docsOnly.enabled: false` opts out

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 97 tests in `shared/resources/tests/ci-tree-equivalence.test.mjs`; fast gate 4,910 of 4,911 on the last code commit
- **Test Coverage:** every acceptance criterion has a test in the per-PR lane

### Code Review

- **Reviewers:** the pipeline's advisory `/review-pr` (twice, CONCERNS, no high finding); no human review decision
- **Review Comments Addressed:** the conformance findings were fixed; the MEDIUM code findings are recorded in the work item's Deferred Work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** (DoD run 2, probes: 74 executed, 0 reproduced)

- [x] Four findings from DoD run 1 fixed and re-verified by execution: the check's children are killed, the matcher is not exponential, uncommitted code is refused, dot segments are never docs
- [x] Credentials go only to the Bitbucket API host; every `git` and `gh` call is an argv array with no shell
- [x] No hardcoded secrets

### Compliance Review

✅ **Not applicable**: an internal CI-decision engine, no PII, payments, UI or health data.

---

## Documentation

- [x] `docs/reference/configuration.md`: the five keys and the rule section
- [x] `CHANGELOG.md`: behaviour change and opt-out
- [x] The skill prose at each call site

---

## Demo Notes

### How to Verify

1. Push two markdown commits on top of a commit whose CI is green, while the head's own CI is still running.
2. Run the engine (`command node .agents/skills/finalise/references/ci-tree-equivalence.js --head-rollup PENDING --pr <n> --json`).
3. Expected: exit 0, `reason: tree-equivalent`, `greenSha` naming the ancestor; change a code file in the delta and it exits 1 with `code-changed`.

---

## Impact & Value

### User Impact

A docs-only commit over a green head no longer costs a full CI wait (about 34 minutes on the consumer that asked for this) at any pipeline step.

### Technical Impact

One rule in one engine instead of four hand-copied readings, with the record always naming the commit CI verified.

---

## Known Limitations & Future Work

### Current Limitations

- The detached check is not stopped when the engine is interrupted or killed from outside (documented in `configuration.md`)
- A `ci` block nested under another key, or with its children dedented to column 0, reads as the defaults
- The `/finalise` Step 6 record for a retaken reading 1 (Step 8a) has no tree-equivalent clause, and `CI_CHECKS_1` is counted before the docs-only arm

### Suggested Follow-Up Stories

- Move the check to an async spawn with signal handlers, or to a background poll with a result file
- Fix the two finalise prose findings and the Bitbucket arm of `/develop-next`
- A per-test mutation ledger for the first 51 tests, if wanted

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
