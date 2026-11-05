---
id: task.255
title: "security-probe: a cli: fixture setup cannot reach the host gh"
type: task
description: "Run the cli: --fixture-setup under the same trip-wire gh and gh-free PATH the shell arm uses, so a setup that reaches gh by an indirect spelling the textual scan misses is caught at run time instead of running the host binary."
tags: [security-probe, observation, qa-advisory]
category: infrastructure
status: accepted
priority: Medium
created: 2026-11-03
updated: 2026-11-03
completed_date: 2026-11-03
estimated_effort_hours: 8
github_issue: 820
pr_number: 821
---

# Technical Task: security-probe: a cli: fixture setup cannot reach the host gh

**Status:** Accepted

**GitHub Issue**: [#820](https://github.com/Gamaroff/agent-skills/issues/820)

> Follow-up to task.254 QA advisory CR-1, carried in `task.254.gate.2.probe-engine-cli-fixture-setup.yml` under `recommendations.future`. **Design decided with the author on 2026-11-03: reuse the shell arm's existing trip-wire and `ghFreePath`**, not a new sandbox mechanism.

---

## 1. Overview

Task 254 let the `cli:` entry form run a `--fixture-setup` script. The only guard against that script calling the host `gh` is a textual scan (`namesGh`) at argument-check time. A setup that reaches `gh` by a spelling the scan does not see (a variable-built command name, a sourced helper) would run the real binary, with the host PATH and keychain. The shell arm has no such gap: it puts a trip-wire `gh` first on PATH and shadows every PATH directory holding a `gh`. This task gives the `cli:` setup the same run-time guard.

**Scope**: `shared/resources/security-probe.mjs` (the `cli:` arm's setup spawn and its trip-wire detection), its tests, the prose that states the limit, bundled copies, and `CHANGELOG.md`. The `cli:` **entry** is out of scope (see § 4).

**Key deliverables**: (1) the `cli:` setup runs with the harness `bin/gh` trip-wire first on PATH and a gh-free PATH; (2) a trip-wire hit declines the run `needs-fake-gh`; (3) tests that go red when either guard is removed.

---

## 2. Motivation

### Current Problems

1. **The only guard is text.** `namesGh(setupPath, …)` at `security-probe.mjs:1780` reads the setup file. An indirect spelling (`g=g; "${g}h" …`, or a helper the setup sources) is invisible to it, and the setup then runs the host `gh`.
2. **The `cli:` arm builds no trip-wire.** `harnessDir/bin/gh` is written only when `isShellForm || isFenceForm || isShellArgvForm` (`security-probe.mjs:1989`), and `ghTripped` is read under the same condition (`:2151`). The `cli:` form is in neither.
3. **The setup's PATH is the host's.** `runCliCase` builds its env with `fixtureCaseEnv` (`:2950`); only `caseShellEnv` (`:3114`, used by the fence: and shell-argv: arms) calls `ghFreePath`.
4. **The gap was left as an advisory, not closed.** Task 254 accepted it as low confidence; nothing else tracks it.

### Benefits

1. A committed setup cannot reach the host `gh` through a PATH-resolved spelling, whatever the spelling.
2. The `cli:` and `shell-argv:` setups are guarded by the same mechanism, so they cannot drift.
3. The textual decline stays as the early, cheap message; the trip-wire is the guarantee behind it.

---

## 3. Technical Background

### Current Architecture

Names found with `grep -n` on `shared/resources/security-probe.mjs`:

- Trip-wire script: `tripwireGh(markerPath)` (`:1180`). It records the call in a marker file and exits 127.
- Marker: `GH_TRIPPED` (`:1172`), under `harnessDir = join(workDir, ".probe-harness")`.
- Shell-form env: `caseShellEnv` (`:3114`) applies `ghFreePath(env.PATH, join(harnessDir, "path"), caseDir)` (`:3122`) and then puts `join(harnessDir, "bin")` first on PATH.
- Post-run detection: `ghTripped` (`:2151`) turns the run into a `needs-fake-gh` decline (`:2173`), keeping the observed escapes and cases.
- Textual scan: `namesGh` (`:1196`); the `cli:` setup call is at `:1780`.
- The setup spawn: `runCaseSetup` (`:3211`), called from `runCliCase` (`:2960`) and from the shell-argv arm (`:3371`). It is handed `env`; it builds no PATH itself.
- Stated limits of the trip-wire (`probe-boundary-rule.md` § 5): an absolute path to a real `gh`, a PATH the script itself prepends, and a call backgrounded past the spawn all reach a real `gh` unrecorded. This task inherits those limits and does not remove them.

### Target Architecture

- The `cli:` form creates `harnessDir/bin/gh` (trip-wire) when a `--fixture-setup` is present.
- `runCliCase` builds a **setup-only** env: the case env, with `env.PATH = ghFreePath(...)` then the trip-wire first. The CLI entry's own env is unchanged.
- The `ghTripped` check includes the `cli:` form when a setup ran, and the decline reuses the `needs-fake-gh` reason with wording that names the setup.
- `runCaseSetup` stays the one helper; the PATH policy is passed in through `env`, not duplicated inside it.
- `runCliCase` (`:2868`) does not receive `harnessDir` today; the call at `:2047` must pass it. The setup env is a **copy** of the case env (`{ ...env, PATH }`), because `env` is also handed to the entry spawn and must stay unchanged.
- The trip-wire exits 127, so a setup that hits it fails and the case is recorded `errored` (as at `:3378` in the shell-argv arm). `ghTripped` is read once after the case loop (`:2150`), so the decline still wins over the `errored` record. A test pins this order.

### Clarifications

- Whether a `cli:` setup that legitimately needs `git` is affected: `ghFreePath` only replaces PATH directories that hold a `gh` with a symlink farm minus `gh`; `git` stays reachable. Phase 1 confirms it with a run, not by reading.
- A setup that names `gh` is still declined by the textual scan first. This task is the guarantee for what the scan misses.

---

## 4. Scope

### In Scope

✅ A trip-wire `gh` and a gh-free PATH for the `cli:` setup spawn
✅ Detecting a trip-wire hit from the setup and declining `needs-fake-gh`
✅ Tests, a mutation per guard, prose that states the limit, bundles, CHANGELOG

### Out of Scope

❌ The `cli:` **entry's** PATH. A `cli:` entry that consults `gh` is declared unprobeable by design (the comment at `:1776`); changing that is a contract change, not this fix.
❌ Closing the trip-wire's stated limits (absolute path, PATH prepend, backgrounded call).
❌ A `--fake-gh` flag for the `cli:` form.
❌ Sandboxing the setup's PATH to a fixed minimal set (considered and rejected: a setup needing tools outside `/usr/bin:/bin` would break, and it is a new mechanism to maintain).

---

## 5. Breaking Changes

None. A `cli:` setup that never reaches `gh` runs exactly as before. A setup that does reach `gh` by a spelling the scan missed used to run the host binary; it now declines the run `needs-fake-gh`. That is the intended change in behaviour, and no consumer relied on it (task.254 shipped the form days ago and the scan declines the plain spelling).

**Migration path**: a setup that needs `gh` uses the `shell-argv:` form with `--fake-gh`, which is what the existing decline text already says.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.255.plan.probe-engine-cli-setup-gh-isolation.md](task.255.plan.probe-engine-cli-setup-gh-isolation.md)

### Phase 1: Reproduce the gap (Risk: Low)

Files: none modified; scratch fixtures.

- [x] Write a setup whose `gh` call the textual scan misses (a variable-built name) and run it through the `cli:` form; confirm the host `gh` is reached (observe with a marker `gh` placed on the host PATH, not the real one)
- [x] Confirm `namesGh` returns false for the chosen spelling
- [x] Confirm a `git`-using setup still runs under `ghFreePath` in the shell arm

### Phase 2: Give the cli: setup the trip-wire and gh-free PATH (Risk: Medium)

Files: `shared/resources/security-probe.mjs`

- [x] Create `harnessDir/bin/gh` for the `cli:` form when a setup is present
- [x] Build the setup-only env with `ghFreePath` and the trip-wire first; leave the entry's env alone
- [x] Include the `cli:` form in the `ghTripped` check and the `needs-fake-gh` decline
- [x] Keep `runCaseSetup` the single helper

Depends on Phase 1.

### Phase 3: Tests and mutations (Risk: Low)

Files: `shared/resources/tests/security-probe.test.mjs`

- [x] A test: an obfuscated `gh` call in a `cli:` setup declines `needs-fake-gh`, and the host marker `gh` is never run
- [x] A test: a `git`-using setup still runs
- [x] A test: the `cli:` entry's PATH is unchanged
- [x] A test: a setup that hits the trip-wire (exit 127, case `errored`) still yields the `needs-fake-gh` decline, not an errored run
- [x] Mutation per guard: drop the trip-wire, drop `ghFreePath`, drop the `ghTripped` check; each turns a test red

### Phase 4: Documentation, bundles and proof (Risk: Low)

Files: `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`, bundled copies

- [x] State that the `cli:` setup is now guarded at run time, with the inherited limits
- [x] `npm run bundle`; `npm run bundle:check`
- [x] CHANGELOG entry citing task 255

---

## 7. Files Summary

Count command: `git diff --name-only develop...HEAD`, re-measured at QA; the figure is not recorded here.

### Core Implementation

1. ✅ `shared/resources/security-probe.mjs` — trip-wire, setup env, `ghTripped`

### Tests

2. ✅ `shared/resources/tests/security-probe.test.mjs` — the guards and their mutations

### Documentation

3. ✅ `shared/resources/probe-boundary-rule.md` — the limit statement
4. ✅ `CHANGELOG.md`

### Generated

5. ✅ `skills/{finalise,qa-story,qa-task,review-security}/references/*` — via `npm run bundle`, never edited by hand

---

## 8. Testing Strategy

### Unit Tests

- Scope: `runProbeSpec` over a `cli:` entry with a `--fixture-setup`
- Command: `command node --test shared/resources/tests/security-probe.test.mjs`
- A marker `gh` is placed in a scratch directory on the host PATH for the test; the assertion is that the marker is never executed and the run declines `needs-fake-gh`.

### Integration Tests

- `npm test` and `npm run bundle:check` clean.

### Mutation Tests

- Remove each of the three guards in turn; the named test goes red; the file is restored byte-identical (compare with the pre-mutation copy).

### Control case

The obfuscated spelling the test uses is **not** the one quoted in this task or the QA advisory; a second, differently built spelling is added as a control, and a setup that uses only `git` is the correct case the guard must leave alone.

---

## 9. Success Criteria

### Functional

- [x] A `cli:` setup that reaches `gh` by a PATH-resolved spelling `namesGh` misses declines `needs-fake-gh`; the host marker `gh` is never executed
- [x] A `cli:` setup that uses only `git` still runs and the case is scored
- [x] The `cli:` entry's PATH is unchanged
- [x] `runCaseSetup` is still called by both arms, held by the existing structural test

### Performance

- [x] A `cli:` run with no `--fixture-setup` writes no `bin/gh` and spawns no extra process (the task.254 spawn-count test stays green)
- [x] `ghFreePath` is called once per case at most (one call in `runCliCase`, before the setup spawn; the QA report's Findings table records it)

### Code Quality

- [x] `command node --test shared/resources/tests/security-probe.test.mjs` passes
- [x] `npm test` passes
- [x] Each of the three guard mutations turns a test red, recorded in the QA report's mutation table

### Migration

- [x] `CHANGELOG.md` records the change and cites task 255
- [x] `probe-boundary-rule.md` states the run-time guard and its inherited limits
- [x] `npm run bundle:check` reports 0 problems

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

1. **A legitimate setup breaks under the gh-free PATH**
   - Risk: a setup depends on a tool in a directory that also holds `gh`
   - Probability: Low
   - Impact: Medium (a probe declines instead of running)
   - Mitigation: `ghFreePath` keeps every other binary in that directory via a symlink farm; Phase 1 runs a `git` setup to prove it
   - Rollback: revert the commit

### LOW RISK

1. **Inherited limits are mistaken for closed gaps** — the prose states them; the limits are not removed.
2. **The trip-wire marker is read as an escape** — it lives under the work dir the escape sentinel skips, as in the shell arm.

---

## 11. Rollback Plan

### Immediate (< 1 hour)

- Triggers: a legitimate `cli:` probe regresses to `needs-fake-gh`, or CI turns red on the engine suite
- Steps: `git revert` the merge commit; run `npm run bundle:check`
- Validation: the engine suite passes and the task.254 acceptance tests are green

### Partial

- Revert only the `ghFreePath` application and keep the trip-wire, if the PATH shadowing is the cause

### Forward fix

- A setup that must reach a tool in a `gh`-holding directory: handle in a follow-up, not by weakening the guard

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-03
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.255.qa.1.probe-engine-cli-setup-gh-isolation.md](./task.255.qa.1.probe-engine-cli-setup-gh-isolation.md)
- **Gate File**: [task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml](./task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml)

### Test Coverage Summary
- **Tests Executed**: 290
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues. Two low-severity advisory cleanups (CR-1, CR-2).

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA Report**: `task.255.qa.1.probe-engine-cli-setup-gh-isolation.md`
**Gate File**: `task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** all 12 met (`npm test` graded from CI reading 1, SUCCESS on `ff0eefe99`)
✅ **Tests:** 290 pass in `security-probe.test.mjs`; the five task.255 tests start at line 8872
✅ **Mutation proof:** three guard mutations each turn a test red (QA report mutation table)
✅ **PR Review (5c):** CONCERNS, 0 open coverage findings; PC-1 cleared by this acceptance, PC-2 fixed
✅ **Documentation:** CHANGELOG entry citing task 255; `probe-boundary-rule.md` states the guard and its limits; bundled copies match
✅ **Security Review:** boundary held (1 executed, 0 reproduced, 0 escapes). The plan carried legitimate-direction cases only, so the engine verdict per control is `unverifiable`; the hostile-direction evidence is the mutation-proven behavioural tests
⚠️ **Compliance:** not applicable (internal developer tooling)

**Advisory, not fixed here:** CR-1 (share the setup-PATH build with `caseShellEnv`) and CR-2 (re-wrap one doc paragraph), recorded in the gate's `recommendations.future`.

**Task marked as ACCEPTED on:** 2026-11-03

**Detailed Verification Log:** See `task.255.dod.1.probe-engine-cli-setup-gh-isolation.md` for complete verification evidence and timestamps.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-03 | 1.0     | Initial draft — task.254 QA advisory CR-1; design: reuse the trip-wire | create-task |
| 2026-11-03 | 1.1     | Review passed (9/10) — runCliCase harnessDir, env copy, errored-vs-decline order, record locations | review-task |
| 2026-11-03 |         | Status → ready-for-development                                          | review-task |
| 2026-11-03 |         | QA gate PASS (100/100) — 2 advisory findings                            | qa-task     |
| 2026-11-03 | 1.2 | DoD passed — accepted (PR #821) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Reproduce the gap
- [x] Obfuscated spelling reaches the host marker `gh`
- [x] `namesGh` misses it
- [x] `git` setup runs under `ghFreePath`

### Phase 2: Guard the cli: setup
- [x] Trip-wire created
- [x] Setup-only env
- [x] `ghTripped` includes `cli:`

### Phase 3: Tests and mutations
- [x] Tests
- [x] Three mutations red

### Phase 4: Documentation, bundles and proof
- [x] Docs and CHANGELOG
- [x] Bundle and `bundle:check`

---

## References

- **Origin**: task.254 QA advisory CR-1 — `docs/tasks/task.254.probe-engine-cli-fixture-setup/task.254.gate.2.probe-engine-cli-fixture-setup.yml`, `recommendations.future`
- **Earlier engine tasks**: task.254 (`cli:` setup), task.181 (`shell-argv:` and `--fixture-setup`), task.140 (the trip-wire)
- **Engine**: `shared/resources/security-probe.mjs`; rule: `shared/resources/probe-boundary-rule.md` § 5

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only; `npm run bundle` regenerates the copies.
- Mutation-prove every fix.
- Use `command node` (nvm shell function).
