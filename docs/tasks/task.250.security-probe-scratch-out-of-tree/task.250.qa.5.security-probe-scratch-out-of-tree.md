# QA Report: Task 250 - Security-probe tests write no scratch files into the repository

**Task**: [Link to task document](./task.250.security-probe-scratch-out-of-tree.md)
**Gate File**: [task.250.gate.5.security-probe-scratch-out-of-tree.yml](./task.250.gate.5.security-probe-scratch-out-of-tree.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 5, the last in the budget: a re-review scoped to the files changed since gate 4's head. Cycle 4's fixes hold. The regex tripwire covers regex blanks only. Two string and template blank paths still re-split an argument list without failing the guard: a nested template literal and a phantom string (both reproduced). Neither shape is in the file today, and the shipped behaviour (no scratch files in the repository) is unaffected.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 4 finding | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-250-CR4-1 (medium): a phantom regex merges arguments | ✅ FIXED | Reviewer's three reproductions are now `found`. Mutations: postfix off, `wordAfterDot` off and tripwire off each turn the calibration red. With postfix and tripwire both off, row 30 passes silently, so the rows test the real class. |
| CR4-2 (cleanup): `/` not in `OPENS` | ✅ FIXED | Removed → calibration red (row 33 masked). |

## New Findings This Cycle

- **[medium]** `shared/resources/tests/security-probe.test.mjs:8177`: a nested template literal ends the outer template early, and its text re-splits the argument list. **Reproduced:** ``cpSync(`${b ? `,` : ""}`, join(REPO_ROOT, "x"));`` → found [], total 1, unparsed [], masked []. → **TASK-250-CR5-1**
- **[low]** `:8258`: the tripwire ignores a phantom regex that holds a quote, and the phantom string it opens swallows a comma. **Reproduced** (with `this.#of`). → **TASK-250-CR5-2**
- **[low, advisory]** `:8258`: any regex with a class or group inside a write call's arguments fails the guard, and the comment's "real code never does this" is unmeasured. → CR5-3

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer, with `duration_ms` 254111 (4.2 min). All 3 anchors `ok`.

Re-review scope: files changed since gate 4 (head ad5bd4364d46; 4 files) — default

`CI on 51ca2fdb0282: pending` (read once). Earlier heads `951f9cbe` and `ad5bd436`: all six workflows `success`, including `Test` with zsh installed.

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1: Root builder and guard | CONCERNS | CR5-1, CR5-2 |
| 2–5 | PASS | Unchanged since gate 4 |

---

## Success Criteria Verification

Unchanged from QA report 4, with these updates:
- Criterion 1: the static half has CR5-1 and CR5-2. The runtime half (the `fenceRoot` refusal) and the watched run hold.
- Criterion 7: `CI=true ci:fast` gives 7114 pass, 1 fail. The failure is environmental: zsh is not installed on the local machine, and hosted CI is green with zsh.
- `criteria-drift.js`: clean. Boundary signals: none.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (CR5-1), LOW: 1 (CR5-2); plus 1 advisory (CR5-3).

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR5-1, CR5-2.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
### Maintainability — PASS

---

## Code Review

Two findings promoted under `code_review_blocking`: CR-1 → TASK-250-CR5-1 and CR-2 → TASK-250-CR5-2.

**Correctness bugs (3):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:8177`: a nested template re-splits the argument list. **Reproduced.**
- [low/high] `shared/resources/tests/security-probe.test.mjs:8258`: the tripwire ignores a phantom regex that holds a quote. **Reproduced.**
- [low/high] `shared/resources/tests/security-probe.test.mjs:8258`: false positive on a regex with a class or group inside a write call's arguments.

**Cleanups (1):**
- The `close` fallback to `open` is unreachable (that case is already `unparsed`).

Provenance: in code this branch added.

mutation-proven: postfix `++` handling off → calibration → covered
mutation-proven: `wordAfterDot` off → calibration → covered
mutation-proven: regex tripwire off → calibration → covered
mutation-proven: `/` removed from `OPENS` → calibration → covered

These ran during qa-fix cycle 4 on the bytes now at HEAD, and the reviewer re-derived them in memory: 4 of 4.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-250-CR5-1 and TASK-250-CR5-2, or a person's decision to accept the residual (see the escalation in the implementation report).

### Short-term Actions (Non-Blocking)
1. CR5-3: reword the comment and the failure message.
2. Pre-existing on develop: 5 create-before-`try` sites.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-250-CR5-1 fixed and re-gated, or the residual accepted by a person

**Next Steps**: the QA budget (5 gates) is spent. The pipeline escalates (loop limit).
