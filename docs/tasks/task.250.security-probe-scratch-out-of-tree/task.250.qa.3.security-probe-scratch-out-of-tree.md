# QA Report: Task 250 - Security-probe tests write no scratch files into the repository

**Task**: [Link to task document](./task.250.security-probe-scratch-out-of-tree.md)
**Gate File**: [task.250.gate.3.security-probe-scratch-out-of-tree.yml](./task.250.gate.3.security-probe-scratch-out-of-tree.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 3: a re-review scoped to the files changed since gate 2's head. Cycle 2's fixes hold, and each goes red when reverted. The regex-literal handling those fixes added has a heuristic gap: a division after a string literal or a `//` comment is read as a regex start, which hides a REPO_ROOT write without failing the guard (reproduced). No real write is hidden today: the scan of the real file still counts 244 calls, with 0 unparsed and 4 masked.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-250-CR2-1 (medium): a call it cannot parse is skipped | ✅ FIXED | One code-only view decides both match and split; unparsed calls fail. Mutations: split on raw source → calibration red; unparsed push removed → calibration red. |
| TASK-250-CR2-2 (low): regex literals; loose floor | ⚠️ PARTIAL | Regex literals are now blanked (calibration red when disabled), and a masked cap was added (red at cap 3). The regex start heuristic misreads division after a literal or comment: TASK-250-CR3-1. |
| CR2-3 (advisory): `viaLink` before `try` | ✅ FIXED | Inside `try`, with a guarded removal. |
| CR2-4 (advisory): leftover in-tree PWNED-self | ✅ FIXED | A planted leftover fails first with its own message. |
| CR2-5 (cleanup): allowlist count | ✅ FIXED | Count 1→2 → guard red (`covers 2 call(s) but 1 match`). |

## New Findings This Cycle

- **[medium]** `shared/resources/tests/security-probe.test.mjs:8115`: `regexAfter` reads the blanked view, with `^` anchored to a 16-character window. A `/` after a string literal or a `//` comment is taken as a regex start, which hides the write that follows. **Reproduced:** `const z = "it's" / c; mkdirSync(join(REPO_ROOT, "x")); const w = e / f;` → found [], masked ["1"]. → **TASK-250-CR3-1**
- **[low]** `:8348`: the "division is not a regex" calibration row cannot catch CR3-1, because nothing on its line closes the phantom regex. → **TASK-250-CR3-3**
- **[medium/medium, advisory]** `:8183`: the masked cap lets a hidden call through while the count is under the cap; pinning the exact set would make any misread fail. → CR3-2

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer, with `duration_ms` 98796 (1.6 min). All 3 anchors `ok`.

Re-review scope: files changed since gate 2 (head 7482fc53da4f; 4 files) — default

`CI on 951f9cbe5e3f: pending` (read once). Earlier heads `7482fc53` and `1a4750a2`: all six workflows `success`.

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1: Root builder and guard | CONCERNS | CR3-1 |
| 2–5 | PASS | Unchanged since gate 2, apart from CR2-3 and CR2-4 |

---

## Success Criteria Verification

Unchanged from QA report 2 except as follows. Criterion 1: the static half is weakened by CR3-1, while the runtime half (`fenceRoot` refusal) and the watched run are unaffected. Criterion 7: `ci:fast` gives 7114 pass, 0 fail, ratchet ok, at `951f9cbe`. `criteria-drift.js`: clean. Boundary signals: none. CHANGELOG cites task 250.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (CR3-1), LOW: 1 (CR3-3); plus 1 advisory (CR3-2).

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR3-1: the guard can still miss a write without failing.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
### Maintainability — PASS

---

## Code Review

Two findings promoted under `code_review_blocking`: CR-1 → TASK-250-CR3-1 and CR-3 → TASK-250-CR3-3.

**Correctness bugs (3):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:8115`: a division after a literal or a comment is taken as a regex start → decide from the last significant token. **Reproduced.**
- [medium/medium] `shared/resources/tests/security-probe.test.mjs:8183`: a masked cap, not an exact set → pin the exact masked set.
- [low/high] `shared/resources/tests/security-probe.test.mjs:8348`: the division calibration row is vacuous for CR3-1 → add a closing division and a write.

**Cleanups (0).**

Provenance: all three are in code this branch added in cycle 2.

mutation-proven: argument split on the raw source → calibration → covered
mutation-proven: regex-literal handling disabled → calibration → covered
mutation-proven: unparsed push removed → calibration → covered
mutation-proven: `T250_ALLOWED` count 1→2 → guard → covered
mutation-proven: `T250_MAX_MASKED` 8→3 → guard → covered

These ran during qa-fix cycle 2 on the bytes now at HEAD (`git diff --quiet HEAD`): 5 of 5.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-250-CR3-1 and TASK-250-CR3-3.

### Short-term Actions (Non-Blocking)
1. CR3-2: pin the exact masked set.
2. Pre-existing on develop: 5 create-before-`try` sites (named in the gate).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-250-CR3-1 fixed and re-gated

**Next Steps**: `/qa-fix` cycle 3.
