# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Task**: [Link to task document](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.7.qa-reentry-after-finalise-gaps.yml](./task.170.gate.7.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-04
**Testing Completed**: 2026-10-04
**Gate Status**: PASS

---

## Executive Summary

Cycle 7 is the QA re-entry after the Step 7 DoD-gaps halt. It gates the one code change since gate 6: commit `3008d0d7`, which parenthesises a `case` pattern inside `$(...)` so `reenter-qa-after-finalise.sh` parses under macOS `/bin/bash` 3.2 (DoD gap 1). The fix holds, the new parse case is mutation-proven, and no other shell script on the branch fails under bash 3.2.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Source | Status |
| --- | --- | --- |
| DoD gap 1 — script fails to parse under `/bin/bash` 3.2 | `task.170.dod.1` | FIXED — `3008d0d7`; parse case red on revert |
| DoD gap 2 — probe zero-guard | `task.170.dod.1` | Operator decision 2026-10-04: unverified by the engine (task.130 precedent); follow-up task.181 (#564). No code change |
| Gate 6 CR-1 (report-ahead in-flight-gate sentence, low) | gate 6 | Carried — `recommendations.future` |
| Gate 6 CR-2 / CR-3 (advisory) | gate 6 | Carried — `recommendations.future` |

## New Findings This Cycle

- **[low/cleanup]** `shared/resources/reenter-qa-after-finalise.test.sh:319` — the bash 3.x guard checks parse only (`/bin/bash -n`); every runtime case runs the PATH bash, so a bash-4-only runtime construct would still pass on macOS → run the accept and refusal cases under `/bin/bash` where it is 3.x. Advisory (CR-1).

Searched beyond the fix: every `.sh` file the branch changes (10 files) parses under `/bin/bash -n` 3.2.57; the reviewer also parsed all 334 tracked `.sh` files under 3.2 with no failure.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#563)

### Review Methodology

Direct tools plus one read-only diff reviewer (Explore), dispatched 2026-10-04T06:16:30Z, returned 2026-10-04T06:18:53Z (`duration_ms` 103317).

Re-review scope: files changed since gate 6 (head d0617e342e1f; 11 files) — default

`SAFETY_REPROBE=false` (clause 1 false; the prior security verdict was PASS and the delta does not touch the refusal predicate).

Step 4b: not applicable — no `SKILL.md` or `shared/resources/*.md` with fenced bash changed since gate 6.

**Measurement note.** The reviewer reported one `/bin/bash -n` run that failed and passed on recheck. That was this cycle's mutation proof (Step 3c), which reverted the fix in the working tree for the length of one suite run. The file was restored from a `cp` snapshot and `git status` was clean afterwards. The reviewer's final reading is of the committed content.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1–3 (as gated in cycles 1–6) | PASS | Verified | Unchanged since gate 6 except the parse fix |
| DoD gap 1 fix (`3008d0d7`) | PASS | Verified | Source and both bundled copies identical apart from the generated header |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Re-entry suite | all pass | 53/53 (bash 5.3.9); 53/53 (bash 3.2.57 first on PATH) | PASS |
| Refusal-route parity | all pass | 5/5 | PASS |
| shellcheck `--severity=warning` | clean | clean | PASS |
| Bundle freshness | 0 problems | 129 skills, 0 problems | PASS |
| `npm run validate` (develop-task, develop-story) | pass | pass | PASS |

The re-entry script was also exercised live on this run: it lowered the lock from step 7 to step 5 / `qa_phase: 5a`, with `qa_max_cycles=8` (base 6) and `gate_head=d0617e34`.

---

## Breaking Changes Validation

None. The fix changes syntax only; behaviour under bash 5 is unchanged.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (advisory cleanup)

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
The script now runs on the stock macOS bash that the orchestrators call it with.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The refusal predicate is unchanged. The eight hostile `head:` cases in the suite pass under both bashes. Recorded as unverified by the engine, per the operator decision of 2026-10-04 (task.181 closes the engine gap).

### Maintainability — PASS
CR-1 (cleanup) only.

---

## Code Review

**Correctness bugs (0).**

**Cleanups (1):**
- `shared/resources/reenter-qa-after-finalise.test.sh:319` — the bash 3.x guard checks parse only → run the runtime cases under `/bin/bash` 3.x as well.

`boundary: true` (shell script that refuses), unchanged since cycle 1. The engine probe is recorded as unverified by the engine, per the operator decision.

mutation-proven: unparenthesised `"$p".*)` restored in `reenter-qa-after-finalise.sh` → `bash 3.2 parse` case → covered (52/53 red; 53/53 after restore)

---

## Regression Testing

| Area | Result |
| --- | --- |
| All branch `.sh` files under `/bin/bash -n` 3.2 | PASS (10/10) |
| Fast gate (`npm run ci:fast`) | See the implementation report's QA Cycle 7 entry |

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
PATH="<dir with /bin/bash as bash>:$PATH" /bin/bash shared/resources/reenter-qa-after-finalise.test.sh
command node --test evals/shared/tests/reenter-qa-refusals-parity.test.mjs
shellcheck --severity=warning shared/resources/reenter-qa-after-finalise.sh shared/resources/reenter-qa-after-finalise.test.sh
npm run bundle -- --check
npm run validate -- skills/develop-task/
npm run validate -- skills/develop-story/
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The one code change since gate 6 is correct, tested under the interpreter it targets, and mutation-proven. No open findings.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: 5c `/review-pr`, then `/finalise` re-runs over the gated head.
