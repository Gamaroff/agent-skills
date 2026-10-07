# QA Report: Task 187 - Review checks for plan shapes

**Task**: [Link to task document](./task.187.review-plan-shape-checks.md)
**Gate File**: [task.187.gate.1.review-plan-shape-checks.yml](./task.187.gate.1.review-plan-shape-checks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-07
**Testing Completed**: 2026-10-07
**Gate Status**: PASS

---

## Executive Summary

The change adds six plan-shape checks to review-task (Step 3, checks 15–20) and their review-story
twins (Step 4, 11–16), the Step 6 / Step 7 / Step 5 criterion and risk rules, and two tests. All five
phases are present as planned. The 35 new test cases pass and both new suites were mutation-proven.
An independent diff review raised seven findings, all LOW and none high-confidence. They are
advisory, so the gate is not affected.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#593, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit — presence and reach suites)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one dispatched reviewer for Step 3b. The task has 5 phases across 2 skills and
`tests/`, so the default applies (direct tools first; the diff review was the only agent).
Step 3b ran as a general-purpose subagent in read-only mode rather than Explore (project memory
records Explore agents hanging); it returned in 212 s (`duration_ms: 212415` from its completion
notice). First review — whole branch diff `origin/develop...HEAD`, 10 files.

Step 4b ran over both changed `SKILL.md` files (bash and zsh): review-task 0 runnable / 1 placeholder
/ 17 mutating, review-story 0 / 4 / 15 → `zero-blocks-executed` on each. **Pre-existing** (5b
provenance): `git show origin/develop:skills/{review-task,review-story}/SKILL.md` gives identical
counts and the same finding, and the diff adds 0 fenced blocks (`git diff … | grep -c '^+```'` → 0).
Not entered in `top_issues`. Routed to `recommendations.future`, with task.191 as the follow-up.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: review-task Step 3 checks 15–20 | PASS | Verified | Trigger / Worked example / Important on each; not-applicable on 15, 16, 18; 6 pattern lines, Detection Rules 9–14, 3 Questions lines |
| Phase 2: review-task Step 6 and Step 7 | PASS | Verified | Check 4 items under "Two more shapes…", the "Three shapes" intro intact, no count of kinds |
| Phase 3: review-story parity | PASS | Verified | Step 4 checks 11–16; Step 5 items, check 10, check 11; bundle closure +1 |
| Phase 4: test-runner reach guard | PASS | Verified | 227 tracked suites reached; control and mutation cases in-file |
| Phase 5: presence test and changelog | PASS | Verified | 31 cases; CHANGELOG `[Unreleased]` entry |

**Overall Phase Completion**: 5/5 phases passed

---

## Success Criteria Verification

Each criterion classified the way finalise will (`finalise-dod-ac-prompt.md` Step 3): every
Functional criterion is a behaviour criterion held by a committed per-PR test.

**Functional Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| Step 3 checks 15–20 with lines and severity | `review-plan-shape-checks.test.js` per-check cases (green; red when check 17 deleted) | PASS |
| review-story Step 4 checks 11–16 | same test (green; red when check 13 deleted) | PASS |
| Not-applicable lines on 15/16/18 and twins | same test, `notApplicable` assertion | PASS |
| Step 6 check 2 / check 4 items, intro intact, no count | same test Step 6 case (red on a "three test-free kinds" mutation) | PASS |
| Step 7 guard-exemption rule | same test Step 7 case | PASS |
| review-story Step 5 check 10, items, check 11 | same test Step 5 case | PASS |
| Detection Rules and Questions lines | same test pattern/detection/question cases | PASS |
| Reach guard green + in-file glob-removal case | `test-runner-reach.test.js` 4/4; real `package.json` mutation turned it red | PASS |

**Performance**: not applicable (stated in the task); both suites run in under 50 ms.

**Code Quality Criteria:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `npm test`, no existing check renumbered | green | 5446/5449 in `ci:fast`; the 2 failures are the LOAD-SENSITIVE file budgets, green alone; the four sibling presence suites 39/39 | PASS |
| `bundle:check`, prettier | clean | clean | PASS |
| `quick_validate.py` / `npm run validate` both skills | pass | pass | PASS |

**Migration**: CHANGELOG `[Unreleased]` › Added entry present — PASS.

---

## Breaking Changes Validation

None declared; none found. The checks add Important findings to reviews only.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (7)

All from the Step 3b review, advisory (none high-confidence); see Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 7

---

## NFR Assessment

### Performance — PASS
Two new test files, each under 50 ms. No runtime path changed.

### Reliability — PASS
Additive prose. No existing check renumbered (sibling suites unchanged at 39/39).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary rule: `boundary: false`. The change ships prose review checks. The predicate-shaped
  functions it adds are `reach()`, `globToRegExp()` (`tests/test-runner-reach.test.js`) and `itemOf()`
  (`tests/review-plan-shape-checks.test.js`). All three are test-harness oracles, not shipped
  boundaries. None backs an eval assertion about agent behaviour, and none gates an action a shipped
  skill takes, so none is a boundary under the rule.

### Maintainability — PASS
Cleanups CR-4 to CR-7 recorded for follow-up.

---

## Code Review

Advisory: `code_review_blocking=true` resolved, but no finding is `category: bug` with
`confidence: high`, so none was promoted to `top_issues`.

**Correctness bugs (3):**
- [low/medium] `skills/review-task/SKILL.md:1022` — CR-1: checks 18/19 (and the review-story twins)
  say "In this repository …", naming the reach test and the resume contract. Both skills ship to
  consumers, where those files do not exist. → name the agent-skills source repository explicitly
- [low/medium] `tests/test-runner-reach.test.js:47` — CR-2: the population is `git ls-files`, so an
  uncommitted new suite is not scanned locally. → `--cached --others --exclude-standard` plus a
  control case
- [low/medium] `skills/review-story/SKILL.md:1255` — CR-3: check 10 links
  `../review-task/SKILL.md#step-6-…`, a dead link in a single-skill install. → rest it on the bundled
  AC prompt, or an upstream URL

**Cleanups (4):**
- `tests/review-plan-shape-checks.test.js:122` — CR-4: pattern, detection and question lines are matched by number only
- `tests/review-plan-shape-checks.test.js:61` — CR-5: `itemOf` duplicates `citingItemOf`
- `tests/test-runner-reach.test.js:24` — CR-6: `?`, `**` and braces are not handled (none used today)
- `tests/test-runner-reach.test.js:46` — CR-7: the `references/` exclusion is path-only

Mutation proofs:

```markdown
mutation-proven: deleted check 17 (review-task) and check 13 (review-story) in copies → review-plan-shape-checks.test.js floor + per-check cases → covered
mutation-proven: wrote "three test-free kinds" into check 4 in a copy → review-plan-shape-checks.test.js Step 6 case → covered
mutation-proven: removed 'skills/wireframe/tests/*.test.js' from the real package.json (cp snapshot, restored) → test-runner-reach.test.js "every tracked test file" → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| Sibling presence suites (review-property-checks, outcome-reachability, call-site-population, measured-criterion) | 39/39 PASS |
| 10 suites pinning these SKILL.md files (run by the reviewer) | 126/126 PASS |
| Full `ci:fast` | 5446/5449, the 2 failures LOAD-SENSITIVE and green alone |

---

## Test Artifacts

### Files Reviewed
`skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`,
`skills/review-story/references/finalise-dod-ac-prompt.md`, `tests/test-runner-reach.test.js`,
`tests/review-plan-shape-checks.test.js`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test tests/test-runner-reach.test.js tests/review-plan-shape-checks.test.js
npm run validate -- skills/review-task/
npm run validate -- skills/review-story/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-task/SKILL.md --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-story/SKILL.md --json
```

### Coverage Report
Not applicable: prose and test-only change.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1 / CR-3: make the shipped prose consumer-correct, including review-story's link to review-task.
2. CR-2: scan untracked suites in the reach guard.
3. CR-4 to CR-7: test-helper hardening.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: every phase verified; every criterion held by a committed, mutation-proven test; no
finding at MEDIUM or above.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.187.qa.1.review-plan-shape-checks.md`
**Gate File**: co-located at `task.187.gate.1.review-plan-shape-checks.yml`
**Next Steps**: Step 5c PR conformance review (`/review-pr`)
