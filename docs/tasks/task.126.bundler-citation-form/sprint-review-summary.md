# Sprint Review Summary - Citing a hub shared resource copies one file; the pre-commit refuses an untracked generated copy

**Story/Task ID:** task.126
**Completed Date:** 2026-09-29
**Completed By:** Claude (develop-task pipeline, autonomous via `/develop-next`)
**Pull Request:** [#524](https://github.com/Gamaroff/agent-skills/pull/524)

---

## Summary

Before this change, one pointer sentence to a hub document pulled that hub's whole transitive closure into a skill. And a generated `references/` copy left untracked was only a warning at commit time, so the failure showed up a push later in CI.

- **Cite or depend.** A fragment reference to an `.md` file bundles that file alone, in either spelling (`shared/resources/X.md#section` or `references/X.md#section`), as does a bare mention inside `<!-- cite: … -->`. A bare mention still bundles its whole closure.
- **Closure growth is visible.** Every bundle run prints `closure M (±K vs committed)` per skill.
- **The pre-commit refuses rather than warns.** A commit that would leave an untracked generated copy behind is refused. `BUNDLE_PRECOMMIT_WARN=1` downgrades the refusal to a warning.

---

## What Was Delivered

### Acceptance Criteria Met

- ✅ **Fragment references in either spelling bundle one file:** tests A, D, D2
- ✅ **The three task.116 pointer sites cite the hub:** closures qa-fix 37→21, review-task 45→27, review-story 46→29, and 51 unreached copies removed
- ✅ **`bundle:check` reports no `UNREACHED`, and `validate:all` passes**
- ✅ **An untracked generated copy is refused at commit:** 10 hook cases
- ⚠️ **No measurable change to bundle time:** waived by operator decision 1. The measurements show the branch faster than develop.
- ✅ **One definition of the edge rules, with a mutation proof per test:** proofs D1–D5 were recorded at finalise, completing the set
- ✅ **Observations #83 and #114 are actioned, naming PR #524**

### Key Features Implemented

- **`quick_validate.py`:** `ref_kind` and `parse_shared_refs` together are the one statement of the edge rule. They are shared by the bundler, the packager and the validator.
- **`bundle_skill.py`:**
  - A cite is a leaf in discovery.
  - The closure status line compares against HEAD.
  - Links relocate according to the reached set.
- **`.githooks/pre-commit`:**
  - Refuses a commit that leaves an untracked generated copy behind; a copy has to have a shared source to count as generated.
  - `revert_new` means a refused commit leaves the tree as the author left it.

---

## Technical Details

### Files Modified/Created

- **Scripts:**
  - `skills/create-skill/scripts/bundle_skill.py`
  - `skills/create-skill/scripts/quick_validate.py`
  - `.githooks/pre-commit`
- **Prose:**
  - `skills/create-skill/SKILL.md` (§ Cite or depend)
  - `AGENTS.md`
  - `docs/contributing/traps.md`
  - three `SKILL.md` pointer sites
  - `CHANGELOG.md`
- **Tests:**
  - `tests/bundle-citation.test.js`
  - `tests/pre-commit-hook.test.js`
  - `tests/bundle-missing-source.test.js`
- **Generated:** 51 unreached `references/` copies deleted

### Dependencies

None added.

---

## Testing & Quality Assurance

- **QA:** 3 cycles; gate 3 PASS at 100/100.
- **PR review (5c):** APPROVE.
- **Mutation proofs:** every one of these is recorded red.
  - M1–M9 and H1–H4 (develop)
  - F1–F8 (QA fixes)
  - D1–D5 (finalise)
- **CI:** 5 checks green on `67b4ed23`.

## Security & Compliance

- **Security:** one low finding. The pre-commit boundary cannot be executed by the probe engine, because it decides from git state. That finding is accepted by operator decision 2, on fixture-test evidence. The tooling follow-up is observation #221.
- **Compliance:** not applicable (internal tooling).

## Known Limitations and Future Work

- The probe engine has no git-repository entry form (observation #221).
- There are two advisory QA cleanups:
  - the `expected_bytes` dead fallback
  - an untested tracked branch in `revert_new`
