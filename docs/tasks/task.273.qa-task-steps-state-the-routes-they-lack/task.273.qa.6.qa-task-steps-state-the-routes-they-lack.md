# QA Report: Task 273 - qa-task steps state the routes they lack (cycle 6)

**Task**: [Link to task document](./task.273.qa-task-steps-state-the-routes-they-lack.md)
**Gate File**: [task.273.gate.6.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.6.qa-task-steps-state-the-routes-they-lack.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: PASS

---

## Executive Summary

The cycle-5 finding is fixed. The reviewer confirmed both rewritten gate-decision notes and swept the other consumers; it found two LOW wording residues, which stay open as LOW entries.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T273-CR-4 — gate-decision note omits the 5d exception | ✅ FIXED | both notes now open with the reviewer claim, name both ways blocking resolves to true, and carve out 5d for the whole note; they agree with the Resolution matrix |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer, which checked the two rewritten notes and then swept the QA skills, the review prompt, `qa-fix`, the develop skills and the reference docs.

Diff review: code review (prose in two SKILL.md files).
Re-review scope: files changed since gate 5 (head b873e8cc3ae1; 2 files), widened by the reviewer's sweep.
Step 4b: not applicable — no fenced bash block was added.
CI on 6bb434f8: not read (pushed minutes ago; `/finalise` gates CI on the final commit).

---

## New Findings This Cycle

- **[low]** `shared/resources/code-review-prompt.md:96` — "confidence: low (it will not gate)" is unqualified; a reproduced bug gates at any confidence. Gate entry T273-CR-5.
- **[low]** `skills/qa-task/SKILL.md:1622` (also 1936, and `skills/qa-story/SKILL.md` 1867 and 2479) — the report-template lines say "advisory unless the doc opted in ... or QA reproduced the finding", which ignores the run-level arg. Gate entry T273-CR-6.

Both verified by reading the lines.

---

## Success Criteria Verification

Unchanged from cycle 1, apart from the consistency note in the cycle 2 report. The routes are now stated consistently in the places that decide a gate; two LOW wording residues remain.

---

## Issues Found

### LOW Severity Issues (2)

- T273-CR-5: unqualified "it will not gate" in the review prompt.
- T273-CR-6: four report-template lines ignore the run-level arg.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

Security PASS (reasoned, 0 probes; no boundary), Performance PASS, Reliability PASS, Maintainability PASS.

---

## Code Review

**Correctness bugs (2):**
- [low/high] `shared/resources/code-review-prompt.md:96` — gate entry T273-CR-5 (low severity, open).
- [low/high] `skills/qa-task/SKILL.md:1622` — gate entry T273-CR-6 (low severity, open).

**Cleanups (0).**

No mutation proof this cycle: the fix is prose.

---

## Regression Testing

`CI=true npm run ci:fast` exit 0 on 6bb434f8 (8102 pass, 0 fail), run by qa-fix before the commit.

---

## Performance re-measure on the PR head (added during `/finalise` run 1, 2026-11-09)

The cycle-1 timing was taken at 30da588c, before three later code changes, so `/finalise` asked for it again on the head. Five alternating `CI=true npm test` runs on the laptop, `develop` at 22f13cce against the PR head cb2bf8dc, every run exit 0:

| Run | develop | head | load average at start (develop / head) |
|---|---|---|---|
| 1 | 164 s | 167 s | 0.49, 0.31, 0.39 / 5.11, 2.16, 1.06 |
| 2 | 164 s | 167 s | 6.70, 3.50, 1.70 / 4.25, 3.57, 2.01 |
| 3 | 193 s | 190 s | 4.74, 3.75, 2.31 / 7.39, 5.19, 3.10 |
| 4 | 218 s | 207 s | 6.86, 5.26, 3.46 / 7.80, 6.05, 4.11 |
| 5 | 211 s | 166 s | 6.91, 6.09, 4.47 / 5.07, 5.38, 4.49 |

**Median: develop 193 s, head 167 s (head 13% faster).** The head is not slower than `develop`, so the 10% bound holds. The spread (164 to 218 s) comes from machine load rising during the session (the load figures above), not from the change; the first pair, at the lowest load, reads 164 s against 167 s (+1.8%). An earlier attempt on the LAN server was discarded: every run exited 1 on three environment failures (missing tools) and the server was at load 5 to 20, so its times (450 to 1600 s) were not comparable.

---

## Test Artifacts

### Test Commands Executed
```bash
git diff b873e8cc3ae1cbb6cec3b66d54f74df1c30daec1..HEAD
CI=true npm run ci:fast
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Reword the five lines of T273-CR-5 and T273-CR-6.
2. Add a guard test for the restated rule (see the gate).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no HIGH or MEDIUM finding; the residue is two LOW wording entries.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

**Next Steps**: the cosmetic-residue exit routes to Step 5c (`/review-pr`).
