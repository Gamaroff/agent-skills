# QA Report: Task 241 - Make /finalise changelog checks opt-in (cycle 2)

**Task**: [Link to task document](./task.241.finalise-changelog-checks-opt-in.md)
**Gate File**: [task.241.gate.2.finalise-changelog-checks-opt-in.yml](./task.241.gate.2.finalise-changelog-checks-opt-in.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-reviewed head `f530a532` with a full-diff refute pass. All three medium findings from
cycle 1 were reproduced as fixed, and their bug reports are now Closed. The refute pass found no new
medium code defect, but CI is red on the head. It is not a failing test (7,086 pass): the suite's
tmp-leak ratchet trips because the 6d test helper never removes its temp directory, and this branch
added 6d cases that CI runs under both bash and zsh. Four low findings come from the refute pass.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / BUG-1: an unreadable config read as unset | ✅ FIXED | An anchor elsewhere in the config, forced to the awk tier, now gives `off` and a stderr line naming `__UNSUPPORTED__`. 5 new tests. |
| CR-2 / BUG-2: two prompts still read `CHANGELOG.md` | ✅ FIXED | The AC and fix-evidence prompts carry only the deferral and documentation-criterion mentions. The enumeration test is green and mutation-proven (3 mutations, each red). |
| CR-3 / BUG-3: the `enforce` guard refused unrelated configs | ✅ FIXED | `tracker` reads `github` with `"enforce":` under another block. Both directions tested (6 cases). |
| PROBE-1: block-scalar tiers disagree | ✅ FIXED (claim scoped) | Named on stderr under awk, and the header claim is narrowed. The python tier still reads it `on`, which is the documented residual. |

## New Findings This Cycle

- **[medium]** `evals/shared/tests/finalise-publish-boundary.test.mjs:573`: `runSixD` leaks a
  `finalise-6d-*` temp dir per call, so CI's tmp-leak ratchet fails the `test` job (20 > 10).
  Remove the dir in the helper and delete the healed ratchet entry (CI-1, BUG-4).
- **[low]** `skills/finalise/SKILL.md:1835`: 6d treats any non-`on` resolver answer, including a
  missing resolver, as "not enabled" → accept only `on` or `off` and HALT otherwise (CR2-1).
- **[low]** `skills/finalise/assets/bug-dod-template.md:76`: the Step 4b placeholder does not say the
  answer comes from agent 4's gated item, and the enumeration test does not cover `assets/` (CR2-2).
- **[low]** `shared/resources/changelog-enforce.sh`: `changelog:`/`rules:`/`enforce: true` reads `on`
  under awk and `off` under python, which contradicts the header's tier claim (CR2-3).
- **[low]** `evals/shared/tests/finalise-publish-boundary.test.mjs:766`: the enumeration counts only
  uppercase `CHANGELOG` (CR2-4).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing locally (CI red on the leak ratchet, see BUG-4)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#773, OPEN)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (executed probe)
- [x] Code Review (refute pass)

### Review Methodology

- **Approach:** direct tools, plus one independent Explore reviewer running the cycle-2 refute pass.
  - Dispatched 10:39:51Z; returned in 170.5 s (`duration_ms` 170507).
- **Re-review scope:** the whole branch diff (cycle 2 refute pass). That is `origin/develop...HEAD`
  minus bundled `references/` copies and `docs/tasks/`: 14 files, 845 lines.
- **CI:** `CI on f530a5329124: 1 failed (0 pre-existing)`.
- **Step 4b:** the changed prompts carry no fenced bash. `skills/finalise/SKILL.md` is unchanged
  since gate 1, so gate 1's Step 4b result stands: 2 changed blocks, both refused by the pre-existing
  `$(bash path)` tokeniser limit, and 6d is executed per PR by the boundary test.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The resolver | PASS | Verified | Strict read, with sentinels named. CR2-3 is low. |
| Phase 2: Gate both call sites | PASS | Verified | Agent 4 is the sole owner. CR2-1 and CR2-2 are low. |
| Phase 3: Config and docs | PASS | Verified | Claims scoped to match the code. |
| Phase 4: Tests, bundle and record | CONCERNS | CI red | BUG-4: temp-dir leak trips the ratchet. |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Unset → 6d prints "not enabled" | `finalise-publish-boundary.test.mjs` | PASS. Bash runs locally; zsh runs on CI, where all tests pass. |
| Resolver gives the same answer under both tiers | `changelog-enforce.test.mjs`, 36 tests | PASS for single-line values directly under `changelog:` (CR2-3) |
| No dispatched prompt but agent 4 checks the changelog | enumeration test | PASS |
| `npm test` green | local `ci:fast`: 6,579 tests, 0 failed. CI: 7,086 pass, but the job fails on the ratchet. | **CONCERNS** (BUG-4) |

---

## Breaking Changes Validation

Unchanged from cycle 1: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the 6d test helper leaks temp dirs, so CI fails**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.241.bug.4.finalise-6d-test-leaks-temp-dirs.md](./task.241.bug.4.finalise-6d-test-leaks-temp-dirs.md)
- **Observation**: `tmp-leak: prefix "finalise-6d" over its ratchet (20 > 10)`, with every test passing.
- **Impact**: CI is red on the head, so the PR cannot finalise.
- **Recommendation**: Clean up in `runSixD` and remove the ratchet entry.
- **Priority**: P2

### LOW Severity Issues (4)

CR2-1, CR2-2, CR2-3 and CR2-4, as listed under New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
BUG-4.
### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 15 (`task.241.qa.2.security.run.json`, `totals.executed`); escaped: 0
- One case reproduced: `off.block-scalar` under the python tier. This is the PROBE-1 residual that
  cycle 1 scoped by design.

### Maintainability — PASS

---

## Code Review

**Boundary:** `boundary: true` (`changelog-enforce.sh`). Re-probed with `shell-argv:`:
`probes_executed: 15`, `escaped: 0`.

**Correctness bugs (4):**
- [medium/medium] `skills/finalise/SKILL.md:1835`: a missing resolver reads as "not enabled" →
  accept only on/off. QA rated it low (CR2-1) because bash prints the missing-file error.
- [medium/medium] `evals/shared/tests/finalise-publish-boundary.test.mjs:731`: the enumeration misses
  `assets/bug-dod-template.md:76` → reword it and widen the enumeration. QA rated it low (CR2-2): the
  text predates this branch and is a placeholder, not a read instruction.
- [low/medium] `shared/resources/changelog-enforce.sh:43`: deeper nesting splits the tiers (CR2-3).
  Measured: awk `on`, python `off`.
- [low/medium] `evals/shared/tests/finalise-publish-boundary.test.mjs:766`: uppercase-only matching
  (CR2-4).

**Cleanups (1):**
- `shared/resources/read-config.sh:463`: the call-site comment names the wrong reader for
  `changelog.enforce` → `recommendations.future`.

All 5 anchors were checked with `finding-anchors.js`: `ok`. None is `bug` + `high` confidence, so
none was auto-promoted. QA entered the four bugs at low, with the reviewer's ratings recorded above.

**Mutation spot check:**
- mutation-proven: the awk `top` tracker disabled (`indent == 0` → `0`) →
  `changelog-enforce.test.mjs` "a quoted/spaced enforce under changelog: → __UNSUPPORTED__", 2 red →
  covered. This is the refused direction; qa-fix proved the readable direction.

The qa-fix proofs from cycle 1 were not re-run: plain reader 3 red, scopes emptied 3 red, CR-2 three
mutations each 1 red.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (local `ci:fast`) | 6,579 tests, 0 failed |
| CI `test` job | 7,086 pass, job **red** (tmp-leak ratchet, BUG-4) |
| `read-config.sh` on unrelated configs, awk tier | fixed (BUG-3) |
| CI awk variants (gawk, mawk) and zsh, `tracker-access.test.sh` | 406 passed, 0 failed |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
command node --test shared/resources/tests/changelog-enforce.test.mjs evals/shared/tests/finalise-publish-boundary.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shell-argv:shared/resources/changelog-enforce.sh' --argv '["{input}"]' --cases-file docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.qa.2.security.cases.json --repo-root "$PWD" --record docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.qa.2.security.run.json --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 773
gh run view 40673829397 --log-failed
```

### Coverage Report
Not measured (shell and Markdown).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-241-BUG-4: clean up the temp dir in `runSixD` and remove the ratchet entry.

### Short-term Actions (Non-Blocking)
1. CR2-1 to CR2-4 (low).
2. CR2-5 (cleanup): the comment in `read-config.sh`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium finding: CI is red on the head. No HIGH findings.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-4 fixed and CI green on the head.

---

**QA Report**: co-located at `task.241.qa.2.finalise-changelog-checks-opt-in.md`
**Gate File**: co-located at `task.241.gate.2.finalise-changelog-checks-opt-in.yml`
**Next Steps**: `/qa-fix` for BUG-4 and the low findings, then QA cycle 3.
