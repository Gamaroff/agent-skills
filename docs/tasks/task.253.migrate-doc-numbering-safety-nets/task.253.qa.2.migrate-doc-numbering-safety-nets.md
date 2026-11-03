---
type: qa-report
title: "QA report: task 253, cycle 2"
description: "Second QA review (full-diff refute pass) of the migrate-doc-numbering safety nets: gate CONCERNS, one vacuous regression guard and one fence-tracking bug."
updated: 2026-11-03
---

# QA Report: Task 253 - migrate-doc-numbering safety nets

**Task**: [task.253.migrate-doc-numbering-safety-nets.md](./task.253.migrate-doc-numbering-safety-nets.md)
**Gate File**: [task.253.gate.2.migrate-doc-numbering-safety-nets.yml](./task.253.gate.2.migrate-doc-numbering-safety-nets.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle 1 fix works and is held by a test that goes red when it is reverted. The refute pass over the whole branch, this time including the test code, found a regression guard that cannot fail for three of its four keys, and a fence-tracking bug in a warning list. Gate is CONCERNS; one more fix cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix T253-QA-2, T253-QA-3)

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T253-QA-1: behind guard reads a failed `rev-list` as 0 | ✅ FIXED | `repoGuard` now raises one `upstream-unverified` warning; `253 gap 5 controls` deletes the remote branch and goes red when the fix is reverted (re-run this cycle). `--apply` still returns `ok`. Bug 1 closed. |

## New Findings This Cycle

- **[medium]** `shared/resources/tests/migrate-doc-numbering.test.mjs:2424` — the gap 3 guard asserts not-null on an empty-string return → T253-QA-2
- **[low]** `shared/resources/migrate-doc-numbering.mjs:2463` — `maskedLinks` closes a fence on any fence line → T253-QA-3
- Advisory (not promoted, medium confidence), listed in the gate's `recommendations.future`: CR-2, CR-3, CR-4, CR-6, CR-7, CR-8.

---

## Testing Scope

### Review Methodology

- Re-review scope: unscoped, full branch diff (cycle 2 refute pass). The diff given to the reviewer covered `shared/resources/**` and `CHANGELOG.md`, 1,075 lines, test files included. Bundled `skills/*/references/` copies are generated and were left out.
- Strategy: direct tools plus one read-only Explore reviewer with the refute directive. Return time not measured.
- CI on `2c366a494b64`: pending when read (`link-check`, `shellcheck`, `test`, `validate`); `secret-scan` and the branch-name check pass. `/finalise` reads CI on the final commit.
- Step 4b: not applicable. No `SKILL.md` or step-doc fenced bash in the change set.

### Test Commands Executed

```bash
CI=true npm run ci:fast        # run at this head by qa-fix: 7187 pass, 1 fail (zsh absent locally)
TMPDIR=/tmp node --test shared/resources/tests/migrate-doc-numbering.test.mjs shared/resources/tests/doc-links.test.mjs   # 135 pass
npm run validate -- skills/review-prd/    # ✓
npm run bundle:check                      # 128 skills, 0 problems
```

The one local failure ("under CI, every tool a suite skips without is on PATH") comes from `zsh` not being installed on the author's laptop. `.github/workflows/test.yml:46` runs `apt-get install … zsh`. Re-checked against the workflow file this cycle.

---

## Success Criteria Verification

Unchanged from cycle 1 and re-checked: all criteria pass, with the caveat that the gap 3 regression guard is weak (T253-QA-2). `criteria-drift.js`: clean. `changelog-cites.sh`: `cites (task 253)`.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T253-QA-2: the gap 3 regression guard cannot fail for `id`, `epic` and `prd_source`**
- **Bug Report**: [task.253.bug.2.gap-3-guard-asserts-not-null-on-an-empty-string.md](./task.253.bug.2.gap-3-guard-asserts-not-null-on-an-empty-string.md)
- **Observation**: `frontmatterField` returns `""` for a missing key; the test asserts `!== null`. Reproduced with a document lacking `epic`.
- **Impact**: the only stand-in for the dropped gap 3 is mostly vacuous.
- **Provenance**: introduced by this branch; new test.

### LOW Severity Issues (1)

**T253-QA-3: `maskedLinks` fence tracking ignores marker type and length**
- **Bug Report**: [task.253.bug.3.masked-links-fence-tracking-ignores-marker-type.md](./task.253.bug.3.masked-links-fence-tracking-ignores-marker-type.md)
- **Observation**: a tilde fence holding a backtick fence line drops a later link from the warning list. Reproduced.
- **Promoted** because it is a high-confidence bug; severity stays low.

**Total Issues**: HIGH 0, MEDIUM 1, LOW 1

---

## NFR Assessment

- **Performance** PASS.
- **Reliability** PASS. T253-QA-1 closed; remaining guard gaps are advisory.
- **Security** PASS. Evidence: reasoned, `probes_executed: 0`. The matched criterion ("refuses") is a repository-state guard, not an input validator.
- **Maintainability** CONCERNS. T253-QA-2, T253-QA-3.

---

## Code Review

Reviewer reported 8 findings and read the test hunks this time. All six bug anchors verified (`anchor_check: ok`).

**Correctness bugs (6):**
- [medium/high] `shared/resources/tests/migrate-doc-numbering.test.mjs:2424` — not-null on an empty string → T253-QA-2 (promoted)
- [low/high] `shared/resources/migrate-doc-numbering.mjs:2463` — fence tracking → T253-QA-3 (promoted)
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:2649` — `fetch` without `--prune`: a branch deleted by someone else leaves a stale tracking ref, so `rev-list` succeeds and the guard reads level. The cycle 1 test deletes through `git push --delete`, which also removes the local ref. Advisory.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:2611` — a failed `git status` reads as clean. Advisory.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:2639` — `fetch` sets no `GIT_TERMINAL_PROMPT=0` and no stdin ignore. Advisory.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:2369` — the blocked return carries no `postScan`, so the CHANGELOG's "every mode" is not true for blocked runs. Advisory.

**Cleanups (2):**
- `shared/resources/tests/migrate-doc-numbering.test.mjs:2761` — the read-count test covers only `applied: false`.
- `shared/resources/migrate-doc-numbering.mjs:2540` — no whole-text prefilter in applied mode.

Provenance: every promoted finding is in code added by this branch.

mutation-proven: `behind.status !== 0` branch disabled → `253 gap 5 controls` → covered

Re-run this cycle in the working tree after the reviewer returned; the file was restored from a `cp` snapshot and compared, and `git status` showed no change under `shared/` or `skills/`. The nine cycle 1 mutations were not repeated (their code is unchanged since cycle 1).

Platform variance: `TMPDIR=/tmp` run, 135 pass.

---

## Regression Testing

Unchanged since cycle 1. Full run at this head: 7187 pass, 1 environmental fail.

---

## Recommendations

### Immediate (blocking)
1. Fix T253-QA-2 (assert real values; mutation-prove).
2. Fix T253-QA-3 (match fence marker and length; add a test).

### Short-term
1. Consider CR-3 (`fetch --prune`) with a second-clone test; it is the realistic form of the cycle 1 defect.
2. `/finalise` reads CI on the final commit.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
