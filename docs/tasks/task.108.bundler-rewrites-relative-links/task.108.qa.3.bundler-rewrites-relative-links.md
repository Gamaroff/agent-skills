# QA Report: Task 108 - The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Task**: [Link to task document](./task.108.bundler-rewrites-relative-links.md)
**Gate File**: [task.108.gate.3.bundler-rewrites-relative-links.yml](./task.108.gate.3.bundler-rewrites-relative-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review after qa-fix cycle 2 (`5bdb7011`). All five cycle-2 findings verified — by direct probe of `_relocate_target()` on six inputs, by the new nested-source and stale-sibling tests, and by two more freshly packaged skills (0 broken). CI is green on `5bdb7011`. The scoped review of the five changed files then found a medium, high-confidence defect **in the guard**: the git pathspec `shared/resources/**/*.md` matches only nested files, so the checker has never walked the 57 top-level shared sources (its 606-file corpus is 605 skills files plus one fixture README). QA scanned those sources by hand — 0 of 103 relative links broken — so the fix is to the guard's coverage, not to the corpus. Gate **CONCERNS**.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix C3-CR-1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 5/5, tests passing (`ci:fast` 3,202/0 on `5bdb7011`; CI green on `5bdb7011`), breaking changes documented, PR #396 OPEN

### Review Methodology

Direct tools + one read-only Explore subagent over the diff **scoped to files changed since gate 2** (cycle 3+ default; `SAFETY_REPROBE=false`): `bundled-parity.mjs`, its test, `bundle_skill.py`, `bundle-link-rewrite.test.js`, `bundled-links.test.js` — 998 lines. Step 4b: not applicable.

Re-review scope: since 2026-09-12T15:29:55Z (default) — 5 files

### Re-Review Context

| Cycle-2 finding | Status | Evidence |
| --- | --- | --- |
| C2-CR-1 nested-source sibling path | FIXED | probes: `y.md`→`y.md`, `../x.md`→`../x.md`; nested-source test red when reverted |
| C2-CR-2 `ok` conflation | FIXED | `ran` flag; stale-sibling test; unresolvable target → `ran:false` |
| C2-CR-3 skill-dir self-link | FIXED | probes `../../skills/s/`→`../`, `../../skills/s`→`..` |
| C2-CR-4 `execFileSync("rm")` | FIXED | `rmSync` |
| C2-CR-5 duplicated comment | FIXED | removed |

---

## New Findings This Cycle

- **[medium/high]** `tests/bundled-links.test.js:81` — `git ls-files -- 'shared/resources/**/*.md'` returns 1 file; `'shared/resources/*.md'` returns 58. In a default git pathspec `**` is `*` and the following `/` is literal, so only nested files match; `skills/**/*.md` happens to work because every skills file has a slash after `skills/`. The header's claim of covering `shared/resources/**` was false in practice. Verified by QA against `git ls-files`. → use `shared/resources/*.md` and add a floor that at least one top-level shared source was visited. **Gated as C3-CR-1.**
- **[low/medium]** `tests/bundle-link-rewrite.test.js:201` — the package-path test needs an external `unzip`; `python3 -m zipfile` is already a dependency. Advisory.
- Cleanup: `evals/shared/tests/bundled-parity.test.mjs:33` recomputes `BUNDLER`/`repoRoot` — export from the helper.

QA hand-scan of the unwalked sources: 58 files, 113 links parsed, 103 relative, **0 broken**.

---

## Implementation Verification

All phases PASS (unchanged). Phase 1's checker has a coverage hole (C3-CR-1) — noted under `phases_with_issues: [1]`.

## Success Criteria Verification

Criterion 1 ("0 broken over `skills/**/*.md` + `shared/resources/**/*.md`") is **true of the corpus** (QA scanned both halves) but the automated guard only proves the first half until C3-CR-1 lands. Criteria 2–6 unchanged, PASS.

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (C3-CR-1), LOW: 1 (C3-CR-2) + 1 cleanup

---

## NFR Assessment

Performance PASS · Reliability PASS · Security PASS (evidence: reasoned, probes: 0) · Maintainability PASS.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `tests/bundled-links.test.js:81` — shared-sources pathspec matches only nested files → `shared/resources/*.md` + floor. **Promoted to gate as C3-CR-1.**
- [low/medium] `tests/bundle-link-rewrite.test.js:201` — external `unzip` dependency → `python3 -m zipfile`.

**Cleanups (1):**
- `evals/shared/tests/bundled-parity.test.mjs:33` — import `BUNDLER` from the helper.

**Mutation-proven:** C2-CR-1 fix — yes (nested-source test red when the join is reverted).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Affected suites | 133/133 |
| `npm run ci:fast` on `5bdb7011` | 3,202 pass / 0 fail |
| CI on `5bdb7011` | test / validate / link-check / shellcheck / branch-policy all success |
| `bundle --check --all` | 126 skills, 0 problems |
| qa-task + create-skill packaged and extracted | 25 md, 33 links, 0 broken |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The guard the task exists to add does not walk half the corpus it claims; the corpus itself is clean.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — C3-CR-1.

---

**QA Report**: co-located at `task.108.qa.3.bundler-rewrites-relative-links.md`
**Gate File**: co-located at `task.108.gate.3.bundler-rewrites-relative-links.yml`
**Next Steps**: `/qa-fix` on gate 3; re-review.
