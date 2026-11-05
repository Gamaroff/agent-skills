# QA Report: Task 250 - Security-probe tests write no scratch files into the repository

**Task**: [Link to task document](./task.250.security-probe-scratch-out-of-tree.md)
**Gate File**: [task.250.gate.2.security-probe-scratch-out-of-tree.yml](./task.250.gate.2.security-probe-scratch-out-of-tree.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 2: a re-review with a whole-branch refute pass. Cycle 1's two gated findings (CR-1, CR-4) and its two advisory ones (CR-2, CR-3) are fixed, and each fix goes red when it is reverted. The refute pass found two new ways to blind the in-tree write guard. Both were reproduced in memory: a quote inside a comment within an argument list (medium), and a backtick or `/*` inside a regex literal (low). No in-tree write is hidden today: the scan counts 244 of the file's 248 name matches, and the other 4 sit inside strings or comments.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-250-CR-1 (medium): stale-allowlist check self-matched its key | ✅ FIXED | Calls are matched on `t250CodeOnly`. The allowlisted `rmSync` moved to a tmpdir path → `stale T250_ALLOWED entry` (red). |
| TASK-250-CR-4 (low): temp root leaked on a throw before `try` | ✅ FIXED | `fenceRoot` removes its root on any throw; `t140Libs` builds inside it; five rows create `outside` inside `try`. New test red without the catch's `rmSync`. One residual site of the same class: CR2-3 (advisory). |
| CR-2 (advisory): guard missed `resolve(`, template paths, more fs calls | ✅ FIXED | Calibration lines 15–17 flagged. |
| CR-3 (advisory): BUG-12 escape not pinned to the root | ✅ FIXED | Red with `repoRoot: REPO_ROOT` (`PWNED-self is not under the temp root`). |

## New Findings This Cycle

- **[medium]** `shared/resources/tests/security-probe.test.mjs:8157`: the guard uses two parsers. Calls are matched on the code-only view, but `t250Args` splits arguments on the raw source. A comment containing a quote inside an argument list makes `t250Args` return null, and the call is skipped without being counted or flagged. Fix: split on the code-only view, and fail on an unparseable matched call. → **TASK-250-CR2-1**
- **[low]** `shared/resources/tests/security-probe.test.mjs:8082`: `t250CodeOnly` does not recognise regex literals, so a backtick or `/*` in a regex hides the writes after it. The line-8082 comment says otherwise, and the `>= 150` floor tolerates losing up to 94 calls. Fix: skip regex literals or pin the exact count. → **TASK-250-CR2-2**
- **[low, advisory]** `:2158`: the namesGh test creates `viaLink` between its root and `try` (CR2-3).
- **[low/low, advisory]** `:1020`: a `PWNED-self` left in the repository by a killed older run reads as a regression (CR2-4).
- **[cleanup]** `:8191`: one allowlist entry approves any number of identical calls (CR2-5).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status `ready-for-review`
- [x] All implementation phases complete
- [x] Tests passing (277/277)
- [x] No breaking changes
- [x] Feature branch with open PR #813

### Review Methodology

Direct tools plus one read-only Explore code reviewer (re-review strategy). Cycle 2, so the whole-branch diff (`origin/develop...HEAD`, 10 files) was reviewed with the REFUTE directive. The reviewer was dispatched at about 19:01Z and returned with `duration_ms` 251828 (4.2 min). All 5 anchors were `ok`.

Re-review scope: unscoped — cycle 2 refute pass over the whole branch diff (prior gate: CONCERNS, security PASS; `SAFETY_REPROBE=false`).

`CI on 7482fc53da4f: pending` (read once; does not hold the gate).

Step 4b: not applicable — no runnable prose in the change set. Standards-named validation (`npm run validate -- skills/<changed-skill>/`): not run, because no skill changed.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1: Root builder and guard | CONCERNS | Guard blind spots CR2-1, CR2-2 |
| 2: Convert sites | PASS | 13 sites; unchanged since gate 1 except CR-4's reordering |
| 3: Containment rows | PASS | Premise controls from cycle 1 still hold (file unchanged in those assertions) |
| 4: `.gitignore` | PASS | |
| 5: Verify | PASS | 277/277; `ci:fast` 7114 pass, 0 fail; tmp-leak ratchet ok |

**Overall Phase Completion**: 5/5 delivered, 1 with concerns.

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | No test creates a file, directory or symlink under `REPO_ROOT` | Guard green; the scan counts 244 calls, and no real call is hidden (the other 4 name matches are in strings or comments, listed in the implementation report). After the suite run, `git status --porcelain --untracked-files=all shared/resources/tests tests/fixtures` showed no stray files. The guard's blind spots (CR2-1, CR2-2) weaken the static half; they hide nothing today | PASS (guard concerns) |
| 2 | Every test keeps its name and assertions | One test added this cycle (CR-4); BUG-12 gained assertions; none removed | PASS |
| 3 | Containment tests fail when their root is wrong | Cycle 1 premise controls; BUG-12 added this cycle (red with `REPO_ROOT`) | PASS |
| 4 | Suite runtime alone grows ≤ 10% | 31.33 s at this head (`.claude/state/t250/suite-fix1.log`) vs base median 31.60 s | PASS |
| 5 | No temp roots left behind | `ci:fast` tmp-leak ratchet ok; CR-4 fixed; residual CR2-3 advisory | PASS |
| 6 | One root builder | `fenceRoot` (now with `build`) | PASS |
| 7 | `format:check` and `npm test` pass | prettier clean; `ci:fast` 7114 pass, 0 fail, 14 skipped | PASS |
| 8 | Guard red before the change and on a one-site mutation | Cycle 1; plus this cycle's stale-check and mask mutations | PASS |
| 9 | CHANGELOG `[Unreleased]` cites task 250 | `changelog-cites.sh` → `cites (task 250)` | PASS |

`criteria-drift.js`: clean (base: review commit). Criteria boundary signals: none.

---

## Breaking Changes Validation

None. Test-only change.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the in-tree write guard skips a call it cannot parse (TASK-250-CR2-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: matching and argument splitting read different views of the source. Reproduced: `mkdirSync(join(REPO_ROOT, "x") // it's` followed by a line break and `, {…});` gives total 0, found [].
- **Impact**: a REPO_ROOT write can be added without failing the guard.
- **Recommendation**: split on the code-only view; an unparseable matched call fails.
- **Priority**: P2

### LOW Severity Issues (1)

**TASK-250-CR2-2**: regex literals are not recognised by `t250CodeOnly`. Both shapes were reproduced (total 0). Pin the exact count or skip regex literals.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (plus 2 advisory bugs and 1 cleanup)

---

## NFR Assessment

### Performance — PASS
31.33 s at head against a 31.60 s base median.

### Reliability — CONCERNS
The guard can miss a write without failing (CR2-1, CR2-2). The CR-4 leak is fixed, with one advisory residual (CR2-3).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Test-only change; `security-probe.mjs` is unchanged. `boundary: false`, with the predicate-shaped functions named in the gate: their only input is this file's own source.

### Maintainability — PASS
One root builder, one wrapper, and a 17-line calibration sample.

---

## Code Review

Refute pass over the whole branch diff. Two findings were promoted under `code_review_blocking`: CR-1 → TASK-250-CR2-1 and CR-2 → TASK-250-CR2-2.

**Correctness bugs (4):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:8157`: `t250Args` parses the raw source while matching uses the code-only view, so a comment with a quote in an argument list silently drops the call → split on the code-only view and fail on an unparseable call. **Reproduced.**
- [low/high] `shared/resources/tests/security-probe.test.mjs:8082`: regex literals are not handled, and the floor is loose → skip regex literals or pin the exact count. **Reproduced.**
- [low/medium] `shared/resources/tests/security-probe.test.mjs:2158`: `viaLink` is created between the root and `try` → move it inside `try`.
- [low/low] `shared/resources/tests/security-probe.test.mjs:1020`: a leftover in-tree `PWNED-self` reads as a regression → check before the probe.

**Cleanups (1):**
- `shared/resources/tests/security-probe.test.mjs:8191`: allowlist approves any count → store an expected count.

Provenance: all four bugs are in code this branch added, so none is pre-existing.

mutation-proven: allowlisted `rmSync` target moved to a tmpdir path → "no write call … builds its write path from REPO_ROOT" (stale entry) → covered
mutation-proven: scan over raw source instead of `t250CodeOnly` → calibration test → covered
mutation-proven: BUG-12 `repoRoot: REPO_ROOT` → "side effects in HOME, TMPDIR or beside the script" → covered
mutation-proven: `fenceRoot` catch without `rmSync` → "a root whose build throws is removed" → covered

All four were run during qa-fix on the bytes now at HEAD (`git diff --quiet HEAD` on the test file). Each used a `cp` snapshot and restore. 4 of 4 cycle-1 fixes are proven.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `security-probe.test.mjs` | 277/277 |
| `ci:fast` (whole repo, tmp-leak ratchet) | 7114 pass, 0 fail; ratchet ok |
| Fixture directories after the run | No stray files |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/tests/security-probe.test.mjs`
- `.gitignore`

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs
npm run ci:fast
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
bash .agents/skills/qa-task/references/changelog-cites.sh task.250
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 813
```

### Coverage Report
Not applicable (test-only change).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-250-CR2-1: one parser for matching and argument splitting; an unparseable matched call fails.
2. TASK-250-CR2-2: handle regex literals or pin the exact call count; correct the comment.

### Short-term Actions (Non-Blocking)
1. CR2-3: move `viaLink` inside `try`.
2. CR2-4: separate message for a leftover in-tree `PWNED-self`.
3. CR2-5: expected count per allowlist entry.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 1's fixes hold, but the guard that stands for criterion 1's static half can still be blinded (one medium, one low, both reproduced).
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-250-CR2-1 fixed and re-gated

---

**QA Report**: co-located at `task.250.qa.2.security-probe-scratch-out-of-tree.md`
**Gate File**: co-located at `task.250.gate.2.security-probe-scratch-out-of-tree.yml`
**Next Steps**: `/qa-fix` for CR2-1 and CR2-2, then QA cycle 3.
