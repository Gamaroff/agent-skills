# QA Report: Task 255 - security-probe: a cli: fixture setup cannot reach the host gh

**Task**: [Link to task document](./task.255.probe-engine-cli-setup-gh-isolation.md)
**Gate File**: [task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml](./task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: PASS

---

## Executive Summary

The `cli:` fixture setup now runs under the shell arm's trip-wire `gh` and a gh-free `PATH`. A setup that reaches `gh` by a spelling the textual scan misses declines `needs-fake-gh`. Tests, mutations, bundles and the diff review all hold. Two low-severity cleanups are advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#821)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b), as the standard strategy allows for a four-phase, single-module task. First review, so the whole branch diff was reviewed and no refute pass applies.

CI on 22f6b145a7e6: pending (read once, not awaited; CI is gated at `/finalise`).

Step 4b: not applicable. The change set adds no `SKILL.md` and no fenced bash block.

Reviewer timing: not measured.

---

## New Findings This Cycle

_First review: every finding below is new._

- **[low]** `shared/resources/security-probe.mjs:2970` — the setup `PATH` build in `runCliCase` restates `caseShellEnv`'s trip-wire-first, `ghFreePath` logic → share one helper.
- **[low]** `shared/resources/probe-boundary-rule.md:565` — the added paragraph runs far past the wrap width and has an unrelated sentence glued to its end → re-wrap.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Reproduce the gap | PASS | Verified | M0 (original code) turns two new tests red |
| Phase 2: Guard the cli: setup | PASS | Verified | trip-wire `bin/gh`, setup-only env copy, `ghTripped`, `harnessDir` passed to the watch |
| Phase 3: Tests and mutations | PASS | Verified | 5 new task.255 tests in the 290 |
| Phase 4: Docs, bundles, proof | PASS | Verified | CHANGELOG, probe-boundary-rule.md, bundles |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Setup reaching `gh` by a missed spelling declines `needs-fake-gh`; host `gh` never runs | PASS | split-name and command-substitution tests; M3 turns both red |
| A git-only setup still runs and is scored | PASS | "a git-only setup still runs and the case is scored" test |
| The `cli:` entry's PATH is unchanged | PASS | "the entry's own PATH is not the setup's" test; `setupEnv` is a copy (`security-probe.mjs:2970`) |
| `runCaseSetup` still called by both arms | PASS | calls at `security-probe.mjs:2978` and `:3390`; existing structural test green |
| No `--fixture-setup` writes no `bin/gh`, no extra spawn | PASS | task.254 spawn-count test green in the 290 |
| `ghFreePath` called once per case at most | PASS | one call in `runCliCase` (`security-probe.mjs:2972`), before the setup spawn; the other call (`:3140`) is the shell arm |
| Probe test file passes | PASS | 290 pass, 0 fail |
| `npm test` passes | PASS (with caveat) | dev run: 7174 pass, 1 fail, a CI-only guard reporting `zsh` missing on this laptop; `.github/workflows/test.yml:37` installs zsh for CI |
| Guard mutations turn a test red | PASS | see Mutation table |
| CHANGELOG cites task 255 | PASS | `changelog-cites.sh` exit 0 |
| `probe-boundary-rule.md` states the guard and limits | PASS | paragraph near line 557 |
| `bundle:check` reports 0 problems | PASS | 128 skills, 0 problems |

Criteria drift: clean (`criteria-drift.js`, base review-commit).

---

## Breaking Changes Validation

None documented, none introduced. A setup that never reaches `gh` runs as before.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 2 (both advisory, listed under New Findings).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
No added process without `--fixture-setup`; one filtered-path build per `cli:` case with a setup.

### Reliability — PASS
A tripped setup declines rather than runs; the marker counts as the harness's own write.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates named: `ghFreePath`, `namesGh` (both pre-existing, unchanged), `cliSetupGuarded` (a flag, not a validator). The criteria signal list is `["never"]`; the reason it is not an input gate is in the gate's `boundary_reason`.

### Maintainability — PASS
One duplicated PATH-build (CR-1), advisory.

---

## Code Review

Reviewer: read-only Explore subagent, whole branch diff. `code_review_blocking=true`; no finding is a high-confidence bug, so none enters the gate. Anchors: both `ok`.

**Correctness bugs (0):** none.

**Cleanups (2):**
- `shared/resources/security-probe.mjs:2970` — `runCliCase` rebuilds the shell arm's PATH isolation inline, which can drift from `caseShellEnv` → extract a shared helper.
- `shared/resources/probe-boundary-rule.md:565` — over-wide added paragraph with an unrelated sentence glued on → re-wrap.

### Mutation table

| Mutation | Test that went red | Outcome |
| -------- | ------------------ | ------- |
| M2: setup `PATH` without `ghFreePath` | "with the trip-wire stepped around, the gh-free PATH still keeps the host gh out of the setup's reach" | covered |
| M3: `ghTripped` without `cliSetupGuarded` | split-name and command-substitution declines (2 tests) | covered |
| M1: no `bin/gh` written for a `cli:` setup | split-name and command-substitution declines (2 tests) | covered |

mutation-proven: setup PATH without ghFreePath → the stepped-around trip-wire test → covered
mutation-proven: ghTripped without cliSetupGuarded → both needs-fake-gh decline tests → covered
mutation-proven: no bin/gh for a cli: setup → both needs-fake-gh decline tests → covered

The three guard mutations the criterion names (M1, M2, M3) were all re-run independently this cycle. Two others from the development run (M0 original code, M4 entry shares the setup env) are recorded in the implementation report's Decisions Log and were not re-run here, so those two are `dev-only`. Each snapshot was restored with `cp` and the file checked byte-identical.

---

## Regression Testing

The full probe suite (290) passes, including the task.254 `--fixture-setup` tests and the spawn-count test. `npm run bundle:check` is clean.

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, four new fixtures, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`, five bundled copies.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/security-probe.test.mjs   # 290 pass
npm run bundle:check                                                          # 0 problems
python3 skills/create-skill/scripts/quick_validate.py skills/<skill>/        # qa-story qa-task finalise review-security: all pass
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: share the setup-PATH build with `caseShellEnv`.
2. CR-2: re-wrap the `probe-boundary-rule.md` paragraph.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion has evidence; two guard mutations re-proven; no bug found.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.255.qa.1.probe-engine-cli-setup-gh-isolation.md`
**Gate File**: co-located at `task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml`
**Next Steps**: proceed to the 5c PR review, then finalise.
