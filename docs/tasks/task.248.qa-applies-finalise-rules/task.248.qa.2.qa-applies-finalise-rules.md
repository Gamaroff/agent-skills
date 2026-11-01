# QA Report: Task 248 - QA applies the finalise DoD's rules before finalise does

**Task**: [task.248.qa-applies-finalise-rules.md](./task.248.qa-applies-finalise-rules.md)
**Gate File**: [task.248.gate.2.qa-applies-finalise-rules.yml](./task.248.gate.2.qa-applies-finalise-rules.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: [task.248.gate.1.qa-applies-finalise-rules.yml](./task.248.gate.1.qa-applies-finalise-rules.yml), CONCERNS 80/100.

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T248-QA-1: an unstamped review drops the base to merge-base | ✅ FIXED | The unstamped report's commit is the base; test "an unstamped review report still makes the review's commit the base" |
| T248-QA-2: an edited bound reads as appended | ✅ FIXED | `extendsAtBoundary`; both identity directions tested |
| T248-QA-3: a path stem skips 6d silently | ✅ FIXED | Path stems exit 2; the re-probe refused all 5 hostile stems |

---

## Executive Summary

This was cycle 2, a full-diff refute pass. All three cycle-1 findings are fixed. The refute pass found two HIGH defects and two MEDIUMs, three of them reproduced by execution. The worst, T248-QA2-1, would HALT every `/finalise` run at 6d. CI is green on 1da9f7f0, and locally `npm run ci` gave 6956 pass, 0 fail.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

The review used direct tools, plus one Explore reviewer over the full branch diff (4,027 lines, 40 files, with the bundled copies excluded) and the REFUTE directive appended. The reviewer was dispatched at 18:43Z and returned after 172.7 s (`duration_ms` 172745).

Re-review scope: unscoped, cycle 2 refute pass (one prior gate; SAFETY_REPROBE false: gate 1's security was PASS)

CI on 1da9f7f025b7: green

Step 4b: the changed blocks are the same set as cycle 1, all refused as `mutating` (`node` and `gh` are not on the allow-list). The committed wiring test runs them instead. That test does not run finalise's 6d block without `STEM`, which is how T248-QA2-1 went unseen.

---

## New Findings This Cycle

- **[high]** `skills/finalise/SKILL.md:1981` — 6d reads an unbound `$STEM`, so changelog-cites exits 2 and 6d HALTs every run → bind STEM in the block (T248-QA2-1)
- **[high]** `shared/resources/criteria-drift.js:243` — a co-located bug's review report can become the base, and every criterion reads as unapproved `added` → match the document's own stem (T248-QA2-2)
- **[medium]** `shared/resources/criteria-drift.js:198` — a symlinked document path reads as `new-document` at exit 0 → use realpath, and refuse a path outside the repository (T248-QA2-3)
- **[medium]** `shared/resources/qa-read-back.js:240` — the drift check trusts the gate's own block → re-run the engine (T248-QA2-4)
- **[low]** `shared/resources/changelog-cites.sh:42` — stem refusals run before the opt-in → read the opt-in first (T248-QA2-5)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1: Boundary signal | CONCERNS | CR-6: the read-back checks that the key exists, not what it holds |
| 2: Criterion amendments | FAIL | T248-QA2-2, T248-QA2-3, T248-QA2-4 |
| 3: CHANGELOG citation | FAIL | T248-QA2-1, T248-QA2-5 |
| 4: Quantifier + read-back + qa-fix | PASS | |

---

## Success Criteria Verification

- `boundary_signals: ["never"]`
- `criteria-drift: clean (base: reviewed-blob)`
- `changelog: cites (task 248)`

The "6d's messages are unchanged" criterion is held by a test, but that test injects `STEM` into the environment, so it cannot see T248-QA2-1.

---

## Issues Found

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 1. No bug report files were written; the gate entries carry the reproductions.

Reproductions:

- **T248-QA2-1**: the 6d block (lines 1968–1995) has no assignment to `STEM`. With `STEM` empty, `changelog-cites.sh ""` exits 2 (pinned by `changelog-cites.test.mjs`), and the block's rc-2 arm HALTs `changelog-stem`. The base read the same unbound `$STEM` and skipped the check without a word.
- **T248-QA2-2**: in a scratch repository, I added `task.9.review.1.x.md`, stamped with the task's blob, and `task.9.bug.1.review.2.y.md`, stamped with the bug's blob. The engine returned `{"reason":"drift","base":"reviewed-blob","report":"task.9.bug.1.review.2.y.md","kinds":["added","added"]}`.
- **T248-QA2-3**: two runs against this repository's own document. With a `/proc/self/cwd/…` path: `new-document`. With the relative path: `clean`. `TMPDIR=<symlinked dir> node --test shared/resources/tests/criteria-drift.test.mjs` gave 3 fail, 13 pass.

---

## NFR Assessment

### Performance — PASS
### Reliability — FAIL
6d HALTs on every run, and the drift engine can take the wrong base.
### Security — PASS
- **Evidence**: measured. **Probes executed**: 6 (escaped 0). Run record: `task.248.qa.2.security.run.json`. `boundary: true`, `boundary_signals: ["never"]`.
### Maintainability — CONCERNS
T248-QA2-4 and CR-6.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true`).

**Correctness bugs (5):**
- [high/high] `skills/finalise/SKILL.md:1981` — 6d reads an unbound STEM (→ T248-QA2-1, promoted)
- [high/medium] `shared/resources/criteria-drift.js:243` — the newest report in the directory is taken whatever its stem (→ T248-QA2-2, reproduced)
- [medium/high] `shared/resources/criteria-drift.js:198` — a symlinked path gives `new-document` (→ T248-QA2-3, promoted, reproduced)
- [medium/medium] `shared/resources/qa-read-back.js:240` — the drift block is trusted, not re-derived (→ T248-QA2-4)
- [low/medium] `shared/resources/changelog-cites.sh:42` — the stem is checked before the opt-in (→ T248-QA2-5)

**Cleanups (1):**
- `shared/resources/qa-read-back.js:227` — `boundary_signals` is checked by key only, not compared with the CLI's phrases

Cycle 1's fixes were mutation-proved in fix cycle 1, in the same session (4 of 4, each red on its named test), and were not re-proved independently here: `dev-only` for this cycle.

---

## Regression Testing

Full `npm run ci` at 1da9f7f0: 6956 pass, 0 fail, 14 skipped (zsh). Hosted CI on 1da9f7f0: all 6 jobs green.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 40/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` for T248-QA2-1 to -5, then QA cycle 3
