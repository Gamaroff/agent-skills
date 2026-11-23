# QA Report: Task 288 - Gating-rule restatements carry the reproduced-bug exception

**Task**: [Link to task document](./task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md)
**Gate File**: [task.288.gate.1.gating-rule-restatements.yml](./task.288.gate.1.gating-rule-restatements.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-23
**Testing Completed**: 2026-11-23
**Gate Status**: FAIL

---

## Executive Summary

The prose rewordings and bundling are correct and the full suite is green, but the new guard test has a gap QA reproduced: the four rewritten report-template lines are not keyed, so removing their exception clause leaves the test green.

**Overall Assessment**: FAIL (one high finding, reproduced)
**Deployment Recommendation**: BLOCKED until T288-CR-1 is fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (LAN server `ci:fast`: 8744 pass, 0 fail, 3 skipped)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#934)

### Testing Approach

- [x] Automated Testing
- [x] Performance Testing (test runtime)
- [x] Regression Testing (full suite)
- [x] Code Review (diff reviewer, read-only Explore subagent)

### Review Methodology

First review, whole branch diff. Direct tools plus one read-only diff reviewer. Diff review: code review (the change set holds a `.mjs` test). The patch excluded generated `skills/*/references/` copies (held by `npm run bundle -- --check`, 129 skills, 0 problems) and `docs/`.

Step 4b: ran `qa-execute-snippets.mjs` over the seven changed prose files with `--diff-base`: changed blocks 0 in every file (the edits are in template fences and prose, not bash blocks), no findings.

CI_SUMMARY: not read at this point; CI is gated once at `/finalise`.

Re-review scope: not applicable (first review).

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reword CR-5 and CR-6 | PASS | Verified | `code-review-prompt.md:96`; four template lines in `qa-task` and `qa-story` |
| Phase 2: other restatements | PASS | Verified | Nine sentences reworded; seven reasoned exemptions (one disputed, CR-2) |
| Phase 3: guard test | CONCERNS | Verified | Test passes and is mutation-proven for two of three mutations by construction; T288-CR-1 |

**Overall Phase Completion**: 2/3 clean, 1 with a finding

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `code-review-prompt.md` no longer says "it will not gate" unqualified | none | `:96` reads "(it will not gate on the reviewer claim alone)" | PASS |
| None of the four template lines says "advisory unless the doc opted in" without the run-level arg | 0 | 0 (4 lines read "blocking resolves to true (run-level arg or frontmatter) or QA reproduced the finding (5d)") | PASS |
| Guard passes on the tree and fails on each of the three mutations | 3 of 3 | Develop recorded 3 of 3 red. QA found a fourth mutation, dropping the 5d clause from a template line, that stays green | CONCERNS |
| Test runs in under 2 s | under 2 s | median 0.40 s (0.386 to 0.459 s, five runs, load 4.1 to 6.1) | PASS |
| `CI=true npm test` and `npm run bundle -- --check` pass | pass | 8744 pass, 0 fail on the LAN server; bundle check 0 problems | PASS |
| Every exemption carries a reason and names an existing sentence | yes | Held by the test; one reason is disputed (CR-2) | CONCERNS |
| `CHANGELOG.md` cites `(task 288)` | yes | `changelog-cites.sh`: `cites (task 288)` | PASS |
| Criteria drift | clean | `criteria-drift.js`: clean | PASS |

---

## Breaking Changes Validation

None documented, none introduced.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T288-CR-1 - four template lines are not keyed by the guard test**
- **Severity**: HIGH
- **Category**: Quality (test coverage)
- **Observation**: See Code Review. Reproduced by QA.
- **Impact**: The T273-CR-6 assertion can only fire on a regression to the old flag-naming wording. A later edit that drops the 5d clause from a template line, the same defect task 273 shipped, is not caught.
- **Recommendation**: Key the phrase "advisory unless" and require the exception marker on every such sentence.
- **Priority**: P1

### MEDIUM Severity Issues (0)

None entered in the gate. CR-2 and CR-3 are advisory (see Code Review).

### LOW Severity Issues (1)

CR-4 (cleanup): splitter edge cases, unclosed-fence silent drop, global floor.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance - PASS
Median 0.40 s, target under 2 s.

### Reliability - PASS
Floor 24, 29 measured; population from `git ls-files`.

### Security - PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary: prose rewordings and a read-only test. The criteria classifier (`probe-boundary-signals.mjs`) returned `boundary_signals: []`.

### Maintainability - CONCERNS
Three advisory guard-test weaknesses (CR-2, CR-3, CR-4).

---

## Code Review

Diff review: code review. Reviewer reviewed: 1 new test file, 4 prose files with a test-visible effect; ran the test and a read-only probe (6 of 6 pass, 29 keyed sentences, 193 files).

**Correctness bugs (3):**
- [high/high] `evals/shared/tests/gating-rule-restatements.test.mjs:276` — the four reworded template lines contain no flag name, so no key matches them and the CR-6 assertion cannot fire on them → key "advisory unless" itself. **Promoted to gate as T288-CR-1; origin: code-review, reproduced by QA.**
  - Reproduction: removed ` or QA reproduced the finding (5d)` from the `skills/qa-task/SKILL.md` template line (an Edit, snapshot kept with `cp`). Command: `command node --test evals/shared/tests/gating-rule-restatements.test.mjs`. Output: `ℹ pass 6`, `ℹ fail 0`. The mutant passes.
  - Control: the old wording `advisory unless the doc opted in via code_review_blocking: true` on the same line goes red (develop mutation (b), CR-6 assertion). Baseline restored with `cmp` (no output) and the test is green again at 6 of 6.
  - Provenance: the test is new in this change, so there is no base to compare; not pre-existing.
- [medium/high] `evals/shared/tests/gating-rule-restatements.test.mjs:191` — the exemption reason for `qa-docs-only-review-prompt.md` says the lens "writes no gate", but that prompt's own description says the caller's gate mapping and reproduction rules apply unchanged to its findings → reword the sentence and drop the exemption, or correct the reason. Not reproduced by execution; advisory (not in `top_issues`).
- [medium/medium] `evals/shared/tests/gating-rule-restatements.test.mjs:258` — the follower rule reads the next sentence regardless of block boundaries, and `reproduc` also matches "reproducible" → keep `next` within one block and narrow the marker. Advisory.

**Cleanups (1):**
- `evals/shared/tests/gating-rule-restatements.test.mjs:98` — splitter breaks only before uppercase or opening punctuation; an unclosed non-prose fence drops the rest of the file; the floor is global → per-file minimum, end-of-file fence assertion, split tests.

mutation-proven: develop's three mutations (CR-5 reverted; one CR-6 line reverted; `review-code` exception removed) → each turned the guard test red → dev-only (recorded in the implementation report, not re-run this cycle). This cycle made no fix, so Step 3c ran no new proofs apart from the CR-1 reproduction above.

Anchor check: no malformed anchors reported; the reviewer's `file_line` values were read against the file.

---

## Regression Testing

Full suite on the LAN server, `CI=true npm run test:remote`: 8744 pass, 0 fail, 3 skipped (develop run 3, on the commit before the PR was opened; the PR added only the implementation report since). `npm run bundle -- --check`: 129 skills, 0 problems. `npm run validate` on `qa-task`, `qa-story`, `review-code`: clean.

---

## Test Artifacts

### Files Reviewed
`evals/shared/tests/gating-rule-restatements.test.mjs`, `shared/resources/code-review-prompt.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/pr-conformance-prompt.md`, `shared/resources/qa-runnable-prose-detection.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/review-code/SKILL.md`.

### Test Commands Executed
```bash
command node --test evals/shared/tests/gating-rule-restatements.test.mjs
npm run -s validate -- skills/qa-task/ skills/qa-story/ skills/review-code/
npm run -s bundle -- --check
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed-file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
bash .agents/skills/qa-task/references/changelog-cites.sh task.288
```

### Coverage Report
Not applicable (prose and a source-reading test).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T288-CR-1 (P1).

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3 and CR-4 are cheap and live in the same file; the fixer may take them in the same pass.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high finding, reproduced with a passing control.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T288-CR-1 fixed and re-reviewed

---

**QA Report**: co-located at `task.288.qa.1.gating-rule-restatements.md`
**Gate File**: co-located at `task.288.gate.1.gating-rule-restatements.yml`
**Next Steps**: `/qa-fix` for T288-CR-1, then re-review
