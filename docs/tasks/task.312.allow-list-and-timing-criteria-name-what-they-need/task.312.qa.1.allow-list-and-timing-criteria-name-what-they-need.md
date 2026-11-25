# QA Report: Task 312 - Allow-list and timing criteria name what they need

**Task**: [Link to task document](./task.312.allow-list-and-timing-criteria-name-what-they-need.md)
**Gate File**: [task.312.gate.1.allow-list-and-timing-criteria-name-what-they-need.yml](./task.312.gate.1.allow-list-and-timing-criteria-name-what-they-need.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-23
**Testing Completed**: 2026-11-23
**Gate Status**: PASS

---

## Executive Summary

Task 312 adds review-task check 32 (an allow-list replacing a deny-list covers the whole set), its review-story sibling, and one timing-statistic sentence in create-task 3.5 and review-task Step 6 check 4. All three phases are present, 9 presence tests hold them, and both mutation proofs went red then green. No correctness bugs found.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#932)

### Testing Approach

- [x] Automated Testing (presence tests, one executes the `uniq` probe)
- [x] Regression Testing (neighbouring review-check tests)
- [x] Code Review (inline pass)
- [x] Mutation proofs

### Review Methodology

Direct tools. The Step 3b diff review was an inline pass by the QA session: no independent reviewer subagent ran, so independence is lost for this cycle. Diff review: code review (the change set holds a `.js` test, so the claim-check route does not apply).

Step 4b: not applicable. The diff adds no fenced bash block to a `SKILL.md`; the changed prose is bullets and one sentence.

CI on aee26acd5d5b: pending (read once, not waited on).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The allow-list check | PASS | Verified | Check 32 (trigger, coverage, probe, worked example, Important, never auto-fix, negative control), pattern bullet, Issues to Flag clause, Anti-Hallucination rule 16, review-story check 20 |
| Phase 2: The timing statistic | PASS | Verified | One sentence in `skills/create-task/SKILL.md` and `skills/review-task/SKILL.md` Step 6 check 4, held by a parity test |
| Phase 3: Bundle, docs and gate | PASS | Verified | `bundle:check` 129 skills, 0 problems; CHANGELOG entry cites task 312; prettier clean |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Check 32 states trigger, coverage rule, Important severity; removing the coverage rule turns the test red | red test named | `check 32 states its trigger, coverage rule, operand probe, example and severity` in `tests/review-allow-list-timing-checks.test.js` went red | PASS | mutation-proven, below |
| Check 32 requires a write-by-operand probe per unaudited member, `uniq in out` as fixture | present | `- Probe:` line quotes `uniq in.txt out.txt`; a test executes it in a temp directory and finds `out.txt` | PASS | |
| create-task 3.5 and review-task check 22 carry the same timing rule | parity | `create-task § 3.5 and review-task check 4 carry the same timing-statistic sentence` | PASS | The sentence sits in review-task Step 6 check 4, the wall-clock note that check 22 points to |
| `bundle:check`, `format:check`, `ci:fast` pass under `CI=true` | pass | `bundle:check` 0 problems; prettier clean; `ci:fast` 8733 pass / 0 fail on the LAN server at the develop run | PASS | `ci:fast` was not re-run this cycle: no file changed since |
| `quick_validate.py` passes for the three skills | pass | review-task, review-story, create-task all ✓ | PASS | |
| CHANGELOG entry citing task 312 | present | `changelog-cites.sh task.312` → `cites (task 312)` | PASS | |

criteria-drift: `clean`. `boundary_signals: []` (probe-boundary-signals.mjs).

---

## Breaking Changes Validation

None documented, none introduced. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (1)

- The timing sentence is one long unwrapped line in `skills/review-task/SKILL.md` Step 6 check 4 and in `skills/create-task/SKILL.md`, where neighbouring prose wraps at about 100 columns. Cosmetic; prettier does not wrap prose. Not worth a fix cycle.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
No runtime path changes.

### Reliability — PASS
Both mutations are caught by a committed test, and each revert is byte-identical (`cmp` printed nothing).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No boundary function is added. The one executed command, `uniq in.txt out.txt`, runs in a `mkdtemp` directory removed in `t.after`.

### Maintainability — PASS
Check 32 carries the same three companion edits as check 31, found by name, not by number, in the test.

---

## Code Review

Inline pass over the full branch diff (first review, so whole diff).

**Correctness bugs (0):** none. Checked: the test's `itemByName` end-of-item regex stops at the `**Common Hallucination Patterns to Detect**:` line (verified by the passing coverage assertions, which would otherwise read into the next section); the Anti-Hallucination rule label `Allow-List Verification` matches the sibling regex; `28` in "left the other 28" is 31 − 3, as stated.

**Cleanups (1):**
- `skills/review-task/SKILL.md` Step 6 check 4 — the added sentence is not wrapped, unlike the lines around it → wrap it. Advisory.

Platform variance: the new test runs under `TMPDIR=/tmp` as well, 9 of 9 pass (it takes its temp path from `os.tmpdir()` and validates nothing against it).

mutation-proven: check 32's coverage rule reworded from "every member" to "some members" → `check 32 states its trigger, coverage rule, operand probe, example and severity` → covered
mutation-proven: the paired-ratio clause removed from `create-task` 3.5 → `create-task § 3.5 and review-task check 4 carry the same timing-statistic sentence` → covered

Both proofs ran with nothing else reading the tree, restored from a `cp` snapshot; `git status --porcelain` is as it was at the start of the step.

probes_executed: 0 (boundary: false; no predicate-shaped function is added: the test helpers `itemByName` and `read` accept nothing and reject nothing)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `tests/review-run-and-parity-checks.test.js` (7 tests, neighbouring check pattern) | PASS |
| `tests/review-allow-list-timing-checks.test.js` (9 tests) | PASS |
| `bundle:check` | PASS |

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true command node --test tests/review-allow-list-timing-checks.test.js tests/review-run-and-parity-checks.test.js   # 16 pass, 0 fail
TMPDIR=/tmp CI=true command node --test tests/review-allow-list-timing-checks.test.js                                   # 9 pass
python3 skills/create-skill/scripts/quick_validate.py skills/{review-task,review-story,create-task}                     # all ✓
npm run -s bundle:check                                                                                                # 129 skills, 0 problems
./node_modules/.bin/prettier --check CHANGELOG.md tests/review-allow-list-timing-checks.test.js                        # clean
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Optionally wrap the timing sentence (LOW).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is verified by a committed test or a measured command; both mutations go red then green; no bugs found.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.312.qa.1.allow-list-and-timing-criteria-name-what-they-need.md`
**Gate File**: co-located at `task.312.gate.1.allow-list-and-timing-criteria-name-what-they-need.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
