# QA Report: Task 241 - Make /finalise changelog checks opt-in

**Task**: [Link to task document](./task.241.finalise-changelog-checks-opt-in.md)
**Gate File**: [task.241.gate.1.finalise-changelog-checks-opt-in.yml](./task.241.gate.1.finalise-changelog-checks-opt-in.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 1 of PR #773 reviewed head `4ade4faf`. All four phases are delivered: the resolver, both
gated call sites, the config and docs, and the tests. Every committed test is green. The independent
diff review raised three medium defects, and QA reproduced each one:
- an unreadable config silently reads as "not opted in"
- two DoD prompts `/finalise` dispatches still read `CHANGELOG.md` when the checks are off
- guarding the bare key `enforce` makes the awk config reader refuse unrelated consumer configs, which
  is a regression against `origin/develop`

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (22/22 plan items)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#773, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (executed probe)
- [x] Code Review

### Review Methodology

- **Approach:** direct tools, plus one independent Explore code reviewer.
  - Dispatched 10:24:11Z; returned in 89.7 s (`duration_ms` 89677).
  - The task has 4 phases and medium risk, so the default strategy applies.
- **Review scope:** first review, the whole `origin/develop...HEAD` diff (1,427 lines).
  - Bundled `skills/*/references/` copies were left out of the patch, because `bundle:check` proves
    they are byte-copies of their sources.
- **CI:** `CI on 4ade4faf8faa: pending`.
- **Step 4b:** ran over the two changed in-scope files.
  - `skills/finalise/SKILL.md`: 2 changed blocks, 0 executed. Both were refused as
    `helper .agents/skills/finalise/references/changelog-enforce.sh): not a literal path`.
  - The cause is a pre-existing limit in the engine: a helper called with no arguments inside `$( )`
    is tokenised with the closing paren. A probe file reproduced it with `qa-cycle.sh`, and the same
    call with one argument classifies `runnable`. Routed to `recommendations.future`.
  - The 6d block is executed on every PR anyway, by `finalise-publish-boundary.test.mjs`, which extracts
    it from `SKILL.md`.
  - `finalise-dod-docs-prompt.md` has no fenced bash.
  - Shells: bash only. zsh is not installed on this host.

---

## Re-Review Context

None. This is the first review.

## New Findings This Cycle

- **[medium]** `shared/resources/changelog-enforce.sh:33`: the resolver reports one silent `off` for
  two different states, key not set and config unreadable (CR-1, TASK-241-BUG-1) → read with the strict
  reader and report each sentinel.
- **[medium]** `shared/resources/finalise-dod-ac-prompt.md:66`, `finalise-dod-fix-evidence-prompt.md:87`:
  two more `CHANGELOG.md` readers are ungated (CR-2, TASK-241-BUG-2) → gate them on
  `<CHANGELOG_ENFORCE>`, and add an enumeration test.
- **[medium]** `shared/resources/read-config.sh:469`: guarding the bare leaf `enforce` refuses unrelated
  configs on the awk tier (CR-3, TASK-241-BUG-3) → scope the guard to `changelog.enforce`.
- **[low]** `shared/resources/changelog-enforce.sh`: for a block scalar `enforce: |\n  true`, the python
  tier says on and the awk tier says off (probe case `off.block-scalar`, TASK-241-PROBE-1).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The resolver | CONCERNS | Verified | Works as specified. CR-1 and PROBE-1 are edge cases of how it reads the config. |
| Phase 2: Gate both call sites | CONCERNS | Verified | Both named sites are gated and wired. CR-2: two more readers were never enumerated. |
| Phase 3: Config and docs | PASS | Verified | Config, reference row, releases, runbooks and CHANGELOG are present. |
| Phase 4: Tests, bundle and record | PASS | Verified | 32 new tests. The zsh arm is honestly recorded as unverified. |

**Overall Phase Completion**: 4/4 delivered, with 2 phases carrying findings.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Unset → 6d exits 0 and prints "not enabled" | `finalise-publish-boundary.test.mjs` ("6d does not read CHANGELOG.md…", 3 configs), under bash | PASS (the zsh arm is unverified, as recorded) |
| `enforce: true` → existing 6d cases unchanged | the same file's existing cases, with `OPTED_IN` as the default fixture | PASS |
| Resolver gives the same answer under both tiers | `changelog-enforce.test.mjs`, 10 values × 2 tiers | PASS for the tested values. PROBE-1 is an untested value that fails. |
| Docs prompt gate and row-4 wiring | the wiring test in `finalise-publish-boundary.test.mjs` | PASS |
| This repository resolves `on` | `changelog-enforce.test.mjs` ("this repository opts in") | PASS |
| Four DoD agents | `finalise-publish-boundary.test.mjs` ("still dispatches four") | PASS |
| Mutation-proved | dev: 3 proofs. QA spot check below. | PASS |
| `npm test`, `bundle:check`, `check:generated`, `validate` | `ci:fast` 6,567/0 failed; `validate skills/finalise` ✓ | PASS |
| shellcheck | clean at `--severity=warning` | PASS |
| Migration docs | `configuration.md`, `CHANGELOG.md`, `releases.md`, runbooks | PASS. CR-2 makes their "never reads CHANGELOG.md" claim overstate the code. |

---

## Breaking Changes Validation

### Breaking Change: the 6d HALT is off by default for consumers
Documented: Yes (task § 5, `CHANGELOG.md`)
Migration Path Provided: Yes (`changelog:` / `enforce: true`)
Migration Tested: Yes (the `enforce: true` cases)
Consumer Code Updated: N/A
Notes: The migration is one config line.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

**Issue: an unreadable config reads as "not opted in"**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.241.bug.1.unreadable-config-reads-as-unset.md](./task.241.bug.1.unreadable-config-reads-as-unset.md)
- **Observation**: With an anchor anywhere in an opted-in config and `AGENT_SKILLS_CONFIG_TIER=awk`, the
  resolver prints `off` with no stderr, while the strict reader returns `__UNSUPPORTED__`.
- **Impact**: The 6d guard is silently lost on a host without pyyaml.
- **Recommendation**: Use the strict reader and report each sentinel.
- **Priority**: P2

**Issue: two dispatched prompts still read CHANGELOG.md**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.241.bug.2.two-dispatched-prompts-still-read-changelog.md](./task.241.bug.2.two-dispatched-prompts-still-read-changelog.md)
- **Observation**: `finalise-dod-ac-prompt.md:66` and `finalise-dod-fix-evidence-prompt.md:87` are ungated.
- **Impact**: The task's headline claim is false. Consumers still get changelog judgements.
- **Recommendation**: Gate both on `<CHANGELOG_ENFORCE>` and add an enumeration test.
- **Priority**: P2

**Issue: guarding `enforce` refuses unrelated configs**
- **Severity**: MEDIUM. The reviewer rated it low; QA raised it because it is a confirmed regression
  against the base.
- **Category**: Reliability
- **Bug Report**: [task.241.bug.3.guarding-enforce-refuses-unrelated-configs.md](./task.241.bug.3.guarding-enforce-refuses-unrelated-configs.md)
- **Observation**: Given `tracker: github` plus `other: {"enforce": 1}` on the awk tier, `origin/develop`
  reads `github` and HEAD reads `__UNSUPPORTED__`.
- **Impact**: Every tracker-using skill halts in an affected consumer.
- **Recommendation**: Scope the guard to `changelog.enforce`.
- **Priority**: P2

### LOW Severity Issues (1)

- **PROBE-1**: a block-scalar `true` reads `on` under python and `off` (with a warning) under awk.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
The change adds one config read per `/finalise` run.

### Reliability — CONCERNS
CR-1 and CR-3.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 15 (`task.241.qa.1.security.run.json`, `totals.executed`); escaped: 0
- `shell-argv:shared/resources/changelog-enforce.sh` was run over 15 `skills-config.yaml` fixtures
  (`task.241.qa.1.security.cases.json`):
  - 4 legitimate opt-ins
  - 11 hostile values, among them `"$(touch pwned)"` and backticks, which stayed inert data
  - 1 case reproduced: `off.block-scalar`, a tier-consistency defect (PROBE-1), not an injection.

### Maintainability — CONCERNS
CR-2: the population of `CHANGELOG` readers was never enumerated.

---

## Code Review

**Boundary:** `boundary: true`. `changelog-enforce.sh` decides on or off, and `off` prevents the 6d
HALT. It was probed with the `shell-argv:` form: `probes_executed: 15`, `escaped: 0`.

**Correctness bugs (3):**
- [medium/high] `shared/resources/changelog-enforce.sh:33` — an unset key and an unreadable config
  produce the same silent `off` → use `read_nested_config_key_strict` and handle the sentinels.
  **Promoted to gate as TASK-241-CR-1** (`code_review_blocking`).
- [medium/medium] `shared/resources/changelog-enforce.sh:10` — `finalise-dod-ac-prompt.md:66` and
  `finalise-dod-fix-evidence-prompt.md:87` are ungated → gate every dispatched `CHANGELOG` read. QA
  confirmed the population by grep and entered it as **TASK-241-CR-2**.
- [low/medium] `shared/resources/read-config.sh:469` — the bare leaf `enforce` widens the subset
  scan's local rules → scope it to the parent. QA reproduced it against the base, raised it to medium,
  and entered it as **TASK-241-CR-3**.

**Cleanups (0).**

All three anchors were checked with `finding-anchors.js`: `ok`.

**Mutation spot check:**
- mutation-proven: the resolver's true arm made to `echo off` → `changelog-enforce.test.mjs`, 11 red →
  covered

The dev-recorded proofs were the 6d gate removed (5 red), row 4 placeholder dropped (1 red), unknown
value made `on` (4 red), and `changelog|enforce` dropped from the guarded keys (`tracker-access.test.sh`
§ 44 red, observed in Step 3). QA did not re-run them.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`npm run ci:fast`) | 6,567 tests, 0 failed |
| `eval:all` | green |
| `read-config.sh` readers on unrelated configs, awk tier | **regression**: CR-3 |
| Other 49 skills' `read-config.sh` copies | identical to the source (`bundle:check`) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/changelog-enforce.sh`, `shared/resources/read-config.sh`, `skills/finalise/SKILL.md`,
`shared/resources/finalise-dod-docs-prompt.md`, `shared/resources/finalise-dod-ac-prompt.md`,
`shared/resources/finalise-dod-fix-evidence-prompt.md`, `shared/resources/tests/changelog-enforce.test.mjs`,
`evals/shared/tests/finalise-publish-boundary.test.mjs`, `skills-config.yaml`.

### Test Commands Executed
```bash
npm run ci:fast
npm run eval:all
npm run validate -- skills/finalise/
command node --test shared/resources/tests/changelog-enforce.test.mjs
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shell-argv:shared/resources/changelog-enforce.sh' --argv '["{input}"]' --cases-file docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.qa.1.security.cases.json --repo-root "$PWD" --record docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.qa.1.security.run.json --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 773
```

### Coverage Report
Not measured: this is shell and Markdown, and there is no coverage tool for them.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-241-BUG-1 (CR-1), P2
2. TASK-241-BUG-2 (CR-2), P2
3. TASK-241-BUG-3 (CR-3), P2

### Short-term Actions (Non-Blocking)
1. PROBE-1: treat an awk-tier block indicator as unreadable.
2. `qa-execute-snippets`: tokenise `$(bash path)` with no arguments (pre-existing in the engine).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Three medium defects, all reproduced. No HIGH findings.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2 and CR-3 fixed and re-reviewed.

---

**QA Report**: co-located at `task.241.qa.1.finalise-changelog-checks-opt-in.md`
**Gate File**: co-located at `task.241.gate.1.finalise-changelog-checks-opt-in.yml`
**Next Steps**: `/qa-fix` for the three medium findings, then QA cycle 2 (refute pass).
