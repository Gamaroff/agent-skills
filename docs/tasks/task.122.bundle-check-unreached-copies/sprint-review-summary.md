# Sprint Review Summary - Twelve skills carry bundled copies no discovery rule reaches

**Story/Task ID:** task.122
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-18
**Completed By:** develop-task pipeline (Claude)
**Pull Request:** [#434](https://github.com/Gamaroff/agent-skills/pull/434)

---

## Summary

`bundle_skill.py --check` now reports `UNREACHED` for a bundled `references/` copy that has a live shared source but that no discovery rule in the skill reaches — a population the bundler refreshed on every run and never reported (15 copies across 12 skills). One scoped discovery rule makes the three real dependencies discoverable, and the twelve dead copies are deleted; the tree reports zero.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `--check` reports `UNREACHED` for every source-backed undiscovered copy; nothing else changes class (measured 15 on the live tree, exactly the task's prediction)
- [x] `verify-push-state.sh` discovered for develop-story/-task/-bug via the new `INVOKE_REF_RE` rule + the `{develop-story|develop-task|develop-bug}` respell of `develop-pipeline-step-8-commit.md:108`; no other skill gains a copy (15 → 12)
- [x] Zero `UNREACHED` on the merged tree after the twelve deletions (12 → 0; `bundle:check` 128 skills, 0 problems)
- [x] `--check --all` wall time within noise (≈6s before/after)
- [x] Every new test mutation-proved (M1–M8 + QA mutants each cycle); fixtures built with the existing `makeFixture` helper
- [x] No second definition of the discovery rules in `package_skill.py`
- [x] Twelve copies gone; observation #118 ticked `actioned` with PR #434

### Key Features Implemented

- **`UNREACHED` class**: `check_skill` reports every reconciliation-only copy; remedy is a decision (cite it or delete it), deliberately outside `REGENERABLE` — proved non-regenerable by measurement (check → bundle → check)
- **Scoped invocation discovery**: `.agents/skills/<skill>/references/X` followed out of shared `.md`/`.sh` text only when `<skill>` names the skill being bundled, literally or in a `{a|b|c}` alternation; a bare `{placeholder}` is never followed (as a wildcard it would vendor `change-log.js` into 24 skills)
- **Containment hardening (from QA)**: `_within` resolves the parent and judges the leaf lexically — a symlinked intermediate directory is refused (as on `develop`), a symlink at the leaf reports `SYMLINK`; the write gate and the check both refuse/name a symlinked component; a directory citation no longer crashes the run; nested `references/sub/x.md` names are rediscovered after pass 3

---

## Technical Details

### Files Modified/Created

- `skills/create-skill/scripts/bundle_skill.py` - `INVOKE_REF_RE`, `REMEDIES['UNREACHED']`, `check_skill` UNREACHED + symlinked-intermediate branches, `_within`, `_symlinked_component`, `_skip_reason`, `writable_copy`, `discover_needed` (`is_file()`), `REFS_REF_RE` nested names
- `shared/resources/develop-pipeline-step-8-commit.md` (+3 bundled copies) - `{skill}` → `{develop-story|develop-task|develop-bug}`
- `tests/bundle-check-mode.test.js` - 29 → 43 tests (UNREACHED, containment, INVOKE_REF_RE blocks; `addSkill` fixture helper)
- `skills/create-skill/SKILL.md`, `AGENTS.md`, `.github/workflows/validate.yml`, `CHANGELOG.md` - documentation
- 12 deletions: `yaml-subset.js` ×4 (Jira skills), `review-story-prepass-prompts.md`, qa-task/qa-story step-0/step-1 docs ×4, `qa-task/references/resolve-paths.sh`, `set-github-project-priority.sh` ×2
- `docs/tasks/task.122.…/` - review 1, implementation report, QA 1–3, gates 1–3, bug 1, PR review 1, DoD 1

### Architecture/Design Decisions

The invocation rule keys on a spelling that carries the skill name, so it can be scoped where the bare `references/X` form (which caused a 38-file over-match in 2026-08) cannot. `UNREACHED` sits with ORPHANED/AMBIGUOUS as a decision class, not a regenerate class. The `_within` change — the one piece QA had to correct — splits containment by where a symlink can sit: parent resolved, leaf lexical.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None (CI's `--check` gains a failure class; the tree is clean at merge)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 14 tests added in `tests/bundle-check-mode.test.js` (29 → 43); bundler suites 79/79; `TMPDIR=/tmp` variance 43/43
- **Integration Tests:** `npm run ci:fast` 3454/3454; `bundle:check`, `check:generated`, `validate:all` green; CI reading 1 SUCCESS @ `3c276b33` over 5 checks
- **Test Coverage:** All critical paths covered; every new test mutation-proved

### Code Review

- **Reviewers:** pipeline code reviewer (3 QA cycles + 5c code lens); conformance reviewer (5c)
- **Approval Status:** ✅ Approved (advisory 5c APPROVE; QA gate 3 PASS 100)
- **Review Comments Addressed:** TASK-122-BUG-1 (medium) + CR2-1/CR2-2 (low) + 4 cleanups — all resolved

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Containment boundary (`_within`) probed with 11 corpus candidates through the probe engine — symlinked intermediate, `..` traversals, absolute path, null byte refused; legitimate names accepted
- [x] No hardcoded secrets; no new unsafe exec patterns
- [x] `package.json` untouched
- [x] One pre-existing sink mismatch recorded (`..%2f..%2f…` — the bundler never URL-decodes)

### Compliance Review

NOT_APPLICABLE — internal build tooling; no user data, payments, UI or health data.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]` — task 122 entry
- `skills/create-skill/SKILL.md` — § "A bundled copy nothing reaches is `UNREACHED`, and a bare `{placeholder}` invocation reaches nothing"
- `AGENTS.md` § Shared Resources — one sentence on the class
- `.github/workflows/validate.yml` — comment names five invisible classes

### Documentation Links

- [Task document](./task.122.bundle-check-unreached-copies.md) · [DoD verification](./task.122.dod.1.bundle-check-unreached-copies.md) · [PR review](./task.122.pr-review.1.bundle-check-unreached-copies.md)

---

## Demo Notes

### How to Verify

1. `python3 skills/create-skill/scripts/bundle_skill.py --check` → `128 skill(s) checked, 0 problems`
2. `git checkout origin/develop -- skills/review-story/references/review-story-prepass-prompts.md && python3 skills/create-skill/scripts/bundle_skill.py --check skills/review-story` → the copy is named `UNREACHED`; `git rm` it again
3. `rm -rf skills/develop-task/references && npm run bundle:skill skills/develop-task` → `verify-push-state.sh` comes back; `git status` clean

### Screenshots/Visuals

N/A — CLI output.

---

## Impact & Value

### User Impact

Consumers who install a skill from a tree with `references/` deleted and re-bundled now get the push-state verifier the last pipeline step runs; the next copy that enters the tree through the back door is reported at the next CI `--check`.

### Technical Impact

15 unreported copies → 0; ~3,500 lines of dead bundled text removed; a containment guard that CI could not see is now tested from both the discovery and the reconciliation side.

---

## Known Limitations & Future Work

### Current Limitations

- `..%2f..%2f…` is accepted by `_within` as a literal filename (pre-existing; the bundler never decodes, so no traversal occurs)
- The probe engine silently runs nothing when invoked through the `.agents/skills/…` symlink (its `main()` guard compares `process.argv[1]` to `import.meta.url`) — worked around by invoking the real path; observation to log

### Future Work

- Observation #125: the `develop` skill cites a `change-log.js` one-liner it does not bundle — the bare-`{placeholder}` class this task documents
- Observations #83 / #114: transitive citation closure; literal-as-instruction (related bundler work, separately shippable)
