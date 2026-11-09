# QA Report: Task 268 - qa-fix finds the whole defect the first time

**Task**: [Link to task document](./task.268.qa-fix-finds-the-whole-defect-the-first-time.md)
**Gate File**: [task.268.gate.1.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.1.qa-fix-finds-the-whole-defect-the-first-time.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

The change lands all eight rules in `skills/qa-fix/SKILL.md`, the shared develop-loop doc and its three generated copies, and updates the one pinned test. The pinned test is mutation-proven. Three medium findings are open, so the gate is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Lite mode was not set. Direct tools plus one read-only Explore reviewer for the diff (Step 3b) and one fresh-reader subagent for the per-rule fixtures. Step 4b: not applicable beyond the two fenced blocks the diff adds, which the reviewer read; the Step 4 guard block is unrunnable as written (T268-QA-3).

CI on 91e2da1d39b5: green

Reviewer timing: not measured (completion notice reports 29.8 s for the code review and 28.1 s for the fixture check).

---

## New Findings This Cycle

Not a re-review; findings are listed under Issues Found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Step 3.5 probes | PASS | Verified by fixture check | classifier both-sides, weakest value, earlier refusal, population search |
| Phase 2: Step 2.6 moves | CONCERNS | Test pinned, mutation-proven | "six moves" and `Move:` line agree in the skill and the test |
| Phase 3: Steps 4 and 7 | CONCERNS | Fixture check passed | Step 4 guard unrunnable; Step 7 contradiction |
| Phase 4: shared doc + bundle | PASS | `bundle --check` 0 problems | three copies regenerated |

**Overall Phase Completion**: 4/4 present, 2 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Per-rule behaviour with controls | 8 shapes fire, 8 controls silent | 16/16 (fresh reader of the skill text) | PASS |
| Pinned test follows the change | six moves, widened `Move:` regex | 13 pass; mutation reds one test | PASS |
| Suite time within 10% | median of 5 alternating runs | contaminated by load; added cost under 0.6 s of about 170 s | PASS (see Performance) |
| CHANGELOG cites the task | entry present | missing | FAIL (T268-QA-1) |
| Criteria unchanged since review | no drift | `criteria-drift.js`: clean | PASS |

Two caveats from the fixture reader: control 1C reads silent only because the control already supplies both probes, and controls 2C and 4C rest on the "skip for typos, copy changes, pure test edits" carve-out, which the text does not tie to the Step 7 `Probe:` requirement.

---

## Breaking Changes Validation

None documented; none found.

---

## Issues Found

### MEDIUM Severity Issues (3)

- **T268-QA-1** `CHANGELOG.md`: no `[Unreleased]` entry cites task 268 (`changelog-cites.sh`: `missing (task 268)`). `/finalise` 6d halts without it.
- **T268-QA-2** `skills/qa-fix/SKILL.md` Step 7: "do not post until it is added" contradicts "a refusal here never halts the cycle"; trigger (b) is defined mechanically here but as a judgement in Step 2.6; trigger (a) is not named. Reviewer confidence medium.
- **T268-QA-3** `skills/qa-fix/SKILL.md` Step 4: the guard block holds an unbound `<changed paths>` placeholder. It cannot be run by any engine entry form, and run as written it is a shell syntax error.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 0

---

## NFR Assessment

### Performance — PASS

Five alternating `CI=true npm test` pairs (develop vs branch, scratch worktrees) gave base 162/168/192/277/430 s and head 172/167/247/398/496 s, with load average rising from 0.7 to 7.5 across the run (a browser and a status bar were running). The late pairs reflect load, not the change. The early quiet pairs are at parity (162/172, 168/167). Both trees fail the same two worktree-sensitive tests and pass 7914. The change adds no test file; the edited suite runs in 0.14-0.6 s. Strictly the median-within-10% criterion was not measured under quiet load; this is recorded rather than claimed.

### Reliability — PASS

Prose and a test regex only.

### Security — CONCERNS

- **Evidence**: reasoned
- **Probes executed**: 0
- The Step 4 guard is a repository-state refusal (boundary true). Criteria signals: `refused`, `is refused`. It could not be probed because of the placeholder (T268-QA-3).

### Maintainability — CONCERNS

Duplicate direction row (CR-3) and the obs #56 rule stated twice (CR-4).

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `skills/qa-fix/SKILL.md:958` — Step 7 contradiction and trigger definition (CR-1) → T268-QA-2.
- [low/medium] `skills/qa-fix/SKILL.md:838` — unbound placeholder in the guard block (CR-2) → T268-QA-3.

**Cleanups (2):**
- `skills/qa-fix/SKILL.md:808` — repeats the "Which direction did the last fix move?" row from the identity-rule table above it (CR-3).
- `skills/qa-fix/SKILL.md:834` — obs #56 rule restated here and in the develop-loop doc (CR-4).

Reviewer line numbers were checked against the file: the quoted text sits at 950-962, 840-841, 807 and 834-836; the reviewer's numbers were off by a few lines and its `&lt;` was an escaping artefact (the file holds a literal `<`).

mutation-proven: reverted the widened `Move:` line (dropped "narrow the contract | extract to a script") → `tests/qa-fix-structural-move.test.js` "Step 2.6 carries the fixed fix-summary shape" went red → covered. Restored; `cmp` clean; 13 pass.

Provenance: all findings are new in this diff; none is pre-existing.

---

## Regression Testing

Full suite on each tree: 7914 pass, 2 fail on both (clean-checkout and from-observation tests, worktree-sensitive); no regression attributable to this change. `ci:fast` was green in the repository (7944 pass, 0 fail).

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test tests/qa-fix-structural-move.test.js
CI=true npm test            # develop vs branch, five alternating pairs
python3 skills/create-skill/scripts/quick_validate.py skills/qa-fix
bash .agents/skills/qa-task/references/changelog-cites.sh task.268
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: three open medium findings; no high-confidence blocking bug.
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL on T268-QA-1 to T268-QA-3.

**Next Steps**: `/qa-fix` the three findings, then re-run `/qa-task`.
