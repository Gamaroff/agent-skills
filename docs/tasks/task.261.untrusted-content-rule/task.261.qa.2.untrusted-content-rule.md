# QA Report: Task 261 - Untrusted-content rule

**Task**: [Link to task document](./task.261.untrusted-content-rule.md)
**Gate File**: [task.261.gate.2.untrusted-content-rule.yml](./task.261.gate.2.untrusted-content-rule.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-05
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's finding is fixed. The refute pass then found two new medium issues: the fix's fence tracking can desynchronise, and the CHANGELOG entry that `/finalise` requires is missing.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Cycle 2 refute pass over the whole branch diff (24 files, 1530 patch lines). The Step 3b reviewer ran as an independent read-only Explore subagent (dispatched 07:11:52Z, returned in 30 s by its reported duration). It read the authored files and not the generated `references/` copies. I reproduced its main finding myself before accepting it.

CI on e0d5e019: all checks pass (`test`, `validate`, `link-check`, `shellcheck`, `secret-scan`).

Re-review scope: unscoped whole-branch diff (cycle 2 is always a full refute pass).

---

## Re-Review Context

| Gate 1 issue | Status | Evidence |
| --- | --- | --- |
| T261-QA-1: lint filter drops a read line containing "no" | ✅ FIXED | Bare `no` removed; filter limited to prose; two controls added. Re-proved this cycle: restoring the bare `no` turns `control: a prose line using the bare word no is not treated as forbidding` red. |

---

## New Findings This Cycle

- **[medium]** `tests/untrusted-content-rule.test.js:95` — the fence toggle ignores fence character and length, so an unclosed or nested fence flips the state and prose like "Never call WebFetch" is then flagged as a read (T261-QA-2). Reproduced three ways with `markerLines` lifted from the file: unclosed fence, odd fence count, and a backtick fence inside a tilde fence. `skills/create-parallel-stories/SKILL.md` has 55 fence lines, so one file is already out of sync, and the tree is green only because no forbidding prose follows. Introduced by the cycle 1 fix, so provenance is this branch (the test file does not exist on `origin/develop`).
- **[medium]** `CHANGELOG.md` — `changelog-cites.sh` answers `missing (task 261)`; `/finalise` 6d halts without an `[Unreleased]` entry citing the task (T261-QA-3). Missed in cycle 1.
- **[low]** `shared/resources/untrusted-content-rule.md:34` — the rule says "or the configured PRD or task root" but the three bound blocks accept `docs/` only (CR-2, advisory).
- **[cleanup]** `tests/untrusted-content-rule.test.js:308` — missing bound cases and no check that the three copies of the bound block stay identical (CR-3, advisory).

The reviewer's line numbers were off (107, 40, 318 against the real 95, 34, 308); `finding-anchors.js` reported `text-mismatch` for all three, shown below as unverified anchors. I corrected the lines after reading the files.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Rule doc, six headings | test "carries the six headings" | PASS |
| Every read site cites the rule | lint test, 22 of 22 pass | PASS |
| Path outside docs/ HALTs, with test | 3 sites x accepted / rejected / empty | PASS |
| Removing a citation turns the test red | proved in cycle 1 | PASS |
| `bundle:check` clean | 129 skills, 0 problems | PASS |
| CHANGELOG entry citing the task | `changelog-cites.sh`: missing | **open (T261-QA-3)** |
| Criteria unchanged since review | `criteria-drift.js`: clean | PASS |

---

## Issues Found

### MEDIUM Severity Issues (2)

**T261-QA-2** fence tracking, see New Findings. **T261-QA-3** missing CHANGELOG entry, see New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0 (plus 1 low and 1 cleanup advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The reviewer traced `docs/..`, `docs/a/../../x`, trailing `/..` and `docs/a..b.md` against the bound by hand and found it correct. These cases are not asserted yet (CR-3).
### Maintainability — CONCERNS
The path-bound block is copied into three files with no identity check.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `tests/untrusted-content-rule.test.js:107` ⚠️ unverified anchor (text-mismatch; real line 95) — fence toggle desynchronises → track fence character and length. Promoted to T261-QA-2.
- [low/medium] `shared/resources/untrusted-content-rule.md:40` ⚠️ unverified anchor (text-mismatch; real line 34) — rule allows a configured root the code does not → reword or derive the root. Advisory.

**Cleanups (1):**
- `tests/untrusted-content-rule.test.js:318` ⚠️ unverified anchor (text-mismatch; real line 308) — add the missing bound cases and an identity check for the three copies.

mutation-proven: restore bare `no` in FORBIDDING → `control: a prose line using the bare word no is not treated as forbidding` went red (1 fail) → covered

The fence-tracking guard (inFence) has no mutation proof yet, because it has no test that fails when the toggle is wrong; that is T261-QA-2.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test tests/untrusted-content-rule.test.js tests/bundled-links.test.js
npm run bundle:check
node .agents/skills/qa-task/references/changelog-cites.sh   # missing (task 261)
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — fix T261-QA-2 and T261-QA-3, then re-review.
