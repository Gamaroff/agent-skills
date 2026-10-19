# Sprint Review Summary - Scripts reach only the skills that run them

**Story/Task ID:** task.193
**Completed Date:** 2026-10-19
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#691](https://github.com/Gamaroff/agent-skills/pull/691)

---

## Summary

Skills no longer ship scripts they never run. A shared document that names a script by its
`shared/resources/` path in prose made the bundler copy that script into every skill bundling the
document; 21 such copies are gone, and a new guard fails CI on the next one.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] AC1: every prose script literal in `shared/resources/*.md` is a bare filename or an `ALLOWED` entry with its bundler set and a reason
- [x] AC2: an `ALLOWED` entry that matches no line fails
- [x] AC3: no unrun copy remains (`grant-qa-cycles.sh` only in develop-story and develop-task); `bundle:check` reports no `UNREACHED`
- [x] AC4: create-skill's rule paragraph is pinned to its unbundled wording
- [x] AC5: performance not applicable (one text scan, about 0.5 s)
- [x] AC6: `npm test`, `bundle:check` and `prettier --check` pass
- [x] AC7: the CHANGELOG entry names the guard and the 21 removed copies

### Key Features Implemented

- **Guard** (`tests/shared-script-literals.test.js`): reads every shared doc the way the bundler does — fenced lines, nested paths, `<!-- cite: -->` wrappers — and reports a script literal unless a command runs it.
- **Literal fixes**: 13 literals switched to bare filenames across the shared pipeline docs.
- **Copy removal**: 21 bundled copies deleted from skills that never run them; three `SKILL.md` files now name the scripts they do run.

---

## Technical Details

### Files Modified/Created

- `tests/shared-script-literals.test.js` - new guard (9 tests: controls, live tree, bundler sets, pin)
- `shared/resources/*.md` - prose literals switched to bare filenames
- `skills/{develop-bug,develop-story,develop-task}/SKILL.md` - name the scripts each runs
- `skills/*/references/` - 21 unrun copies removed, bundled docs regenerated
- `CHANGELOG.md` - [Unreleased] › Fixed entry

### Architecture/Design Decisions

The guard classifies a literal as run only when a command sits immediately before it — inside
`require(`/`import(`, after `$(`, opening the code span, or (in a fence) in shell command position.
Code spans are matched as CommonMark matches them. Anything else is prose and must be bare-named or
allow-listed. The bundler itself is unchanged.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 9 tests in `tests/shared-script-literals.test.js`
- **Fast gate:** `npm run ci:fast` 5906 tests, 0 fail on `097cfe8f`
- **Mutation proofs:** every rule change went red on revert

### Code Review

- **Reviewers:** /review-pr (5c conformance lens), single maintainer
- **Approval Status:** ✅ APPROVE
- **Review Comments Addressed:** 4 QA cycles (CONCERNS → CONCERNS → FAIL → PASS 92); one low PR-review note (PC-1) recorded as a follow-up

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets
- [x] No unsafe calls (the test only reads files)
- [x] No dependency change
- [x] Boundary probed: 39 candidates against `isRun` and `isRunInFence`; 6 low reproductions fixed during /finalise, 0 on re-run

### Compliance Review

⚠️ **Not applicable** — internal refactor of skill files and a test guard; no personal, payment, health or UI data.

---

## Documentation

### Updated Documentation

- [x] CHANGELOG.md entry
- [x] Skill `SKILL.md` files name the scripts they run
- [x] Guard header documents its rules and their sources

### Documentation Links

- [Task document](./task.193.scripts-reach-only-skills-that-run-them.md)
- [DoD verification](./task.193.dod.1.scripts-reach-only-skills-that-run-them.md)

---

## Demo Notes

### How to Verify

1. `command node --test tests/shared-script-literals.test.js` — 9 pass.
2. `npm run bundle:check` — 0 problems, no `UNREACHED`.
3. Restore `shared/resources/grant-qa-cycles.sh` as a prose literal in the resume contract — the guard reports it.

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

Installed skills are smaller and carry only what they execute, so a consumer reading a skill's
`references/` sees its real dependencies.

### Technical Impact

About 25k lines of duplicated script copies removed. The class of bug (a prose path widening a
skill's closure) is now caught at CI rather than discovered by observation.

---

## Known Limitations & Future Work

### Current Limitations

- The guard reads `shared/resources/*.md` only; a literal in a shared `.sh` comment is not scanned.
- The run rule is a line-level heuristic; a code span that wraps across lines is read line by line.

### Suggested Follow-Up Stories

- Scan shared `.sh` comments for script literals.
- Task doc § 8 Pin bullet wording (PR review PC-1).

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** +2051 / -25071 (72 files)
- **QA cycles:** 4

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
