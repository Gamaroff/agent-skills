---
type: qa-report
title: "QA report: task 253, cycle 1"
description: "First QA review of the migrate-doc-numbering safety nets: gate CONCERNS, one reproduced fail-open."
updated: 2026-11-03
---

# QA Report: Task 253 - migrate-doc-numbering safety nets

**Task**: [task.253.migrate-doc-numbering-safety-nets.md](./task.253.migrate-doc-numbering-safety-nets.md)
**Gate File**: [task.253.gate.1.migrate-doc-numbering-safety-nets.yml](./task.253.gate.1.migrate-doc-numbering-safety-nets.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

All six fixes work and each is held by a test that goes red when the fix is reverted. One bug remains: the behind-upstream guard says "not behind" when it could not measure. Gate is CONCERNS, one fix cycle needed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix T253-QA-1)

---

## Testing Scope

### Review Methodology

- First review, so the whole branch diff was reviewed. The diff given to the code reviewer covered `shared/resources/**` and `CHANGELOG.md` (1,046 lines). The bundled `skills/*/references/` copies are generated and were left out.
- Strategy: direct tools plus one read-only Explore reviewer. Task has five phases in one module, so no parallel agent set.
- CI on `1676e0f47a81`: pending when read. `/finalise` reads CI on the final commit.
- Step 4b: not applicable. The change set holds no `SKILL.md` or step-doc fenced bash.
- Re-review scope: not applicable (first review).

### Test Commands Executed

```bash
CI=true npm run ci:fast          # 7187 pass, 1 fail (environmental, below)
TMPDIR=/tmp node --test shared/resources/tests/migrate-doc-numbering.test.mjs shared/resources/tests/doc-links.test.mjs   # 135 pass
npm run validate -- skills/review-prd/    # ✓
npm run bundle:check                      # 128 skills, 0 problems
```

The one failure, "under CI, every tool a suite skips without is on PATH", fails only because `zsh` is not installed on the author's laptop. `.github/workflows/test.yml:46` installs `zsh` (`apt-get install … zsh`), so that guard cannot fail in GitHub CI for this reason. Checked against the workflow file, not carried over from the task's notes.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1: failing test per gap | PASS | Gap 3 did not reproduce; a regression guard holds it |
| 2: multi-line links (gap 1) | PASS | `targetLine` is additive; caller suites pass |
| 3: post-apply scans (gaps 2, 7) | PASS | Each tracked file read once, asserted |
| 4: stub, dirty/behind, generated (gaps 4, 5, 6) | CONCERNS | Behind guard fails open, see T253-QA-1 |
| 5: mutation proof, docs, changelog | PASS | |

**Gap 3 (frontmatter validation) did not reproduce.** The tool already writes `prd_number` for every moved story and the post-apply `checkCorpus` fails `--apply` on a disagreement. It was dropped from scope with the evidence in the task's Phase 1 results table. No fix, no mutation row.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Multi-line link resolves after `--apply` | `253 gap 1`, plus `doc-links.test.mjs` | PASS |
| Dangling link printed with file and line | `253 gap 2` | PASS |
| Stub contains no link | `253 gap 4`, `epicRegistryPointer keeps…` | PASS |
| `--apply` refuses a dirty tree and a branch behind upstream | `253 gap 5`, `253 gap 5 controls`; real git repos with a bare upstream and a second clone | PASS, except a deleted upstream branch (T253-QA-1) |
| Generated file not edited, listed | `253 gap 6`, `inRewriteScope` test | PASS |
| Legacy-name file listed in the closing line | `253 gap 7`; clean and new-scheme files are controls | PASS |
| Scans read each tracked file once | `253 gap 2/7: scanTracked reads each tracked file at most once` | PASS |
| CHANGELOG updated | `changelog-cites.sh`: `cites (task 253)` | PASS |
| Criteria unchanged since review | `criteria-drift.js`: clean | PASS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**T253-QA-1: the behind-upstream guard fails open when the upstream ref is gone**
- **Bug Report**: [task.253.bug.1.behind-guard-fails-open-on-missing-upstream-ref.md](./task.253.bug.1.behind-guard-fails-open-on-missing-upstream-ref.md)
- **Observation**: `shared/resources/migrate-doc-numbering.mjs:2650` sets the count to 0 when `git rev-list` fails. Reproduced in a throwaway repo: with the remote branch deleted, `rev-list` exits 128 and the tool prints no warning.
- **Impact**: the guard gives no signal in a state where it cannot tell. Low blast radius.
- **Recommendation**: push an `upstream-unverified` warning on a non-zero exit; add a control test; mutation-prove it.
- **Why it gates**: the reviewer rated it medium confidence, which is advisory by the rules. QA reproduced it, so it is promoted on that evidence.

**Total Issues**: HIGH 0, MEDIUM 1, LOW 0

---

## NFR Assessment

- **Performance** PASS. One bounded `git fetch` (20 s timeout) per run; scans read each file once.
- **Reliability** CONCERNS. T253-QA-1.
- **Security** PASS. Evidence: reasoned, `probes_executed: 0`. The matched criterion ("refuses") describes a repository-state guard, not an input validator. Predicate-shaped functions in the diff: `repoGuard`, `isGenerated` / `generatedReason`, `isLegacyName`. Each has committed tests with controls and was mutation-proven below. No corpus sink models them. git is spawned with an argument array.
- **Maintainability** PASS.

---

## Code Review

Reviewer reported 1 finding; the reviewer did not read the two test-file hunks, so test code is reviewed only by the mutation proofs below.

**Correctness bugs (1):**
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:2650` — a failed `rev-list` is read as 0 behind → push `upstream-unverified` (promoted to the gate as T253-QA-1, see above)

**Cleanups (0).**

mutation-proven: `--apply` no longer blocks on the warnings → `253 gap 5` → covered
mutation-proven: `git fetch` replaced by a no-op → `253 gap 5`, `253 gap 5 controls` → covered
mutation-proven: stub path written as a link again → `253 gap 4`, `epicRegistryPointer keeps the old table…` → covered
mutation-proven: `!isGenerated(rel)` removed from `inRewriteScope` → `253 gap 6: inRewriteScope refuses a generated file…` → covered
mutation-proven: `maskedLinks` returns nothing → `253 gap 2` → covered
mutation-proven: old-path scan disabled → `253 gap 2` → covered
mutation-proven: `parseLegacy` result ignored → `253 gap 7` → covered
mutation-proven: `linkPass` reads the opening line, not `targetLine` → `253 gap 1` → covered
mutation-proven: `scanLinks` never sets `targetLine` → `253 gap 1`, both `doc-links.test.mjs` tests → covered

All nine were run this cycle in a scratch worktree at the PR head, not the working tree the reviewer was reading, and the tree was restored and compared after each. One first attempt was void (the sed did not match the formatted line); it was redone against line 189 and went red. The `dirty-tree` warning mutation and the `generated skip branch` mutation are covered by the development-time log only and were not re-run (`dev-only`).

Platform variance: the tests use `mkdtemp` under `os.tmpdir()` for scratch git repos and pass them to the tool as `cwd`; no containment check validates them. `TMPDIR=/tmp` run: 135 pass.

---

## Regression Testing

`doc-links.js` is also called by `jira-sync.js`, `status-history.js`, `qa-read-back.js`, `finalise-fix-and-recheck.mjs` and the `sync-jira-*` link tests. All pass in the full run. The two existing revert tests were changed to dirty the tree after `--apply`; this follows from the new `--apply` refusal and is stated in the task.

---

## Recommendations

### Immediate (blocking)
1. Fix T253-QA-1.

### Short-term
1. `/finalise` must read CI on the final commit; it was pending at this gate.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
