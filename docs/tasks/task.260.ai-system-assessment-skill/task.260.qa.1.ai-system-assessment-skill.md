# QA Report: Task 260 - ai-system-assessment skill

**Task**: [Link to task document](./task.260.ai-system-assessment-skill.md)
**Gate File**: [task.260.gate.1.ai-system-assessment-skill.yml](./task.260.gate.1.ai-system-assessment-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-04
**Testing Completed**: 2026-11-04
**Gate Status**: CONCERNS

---

## Executive Summary

The skill, its eight checklists, the plain-Node signal harness and the 12 tests all work and hold. One MEDIUM finding blocks acceptance: `CHANGELOG.md` has no entry citing task 260.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, inline. **The independent Explore subagent for the diff code review did not run**; the harness and tests were read inline, so the review is not independent. Adaptive strategy: small task, direct tools.

Step 4b: not applicable. No fenced bash block in `SKILL.md` or the checklists.

CI on 3c1838b41ce3: pending (read once, not awaited).

Re-review scope: not a re-review (first cycle).

---

## New Findings This Cycle

- **[medium]** `CHANGELOG.md` — no `[Unreleased]` entry cites task 260 → add one (T260-QA-1, [bug report](./task.260.bug.1.changelog-entry-missing.md)).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| 1 Rubric and target types | PASS | Verified | five ratings, evidence rule, "a hit is a lead" |
| 2 Eight checklists | PASS | Verified | each has the five required headings and at least 3 signals |
| 3 Templates and SKILL.md | PASS | Verified | 58 lines, one checklist loaded at a time |
| 4 Fixture and tests | PASS | Verified | 12 tests; signal layer only, by design |
| 5 Integration | CONCERNS | Verified | bundle, catalog, deps, validate clean; CHANGELOG entry missing |

**Overall Phase Completion**: 4/5 clean, 1 with a finding.

---

## Success Criteria Verification

Criteria are held by the committed tests (signal hit/miss per principle, nonstandard-name control, mutation, tree-unchanged, template slots, SKILL.md length) or verified by reading. Criteria drift: clean. The CHANGELOG citation check fails (see below).

### Consumer Test: this repository

All 32 runnable signals were run over this repository (minus task, plan and prd documents) and compared with the plan's expected table. A scratch probe of mine excluded `.github` by mistake at first; re-run on the real harness it agrees with the table.

| Plan expectation | Run result | Judgement |
|---|---|---|
| P1 Partial: no CODEOWNERS | `p1-codeowners` miss; instruction file, scope statement and schema checks hit | matches |
| P2 Strong: parity tests | `p2-drift-test` miss | **difference.** The glob `tests/**/*drift*` misses `evals/shared/tests/*parity*.test.mjs`. A lead is missed, not a rating changed. Logged as LOW. |
| P3 Strong: fakes | `p3-tool-fakes` miss | **difference.** `tests/**/fake*` misses `shared/resources/fake-jira.js`. Same cause, LOW. |
| P4 Partial | permission-modes, tool-allowlist hit; user-identity miss | matches; 477 and 146 file hits are noise the rubric tells the reader to discard |
| P5 Gap: no untrusted-text rule | `p5-untrusted-text-rule` miss, `p5-secret-scan` hit (`secret-scan.yml`) | matches. Task 261's gap excepted. |
| P6 Partial: no caching | `p6-caching` miss; loop-limit, cheap-mode, model-routing hit | matches |
| P7 Partial | `p7-run-log` miss (run state is gitignored, as the plan says) | matches |
| P8 Partial | `p8-ci-on-prompt-edit` miss; eval-suite, mutation-proof hit | matches |

Two of 32 signals differ from the plan, both for a layout reason, and the rubric's behaviour-search rule covers them. Repository tree unchanged by the run (`git status --porcelain` identical before and after).

### CHANGELOG citation

`changelog-cites.sh task.260` → `missing (task 260)`, rc 1. MEDIUM, see below.

---

## Breaking Changes Validation

None. New skill only.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CHANGELOG entry missing**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.260.bug.1.changelog-entry-missing.md](./task.260.bug.1.changelog-entry-missing.md)
- **Impact**: `/finalise` 6d halts.
- **Recommendation**: add an `Added` bullet under `[Unreleased]` citing (task 260).

### LOW Severity Issues (2)

- `p2-drift-test` and `p3-tool-fakes` globs assume a root `tests/` directory (above).
- `p4-permission-modes` and `p7-decision-log` return hundreds of hits on a large repository.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance: PASS
Test file about 90 ms.

### Reliability: PASS
Green under `CI=true` and `TMPDIR=/tmp`. Prettier, `quick_validate` clean.

### Security: PASS
- **Evidence**: reasoned
- No boundary function. `parseSignals` and `runSignal` report a result; nothing is accepted or rejected by them. The skill is read-only by rule and a tree-hash test holds it.

### Maintainability: PASS
`EXPECT` table forces a stated fixture result for each new signal.

---

## Code Review

Inline, not independent. **Correctness bugs (0).** **Cleanups (0)** worth a fix. Checked: pipe-escape handling in table cells, glob translation (`**/`, `{a,b}`), symlinks skipped by `isFile`, no writes or spawns.

boundary: false (candidates considered: `runSignal`, `parseSignals`; neither gates an action).

mutation-proven: grep signal always matches → "signals hit the seeded controls and miss the seeded gaps" and one more red → covered
mutation-proven: file-kind signal never hits → 2 tests red → covered
mutation-proven: `\|` unescape removed in `parseSignals` → 3 tests red → covered
mutation-proven: delete the mislabelled control `docs/trust-boundaries.md` → 3 tests red (incl. the nonstandard-name test) → covered

Every mutation was applied to a `cp` snapshot and restored; `git status --porcelain` is identical before and after.

---

## Regression Testing

Not applicable beyond the new test file; `check:generated`, `bundle:check`, `lint:shell`, `lint:secrets`, `validate:all` were clean at the Step 3 gate of the pipeline.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test skills/ai-system-assessment/tests/*.test.js     # 12 pass
TMPDIR=/tmp node --test skills/ai-system-assessment/tests/*.test.js # 12 pass
python3 skills/create-skill/scripts/quick_validate.py skills/ai-system-assessment
./node_modules/.bin/prettier --check skills/ai-system-assessment
bash .agents/skills/qa-task/references/changelog-cites.sh task.260   # missing
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Add the CHANGELOG entry citing task 260.

### Short-term Actions (Non-Blocking)
1. Widen the two layout-bound globs.
2. Tighten the noisiest p4 and p7 patterns.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM process finding; no defect in the shipped code.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CHANGELOG entry citing task 260.

---

**QA Report**: co-located at `task.260.qa.1.ai-system-assessment-skill.md`
**Gate File**: co-located at `task.260.gate.1.ai-system-assessment-skill.yml`
**Next Steps**: `/qa-fix`, then a second gate.
