# QA Report: Task 126 - Bundler citation form, per-skill closure count, pre-commit refusal (cycle 2)

**Task**: [task.126.bundler-citation-form.md](./task.126.bundler-citation-form.md)
**Gate File**: [task.126.gate.2.bundler-citation-form.yml](./task.126.gate.2.bundler-citation-form.yml)
**Previous Gate**: [task.126.gate.1.bundler-citation-form.yml](./task.126.gate.1.bundler-citation-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

All five cycle-1 findings are fixed, and each fix is held by a test that goes red when the fix is
reverted. The cycle-2 refute pass re-read the whole branch with the fixes as its starting point. It
found two medium defects **in those fixes**:
- a refused commit now leaves the hook's own copies behind, so a retry that follows the printed
  remedy is refused again (reproduced);
- the "reached, not on disk" rule reached prose mentions but not Markdown links.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed

---

## Re-Review Context

| Cycle-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 hook refused skill-native files | FIXED | native-file hook test; mutation F1 (no source filter) red |
| CR-3 refusal after the NEW add | FIXED | index test; mutation F2 red — **but the fix created cycle-2 CR-1** |
| CR-2 unshipped decided on on-disk copies | PARTIAL | prose mentions fixed (test M, mutation F4 red); Markdown links not — cycle-2 CR-2 |
| CR-4 duplicate fragment strip | FIXED | `split_fragment` reused; covered by the fragment tests (M7) |
| CR-5 "vs committed" read the index | FIXED | test J extended with a staged `git rm`; mutation F5 red |

### Review Methodology

Direct tools, plus one dispatched read-only reviewer. Cycle 2 is a **full refute pass** (Step 3b):
the whole branch diff (1234 lines) was read again, plus cycle 1's fix diff (328 lines) as the
starting point, with the four lifecycle transitions and the identity-rule pairs probed explicitly.

```
Re-review scope: unscoped (cycle 2 — refute pass over the whole branch)
```

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` changed this cycle.

---

## New Findings This Cycle

- **[medium/high]** `.githooks/pre-commit:69` — **CR-1**. A refused commit leaves the copies this run
  wrote untracked on disk, and the retry refuses them as pre-existing. This is the Error-path
  transition. **Reproduced** in a fixture repo: refused on `stray.md`; `git add stray.md` (the
  printed remedy); the retry is refused on `fresh.md`, which the hook itself generated; exit 1. The
  `UNSTAGED_SHARED` refusal's own "stage them, then retry" now always fails the same way. → Revert
  the run's NEW copies on any refusal, and test the retry.
- **[medium/high]** `skills/create-skill/scripts/bundle_skill.py:482` — **CR-2**. `rewrite_md_links`
  still relocates on `bundled_names` (`needed` ∪ on-disk). A cited document with a sibling Markdown
  link changes bytes when an `UNREACHED` copy is removed, and can disagree with its own prose
  mention of the same target. 27 shared documents carry sibling links. → Pass the reached set there
  as well.
- **[medium/medium, advisory]** `.githooks/pre-commit:76` — CR-3. An untracked, *unreached* leftover
  copy (left by a dependency-to-citation conversion) is refused with `git add` as the first remedy.
  That is the one remedy that makes CI fail, with `UNREACHED`. → Name both remedies.
- **[low, cleanup]** CR-4: the closure figure is a net delta, but the docs call it the `git rm`
  count. CR-5: the CHANGELOG still says `git ls-files`. CR-6: `shared_refs_with_lines` has no
  production caller, so §1d compares two views of one parser and cannot fail.

---

## Code Review

`code_review_blocking` resolved `true`. CR-1 and CR-2 (bug + high confidence) are promoted to gate
`top_issues[]`. CR-3 to CR-6 stay advisory.

**Provenance (5b):** every finding is in code this branch adds, and CR-1 and CR-2 are in cycle-1
fixes. None is pre-existing.

**Combination:** CR-1 is the class the refute directive names. Cycle 1's CR-3 fix ("refuse before
staging") is correct on its own. Combined with the untracked-copy refusal it creates a retry loop
that neither change produces alone.

**Mutation proofs (this cycle's fixes):**
- mutation-proven: no source filter → native-file test → covered
- mutation-proven: refusal after the NEW add → index test → covered
- mutation-proven: `&&` form under `set -e` → native-file test → covered
- mutation-proven: unshipped from `bundled_names` → M → covered
- mutation-proven: committed set from the index → J → covered

---

## NFR Assessment

### Performance — PASS
No change to discovery cost.

### Reliability — CONCERNS
CR-1: the refused-commit retry loops. CR-3 is advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycle 1. The Python parser and the argument-less hook are not modelled
  by the probe engine; both are held by behavioural tests and mutations. No new input surface this
  cycle.

### Maintainability — PASS
Cleanups CR-4, CR-5 and CR-6.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Bundler, link, hook and parity suites | 131/131 before the cycle-1 commit; 23/23 under `TMPDIR=/tmp` |
| Whole tree `npm run bundle` | no-op; `--check` 0 problems |
| Fast gate `npm run ci:fast` | first run red on formatting only (`tests/pre-commit-hook.test.js`), fixed in `fc83a5d0`; the re-run's result is recorded in the implementation report |

---

## Test Commands Executed

```bash
command node --test tests/bundle-*.test.js tests/bundled-links.test.js tests/executable-instructions.test.js tests/pre-commit-hook.test.js evals/shared/tests/qa-gate-preconditions-parity.test.mjs
TMPDIR=/tmp command node --test tests/bundle-citation.test.js tests/pre-commit-hook.test.js
npm run ci:fast
```

The CR-1 reproduction ran in a throwaway `git init` repo, with the hook copied in and a stub bundle.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed
**Next Steps**: `/qa-fix` cycle 2 (CR-1, CR-2; fold in CR-3 to CR-6); QA cycle 3.
