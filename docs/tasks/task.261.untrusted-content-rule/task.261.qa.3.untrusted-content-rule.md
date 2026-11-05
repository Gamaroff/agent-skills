# QA Report: Task 261 - Untrusted-content rule

**Task**: [Link to task document](./task.261.untrusted-content-rule.md)
**Gate File**: [task.261.gate.3.untrusted-content-rule.yml](./task.261.gate.3.untrusted-content-rule.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-05
**Gate Status**: PASS

---

## Executive Summary

Both gate 2 findings are fixed. The scoped review of the cycle 2 fix found two low-severity test-hardening items and one cleanup. None is high-confidence at medium or above, so none enters the gate.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Cycle 3 review scoped to the 11 files changed since gate 2 (head e0d5e019): 1181 patch lines. The Step 3b reviewer ran as an independent read-only Explore subagent (dispatched 07:23:10Z, returned in 126 s by its reported duration). It ran the old and new `markerLines` over every `skills/*/SKILL.md` and `shared/resources/*.md` file and found no file whose hit set differs. I did not mutate the tree while it ran.

Re-review scope: files changed since gate 2 (head e0d5e019; 11 files) — default.

CI on ab45a4b0: pending when read. Nothing in the gate changes; `/finalise` gates CI once on the final commit.

---

## Re-Review Context

| Gate 2 issue | Status | Evidence |
| --- | --- | --- |
| T261-QA-2: fence toggle ignores character and length | ✅ FIXED | `markerLines` tracks `{ch, len}` and closes only on a matching fence of at least that length with nothing after it. Controls cover nested, longer and unclosed fences. The reviewer's tree-wide run shows no change in hit sets. |
| T261-QA-3: CHANGELOG entry missing | ✅ FIXED | `changelog-cites.sh task.261` answers `cites (task 261)`. |
| CR-2 (advisory): rule doc allows a configured root | ✅ FIXED | Rule doc line 34 now says the `docs/` root only. |
| CR-3 (advisory): missing bound cases, no identity check | ✅ FIXED | Four hostile cases and one dotted-name case added; a test asserts the three bound blocks are byte-identical. |

---

## New Findings This Cycle

- **[low]** `tests/untrusted-content-rule.test.js:98` — the fence regex ends in `(.*)$`; `.` does not match a carriage return, so on CRLF text fence lines are missed. No file in the repository has CRLF (checked), so this is latent. Advisory (CR-1).
- **[low]** `tests/untrusted-content-rule.test.js:362` — hostile path cases assert only status 1 and `/HALT/`, not which guard fired. Advisory (CR-2). Reviewer anchor was 360; the real line is 362.
- **[cleanup]** `tests/untrusted-content-rule.test.js:335` — block extraction is duplicated (CR-3).

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Rule doc, six headings | test "carries the six headings" | PASS |
| Every read site cites the rule | lint test, 34 of 34 pass | PASS |
| Path outside docs/ HALTs, with test | 3 sites x accepted / rejected (8 bad paths) / dotted / empty | PASS |
| Removing a citation turns the test red | proved in cycle 1 | PASS |
| `bundle:check` clean | clean in cycle 2; bundled copies regenerated in ab45a4b0 | PASS |
| CHANGELOG entry citing the task | `changelog-cites.sh`: cites (task 261) | PASS |
| Criteria unchanged since review | `criteria-drift.js`: clean | PASS |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (advisory), plus 1 cleanup.

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The path bound is exercised by committed tests at all three sites. Symlinks inside `docs/` and a non-`docs/` PRD root remain uncovered; the rule doc states `docs/` only.
### Maintainability — PASS
The identity test now holds the three bound blocks together.

---

## Code Review

**Correctness bugs (2, both low/medium, advisory):**
- [low/medium] `tests/untrusted-content-rule.test.js:98` — CRLF defeats the fence regex → use `([^\n]*)$`.
- [low/medium] `tests/untrusted-content-rule.test.js:362` ⚠️ unverified anchor (reviewer said 360; real line 362) — assertion does not distinguish the two guards → assert the expected message per path.

**Cleanups (1):**
- `tests/untrusted-content-rule.test.js:335` — duplicated block extraction → add a helper.

Boundary: the path bound is probed by committed tests; `boundary: false` for the entry forms (no heading to reach). No mutation proofs were run this cycle: the fence-tracking guard's controls were added in ab45a4b0, and mutation-proving them is recorded as not run.

mutation-proven: fence tracking by character and length → not run this cycle → not-run

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test tests/untrusted-content-rule.test.js tests/bundled-links.test.js   # 34 pass, 0 fail
bash .agents/skills/qa-task/references/changelog-cites.sh task.261                      # cites (task 261)
node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # clean
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED
