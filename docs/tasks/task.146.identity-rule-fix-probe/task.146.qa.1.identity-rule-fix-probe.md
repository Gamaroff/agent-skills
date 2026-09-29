# QA Report: Task 146 - qa-fix: a fix to an identity rule must prove both directions

**Task**: [task.146.identity-rule-fix-probe.md](./task.146.identity-rule-fix-probe.md)
**Gate File**: [task.146.gate.1.identity-rule-fix-probe.yml](./task.146.gate.1.identity-rule-fix-probe.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are in place and every stated success criterion holds. The qa-fix table, the refute
paragraph in both skills and the parity test all pass, and 3 of 3 QA mutations turned red the test
they were aimed at. The diff review found two medium defects that this change introduces. A sibling
description of the cycle-2 refute directive in `shared/resources/code-review-prompt.md` is now
incomplete. And the new four-bullet assertion has a vacuous path: a fifth bullet placed after the
paragraph passes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-1 and QA-2)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4, 11/11 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#488, head `2ce19e93`)

### Testing Approach

- [x] Automated Testing (unit)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, with one read-only Explore subagent for the Step 3b diff review. This is a first
review of a small, low-risk prose change set: three SKILL.md edits, one test and a CHANGELOG entry.
Traceability mapper: skipped, because the Success Criteria are a checklist, not a table.
Step 4b: fired (all three SKILL.md files hold fenced bash blocks); see Code Review.

---

## Implementation Verification

| Phase                         | Status   | Test Result | Notes                                                                                                                                         |
| ----------------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1: qa-fix Step 3.5      | PASS     | Verified    | Table, trigger list and real-call-site rule present, citing obs #169. The worked example matches the task.144 record (four of five cycles plus the PR review) |
| Phase 2: refute directive     | CONCERNS | Verified    | Paragraph present and byte-identical in both. QA-1 (sibling description stale) and QA-3 ("this shape")                                        |
| Phase 3: test                 | CONCERNS | Verified    | 6/6 green; parity, presence and floor mutation-proved. QA-2: the count assertion has a vacuous path                                           |
| Phase 4: docs and validation  | PASS     | Verified    | CHANGELOG cites (task 146); ci:fast, format:check, bundle --check and check:generated all clean                                             |

**Overall Phase Completion**: 4/4 delivered; 2 carry findings.

---

## Success Criteria Verification

| Criterion                                                                                     | Target      | Actual                                                         | Status   |
| --------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- | -------- |
| qa-fix Step 3.5 carries the identity-rule table, trigger, real-call-site rule, obs #169        | present     | present                                                        | PASS     |
| Both REFUTE PASS blocks carry the paragraph outside the four-transition list, byte-identical   | yes         | yes (`cmp` identical; list holds 4 bullets)                    | PASS     |
| The test fails on drift, removal, the entry moving into the list, or a table row removed      | red on each | red on each named mutation; **not** red on a 5th bullet after the paragraph (QA-2) | CONCERNS |
| Test runs < 1s, no network                                                                   | < 1s        | ~0.2s, file reads only                                         | PASS     |
| Every new assertion mutation-proved                                                          | yes         | yes (develop M1–M6, M3b, M3c; QA re-proved 3)                  | PASS     |
| ci:fast, format:check, bundle --check clean                                                   | clean       | clean (4010 tests, 0 fail)                                     | PASS     |
| CHANGELOG `[Unreleased]` cites (task 146)                                                     | yes         | yes                                                            | PASS     |
| Implementation report records the worked application                                          | yes         | yes, run against historical code at `5f553950` / `ef1ed9d6`    | PASS     |

---

## Breaking Changes Validation

None documented, and none found: the change adds QA guidance and a test.

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue QA-1: sibling description of the refute directive is incomplete**
- **Severity**: MEDIUM · **Category**: Quality (documentation consistency)
- **Observation**: `shared/resources/code-review-prompt.md:236` (and its bundled copies) lists what
  the cycle-2 refute pass probes as the four transitions only. The directive now also carries
  Identity rules.
- **Impact**: a reader of the shared contract is told the refute pass is lifecycle-only. This is the
  defect class that qa-fix Step 3.5's documentation probe (obs #21) exists to catch.
- **Recommendation**: one clause in that bullet naming the identity pair, then `npm run bundle`. The
  task's out-of-scope line (no identity probe in the *general* reviewer) is unaffected.
- **Priority**: P2

**Issue QA-2: four-bullet assertion passes with a fifth bullet after the paragraph**
- **Severity**: MEDIUM · **Category**: Quality (test vacuity)
- **Observation**: the count spans intro → Identity paragraph only. QA mutation: a fifth `•` bullet
  inserted between the paragraph and *Review the COMBINATION*, in both blocks, gave 6/6 green. The
  blocks were restored and `git status` is clean for `skills/`.
- **Impact**: "four" can become false with the test that holds it still green.
- **Recommendation**: count every `•` bullet in the block; mutation-prove with the placement above.
- **Priority**: P2

### LOW Severity Issues (1)

**QA-3**: "at least one real defect of this shape" now follows the Identity rules paragraph, and its
referent drifts. Name the subject in both blocks with one script.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
The new test file runs in ~0.2s with pure file reads.

### Reliability — PASS
The extraction floors fail loudly on a renamed fence (M5), so a missing block cannot pass as two
equal empty strings.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary in the change set (`boundary: false`: nothing accepts or rejects input), no input
  handling, no secrets.

### Maintainability — PASS
The change is clear and cited, and one script applied it to both twins. Findings are tracked in
`top_issues`.

---

## Code Review

Step 3b: an Explore subagent reviewed the full branch diff (828 lines, 9 files) and returned in about
75s. Blocking resolution: `code_review_blocking=true` (pipeline). No finding was `bug` +
`confidence: high`, so none was promoted automatically. QA verified all three and entered them as QA
findings.

**Correctness bugs (2):**
- [medium/medium] `skills/qa-task/SKILL.md:444` — CR-1: the sibling cycle-2 description in `code-review-prompt.md` omits identity rules → **QA-1** (verified by reading `shared/resources/code-review-prompt.md:228-242`)
- [low/medium] `skills/qa-task/SKILL.md:448` — CR-2: the "this shape" referent drifts → **QA-3**

**Cleanups (1):**
- `tests/identity-rule-probe.test.js:94` — CR-3: the count misses bullets after the paragraph → **QA-2** (mutation-verified: no red)

**Boundary rule**: `boundary: false`. The change set delivers no function that accepts or rejects input.

**Provenance (5b)**: all three are attributable to this diff; none exists on base.

**Step 4b (runnable prose)**: engine run over all three changed SKILL.md files under bash and zsh.
Each reports `zero-blocks-executed` (qa-fix 2 placeholder / 6 mutating; qa-task 3 / 14; qa-story
4 / 11). The result is **identical on `origin/develop`**, and the diff changes no fence line
(`git diff … | grep -c '^[+-].*```'` = 0), so it is **pre-existing**. It goes to
`recommendations.future`, not to `top_issues`.

**Mutation spot check (3c):**
- mutation-proven: fifth transition bullet before the paragraph, both blocks → "sits outside the four-transition list" ×2 → covered
- mutation-proven: qa-story block edited alone → "one refute directive, byte for byte" → covered
- mutation-proven: qa-fix "Which direction" row renamed → "qa-fix Step 3.5 probes both directions" → covered
- mutation-proven: fifth bullet **after** the paragraph, both blocks → none → no-red-untested (QA-2)

**Platform variance**: not applicable. The test resolves paths from `__dirname`, with no
environment-derived value passed to a validating consumer.

---

## Regression Testing

`command node --test tests/identity-rule-probe.test.js 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js'`
gave 36/36. Develop's `npm run ci:fast` gave 4010 tests, 0 fail. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/identity-rule-probe.test.js 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js'
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/{qa-fix,qa-task,qa-story}/SKILL.md --json
git show origin/develop:skills/<n>/SKILL.md   # Step 4b provenance
```

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-1: add the identity pair to the cycle-2 description in `shared/resources/code-review-prompt.md`, then bundle.
2. QA-2: count every bullet in the block; mutation-prove the after-paragraph placement.

### Short-term Actions (Non-Blocking)
1. QA-3: name the subject of "this shape" in both blocks.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium findings introduced by this diff; no HIGH; all NFRs PASS.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-1 and QA-2 fixed.

---

**Next Steps**: `/qa-fix` cycle 1, then re-review (cycle 2, full-diff refute pass).
