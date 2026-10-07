# QA Report: Task 166 - Give measured non-functional criteria a defined path through review and finalise (cycle 2)

**Task**: [task.166.measured-non-functional-criteria.md](./task.166.measured-non-functional-criteria.md)
**Gate File**: [task.166.gate.2.measured-non-functional-criteria.yml](./task.166.gate.2.measured-non-functional-criteria.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate.1](./task.166.gate.1.measured-non-functional-criteria.yml) CONCERNS 80/100, five open entries. Fix commit `6b89fef3`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (medium) check 4 restates the kind count | FIXED | Check 4 names the kinds and counts none; pin "check 4 names every test-free kind…" red on a restored count word (QA re-read of the qa-fix mutation log) |
| CR-2 (medium) bound rule flags a bound pinned by a planned test | PARTIAL | The check 4 rule now accepts a planned per-PR test, but four other statements of the rule were not updated (CR2-1), and the missing-bound case still ignores a planned test (CR2-2) |
| CR-4 (low) hardcoded "three" in the closing pin | FIXED | Derived from the heading word |
| CR-5 (low) unbounded measured slice | FIXED | Slice ends at the next kind bullet; mutation moving a phrase into a later kind goes red |
| CR-6 (low) FAIL clause vs definition | FIXED in the prompt — but the CHANGELOG and SC 1 still state the old outcome (CR2-3) |

---

## New Findings This Cycle

- **[medium]** `skills/review-task/SKILL.md:1155` — the Issues to Flag line, its pin (`tests/review-task-measured-criterion.test.js:150`), `CHANGELOG.md:258` and task SC 3 still state the pre-fix bound rule → reword every statement (TASK-166-CR2-1; reviewer confidence high)
- **[medium]** `skills/review-task/SKILL.md:1125` — "Missing the bound" raises Important even when a planned per-PR test holds the criterion, which finalise passes after CR-6 → one rule: held by a test, or by bound + command (TASK-166-CR2-2)
- **[medium]** `CHANGELOG.md:255` — "an unbounded criterion stays FAIL", and task SC 1 "An unbounded criterion is FAIL", contradict the shipped prompt → "fails unless a per-PR test holds it" (TASK-166-CR2-3)
- **[low]** `tests/review-task-measured-criterion.test.js:112` — label and prose normalised differently; bare `includes()` (TASK-166-CR2-4)
- **[low]** `tests/review-task-measured-criterion.test.js:130` — count regex misses digits and stacked qualifiers; refuses "both kinds of evidence" (TASK-166-CR2-5)
- **[low]** `tests/review-task-measured-criterion.test.js:6` — header comment counts the kinds (TASK-166-CR2-6)

---

## Executive Summary

Cycle 1 fixed the rule it edited and left four other statements of that rule saying the old thing, and a fifth (the CHANGELOG's FAIL claim) contradicting the new prompt. This is the restatement drift the task itself exists to stop, now inside its own deliverable. No HIGH findings; three medium.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR2-1, CR2-2, CR2-3 resolved

---

## Testing Scope

### Review Methodology

Direct tools plus one Explore subagent for the diff review, run as the cycle-2 **refute pass** over the whole branch diff (`origin/develop...HEAD`, 14 files). Reviewer duration: 167.1s (completion notice `duration_ms`).

```
Re-review scope: unscoped (cycle 2 refute pass — whole branch diff, 14 files)
```

`SAFETY_REPROBE`: false — gate.1 security `PASS` / `reasoned`; no safety finding in `top_issues[]`.

Step 4b: unchanged from cycle 1 — the AC prompt has no fenced bash; review-task SKILL.md `zero-blocks-executed` is pre-existing (identical on `origin/develop`).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: AC prompt | PASS | CR-6 wording in; the prompt is internally consistent |
| Phase 2: review-task check 4 | CONCERNS | CR2-1, CR2-2 |
| Phase 3: Pins | CONCERNS | Pin holds the stale Issues to Flag wording (CR2-1); CR2-4/5/6 |
| Phase 4: Proof and gates | CONCERNS | CHANGELOG claim (CR2-3) |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC 1 three kinds; measured bar; unbounded → FAIL | CONCERNS | The criterion's own wording now overstates the shipped rule (CR2-3) |
| SC 2 closing sentence covers all kinds | PASS | |
| SC 3 review-task flags unbounded non-functional | CONCERNS | Wording and Issues to Flag line stale (CR2-1, CR2-2) |
| SC 4 obs #204 kind covered | PASS | |
| SC 5 behaviour-without-test and post-merge rules | PASS | |
| Performance: each pin < 1s | PASS | ~0.3s |

---

## Breaking Changes Validation

None. PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 3 — detailed under New Findings This Cycle and in the gate.

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` — no accept/reject function added; candidates considered: `acKinds`, `check4`, `kindsSection` (test helpers slicing repository text).

### Maintainability — CONCERNS
The bound rule is stated at five sites; cycle 1 updated one.

---

## Code Review

Refute pass. Run-level `code_review_blocking=true`: CR2-1 is `bug` + `confidence: high` and is promoted automatically. CR2-2 to CR2-5 were confirmed by QA against the source (grep of each quoted string, see Test Commands) and entered as QA findings.

**Correctness bugs (5):**
- [medium/high] `skills/review-task/SKILL.md:1155` — stale bound wording at four sites (TASK-166-CR2-1)
- [medium/medium] `skills/review-task/SKILL.md:1125` — missing-bound case ignores a planned test (TASK-166-CR2-2)
- [medium/high] `CHANGELOG.md:255` — unconditional FAIL claim (TASK-166-CR2-3)
- [low/medium] `tests/review-task-measured-criterion.test.js:112` — asymmetric normalisation (TASK-166-CR2-4)
- [low/low] `tests/review-task-measured-criterion.test.js:130` — count regex gaps (TASK-166-CR2-5)

**Cleanups (1):**
- `tests/review-task-measured-criterion.test.js:6` — header counts the kinds (TASK-166-CR2-6)

---

## Regression Testing

Both pins 10/10. CI on `6b89fef3`: link-check, validate, shellcheck pass; test pending (informational).

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test --test-reporter=tap shared/resources/tests/finalise-dod-ac-kinds.test.mjs tests/review-task-measured-criterion.test.js
grep -n "no numeric bound" skills/review-task/SKILL.md CHANGELOG.md tests/review-task-measured-criterion.test.js docs/tasks/task.166.measured-non-functional-criteria/task.166.measured-non-functional-criteria.md
grep -n "unbounded criterion" CHANGELOG.md docs/tasks/task.166.measured-non-functional-criteria/task.166.measured-non-functional-criteria.md
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` — sweep every statement of the bound rule and the unbounded outcome, consolidating where possible.
