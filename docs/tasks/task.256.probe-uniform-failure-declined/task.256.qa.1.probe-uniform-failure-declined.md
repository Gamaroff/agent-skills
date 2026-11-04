# QA Report: Task 256 - security-probe: a uniform failure is declined, not scored

**Task**: [Link to task document](./task.256.probe-uniform-failure-declined.md)
**Gate File**: [task.256.gate.1.probe-uniform-failure-declined.yml](./task.256.gate.1.probe-uniform-failure-declined.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-04
**Testing Completed**: 2026-11-04
**Gate Status**: PASS

---

## Executive Summary

The engine now declines a run where every case fails the same way before reaching the control, instead of scoring it `absent`. The original script reproduces as intended. Every success criterion is held by a committed test or a measured command, and 18 of 18 mutations of the engine went red. One advisory code-review finding. Two things stay undecided: PR CI is still pending, and no test has run under zsh.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (probe suite 301/301)
- [x] Breaking changes documented (one: the verdict for this shape)
- [x] Code on feature branch with open PR (#827)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Code Review
- [x] Mutation spot check

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (standard mode, first review). The traceability mapper was skipped: the task's Success Criteria are checklists, not a table. Dispatched 2026-11-04T10:16Z, returned before 10:34Z (completion notice `duration_ms` 18024).

CI on 4dc52774bbd1: pending. Recorded and changes nothing in the gate.

Step 4b: not applicable. The change set adds no `SKILL.md` or prompt with fenced bash blocks (the generated copies carry the engine and the rule document only).

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 10 new tests and an extended spawn test; 7 failed on the unmodified engine, the stay-scored rows passed |
| Phase 2: The check and the fold | PASS | Verified | `uniformFailure` exported; key removed ahead of all three returns |
| Phase 3: Downstream, docs, bundles and proof | PASS | Verified | Plan-level test, rule doc, CHANGELOG, bundles, 18 mutations |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

**Functional**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `resolve-pr-number.sh` declines, exit 1 | Re-run this cycle: `unverifiable` / `entry-not-probeable`, `executed: 0`, `reproduced: 0`, `overblocked: 0`, `declined: 1`, exit 1. Held by "the script that caused the false findings" | PASS |
| Detail names exit and shared stderr line | Detail reads `every case exited 2 with the same stderr, hostile and legitimate alike, so no input reached the control. Check the entry form and its argv: usage: resolve-pr-number.sh --doc …`. Held by the per-form tests | PASS |
| Declined under all five forms | "every form declines" (shell, shell-fn, shell-argv, cli), the fence test and the shell-argv path test | PASS |
| Accept-all and the stay-scored rows unchanged | "every shape that is a measurement stays scored", 7 rows, passed on the unmodified engine and on this one | PASS |
| `needs-fake-gh` kept | "a run that reached gh stays needs-fake-gh"; mutation M7 red | PASS |
| `probes: []`, `probes_executed: 0` through the plan script | "through security-probe-plan.mjs", committed | PASS |
| No private key or raw stderr in any return or record | "no case from any of the three returns…"; mutation M6 red | PASS |

**Performance**

| Criterion | Evidence | Status |
| --- | --- | --- |
| No extra process per case | Extended spawn test: a declined `cli:` run starts no bash | PASS |
| Record size does not grow | The key is deleted ahead of every return, held by the private-key test | PASS |

**Code Quality**

| Criterion | Evidence | Status |
| --- | --- | --- |
| One decline path | Per-form tests assert exactly one `declined` entry with every case `errored` | PASS |
| Probe suite passes on a real checkout | 301/301, run in this checkout | PASS |
| `npm test`, `CI=true npm test`, `lint:shell`, `bundle:check` | `lint:shell` and `bundle:check` clean. `CI=true npm run ci:fast` ends 7201 pass, 1 fail ("under CI, every tool a suite skips without is on PATH": zsh is not installed on this machine). Premise re-checked: `.github/workflows/test.yml` installs zsh; the PR's CI is pending | UNDECIDED, environmental |
| Every mutation turns a test red | 18 of 18 re-run by QA this cycle, see below | PASS |

**Migration**

| Criterion | Evidence | Status |
| --- | --- | --- |
| CHANGELOG records the verdict, citing task 256 | `changelog-cites.sh` answers `cites (task 256)` | PASS |
| Rule doc states the rule and four limits | `probe-boundary-rule.md`, the `entry-not-probeable` uniform-failure row | PASS |
| No committed run record rewritten | `git diff --name-only origin/develop... -- '*.run.json'` printed nothing | PASS |

Criteria drift: clean (`criteria-drift.js`, base `reviewed-blob`).

---

## Breaking Changes Validation

### Breaking Change: this shape reads `unverifiable`, not `absent`
Documented: Yes
Migration Path Provided: Yes (use `shell-argv:` with an argv template; the decline's detail says so)
Migration Tested: Yes (the decline detail was read on the real script)
Consumer Code Updated: N/A (no on-disk record changes)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (1)

- CR-1, low severity and confidence, advisory, see Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
No new process per case.

### Reliability — PASS
Every state the check cannot vouch for returns null and is scored as before.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. `uniformFailure` reads the engine's own result objects, which no corpus sink models, and it is tested directly with hand-built results and end to end through every entry form. `boundary_signals: []` (the criteria classifier found none). A decline is a zero-guard failure and escapes are carried exactly as before, so the change cannot turn a missing control into a pass.

### Maintainability — PASS
One pure function, one reused fold, no second decline path.

---

## Code Review

Reviewed: `security-probe.mjs`, tests, fixtures and rule doc, with all 11 `caseResults.push` sites checked against `uniformFailure` and the delete placement. The reviewer found no missed arm and no return between the `finally` and the delete.

**Correctness bugs (1):**
- [low/low] `shared/resources/security-probe.mjs:2265` ⚠️ unverified anchor (text-mismatch; the line is `c.detail = uniform;` a few lines lower) — When one case genuinely errored and the others fail uniformly, the fold overwrites that case's own detail with the uniform message. Advisory only: it is not high confidence, so it does not enter the gate. Recorded under `recommendations.future`.

**Cleanups (0):** none.

mutation-proven: remove the reclassification → "the script that caused the false findings" and 6 more → covered
mutation-proven: remove the sandbox normaliser → fence and shell-argv path tests → covered
mutation-proven: remove the fixture-XXXXXX normaliser → "every form declines" → covered
mutation-proven: remove the fence-N.sh normaliser → "fence: declines" → covered
mutation-proven: remove the 126/127 exclusion → "BUG-9" and "stays scored" → covered
mutation-proven: remove the both-directions condition → "stays scored" (66 tests red in all) → covered
mutation-proven: add input replacement to the normaliser → "stays scored" → covered
mutation-proven: delete the key only after the needs-fake-gh return → "no case from any of the three returns" → covered
mutation-proven: reclassify before the needs-fake-gh return → "stays needs-fake-gh" → covered
mutation-proven: drop the exit comparison, the stderr comparison, exit 0, a missing status, per-shell grouping, the hostile-accepted and legitimate-rejected conditions and the no-child guard → `uniformFailure` unit test or the stay-scored table → covered (8 mutations)

18 of 18 re-run by QA this cycle against the committed tests; the engine was compared with a snapshot afterwards and was identical.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole probe suite | PASS, 301/301 |
| Full fast gate | 7201 of 7215; the one failure is the zsh-on-PATH CI guard |
| `npm run validate` on finalise, qa-story, qa-task, review-security | PASS |
| `npm run lint:shell`, `npm run bundle:check` | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, the 12 fixtures, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs
CI=true npm run ci:fast
npm run -s validate -- skills/finalise/
command node shared/resources/security-probe.mjs --sink filename --entry shell:shared/resources/resolve-pr-number.sh --json
git diff --name-only origin/develop... -- '*.run.json'
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Read the PR CI result on this head before merge: it is the first run of the new tests under zsh.
2. Consider overwriting only the cases that ran in the fold (CR-1).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding, all criteria evidenced, mutation proof independently repeated.
**Quality Score**: 95/100 (5 held back for the undecided CI run and the never-run zsh lane)

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.256.qa.1.probe-uniform-failure-declined.md`
**Gate File**: co-located at `task.256.gate.1.probe-uniform-failure-declined.yml`
**Next Steps**: PR review (Step 5c), then finalise.
