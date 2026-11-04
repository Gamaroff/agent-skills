---
id: task.256
title: "security-probe: a uniform failure is declined, not scored"
type: task
description: "security-probe.mjs declines rather than scores an entry when every case, hostile and legitimate, fails with the same non-zero exit and the same stderr."
tags: [finalise, observation, security-probe]
category: infrastructure
status: accepted
priority: Medium
created: 2026-11-04
updated: 2026-11-04
completed_date: 2026-11-04
pr_number: 827
estimated_effort_hours: 8
github_issue: 825
---

# Technical Task: security-probe: a uniform failure is declined, not scored

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.256.review.1.probe-uniform-failure-declined.md` implemented 2026-11-04

**GitHub Issue**: [#825](https://github.com/Gamaroff/agent-skills/issues/825)

> Cut from observation #12. **The observation's rule is narrowed here, because a prototype showed it was too wide.** "Same non-zero status and same stderr" alone breaks two earlier decisions held by tests (BUG-7, BUG-9), and "same stderr" needs per-case paths normalised or it never matches at all. See Technical Background.

---

## 1. Overview

When every probe case fails the same way before reaching the control, the engine reports the control as missing. `shell:shared/resources/resolve-pr-number.sh` scores `absent` with 9 reproductions and 5 over-blocks, and every case is only a usage error. `/finalise` copies that record into the DoD, so the run publishes false security findings. This task makes the engine decline that shape as `entry-not-probeable` instead of scoring it.

**Scope**: `shared/resources/security-probe.mjs`, its tests and fixtures, `shared/resources/probe-boundary-rule.md`, the bundled copies and `CHANGELOG.md`.

---

## 2. Motivation

### Current Problems

1. **A usage error scores as a missing control.** On develop `6e49e042`, `command node shared/resources/security-probe.mjs --sink filename --entry 'shell:shared/resources/resolve-pr-number.sh' --json` exits 1 with `verdict: absent`, `executed: 14`, `reproduced: 9`, `overblocked: 5`. The cases read show `exit 2` and the usage line. The script takes `--doc <path>`, not one positional directory, so no case reaches a rung of the resolver.
2. **The record is what gets published.** `/finalise` Step 3b.1 sets `probes_executed` and `probes[]` from the record. On task.175 (2026-10-12) this would have published nine fabricated findings against a boundary the executed suite shows holding.
3. **The count makes it believable.** A full `executed` count is what a reader trusts, and here it counts runs that measured the harness.
4. **Nothing else catches it.** The existing decline at `security-probe.mjs:2194` (`const allErrored`) needs every case `errored`. These cases score `accepted` and `rejected`, so it never fires.

### Benefits

1. A wrong invocation produces a named decline carrying the shared stderr line, so the reader fixes the entry form.
2. No false reproduction reaches a DoD through this shape.
3. The zero-guard still counts the decline as a FAIL, so nothing slips through as a pass.

---

## 3. Technical Background

### Current Architecture

Every line below was found with `grep -n` on `shared/resources/security-probe.mjs` unless stated.

- `computeVerdict` (`:1462`) scores `absent` when a hostile case reproduced and none was rejected. It reads only `outcome` and `direction`.
- A case's outcome comes from `compareExpected`. Search: `grep -n "compareExpected(" shared/resources/security-probe.mjs` gives the definition (`:1365`) and four callers: `runShellCase` (`:2542`, which runs both `shell:` and `shell-fn:`), `runCliCase` (`:2874`), `runShellArgvCase` (`:3303`), and `scoreFenceRun` (`:3658`), called from `runFenceCase` (`:3804`). With an `expected`, a hostile case that differs is `accepted` and a legitimate case that differs is `rejected`. A fence legitimate case with no `expected` is `rejected` on any non-zero exit. A uniform failure differs on all of them.
- `caseResults` carries no raw stderr. Only `detail` holds a truncated comparison string, so the fold cannot see the shared line today. `exit` is on the cli, shell-argv and fence pushes but not on the `shell:` one.
- `runProbeSpec` already folds identical errored cases into one decline (`const allErrored`, `:2194`). `sandboxRoot` (`:1971`) is still in scope there; only the directory is removed, at `:2158`.
- **Three returns carry `cases: caseResults`**, found with `grep -n "cases: caseResults"`: the run-time `needs-fake-gh` trip-wire (`:2182`), the fold (`:2201`) and the scored return (`:2252`). The trip-wire return comes first, so the private key must be gone before it.
- Bundled copies: `find skills \( -name security-probe.mjs -o -name probe-boundary-rule.md \)`. Measured 6 on 2026-11-04 (engine in `finalise`, `qa-story`, `qa-task`, `review-security`; rule in `qa-story`, `qa-task`). `npm run bundle:check` holds them, not this count.

**A second mechanism for a job the file already does.** The `allErrored` fold is the job. This task must not add a second decline return. The new check reclassifies the cases as `errored` and lets the existing fold produce the decline, so `executed: 0`, the once-only `declined` entry and the carried `escapes` all stay in one place.

### What a prototype showed

A scratch copy of the engine, with the unmodified copy beside it as baseline, ran `security-probe.test.mjs` on 2026-11-04. Each row below changed the design:

| Attempt | Result | What it means |
|---|---|---|
| Compare raw stderr | Would never match: the path of each case's `fixture-XXXXXX` directory is in the line | Normalise per-case paths |
| Also replace the case's input in stderr | `BUG-9` test went red (`security-probe.test.mjs:760`) | Dropped: an echoed name is evidence the input arrived |
| No exit-code exclusion | `BUG-9` still red. `runs-names.sh` exits 126 on every case with one stderr line | Exclude 126 and 127, which `isLaunchFailure` (`:2272`) and the test at `:731` already treat as the target's own answer |
| Rule as stated below | 289 of 290 pass, the same as baseline, with the same one failing test | No existing test flips |

The one test failing on both sides is `task.227 regression`, an ENOENT in the overlay, which omits `docs/`. It says nothing about this change, and the overlay cannot speak for it either: Phase 2 runs the suite on a real checkout.

Calibration on the prototype, `runProbeSpec` per row:

| Entry behaviour | Verdict | Executed | Why |
|---|---|---|---|
| `shell:` usage line, exit 2 | `unverifiable` / `entry-not-probeable` | 0 | Target shape |
| `shell:` usage echoing `$1`, the fixture path | `unverifiable` / `entry-not-probeable` | 0 | Target shape, needs the normaliser |
| `shell:` same message, exit 1 | `unverifiable` / `entry-not-probeable` | 0 | Not exit-2-specific |
| `shell:` exit 127 with stderr | `absent` | 14 | Held by BUG-7 |
| `shell:` silent exit 3 | `absent` | 14 | No shared line to report |
| `shell:` accept-all, exit 0 | `absent` | 14 | A real finding: must stay scored |
| `shell:` lists its fixture, exit 2 | `absent` | 14 | Stderr differs per case: inputs arrived |
| `cli:` usage, hostile and legitimate | `unverifiable` / `entry-not-probeable` | 0 | Target shape |
| `cli:` usage, hostile only | `absent` | 2 | Needs both directions |
| `cli:` usage echoing the input | `absent` | 3 | **Known limit**, see below |
| `cli:` usage, no `expected` | `unverifiable` / `rejects-every-input` | 3 | Already not a finding; unchanged |

The other three forms ran through the same prototype at review, on 2026-11-04:

| Entry behaviour | Verdict | Executed | Why |
|---|---|---|---|
| `shell-fn:` with `sink: "filename"`, usage line, return 2 | `unverifiable` / `entry-not-probeable` | 0 | Target shape. This form needs `sink`: with `cases` alone it declines for a different reason |
| `shell-argv:` usage line, exit 2 | `unverifiable` / `entry-not-probeable` | 0 | Target shape |
| `shell-argv:` prints the `{fixture}` path, exit 2 | `unverifiable` / `entry-not-probeable` | 0 | The normaliser handles it |
| `shell-argv:` echoes the input | `absent` | 4 | Known limit |
| `shell-argv:` hostile only | `absent` | 2 | Needs both directions |
| `shell-argv:` accept-all | `absent` | 4 | A real finding |
| `fence:` usage line, exit 2 | `unverifiable` / `entry-not-probeable` | 0 | Target shape |
| `fence:` prints `$0`, the `fence-N.sh` path, exit 2 | `unverifiable` / `entry-not-probeable` | 0 | The normaliser handles it |
| `fence:` a command not found, exit 127 | `absent` | 3 | Exit 127 stays scored |
| `fence:` accept-all | `absent` | 3 | A real finding |

**All of this ran under bash only**: zsh is not installed on the machine that ran it (`shells: ["bash"]`). CI installs zsh (`.github/workflows/test.yml`), so CI is the first run of these tests under both shells.

### Target Architecture

`runProbeSpec` declines an entry with `entry-not-probeable` when **all** of these hold over the cases that ran:

1. At least one hostile and one legitimate case ran, every hostile case is `accepted` and every legitimate case is `rejected`. So no case matched its `expected`, and the verdict would otherwise be `absent`.
2. Within each shell, every case has the same non-zero exit, and that exit is neither 126 nor 127.
3. Within each shell, every case has the same non-empty stderr, once `sandboxRoot`, `fixture-XXXXXX` and `fence-N.sh` are normalised.

The decline's detail names the exit, tells the reader to check the entry form and its argv, and quotes the first stderr line.

**The check runs before the `needs-fake-gh` return, and its result applies after it.** A run that reached `gh` stays `needs-fake-gh`, because the trip-wire answered and that is the more specific reason. The private key is removed before that return as well.

### Important Clarifications

- **Condition 1 is what keeps a real finding safe.** A uniform failure on hostile cases alone cannot be told from a control that dies on hostile input, and a legitimate case is what shows it fails alike. `present-but-inert` and `engages` need a case that matched, so neither can be replaced.
- **Known limits, each scored as today and named in the boundary rule:** a usage error that echoes the input (it cannot be told from a control refusing that input); a hostile-only corpus; exit 126 or 127; a silent failure.
- **A real control that refuses everything with one message is also declined.** That is correct: legitimate input fails too, so the run has no evidence about the guard. The zero-guard still counts it.

---

## 4. Scope

### In Scope

✅ **Engine**: record each spawned case's exit and stderr privately, the pure check, the reclassification, and removal of the private field before anything is returned.
✅ **Forms**: `shell:`, `shell-fn:`, `shell-argv:`, `cli:`, `fence:`.
✅ **Docs**: the engine header, the `entry-not-probeable` row of `probe-boundary-rule.md` plus its limits, `CHANGELOG.md`.
✅ **Proof**: the resolve-pr-number reproduction re-run, recorded in the QA report.

### Out of Scope

❌ **Observation #12's improvement 2**, a check in `/finalise` Step 3b item 3. The engine now answers it before `/finalise` reads the record, and a second check would be a second definition of the rule.
❌ The JS form. It spawns one child per case that reports a structured outcome, and a failure there is already `errored`.
❌ Telling an echoed-input usage error from a refusal. Nothing in the output separates them.
❌ Changing the zero-guard, or rewriting the committed task.175 record.

---

## 5. Breaking Changes

### Breaking Change 1: this shape reads `unverifiable`, not `absent`

**What Changed**: an entry meeting all three conditions is declined.

**Before**: `verdict: absent`, `reason: no-hostile-case-was-rejected`, `executed: 14`, `reproduced` non-empty, exit 1.

**After**: `verdict: unverifiable`, `reason: entry-not-probeable`, `executed: 0`, `reproduced` empty, one `declined` entry, exit 1.

**Impact**: the exit code is unchanged. `/finalise` loses the false `probes[]` and gets a zero-guard FAIL, whose remedies at `skills/finalise/SKILL.md` § "When the engine declined the entry" already apply. A run that today accepts on a by-hand reading of the false findings now has to fix the entry form or record an override.

**Migration Path**: none for callers. Fix the probe's entry form when the decline names a usage line.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.256.plan.probe-uniform-failure-declined.md](task.256.plan.probe-uniform-failure-declined.md)

### Phase 1: Tests first

**Risk Level**: Low

**Files**:
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/tests/fixtures/security-probe/` (new fixtures)

**Changes**:
- [x] Add the regression on the real script: `shell:shared/resources/resolve-pr-number.sh` is declined with `executed: 0` and no `reproduced`. Confirm it is red on the unmodified engine.
- [x] Add one declined case per form: `shell:`, `shell-fn:`, `shell-argv:`, `cli:`, `fence:`. Each asserts `executed: 0`, exactly one `declined` entry whose `id` is the entry, and a detail holding the exit and the shared stderr line.
- [x] Add the stay-scored table from § 3: accept-all, silent exit, exit 126/127, stderr that differs per case, hostile-only, echoed input, a corpus where one case matches its `expected`.
- [x] Test `uniformFailure` directly with hand-built results: two shells that each fail uniformly with different lines are still declined, and a shell whose cases differ in exit is not. A hand-built result is what lets this run where zsh is absent.
- [x] Add a run that reaches `gh` under the trip-wire and also fails uniformly. It stays `needs-fake-gh`, and its cases carry no private key.
- [x] Extend the bash-shim spawn test (`security-probe.test.mjs`, "a run with no --fixture-setup spawns no bash") with a declined `cli:` run, which also starts no bash.
- [x] Give each new `.sh` fixture a bash shebang, because `git ls-files '*.sh'` puts it in the ShellCheck lane.

**Dependencies**: none.

---

### Phase 2: The check and the fold

**Risk Level**: Medium

**Files**:
- `shared/resources/security-probe.mjs`

**Changes**:
- [x] Each spawning arm records exit and stderr on its case result, under a private key.
- [x] Add and export the pure `uniformFailure(caseResults, sandboxRoot)`, stating the three conditions of § 3.
- [x] In `runProbeSpec`, straight after the `try`/`finally` and before `if (ghTripped)`: run it and delete the private key from every case. Immediately before `const allErrored`: on a hit, set every case to `errored` with the shared detail. Add no second decline return.
- [x] Assert that a case from each of the three returns, and a run record, carry no private key or raw stderr.
- [x] Run the suite on a real checkout, not only an overlay.

**Dependencies**: Phase 1.

---

### Phase 3: Downstream, docs, bundles and proof

**Risk Level**: Low

**Files**:
- `shared/resources/security-probe.mjs` (header)
- `shared/resources/probe-boundary-rule.md`
- `CHANGELOG.md`
- generated copies under `skills/*/references/`

**Changes**:
- [x] Test through `security-probe-plan.mjs` that the shape yields `probes: []` and `probes_executed: 0`.
- [x] Update the engine header and the `entry-not-probeable` row, and state the four known limits.
- [x] `npm run bundle`, then `npm run bundle:check`.
- [x] Add the `CHANGELOG.md` entry citing task 256.
- [x] Re-run the resolve-pr-number command and record its result in the QA report. (The regression test runs it; QA records it.)

**Dependencies**: Phase 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` - private exit and stderr per case, `uniformFailure`, the fold, the header

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/security-probe.test.mjs` - regression, per-form, stay-scored and plan-level tests
3. ✅ `shared/resources/tests/fixtures/security-probe/` - new uniform-failure fixtures

### Files to Modify (Documentation)

4. ✅ `shared/resources/probe-boundary-rule.md` - the `entry-not-probeable` row and the known limits
5. ✅ `CHANGELOG.md` - the changed verdict

### Generated (by `npm run bundle`)

6. ✅ `skills/{finalise,qa-story,qa-task,review-security}/references/security-probe.mjs`
7. ✅ `skills/{qa-story,qa-task}/references/probe-boundary-rule.md`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `uniformFailure` as a pure function and `runProbeSpec` per form.

**Actions**:
- [x] Every row of § 3's calibration table is a test.
- [x] **Control case**: besides `resolve-pr-number.sh`, a fixture this task's text never names, failing with a different message and exit 1, is declined; and an accept-all fixture stays `absent`. So a pass does not mean the example was recognised.

**Command**: `command node --test shared/resources/tests/security-probe.test.mjs`

**Target**: all existing tests plus the new ones pass.

### Mutation

- [x] Remove the reclassification: the resolve-pr-number regression goes red. Restore.
- [x] Remove the path normaliser: the regression goes red. Restore.
- [x] Remove the 126/127 exclusion: `BUG-9` goes red. Restore.
- [x] Remove the both-directions condition: the hostile-only row goes red. Restore.
- [x] Add input replacement to the normaliser: `BUG-9` or the echoed-input row goes red. Restore.
- [x] Delete the private key only after the `needs-fake-gh` return: the trip-wire test goes red. Restore.
- [x] Apply the reclassification before the `needs-fake-gh` return: the trip-wire test goes red. Restore.

### Consumer Tests

**Scope**: the bundled copies behave as the source does.

**Command**: `npm run bundle:check` and `npm test`.

---

## 9. Success Criteria

### Functional

- [x] `shell:shared/resources/resolve-pr-number.sh` under `--sink filename` returns `verdict: unverifiable`, `reason: entry-not-probeable`, `executed: 0`, empty `reproduced` and `overblocked`, exit 1 (Phase 2 states the branch). The command and result are recorded in the QA report.
- [x] The decline's detail names the exit and the shared stderr line (held by the per-form tests, Phase 1).
- [x] The shape is declined under `shell:`, `shell-fn:`, `shell-argv:`, `cli:` and `fence:` (held by the per-form tests, Phase 1).
- [x] An accept-all control still scores `absent`, and every stay-scored row in § 3 is unchanged (held by the stay-scored tests, Phase 1).
- [x] A run that reaches `gh` under the trip-wire stays `needs-fake-gh` (held by the trip-wire test, Phase 1).
- [x] Through `security-probe-plan.mjs`, the shape yields `probes: []` and `probes_executed: 0` (held by the plan-level test, Phase 3).
- [x] No private key or raw stderr appears in a case from any of the three returns, or in a run record (held by the private-key test, Phase 2).

### Performance

- [x] No extra process per case: a declined `cli:` run starts no bash (held by the extended bash-shim spawn test, Phase 1).
- [x] A run's case-record size does not grow: the private key is removed before every return (held by the private-key test, Phase 2).

### Code Quality

- [x] One decline path: a declined run returns exactly one `declined` entry, whose `id` is the entry, with every case `errored` (held by the per-form tests, Phase 1).
- [x] `command node --test shared/resources/tests/security-probe.test.mjs` passes on a real checkout.
- [ ] `npm test`, `CI=true npm test`, `npm run lint:shell` and `npm run bundle:check` pass. (Not met locally: `CI=true` fails one test, "under CI, every tool a suite skips without is on PATH", because zsh is not installed on this machine. 7201 of 7215 pass; `lint:shell` and `bundle:check` pass. CI installs zsh.)
- [x] Every mutation in § 8 turns a test red (18 mutations run, 18 red as predicted; recorded in the implementation report, QA re-checks).

### Migration

- [x] `CHANGELOG.md` records the changed verdict, citing task 256.
- [x] `probe-boundary-rule.md` states the rule and its four known limits.
- [x] No committed run record is rewritten: `git diff --name-only origin/develop... -- '*.run.json'` prints nothing, and the QA report records the command and its result.

---

## 10. Risk Assessment

### High Risk Areas

**1. A real finding becomes a decline.**
- **Risk**: an entry that is genuinely unguarded fails uniformly and loses its reproduction.
- **Probability**: Low
- **Impact**: Critical
- **Mitigation**: the rule needs a non-zero exit and a legitimate case failing identically, so a control letting input through cannot meet it. The decline is a zero-guard FAIL, so it still stops the run. The stay-scored table is the differential oracle: each row must read the same on `develop` and on this branch.
- **Rollback**: revert the merge; verdicts return to today's.

### Medium Risk Areas

**1. The normaliser misses a per-case token.**
- **Risk**: a form prints another per-case path, so stderr differs and the false finding remains.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: one declined test per form, using real spawned paths.
- **Rollback**: forward fix in the normaliser.

**2. A run that accepted on the old record now halts.**
- **Risk**: a work item with a mis-formed probe gets a zero-guard FAIL.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the decline names the usage line, and the remedies exist. This is the intended behaviour.
- **Rollback**: none needed.

### Low Risk Areas

**1. Bundle drift.** Mitigation: `npm run bundle` then `bundle:check` in Phase 3.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- An accept-all or partially rejecting control reads `unverifiable`.
- An existing probe test goes red on a real checkout.

**Steps**:
1. Revert the merge commit.
2. `npm run bundle` to restore the copies.
3. Re-run `npm test`.

**Verification**: `npm test` and `npm run bundle:check` pass, and the resolve-pr-number command returns `absent` again.

---

### Partial Rollback (1-2 hours)

**When to Use**: one form misbehaves and the others are sound.

**Steps**:
1. Stop that arm recording the private key, so the check returns null for it.
2. Re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: the normaliser misses a token, or the docs are inaccurate.

**Approach**: fix in a follow-up commit, with the failing form as the test.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A real reproduction is declined.

**Non-Critical (Forward Fix)**:
- A false finding remains for a shape the rule did not cover.
- Decline wording.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-04
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.256.qa.1.probe-uniform-failure-declined.md](./task.256.qa.1.probe-uniform-failure-declined.md)
- **Gate File**: [task.256.gate.1.probe-uniform-failure-declined.yml](./task.256.gate.1.probe-uniform-failure-declined.yml)

### Test Coverage Summary
- **Tests Executed**: 301
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No blocking findings. One advisory code-review note (a genuinely errored case loses its own detail in the fold). PR CI was pending and nothing has run under zsh yet, so the CI result is worth reading before merge.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.256.qa.1.probe-uniform-failure-declined.md`
**Gate File**: `task.256.gate.1.probe-uniform-failure-declined.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 95/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** all 16 met (15 on committed tests or records, #12 graded from CI)
✅ **Tests:** probe suite 301/301; 10 new tests and 12 fixtures; 18 of 18 mutations of the engine red
✅ **PR Review:** PR #827, `/review-pr` APPROVE (`task.256.pr-review.1.probe-uniform-failure-declined.md`)
✅ **CI:** all 6 checks SUCCESS on `73b0df2444cf`, including the zsh lane
✅ **Documentation:** CHANGELOG entry citing task 256; the rule and its four limits in `probe-boundary-rule.md`
⚠️ **Security / Compliance:** not applicable (not a boundary; no PII, payment, UI or PHI scope)

**Detailed Verification Log:** See `task.256.dod.1.probe-uniform-failure-declined.md`.

**Task marked as ACCEPTED on:** 2026-11-04
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-04 | 1.0     | Initial draft — cut from observation #12  | create-task |
| 2026-11-04 | 1.1     | Review passed (9/10) after 8 fixes: private key removed before the `needs-fake-gh` return; three forms run and tabled; criteria name their tests | review-task |
| 2026-11-04 |         | Status → ready-for-development | review-task |
| 2026-11-04 |         | Implemented — 12 files (engine, tests, 12 fixtures, rule doc, CHANGELOG, bundles), 10 new tests, 18 mutations red | develop |
| 2026-11-04 |         | QA gate PASS (95/100) — 1 advisory finding | qa-task |
| 2026-11-04 | 1.2 | DoD passed — accepted (PR #827) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first
- [x] Regression red on the unmodified engine
- [x] One declined case per form
- [x] Stay-scored table

### Phase 2: The check and the fold
- [x] Private exit and stderr recorded by each arm
- [x] `uniformFailure` and the reclassification
- [x] Suite green on a real checkout

### Phase 3: Downstream, docs, bundles and proof
- [x] Plan-level test
- [x] Docs and CHANGELOG
- [x] Bundle and bundle:check
- [x] Reproduction re-run recorded in the QA report

---

## References

- **Observation**: Observation #12 — security-probe shell: form scores a uniform usage error as the control's verdict (task.175: 14 executed, 9 false reproductions)
- **Earlier decisions this keeps**: BUG-7 and BUG-9 of task.128 (`security-probe.test.mjs:731`, `:760`)
- **Where it bit**: task.175 — `task.175.dod.1.security.run.json`
- **Engine**: `shared/resources/security-probe.mjs`; rule: `shared/resources/probe-boundary-rule.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only; `npm run bundle` regenerates the copies.
- Mutation-prove every fix.
- Use `command node`, and never under `timeout` (obs #146).
- In the engine header and in `probe-boundary-rule.md`, cite a sibling by its bare filename. A `shared/resources/` literal inside a shared source is a bundling instruction.

### Future Improvements

- Have the security agent choose the entry form from the script's usage, so a mis-formed probe is rarer in the first place.

---

**Status:** Accepted

**Next Steps**:
1. Implement according to the plan with `/develop-task`.
2. Mark checkboxes as completed.
3. QA will create the QA report, gate and any bug files in this directory.
