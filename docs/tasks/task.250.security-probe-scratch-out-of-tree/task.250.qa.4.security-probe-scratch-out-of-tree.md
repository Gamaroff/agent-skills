# QA Report: Task 250 - Security-probe tests write no scratch files into the repository

**Task**: [Link to task document](./task.250.security-probe-scratch-out-of-tree.md)
**Gate File**: [task.250.gate.4.security-probe-scratch-out-of-tree.yml](./task.250.gate.4.security-probe-scratch-out-of-tree.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 4: a re-review scoped to the files changed since gate 3's head. Cycle 3's fixes hold. One misread path is left that hides no call name: a phantom regex inside an argument list can merge two arguments, so a three-argument write-at-index-1 call is checked on the wrong argument (reproduced). No such code exists in the file today.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-250-CR3-1 (medium): division after a literal or comment read as a regex | ✅ FIXED | Last-token tracking. With the cycle-2 tokenizer swapped back in, the calibration gives total 16 (expected 18) and lines 27 and 29 move to masked, so it goes red. Mutations: literal not an operand → red; comment resets the token → red. |
| TASK-250-CR3-3 (low): vacuous division calibration row | ✅ FIXED | The rows at lines 27 and 29 go red on the cycle-2 tokenizer (above). |
| CR3-2 (advisory): masked cap | ✅ FIXED | `T250_MASKED` is an exact set. Entry removed → red; stale entry → red. |

## New Findings This Cycle

- **[medium]** `shared/resources/tests/security-probe.test.mjs:8230`: a phantom regex after postfix `++`/`--`, or after a keyword-named property, can blank the comma between arguments. A three-argument `cpSync`, `copyFileSync` or `symlinkSync` is then checked on argument 2. **Reproduced:** `cpSync(i++ / 2, join(REPO_ROOT, "d") / 1, opts);` → found [], total 1, unparsed [], masked []. → **TASK-250-CR4-1**
- **[cleanup]** `:8114`: `/` is not in `OPENS`. → CR4-2

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer, with `duration_ms` 211376 (3.5 min). Both anchors `ok`.

Re-review scope: files changed since gate 3 (head 951f9cbe5e3f; 4 files) — default

`CI on ad5bd4364d46: pending` (read once).

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1: Root builder and guard | CONCERNS | CR4-1 |
| 2–5 | PASS | Unchanged since gate 3 |

---

## Success Criteria Verification

Unchanged from QA report 3, with these updates:
- Criterion 1: CR4-1 weakens the static half. The runtime half is unaffected.
- Criterion 7: `CI=true npm run ci:fast` gives 7114 pass, 1 fail (`ci-tool-skips`: zsh is not installed on the local machine; hosted CI installs it), tmp-leak ratchet ok.
- `criteria-drift.js`: clean. Boundary signals: none.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (CR4-1), LOW: 0; plus 1 cleanup (CR4-2).

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR4-1.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
### Maintainability — PASS

---

## Code Review

One finding promoted under `code_review_blocking`: CR-1 → TASK-250-CR4-1.

**Correctness bugs (1):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:8230`: a phantom regex inside an argument list shifts the write argument → class-level tripwire. **Reproduced.**

**Cleanups (2):**
- `shared/resources/tests/security-probe.test.mjs:8114`: add `/` to `OPENS`.
- The `last` comment omits the `"word"` state.

Provenance: in code this branch added.

mutation-proven: literal not an operand → calibration → covered
mutation-proven: comment resets the last token → calibration → covered
mutation-proven: missing write argument not reported → calibration → covered
mutation-proven: `T250_MASKED` entry removed → guard → covered
mutation-proven: stale `T250_MASKED` entry → guard → covered

These ran during qa-fix cycle 3 on the bytes now at HEAD: 5 of 5.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-250-CR4-1.

### Short-term Actions (Non-Blocking)
1. CR4-2 cleanup.
2. Pre-existing on develop: 5 create-before-`try` sites.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-250-CR4-1 fixed and re-gated

**Next Steps**: `/qa-fix` cycle 4.
